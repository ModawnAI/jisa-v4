import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
const index = pinecone.index((process.env.PINECONE_INDEX_NAME || 'contractorhub').trim());

async function main() {
  const dummyVector = Array.from({ length: 3072 }, () => Math.random() * 0.01);

  // Get namespaces with >1 vector
  const stats = await index.describeIndexStats();
  const multiVector = Object.entries(stats.namespaces || {})
    .filter(([ns]) => ns.startsWith('emp_'))
    .filter(([_, d]) => (d.recordCount || 0) > 1)
    .slice(0, 5);

  console.log(`Checking ${multiVector.length} namespaces with >1 vector:\n`);

  for (const [testNs, data] of multiVector) {
    console.log(`=== ${testNs} (${data.recordCount} vectors) ===`);

    const result = await index.namespace(testNs).query({
      vector: dummyVector,
      topK: 10,
      includeMetadata: true,
    });

    for (const match of result.matches || []) {
      const meta = match.metadata as Record<string, unknown>;
      console.log(`  ID: ${match.id}`);
      console.log(`    templateId: ${meta.templateId}`);
      console.log(`    source: ${(meta.source as string)?.substring(0, 50)}...`);
    }
    console.log('');
  }
}

main().catch(console.error);
