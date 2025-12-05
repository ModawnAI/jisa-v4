import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { desc, sql } from 'drizzle-orm';
import 'dotenv/config';

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  // Check recent documents
  const docs = await db.execute(sql`
    SELECT id, file_name, status, error_message, created_at
    FROM documents
    ORDER BY created_at DESC
    LIMIT 5
  `);

  console.log('=== Recent Documents ===');
  console.log(JSON.stringify(docs, null, 2));

  // Check processing batches for the latest doc
  if (docs.length > 0) {
    const latestDocId = (docs[0] as { id: string }).id;

    const batches = await db.execute(sql`
      SELECT id, status, record_count, success_count, error_count, started_at, completed_at
      FROM processing_batches
      WHERE document_id = ${latestDocId}
    `);
    console.log('\n=== Processing Batches for latest doc ===');
    console.log(JSON.stringify(batches, null, 2));

    const chunks = await db.execute(sql`
      SELECT id, pinecone_id, pinecone_namespace
      FROM knowledge_chunks
      WHERE document_id = ${latestDocId}
      LIMIT 3
    `);
    console.log('\n=== Knowledge Chunks ===');
    console.log(JSON.stringify(chunks, null, 2));
  }

  await client.end();
}

main().catch(console.error);
