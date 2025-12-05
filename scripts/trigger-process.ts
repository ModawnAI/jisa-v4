import { inngest } from '../lib/inngest/client';
import 'dotenv/config';

const documentId = process.argv[2];

if (!documentId) {
  console.error('Usage: npx tsx scripts/trigger-process.ts <document-id>');
  process.exit(1);
}

async function main() {
  console.log('Triggering document/process for:', documentId);

  const result = await inngest.send({
    name: 'document/process',
    data: { documentId },
  });

  console.log('Event sent:', result);
}

main().catch(console.error);
