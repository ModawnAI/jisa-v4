/**
 * Test script to upload a document and trace the processing flow
 * Run with: npx tsx scripts/test-upload.ts
 */

import { db } from '../lib/db';
import { documents } from '../lib/db/schema';
import { storageService } from '../lib/services/storage.service';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const FILE_PATH = process.argv[2] || '/Users/kjyoo/jisa_v4/4098bcba-9e84-4b6d-b1ca-a0a697d5aa38__501ba4a7-1f76-440b-9f5e-3e2dcb781994.pdf';

async function main() {
  console.log('🚀 Starting document upload test...\n');

  // 1. Get a user ID for uploadedBy
  const user = await db.query.users.findFirst();
  if (!user) {
    console.error('❌ No users found in database. Please create a user first.');
    process.exit(1);
  }
  console.log(`✅ Using user: ${user.email} (${user.id})`);

  // 2. Read the file
  const filePath = path.resolve(FILE_PATH);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const fileSize = fileBuffer.length;
  const fileHash = createHash('sha256').update(fileBuffer).digest('hex');

  console.log(`📄 File: ${fileName}`);
  console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Hash: ${fileHash.substring(0, 16)}...`);

  // 3. Upload to Supabase Storage
  console.log('\n📤 Uploading to Supabase Storage...');

  // Create a File-like object for the storage service
  const file = new File([fileBuffer], fileName, { type: 'application/pdf' });

  const uploadResult = await storageService.upload(file, 'uploads', { folder: 'documents' });
  console.log(`✅ Uploaded to: ${uploadResult.path}`);
  console.log(`   URL: ${uploadResult.url}`);

  // 4. Create document record
  console.log('\n📝 Creating document record in database...');

  const [document] = await db
    .insert(documents)
    .values({
      fileName: uploadResult.path.split('/').pop()!,
      fileUrl: uploadResult.url,
      filePath: uploadResult.path,
      fileType: 'pdf',
      fileSize,
      fileHash: uploadResult.hash,
      status: 'pending',
      uploadedBy: user.id,
    })
    .returning();

  console.log(`✅ Document created with ID: ${document.id}`);
  console.log(`   Status: ${document.status}`);
  console.log(`   Created at: ${document.createdAt}`);

  // 5. Show next steps
  console.log('\n' + '='.repeat(60));
  console.log('📋 NEXT STEPS:');
  console.log('='.repeat(60));
  console.log(`
1. The document is now in 'pending' status.

2. To trigger processing, you need to send an Inngest event:
   Event: 'document/process'
   Data: { documentId: '${document.id}' }

3. You can trigger this by:
   a) Using the Inngest Dev Server (http://localhost:8288)
   b) Or by calling the API endpoint that triggers processing

4. Monitor the processing:
   - Check document status: SELECT * FROM documents WHERE id = '${document.id}'
   - Check processing batches: SELECT * FROM processing_batches WHERE document_id = '${document.id}'
   - Check Inngest dashboard for job status

5. View the document in admin UI:
   http://localhost:3000/documents/${document.id}
`);

  // 6. Show how to manually trigger processing
  console.log('🔧 To manually trigger processing, run:');
  console.log(`   npx tsx scripts/trigger-processing.ts ${document.id}`);

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
