/**
 * Parallel MDRT Data Upload with Searchable Text
 *
 * Uploads 811 namespaces in parallel for much faster processing.
 * Uses worker pools to maximize throughput while respecting rate limits.
 *
 * Run: npx tsx scripts/parallel-mdrt-upload.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';

config({ path: path.join(process.cwd(), '.env.local') });

import { mdrtComprehensiveProcessor } from '../lib/services/document-processors';
import { createEmbedding } from '../lib/utils/embedding';
import type { ProcessorOptions, DocumentForProcessing, ProcessedChunk } from '../lib/services/document-processors/types';

const MDRT_FILE_PATH = path.join(
  process.cwd(),
  'data',
  '전달용▶HO&F_MDRT_커미션,총수입 산출금액_2025년_4분기_251114_공유용 (1).xlsx'
);

const INDEX_NAME = process.env.PINECONE_INDEX_NAME?.trim() || 'contractorhub';
const PARALLEL_WORKERS = 10; // Number of parallel namespace uploads
const EMBEDDING_BATCH_SIZE = 5; // Embeddings to generate in parallel per namespace

interface NamespaceJob {
  namespace: string;
  chunks: ProcessedChunk[];
}

async function processNamespace(
  job: NamespaceJob,
  index: ReturnType<Pinecone['index']>,
  jobIndex: number,
  totalJobs: number
): Promise<{ namespace: string; vectorCount: number; success: boolean }> {
  const { namespace, chunks } = job;

  try {
    // Generate embeddings in small parallel batches
    const vectors: Array<{
      id: string;
      values: number[];
      metadata: Record<string, string | number | boolean | string[]>;
    }> = [];

    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const embeddings = await Promise.all(
        batch.map(chunk => createEmbedding(chunk.embeddingText))
      );

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        vectors.push({
          id: chunk.vectorId,
          values: embeddings[j],
          metadata: {
            ...(chunk.metadata as Record<string, string | number | boolean | string[]>),
            searchable_text: chunk.embeddingText, // THE FIX!
          },
        });
      }
    }

    // Upsert to Pinecone (no need to delete first - upsert overwrites)
    await index.namespace(namespace).upsert(vectors);

    console.log(`[${jobIndex + 1}/${totalJobs}] ✓ ${namespace}: ${vectors.length} vectors`);

    return { namespace, vectorCount: vectors.length, success: true };
  } catch (error) {
    console.error(`[${jobIndex + 1}/${totalJobs}] ✗ ${namespace}: ${error}`);
    return { namespace, vectorCount: 0, success: false };
  }
}

async function runParallelPool(
  jobs: NamespaceJob[],
  index: ReturnType<Pinecone['index']>,
  concurrency: number
): Promise<{ success: number; failed: number; totalVectors: number }> {
  let currentIndex = 0;
  let success = 0;
  let failed = 0;
  let totalVectors = 0;
  const totalJobs = jobs.length;

  async function worker(): Promise<void> {
    while (currentIndex < jobs.length) {
      const jobIndex = currentIndex++;
      const job = jobs[jobIndex];

      const result = await processNamespace(job, index, jobIndex, totalJobs);

      if (result.success) {
        success++;
        totalVectors += result.vectorCount;
      } else {
        failed++;
      }
    }
  }

  // Start workers
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return { success, failed, totalVectors };
}

async function main() {
  console.log('='.repeat(80));
  console.log('Parallel MDRT Data Upload with Searchable Text');
  console.log(`Workers: ${PARALLEL_WORKERS} | Embedding batch: ${EMBEDDING_BATCH_SIZE}`);
  console.log('='.repeat(80));

  if (!process.env.PINECONE_API_KEY) {
    console.error('PINECONE_API_KEY not set');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set');
    process.exit(1);
  }

  if (!fs.existsSync(MDRT_FILE_PATH)) {
    console.error(`File not found: ${MDRT_FILE_PATH}`);
    process.exit(1);
  }

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.index(INDEX_NAME);

  // Read and process the MDRT file
  const content = fs.readFileSync(MDRT_FILE_PATH);
  const fileName = path.basename(MDRT_FILE_PATH);

  console.log(`\nFile: ${fileName}`);
  console.log(`Index: ${INDEX_NAME}\n`);

  const document: DocumentForProcessing = {
    id: `mdrt-parallel-${Date.now()}`,
    organizationId: 'hof',
    categoryId: 'performance',
    templateId: 'mdrt-comprehensive',
    fileName,
    originalFileName: fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileType: 'excel',
    clearanceLevel: 'advanced',
  };

  const options: ProcessorOptions = {
    organizationId: 'hof',
    templateId: 'mdrt-comprehensive',
    clearanceLevel: 'advanced',
    processingMode: 'employee_split',
  };

  console.log('1. Processing MDRT file...');
  const startProcess = Date.now();
  const result = await mdrtComprehensiveProcessor.process(content, document, options);
  console.log(`   Done in ${Date.now() - startProcess}ms - ${result.chunks.length} chunks`);

  // Group chunks by namespace
  const chunksByNamespace = new Map<string, ProcessedChunk[]>();
  for (const chunk of result.chunks) {
    if (!chunksByNamespace.has(chunk.namespace)) {
      chunksByNamespace.set(chunk.namespace, []);
    }
    chunksByNamespace.get(chunk.namespace)!.push(chunk);
  }

  console.log(`\n2. Found ${chunksByNamespace.size} namespaces`);

  // Prepare jobs
  const jobs: NamespaceJob[] = Array.from(chunksByNamespace.entries()).map(
    ([namespace, chunks]) => ({ namespace, chunks })
  );

  // Run parallel upload
  console.log(`\n3. Starting parallel upload with ${PARALLEL_WORKERS} workers...\n`);
  const startUpload = Date.now();

  const results = await runParallelPool(jobs, index, PARALLEL_WORKERS);

  const uploadTime = (Date.now() - startUpload) / 1000;

  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Namespaces: ${results.success} success, ${results.failed} failed`);
  console.log(`Total vectors: ${results.totalVectors}`);
  console.log(`Upload time: ${uploadTime.toFixed(1)}s`);
  console.log(`Speed: ${(results.success / uploadTime).toFixed(1)} namespaces/sec`);
  console.log('='.repeat(80));

  // Verify
  console.log('\n4. Verifying index stats...');
  await new Promise(r => setTimeout(r, 2000));

  const stats = await index.describeIndexStats();
  const empNamespaces = Object.keys(stats.namespaces || {}).filter(n => n.startsWith('emp_'));
  console.log(`   Total emp_ namespaces: ${empNamespaces.length}`);
  console.log(`   Total vectors: ${stats.totalRecordCount}`);

  console.log('\nDone!');
}

main().catch(console.error);
