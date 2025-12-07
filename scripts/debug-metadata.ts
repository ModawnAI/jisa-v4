import '@dotenvx/dotenvx/config';
import { PineconeService } from '@/lib/services/pinecone.service';

async function debug() {
  const pinecone = new PineconeService();

  // Query sample from emp_J00307 namespace
  const results = await pinecone.querySample('emp_J00307', 1);

  console.log('\n=== Vector Metadata ===');
  if (results && results.length > 0) {
    const metadata = (results[0].metadata || {}) as Record<string, unknown>;
    console.log('Full metadata keys:', Object.keys(metadata));

    // Check monthly fields
    console.log('\n--- Monthly Fields ---');
    const monthlyFields = ['monthlyCommissions', 'monthlyIncomes', 'monthlyFyc', 'monthlyAgi'];
    for (const field of monthlyFields) {
      if (metadata[field]) {
        console.log(`${field}:`, JSON.stringify(metadata[field]).substring(0, 200));
        // Check specific month
        const data = metadata[field] as Record<string, number>;
        console.log(`  - 2025-11 value:`, data['2025-11']);
        console.log(`  - 202511 value:`, data['202511']);
      } else {
        console.log(`${field}: NOT FOUND`);
      }
    }

    // Check cumulative fields
    console.log('\n--- Cumulative Fields ---');
    console.log('newContractIncome:', metadata.newContractIncome);
    console.log('totalCommission:', metadata.totalCommission);
    console.log('totalIncome:', metadata.totalIncome);
  } else {
    console.log('No results found');
  }
}

debug().catch(console.error);
