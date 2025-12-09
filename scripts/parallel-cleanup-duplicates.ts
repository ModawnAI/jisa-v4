/**
 * Parallel Cleanup Duplicate Vectors
 *
 * Removes old MDRT vectors using parallel workers for speed.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

const PARALLEL_WORKERS = 20;

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
const index = pinecone.index((process.env.PINECONE_INDEX_NAME || 'contractorhub').trim());

interface CleanupJob {
  namespace: string;
  recordCount: number;
}

async function cleanupNamespace(
  job: CleanupJob,
  dummyVector: number[],
  jobIndex: number,
  total: number
): Promise<{ cleaned: boolean; deleted: number }> {
  const { namespace, recordCount } = job;

  if (recordCount <= 1) {
    return { cleaned: false, deleted: 0 };
  }

  try {
    const result = await index.namespace(namespace).query({
      vector: dummyVector,
      topK: 10,
      includeMetadata: false,
    });

    const oldVectors = (result.matches || [])
      .filter(m => m.id.startsWith('mdrt-') && !m.id.includes('parallel'))
      .map(m => m.id);

    if (oldVectors.length > 0) {
      await index.namespace(namespace).deleteMany(oldVectors);
      console.log(`[${jobIndex + 1}/${total}] ✓ ${namespace}: deleted ${oldVectors.length}`);
      return { cleaned: true, deleted: oldVectors.length };
    }

    return { cleaned: false, deleted: 0 };
  } catch (err) {
    console.error(`[${jobIndex + 1}/${total}] ✗ ${namespace}: ${err}`);
    return { cleaned: false, deleted: 0 };
  }
}

async function runParallelCleanup(
  jobs: CleanupJob[],
  dummyVector: number[],
  concurrency: number
): Promise<{ cleaned: number; deleted: number }> {
  let currentIndex = 0;
  let cleaned = 0;
  let deleted = 0;
  const total = jobs.length;

  async function worker(): Promise<void> {
    while (currentIndex < jobs.length) {
      const jobIndex = currentIndex++;
      const job = jobs[jobIndex];
      const result = await cleanupNamespace(job, dummyVector, jobIndex, total);
      if (result.cleaned) {
        cleaned++;
        deleted += result.deleted;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return { cleaned, deleted };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Parallel Cleanup Duplicate MDRT Vectors');
  console.log(`Workers: ${PARALLEL_WORKERS}`);
  console.log('='.repeat(60));

  const stats = await index.describeIndexStats();
  const jobs: CleanupJob[] = Object.entries(stats.namespaces || {})
    .filter(([ns]) => ns.startsWith('emp_'))
    .filter(([_, data]) => (data.recordCount || 0) > 1)
    .map(([namespace, data]) => ({ namespace, recordCount: data.recordCount || 0 }));

  console.log(`\nFound ${jobs.length} namespaces with >1 vector`);
  console.log('Starting cleanup...\n');

  const dummyVector = Array.from({ length: 3072 }, () => Math.random() * 0.01);
  const startTime = Date.now();

  const result = await runParallelCleanup(jobs, dummyVector, PARALLEL_WORKERS);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Namespaces cleaned: ${result.cleaned}`);
  console.log(`Vectors deleted: ${result.deleted}`);
  console.log(`Time: ${elapsed}s`);

  console.log('\nVerifying...');
  await new Promise(r => setTimeout(r, 2000));

  const finalStats = await index.describeIndexStats();
  console.log(`Total vectors: ${finalStats.totalRecordCount}`);

  const empNamespaces = Object.keys(finalStats.namespaces || {}).filter(n => n.startsWith('emp_'));
  console.log(`emp_ namespaces: ${empNamespaces.length}`);

  // Check for remaining duplicates
  const remaining = Object.entries(finalStats.namespaces || {})
    .filter(([ns]) => ns.startsWith('emp_'))
    .filter(([_, data]) => (data.recordCount || 0) > 1);

  console.log(`Namespaces with >1 vector: ${remaining.length}`);
}

main().catch(console.error);
