/**
 * Inspect Pinecone data for emp_J00307
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function inspect() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.error('Missing PINECONE_API_KEY');
    process.exit(1);
  }

  const pc = new Pinecone({ apiKey });
  const indexName = process.env.PINECONE_INDEX || 'contractorhub';
  const index = pc.index(indexName);

  // Get stats
  const stats = await index.describeIndexStats();
  console.log('=== PINECONE INDEX STATS ===');
  console.log('Index:', indexName);
  console.log('Namespaces:', JSON.stringify(stats.namespaces, null, 2));

  // Query emp_J00307 namespace
  const ns = index.namespace('emp_J00307');

  // Use a dummy vector to fetch records
  const dummyVector = new Array(3072).fill(0.1);
  const results = await ns.query({
    vector: dummyVector,
    topK: 20,
    includeMetadata: true,
    includeValues: false,
  });

  console.log('\n=== VECTORS IN emp_J00307 ===');
  console.log('Total found:', results.matches?.length || 0);

  for (const match of results.matches || []) {
    console.log('\n' + '─'.repeat(60));
    console.log('Vector ID:', match.id);
    console.log('Score:', match.score);
    console.log('Metadata:');
    const metadata = match.metadata as Record<string, unknown>;
    for (const [key, value] of Object.entries(metadata)) {
      if (key === 'content' || key === 'text') {
        const textValue = String(value);
        console.log(`  ${key}: ${textValue.substring(0, 500)}${textValue.length > 500 ? '...' : ''}`);
      } else {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      }
    }
  }
}

inspect().catch(console.error);
