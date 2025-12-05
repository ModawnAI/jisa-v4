import { Pinecone } from '@pinecone-database/pinecone';
import 'dotenv/config';

async function main() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX;
  console.log('Using index:', indexName);

  if (!indexName) {
    console.error('No PINECONE_INDEX_NAME or PINECONE_INDEX set');
    process.exit(1);
  }

  const index = pinecone.index(indexName);
  const stats = await index.describeIndexStats();

  console.log('\n=== Pinecone Index Stats ===');
  console.log('Total vectors:', stats.totalRecordCount);
  console.log('Namespaces:', Object.keys(stats.namespaces || {}).length);

  if (stats.namespaces) {
    for (const [ns, data] of Object.entries(stats.namespaces)) {
      console.log(`  - ${ns}: ${data.recordCount} vectors`);
    }
  }
}

main().catch(console.error);
