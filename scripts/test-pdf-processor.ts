/**
 * Test PDF Processor Script
 *
 * Tests the public document processor on PDFs with debug output.
 * Run: npx tsx scripts/test-pdf-processor.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

import { publicDocumentProcessor } from '../lib/services/document-processors/public-document-processor';
import { parsePDF } from '../lib/utils/pdf-parser';
import type { ProcessorOptions } from '../lib/services/document-processors/types';

const DATA_DIR = path.join(process.cwd(), 'data', 'everyone');

async function testPDFProcessor() {
  console.log('PDF Processor Test');
  console.log('='.repeat(60));

  const filename = '11월시책공지_한화생명추가만 (25.10.06.)_Ho&F.pdf';
  const filePath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const buffer = fs.readFileSync(filePath);
  console.log(`\nFile: ${filename}`);
  console.log(`Size: ${(buffer.length / 1024).toFixed(1)} KB`);

  // Step 1: Test direct PDF parsing (same as debug-pdf.ts)
  console.log('\n--- Step 1: Direct PDF parsing ---');
  try {
    const bytes = new Uint8Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      bytes[i] = buffer[i];
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });

    console.log('  Blob created:', blob.size, 'bytes');

    const pdfResult = await parsePDF(blob);
    console.log('  Pages:', pdfResult.pages.length);
    console.log('  Page count:', pdfResult.pageCount);
    console.log('  Total text:', pdfResult.text.length, 'chars');

    for (let i = 0; i < pdfResult.pages.length; i++) {
      const page = pdfResult.pages[i];
      console.log(`    Page ${i + 1}: ${page.text.length} chars`);
      if (page.text.length > 0) {
        console.log(`      Preview: ${page.text.slice(0, 50).replace(/\n/g, ' ')}...`);
      }
    }
  } catch (error) {
    console.error('  Error:', error);
  }

  // Step 2: Test processor directly
  console.log('\n--- Step 2: Processor test ---');
  try {
    const document = {
      id: `test-${Date.now()}`,
      organizationId: 'public',
      fileName: filename,
      originalFileName: filename,
      mimeType: 'application/pdf',
      fileType: 'pdf' as const,
    };

    const options: ProcessorOptions = {
      organizationId: 'public',
      clearanceLevel: 'basic',
      maxChunkSize: 1000,
      chunkOverlap: 200,
    };

    console.log('  Calling processor...');
    const result = await publicDocumentProcessor.process(buffer, document, options);

    console.log('  Result:');
    console.log('    Chunks:', result.chunks.length);
    console.log('    Namespace strategy:', result.namespaceStrategy);
    console.log('    Processing time:', result.processingInfo?.processingTime, 'ms');

    if (result.chunks.length > 0) {
      console.log('\n    Sample chunk:');
      const chunk = result.chunks[0];
      console.log('      Vector ID:', chunk.vectorId);
      console.log('      Content length:', chunk.content.length, 'chars');
      console.log('      Embedding text length:', chunk.embeddingText.length, 'chars');
    } else {
      console.log('\n    NO CHUNKS GENERATED - This is the bug!');
    }
  } catch (error) {
    console.error('  Error:', error);
  }
}

testPDFProcessor().catch(console.error);
