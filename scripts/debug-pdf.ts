/**
 * Debug PDF Parser Script
 *
 * Tests PDF parsing to understand why 0 chunks are being generated.
 * Run: npx tsx scripts/debug-pdf.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';

const DATA_DIR = path.join(process.cwd(), 'data', 'everyone');

async function debugPDF(filename: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Debugging: ${filename}`);
  console.log('='.repeat(60));

  const filePath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`  File not found: ${filePath}`);
    return;
  }

  const buffer = fs.readFileSync(filePath);
  console.log(`  File size: ${(buffer.length / 1024).toFixed(1)} KB`);

  // Convert to Uint8Array
  const data = new Uint8Array(buffer);

  // Create PDF parser
  const parser = new PDFParse({ data });

  try {
    // Get text content
    console.log('\n  Extracting text...');
    const textResult = await parser.getText();

    console.log(`  Total pages: ${textResult.pages.length}`);
    console.log(`  Total text length: ${textResult.text.length} chars`);

    // Show page-by-page breakdown
    console.log('\n  Page breakdown:');
    for (let i = 0; i < textResult.pages.length; i++) {
      const page = textResult.pages[i];
      const textLength = page.text?.length || 0;
      const preview = page.text?.slice(0, 100).replace(/\n/g, ' ') || '(empty)';
      console.log(`    Page ${i + 1}: ${textLength} chars`);
      if (textLength > 0) {
        console.log(`      Preview: ${preview}...`);
      }
    }

    // Get metadata
    console.log('\n  Getting metadata...');
    const infoResult = await parser.getInfo();
    console.log(`  Title: ${infoResult.info?.Title || 'N/A'}`);
    console.log(`  Author: ${infoResult.info?.Author || 'N/A'}`);
    console.log(`  Creator: ${infoResult.info?.Creator || 'N/A'}`);
    console.log(`  Producer: ${infoResult.info?.Producer || 'N/A'}`);

    // Analysis
    console.log('\n  Analysis:');
    if (textResult.text.length === 0) {
      console.log('    STATUS: No text extracted');
      console.log('    LIKELY CAUSE: PDF is a scanned image without OCR');
      console.log('    SOLUTION: Use OCR (e.g., Google Vision API, Tesseract) to extract text');
    } else if (textResult.text.length < 100) {
      console.log('    STATUS: Very little text extracted');
      console.log('    LIKELY CAUSE: PDF may be mostly images with some text');
    } else {
      console.log('    STATUS: Text extracted successfully');
      console.log(`    Text preview: ${textResult.text.slice(0, 200).replace(/\n/g, ' ')}...`);
    }

  } catch (error) {
    console.error(`  Error parsing PDF:`, error);
  } finally {
    await parser.destroy();
  }
}

async function main() {
  console.log('PDF Debug Script');
  console.log('================');

  // Find all PDFs in data/everyone
  const files = fs.readdirSync(DATA_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));

  console.log(`Found ${files.length} PDF files`);

  for (const file of files) {
    await debugPDF(file);
  }

  console.log('\n\nDone!');
}

main().catch(console.error);
