/**
 * Upload PDFs Only to Public Namespace
 *
 * Processes only PDF files from data/everyone
 * Run: npx tsx scripts/upload-pdfs-only.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';

config({ path: path.join(process.cwd(), '.env.local') });

import { publicDocumentProcessor } from '../lib/services/document-processors/public-document-processor';
import { createEmbedding } from '../lib/utils/embedding';
import type { ProcessorOptions } from '../lib/services/document-processors/types';

const DATA_DIR = path.join(process.cwd(), 'data', 'everyone');
const INDEX_NAME =
  process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX || 'jisa-v4';
const PUBLIC_NAMESPACE = 'public';
const BATCH_SIZE = 50;
const EMBEDDING_DELAY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(80));
  console.log('Upload PDFs Only with Fixed doc_type Detection');
  console.log('='.repeat(80));

  if (!process.env.PINECONE_API_KEY) {
    console.error('PINECONE_API_KEY not set');
    process.exit(1);
  }

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.index(INDEX_NAME);

  // Step 1: Delete ALL vectors in public namespace
  console.log('\n1. Clearing public namespace...');
  try {
    await index.namespace(PUBLIC_NAMESPACE).deleteAll();
    console.log('   Public namespace cleared');
  } catch (error) {
    console.log('   Already empty or error:', error);
  }

  // Wait for deletion to propagate
  await delay(3000);

  // Step 2: Get PDF files only
  const allFiles = fs.readdirSync(DATA_DIR);
  const pdfFiles = allFiles.filter((f) => f.toLowerCase().endsWith('.pdf'));
  console.log('\n2. Found ' + pdfFiles.length + ' PDF files in ' + DATA_DIR);

  let totalChunks = 0;
  let totalVectors = 0;

  for (const filename of pdfFiles) {
    console.log('\n' + '='.repeat(60));
    console.log('Processing: ' + filename);
    console.log('='.repeat(60));

    const filePath = path.join(DATA_DIR, filename);
    const buffer = fs.readFileSync(filePath);

    const document = {
      id: 'public-' + filename.replace(/[^a-zA-Z0-9]/g, '-') + '-' + Date.now(),
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

    try {
      console.log('  Processing with FIXED doc_type detection...');
      const startTime = Date.now();
      const result = await publicDocumentProcessor.process(
        buffer,
        document,
        options
      );

      console.log('  Processing complete in ' + (Date.now() - startTime) + 'ms');
      console.log('  Chunks generated: ' + result.chunks.length);

      totalChunks += result.chunks.length;

      if (result.chunks.length === 0) {
        console.log('  No chunks generated, skipping upload');
        continue;
      }

      // Show doc_type for first chunk
      const sampleChunk = result.chunks[0];
      const metadata = sampleChunk.metadata as Record<string, unknown>;
      console.log('  ** doc_type: ' + metadata.doc_type + ' **');
      console.log('  branch: ' + (metadata.branch || 'N/A'));
      if (metadata.insurance_company) {
        console.log('  insurance_company: ' + metadata.insurance_company);
      }

      // Generate embeddings
      console.log('\n  Generating embeddings...');
      const vectorsToUpsert: Array<{
        id: string;
        values: number[];
        metadata: Record<string, string | number | boolean | string[]>;
      }> = [];

      for (let i = 0; i < result.chunks.length; i++) {
        const chunk = result.chunks[i];
        const embedding = await createEmbedding(chunk.embeddingText);

        vectorsToUpsert.push({
          id: chunk.vectorId,
          values: embedding,
          metadata: chunk.metadata as Record<string, string | number | boolean | string[]>,
        });

        if ((i + 1) % 10 === 0) {
          process.stdout.write('    Embedded ' + (i + 1) + '/' + result.chunks.length + '\r');
        }

        if (i < result.chunks.length - 1) {
          await delay(EMBEDDING_DELAY_MS);
        }
      }
      console.log('    Embedded ' + result.chunks.length + '/' + result.chunks.length);

      // Upload to Pinecone
      console.log('  Uploading to Pinecone...');
      for (let i = 0; i < vectorsToUpsert.length; i += BATCH_SIZE) {
        const batch = vectorsToUpsert.slice(i, i + BATCH_SIZE);
        await index.namespace(PUBLIC_NAMESPACE).upsert(batch);
        console.log('    Batch ' + (Math.floor(i / BATCH_SIZE) + 1) + '/' + Math.ceil(vectorsToUpsert.length / BATCH_SIZE));
      }

      totalVectors += vectorsToUpsert.length;
      console.log('  Uploaded ' + vectorsToUpsert.length + ' vectors');
    } catch (error) {
      console.error('  Error:', error);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Upload Summary');
  console.log('='.repeat(80));
  console.log('PDF files processed: ' + pdfFiles.length);
  console.log('Total chunks: ' + totalChunks);
  console.log('Total vectors uploaded: ' + totalVectors);

  // Check stats
  await delay(2000);
  const newStats = await index.describeIndexStats();
  const newCount = newStats.namespaces?.[PUBLIC_NAMESPACE]?.recordCount || 0;
  console.log('\nVectors in ' + PUBLIC_NAMESPACE + ' namespace: ' + newCount);

  console.log('\nDone!');
}

main().catch(console.error);
