/**
 * Verify that J00134 now has searchable_text in metadata
 */

import * as path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';

config({ path: path.join(process.cwd(), '.env.local') });

const INDEX_NAME =
  process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX || 'jisa-v4';

async function verify() {
  console.log('Verifying J00134 searchable_text...\n');

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(INDEX_NAME);

  // Get namespace stats
  const stats = await index.describeIndexStats();
  const j00134Count = stats.namespaces?.['emp_J00134']?.recordCount || 0;
  console.log(`Vectors in emp_J00134: ${j00134Count}`);

  if (j00134Count === 0) {
    console.log('No vectors found');
    return;
  }

  // Query with random vector to get sample
  const testVector = Array.from({ length: 3072 }, () => Math.random() * 0.01);
  const result = await index.namespace('emp_J00134').query({
    vector: testVector,
    topK: 1,
    includeMetadata: true,
  });

  if (result.matches && result.matches.length > 0) {
    const metadata = result.matches[0].metadata as Record<string, unknown>;

    console.log('\n=== Vector Metadata ===');
    console.log(`Vector ID: ${result.matches[0].id}`);
    console.log(`employeeId: ${metadata.employeeId}`);
    console.log(`employeeName: ${metadata.employeeName}`);
    console.log(`totalCommission: ${metadata.totalCommission}`);
    console.log(`searchable_text present: ${!!metadata.searchable_text}`);

    if (metadata.searchable_text) {
      const text = metadata.searchable_text as string;
      console.log(`\n=== searchable_text (first 500 chars) ===`);
      console.log(text.substring(0, 500));
      console.log('\n✅ SUCCESS: searchable_text is now in metadata!');
    } else {
      console.log('\n❌ FAIL: searchable_text is still missing!');
    }
  }
}

verify().catch(console.error);
