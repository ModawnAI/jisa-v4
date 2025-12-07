import * as dotenv from 'dotenv';
import * as path from 'path';
import postgres from 'postgres';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function check() {
  const sql = postgres(process.env.DATABASE_URL as string);

  const docs = await sql`
    SELECT id, file_name, status, file_type, created_at, metadata
    FROM documents
    WHERE is_deleted = false
    ORDER BY created_at DESC
    LIMIT 10
  `;

  console.log('Recent documents:');
  for (const doc of docs) {
    const meta = doc.metadata as Record<string, unknown> | null;
    const processor = meta?.processorType || doc.file_type;
    console.log(`- [${doc.status}] ${doc.file_name} (${processor})`);
  }

  // Check processing batches
  const batches = await sql`
    SELECT pb.id, pb.status, pb.record_count, pb.success_count, pb.error_count,
           d.file_name
    FROM processing_batches pb
    JOIN documents d ON d.id = pb.document_id
    ORDER BY pb.created_at DESC
    LIMIT 10
  `;

  console.log('\nRecent processing batches:');
  for (const batch of batches) {
    console.log(`- [${batch.status}] ${batch.file_name}: ${batch.success_count || 0}/${batch.record_count || 0} records`);
  }

  await sql.end();
}

check().catch(console.error);
