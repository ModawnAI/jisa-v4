/**
 * Trigger document processing via Inngest
 * Run with: npx tsx scripts/trigger-processing.ts <document-id>
 */

import { inngest } from '../lib/inngest/client';

const documentId = process.argv[2];

if (!documentId) {
  console.error('❌ Usage: npx tsx scripts/trigger-processing.ts <document-id>');
  process.exit(1);
}

async function main() {
  console.log(`🚀 Triggering processing for document: ${documentId}\n`);

  try {
    const result = await inngest.send({
      name: 'document/process',
      data: { documentId },
    });

    console.log('✅ Event sent successfully!');
    console.log('   Event IDs:', result.ids);
    console.log('\n📊 Monitor progress at: http://localhost:8288');
    console.log('   Look for function: processDocument');
  } catch (error) {
    console.error('❌ Failed to send event:', error);
    process.exit(1);
  }
}

main();
