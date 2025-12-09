/**
 * Re-upload Compensation Data (건별 및 명세) with Searchable Text
 *
 * Fixes the issue where embeddingText was used for embeddings but NOT stored
 * in Pinecone metadata, causing RAG queries to fail.
 *
 * Run: npx tsx scripts/reupload-compensation-with-searchable-text.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';

config({ path: path.join(process.cwd(), '.env.local') });

import { compensationExcelProcessor } from '../lib/services/document-processors';
import { createEmbedding } from '../lib/utils/embedding';
import type { ProcessorOptions, DocumentForProcessing } from '../lib/services/document-processors/types';

const COMPENSATION_FILE_PATH = path.join(
  process.cwd(),
  'data',
  '★202509마감_HO&F 건별 및 명세_20251023_배포용_수도권, AL (1).xlsx'
);

const INDEX_NAME =
  process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX || 'jisa-v4';
const BATCH_SIZE = 50;
const EMBEDDING_DELAY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(80));
  console.log('Re-upload Compensation Data (건별 및 명세) with Searchable Text');
  console.log('='.repeat(80));

  if (!process.env.PINECONE_API_KEY) {
    console.error('PINECONE_API_KEY not set');
    process.exit(1);
  }

  if (!fs.existsSync(COMPENSATION_FILE_PATH)) {
    console.error(`File not found: ${COMPENSATION_FILE_PATH}`);
    process.exit(1);
  }

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.index(INDEX_NAME.trim());

  // Read the compensation file
  const content = fs.readFileSync(COMPENSATION_FILE_PATH);
  const fileName = path.basename(COMPENSATION_FILE_PATH);

  console.log(`\nFile: ${fileName}`);
  console.log(`Size: ${(content.length / 1024).toFixed(2)} KB\n`);

  // Create document mock
  const document: DocumentForProcessing = {
    id: `compensation-${Date.now()}`,
    organizationId: 'hof',
    categoryId: 'compensation',
    templateId: 'compensation-excel',
    fileName: fileName,
    originalFileName: fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileType: 'excel',
    clearanceLevel: 'advanced',
  };

  // Create options
  const options: ProcessorOptions = {
    organizationId: 'hof',
    templateId: 'compensation-excel',
    clearanceLevel: 'advanced',
    processingMode: 'employee_split',
  };

  console.log('1. Processing compensation file...');
  const startTime = Date.now();
  const result = await compensationExcelProcessor.process(content, document, options);
  console.log(`   Processing complete in ${Date.now() - startTime}ms`);
  console.log(`   Chunks generated: ${result.chunks.length}`);

  if (result.chunks.length === 0) {
    console.log('No chunks generated');
    return;
  }

  // Group chunks by namespace
  const chunksByNamespace = new Map<string, typeof result.chunks>();
  for (const chunk of result.chunks) {
    const ns = chunk.namespace;
    if (!chunksByNamespace.has(ns)) {
      chunksByNamespace.set(ns, []);
    }
    chunksByNamespace.get(ns)!.push(chunk);
  }

  console.log(`\n2. Found ${chunksByNamespace.size} namespaces:`);
  let count = 0;
  for (const [ns, chunks] of chunksByNamespace) {
    console.log(`   ${ns}: ${chunks.length} chunks`);
    count++;
    if (count > 20) {
      console.log(`   ... and ${chunksByNamespace.size - 20} more`);
      break;
    }
  }

  // Process each namespace
  let totalVectorsUploaded = 0;
  let processedCount = 0;

  for (const [namespace, chunks] of chunksByNamespace) {
    processedCount++;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${processedCount}/${chunksByNamespace.size}] Processing namespace: ${namespace}`);
    console.log('='.repeat(60));

    // Delete existing vectors in this namespace
    console.log('   Clearing existing vectors...');
    try {
      await index.namespace(namespace).deleteAll();
      console.log('   Namespace cleared');
    } catch (error) {
      console.log('   Already empty or error:', error);
    }

    await delay(1000);

    // Generate embeddings and prepare vectors
    console.log('   Generating embeddings...');
    const vectorsToUpsert: Array<{
      id: string;
      values: number[];
      metadata: Record<string, string | number | boolean | string[]>;
    }> = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await createEmbedding(chunk.embeddingText);

      // CRITICAL FIX: Include searchable_text in metadata
      const metadata = {
        ...(chunk.metadata as Record<string, string | number | boolean | string[]>),
        searchable_text: chunk.embeddingText, // THE FIX!
      };

      vectorsToUpsert.push({
        id: chunk.vectorId,
        values: embedding,
        metadata,
      });

      if ((i + 1) % 10 === 0) {
        process.stdout.write(`   Embedded ${i + 1}/${chunks.length}\r`);
      }

      if (i < chunks.length - 1) {
        await delay(EMBEDDING_DELAY_MS);
      }
    }
    console.log(`   Embedded ${chunks.length}/${chunks.length}      `);

    // Upload to Pinecone
    console.log('   Uploading to Pinecone...');
    for (let i = 0; i < vectorsToUpsert.length; i += BATCH_SIZE) {
      const batch = vectorsToUpsert.slice(i, i + BATCH_SIZE);
      await index.namespace(namespace).upsert(batch);
      console.log(
        `   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vectorsToUpsert.length / BATCH_SIZE)}`
      );
    }

    totalVectorsUploaded += vectorsToUpsert.length;
    console.log(`   Uploaded ${vectorsToUpsert.length} vectors to ${namespace}`);

    // Show sample metadata for verification
    if (vectorsToUpsert.length > 0) {
      const sample = vectorsToUpsert[0];
      console.log('\n   Sample metadata:');
      console.log(`   - employeeId: ${sample.metadata.employeeId}`);
      console.log(`   - employeeName: ${sample.metadata.employeeName}`);
      console.log(`   - finalPayment: ${sample.metadata.finalPayment}`);
      console.log(`   - searchable_text: ${(sample.metadata.searchable_text as string).substring(0, 200)}...`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('Summary');
  console.log('='.repeat(80));
  console.log(`Namespaces processed: ${chunksByNamespace.size}`);
  console.log(`Total vectors uploaded: ${totalVectorsUploaded}`);

  // Verify a specific employee (J00134 - 윤나래)
  console.log('\n3. Verifying J00134 (윤나래)...');
  await delay(2000);

  const j00134Stats = await index.describeIndexStats();
  const j00134Count = j00134Stats.namespaces?.['emp_J00134']?.recordCount || 0;
  console.log(`   Vectors in emp_J00134: ${j00134Count}`);

  if (j00134Count > 0) {
    // Query to verify searchable_text is present
    const testVector = Array.from({ length: 3072 }, () => Math.random() * 0.01);
    const testResult = await index.namespace('emp_J00134').query({
      vector: testVector,
      topK: 1,
      includeMetadata: true,
    });

    if (testResult.matches && testResult.matches.length > 0) {
      const metadata = testResult.matches[0].metadata as Record<string, unknown>;
      console.log(`   Sample vector metadata:`);
      console.log(`   - employeeId: ${metadata.employeeId}`);
      console.log(`   - employeeName: ${metadata.employeeName}`);
      console.log(`   - searchable_text present: ${!!metadata.searchable_text}`);
      if (metadata.searchable_text) {
        console.log(`   - searchable_text preview: ${(metadata.searchable_text as string).substring(0, 150)}...`);
      }
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
