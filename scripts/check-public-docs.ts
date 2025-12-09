import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
const index = pinecone.index((process.env.PINECONE_INDEX_NAME || 'contractorhub').trim());

async function main() {
  const dummyVector = Array.from({ length: 3072 }, () => Math.random() * 0.01);

  // Check org_hof namespace (public documents)
  const stats = await index.describeIndexStats();
  console.log('All namespaces:');
  for (const [ns, data] of Object.entries(stats.namespaces || {})) {
    if (!ns.startsWith('emp_')) {
      console.log(`  ${ns}: ${data.recordCount} vectors`);
    }
  }

  // Query public namespace
  console.log('\n--- public documents ---');
  const result = await index.namespace('public').query({
    vector: dummyVector,
    topK: 20,
    includeMetadata: true,
  });

  for (const match of result.matches || []) {
    const meta = match.metadata as Record<string, unknown>;
    console.log(`\nID: ${match.id}`);
    console.log(`  fileName: ${meta.fileName}`);
    console.log(`  templateId: ${meta.templateId}`);
    console.log(`  searchable_text preview: ${(meta.searchable_text as string)?.substring(0, 200)}...`);
  }
}

main().catch(console.error);
