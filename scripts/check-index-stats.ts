/**
 * Check Pinecone index statistics
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const indexName = (
    process.env.PINECONE_INDEX_NAME ||
    process.env.PINECONE_INDEX ||
    'jisa-v4'
  ).trim();

  const index = pinecone.index(indexName);
  const stats = await index.describeIndexStats();

  console.log('Index:', indexName);
  console.log('Total vectors:', stats.totalRecordCount);
  console.log('Namespaces count:', Object.keys(stats.namespaces || {}).length);

  // Count by namespace type
  const namespaces = Object.keys(stats.namespaces || {});
  const empNamespaces = namespaces.filter((ns) => ns.startsWith('emp_'));
  const orgNamespaces = namespaces.filter((ns) => ns.startsWith('org_'));
  const otherNamespaces = namespaces.filter(
    (ns) => !ns.startsWith('emp_') && !ns.startsWith('org_')
  );

  console.log('\nNamespace breakdown:');
  console.log('  emp_ namespaces:', empNamespaces.length);
  console.log('  org_ namespaces:', orgNamespaces.length);
  console.log('  other namespaces:', otherNamespaces.length);
  if (otherNamespaces.length > 0) {
    console.log('  other names:', otherNamespaces.slice(0, 5));
  }

  // Count vectors by type
  let empVectors = 0;
  let orgVectors = 0;
  let otherVectors = 0;

  for (const [ns, info] of Object.entries(stats.namespaces || {})) {
    if (ns.startsWith('emp_')) empVectors += info.recordCount || 0;
    else if (ns.startsWith('org_')) orgVectors += info.recordCount || 0;
    else otherVectors += info.recordCount || 0;
  }

  console.log('\nVector breakdown:');
  console.log('  emp_ vectors:', empVectors);
  console.log('  org_ vectors:', orgVectors);
  console.log('  other vectors:', otherVectors);

  // Check for namespaces with more than 1 vector
  const multiVectorNs = Object.entries(stats.namespaces || {}).filter(
    ([, info]) => (info.recordCount || 0) > 1
  );
  console.log('\nNamespaces with >1 vector:', multiVectorNs.length);
  if (multiVectorNs.length > 0) {
    console.log('Examples:');
    for (const [ns, info] of multiVectorNs.slice(0, 10)) {
      console.log('  ', ns, ':', info.recordCount);
    }
  }
}

main().catch(console.error);
