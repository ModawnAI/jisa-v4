/**
 * Upload Public Documents Script
 *
 * Processes and uploads documents from /data/everyone to Pinecone (public namespace).
 * Mirrors the employee data structure patterns for consistency.
 *
 * Run: npx tsx scripts/upload-public-documents.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

import { publicDocumentProcessor } from '../lib/services/document-processors/public-document-processor';
import { createEmbedding } from '../lib/utils/embedding';
import type { ProcessorOptions } from '../lib/services/document-processors/types';

// Configuration
const DATA_DIR = path.join(process.cwd(), 'data', 'everyone');
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX || 'jisa-v4';
const PUBLIC_NAMESPACE = 'public';
const BATCH_SIZE = 50; // Pinecone upsert batch size
const EMBEDDING_DELAY_MS = 200; // Rate limiting for embeddings

// MIME type detection
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.xls':
      return 'application/vnd.ms-excel';
    default:
      return 'application/octet-stream';
  }
}

// Delay helper for rate limiting
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=' .repeat(80));
  console.log('Public Documents Upload Script');
  console.log('=' .repeat(80));

  // Check Pinecone configuration
  if (!process.env.PINECONE_API_KEY) {
    console.error('PINECONE_API_KEY not set');
    process.exit(1);
  }

  // Initialize Pinecone
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.index(INDEX_NAME);

  console.log(`\nPinecone Index: ${INDEX_NAME}`);
  console.log(`Namespace: ${PUBLIC_NAMESPACE}`);

  // Check current stats
  const stats = await index.describeIndexStats();
  const currentCount = stats.namespaces?.[PUBLIC_NAMESPACE]?.recordCount || 0;
  console.log(`Current vectors in ${PUBLIC_NAMESPACE}: ${currentCount}`);

  // Check data directory
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`\nData directory not found: ${DATA_DIR}`);
    process.exit(1);
  }

  // List files
  const files = fs.readdirSync(DATA_DIR).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return ['.pdf', '.xlsx', '.xls'].includes(ext);
  });

  console.log(`\nFound ${files.length} files to process:`);
  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const stat = fs.statSync(filePath);
    console.log(`  - ${file} (${(stat.size / 1024).toFixed(1)} KB)`);
  }

  // Process each file
  let totalChunks = 0;
  let totalVectors = 0;

  for (const filename of files) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${filename}`);
    console.log('='.repeat(60));

    const filePath = path.join(DATA_DIR, filename);
    const buffer = fs.readFileSync(filePath);
    const mimeType = getMimeType(filename);

    console.log(`  File size: ${(buffer.length / 1024).toFixed(1)} KB`);
    console.log(`  MIME type: ${mimeType}`);

    // Check if processor can handle this file
    const canProcess = publicDocumentProcessor.canProcess({
      id: `public-${Date.now()}`,
      organizationId: 'public',
      fileName: filename,
      originalFileName: filename,
      mimeType,
      fileType: mimeType.includes('pdf') ? 'pdf' : 'excel',
    });

    if (!canProcess) {
      console.log(`  Skipping: Processor cannot handle this file type`);
      continue;
    }

    // Create document for processing
    const documentId = `public-${filename.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
    const document = {
      id: documentId,
      organizationId: 'public',
      fileName: filename,
      originalFileName: filename,
      mimeType,
      fileType: mimeType.includes('pdf') ? 'pdf' as const : 'excel' as const,
    };

    const options: ProcessorOptions = {
      organizationId: 'public',
      clearanceLevel: 'basic',
      maxChunkSize: 1000,
      chunkOverlap: 200,
    };

    // Process the document
    console.log(`  Processing document...`);
    const startTime = Date.now();

    try {
      const result = await publicDocumentProcessor.process(buffer, document, options);

      console.log(`  Processing complete in ${Date.now() - startTime}ms`);
      console.log(`  Chunks generated: ${result.chunks.length}`);
      console.log(`  Namespace strategy: ${result.namespaceStrategy}`);

      totalChunks += result.chunks.length;

      if (result.chunks.length === 0) {
        console.log(`  No chunks generated, skipping upload`);
        continue;
      }

      // Show sample chunk
      const sampleChunk = result.chunks[0];
      console.log(`\n  Sample chunk:`);
      console.log(`    Vector ID: ${sampleChunk.vectorId}`);
      console.log(`    Namespace: ${sampleChunk.namespace}`);
      const metadata = sampleChunk.metadata as Record<string, unknown>;
      console.log(`    doc_type: ${metadata.doc_type || 'N/A'}`);
      console.log(`    period: ${metadata.period || 'N/A'}`);
      console.log(`    branch: ${metadata.branch || 'N/A'}`);
      console.log(`    Embedding text (preview): ${sampleChunk.embeddingText.slice(0, 150).replace(/\n/g, ' ')}...`);

      // Generate embeddings and upload to Pinecone in batches
      console.log(`\n  Generating embeddings and uploading...`);
      const vectorsToUpsert: Array<{
        id: string;
        values: number[];
        metadata: Record<string, string | number | boolean | string[]>;
      }> = [];

      for (let i = 0; i < result.chunks.length; i++) {
        const chunk = result.chunks[i];

        // Generate embedding
        const embedding = await createEmbedding(chunk.embeddingText);

        vectorsToUpsert.push({
          id: chunk.vectorId,
          values: embedding,
          metadata: chunk.metadata as Record<string, string | number | boolean | string[]>,
        });

        // Progress indicator
        if ((i + 1) % 10 === 0) {
          process.stdout.write(`    Embedded ${i + 1}/${result.chunks.length} chunks\r`);
        }

        // Rate limiting
        if (i < result.chunks.length - 1) {
          await delay(EMBEDDING_DELAY_MS);
        }
      }
      console.log(`    Embedded ${result.chunks.length}/${result.chunks.length} chunks`);

      // Upsert to Pinecone in batches
      console.log(`  Uploading to Pinecone...`);
      for (let i = 0; i < vectorsToUpsert.length; i += BATCH_SIZE) {
        const batch = vectorsToUpsert.slice(i, i + BATCH_SIZE);
        await index.namespace(PUBLIC_NAMESPACE).upsert(batch);
        console.log(`    Uploaded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vectorsToUpsert.length / BATCH_SIZE)}`);
      }

      totalVectors += vectorsToUpsert.length;
      console.log(`  Uploaded ${vectorsToUpsert.length} vectors to ${PUBLIC_NAMESPACE}`);

    } catch (error) {
      console.error(`  Error processing document:`, error);
      if (error instanceof Error) {
        console.error(`  Stack: ${error.stack}`);
      }
    }
  }

  // Final stats
  console.log(`\n${'='.repeat(80)}`);
  console.log('Upload Summary');
  console.log('='.repeat(80));
  console.log(`Files processed: ${files.length}`);
  console.log(`Total chunks generated: ${totalChunks}`);
  console.log(`Total vectors uploaded: ${totalVectors}`);

  // Check new stats
  const newStats = await index.describeIndexStats();
  const newCount = newStats.namespaces?.[PUBLIC_NAMESPACE]?.recordCount || 0;
  console.log(`\nVectors in ${PUBLIC_NAMESPACE} namespace: ${currentCount} -> ${newCount} (+${newCount - currentCount})`);

  console.log('\nDone!');
}

// Run
main().catch(console.error);
