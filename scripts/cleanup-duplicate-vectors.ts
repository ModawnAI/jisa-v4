/**
 * Cleanup Duplicate Vectors
 *
 * Removes old MDRT vectors that were uploaded by the sequential script,
 * keeping only the new parallel upload vectors.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
const index = pinecone.index((process.env.PINECONE_INDEX_NAME || 'contractorhub').trim());

async function main() {
  console.log('='.repeat(60));
  console.log('Cleanup Duplicate MDRT Vectors');
  console.log('='.repeat(60));

  // Get all namespaces
  const stats = await index.describeIndexStats();
  const namespaces = Object.entries(stats.namespaces || {})
    .filter(([ns]) => ns.startsWith('emp_'));

  console.log(`\nFound ${namespaces.length} emp_ namespaces`);

  const dummyVector = Array.from({ length: 3072 }, () => Math.random() * 0.01);

  let cleaned = 0;
  let skipped = 0;
  let errors = 0;

  for (const [ns, data] of namespaces) {
    const recordCount = data.recordCount || 0;

    if (recordCount <= 1) {
      skipped++;
      continue;
    }

    // Query all vectors in this namespace
    const result = await index.namespace(ns).query({
      vector: dummyVector,
      topK: 10,
      includeMetadata: false,
    });

    // Find old vectors (those without 'parallel' in the ID)
    const oldVectors = (result.matches || [])
      .filter(m => m.id.startsWith('mdrt-') && !m.id.includes('parallel'))
      .map(m => m.id);

    if (oldVectors.length > 0) {
      try {
        await index.namespace(ns).deleteMany(oldVectors);
        cleaned++;
        if (cleaned % 50 === 0) {
          console.log(`  Cleaned ${cleaned} namespaces...`);
        }
      } catch (err) {
        errors++;
        console.error(`  Error cleaning ${ns}:`, err);
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Namespaces cleaned: ${cleaned}`);
  console.log(`Namespaces skipped (1 vector): ${skipped}`);
  console.log(`Errors: ${errors}`);

  // Verify final stats
  console.log('\nVerifying...');
  await new Promise(r => setTimeout(r, 2000));

  const finalStats = await index.describeIndexStats();
  console.log(`Total vectors: ${finalStats.totalRecordCount}`);

  const empNamespaces = Object.keys(finalStats.namespaces || {}).filter(n => n.startsWith('emp_'));
  console.log(`emp_ namespaces: ${empNamespaces.length}`);
}

main().catch(console.error);
