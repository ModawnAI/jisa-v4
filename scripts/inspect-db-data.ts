/**
 * Inspect database records for J00307
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkDB() {
  const { db } = await import('@/lib/db');
  const { employees } = await import('@/lib/db/schema/employees');
  const { knowledgeChunks } = await import('@/lib/db/schema');
  const { documents } = await import('@/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  // Get employee
  const emp = await db.select().from(employees).where(eq(employees.employeeId, 'J00307')).limit(1);

  if (emp.length === 0) {
    console.log('Employee J00307 not found');
    process.exit(1);
  }

  console.log('=== EMPLOYEE IN DATABASE ===');
  console.log('ID:', emp[0].id);
  console.log('Employee ID:', emp[0].employeeId);
  console.log('Name:', emp[0].name);
  console.log('Department:', emp[0].department);
  console.log('Position:', emp[0].position);

  // Get knowledge chunks for this employee
  const chunks = await db
    .select()
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.employeeId, emp[0].id));

  console.log('\n=== KNOWLEDGE CHUNKS FOR J00307 ===');
  console.log('Total chunks:', chunks.length);

  for (const chunk of chunks.slice(0, 10)) {
    console.log('\n' + '─'.repeat(60));
    console.log('Chunk ID:', chunk.id);
    console.log('Document ID:', chunk.documentId);
    console.log('Chunk Index:', chunk.chunkIndex);
    console.log('Pinecone ID:', chunk.pineconeId);
    console.log('Content preview:', chunk.content?.substring(0, 400));
    if (chunk.metadata) {
      console.log('Metadata:', JSON.stringify(chunk.metadata, null, 2));
    }
  }

  // Get documents for this employee
  const docs = await db.select().from(documents).where(eq(documents.employeeId, emp[0].id));

  console.log('\n=== DOCUMENTS FOR J00307 ===');
  console.log('Total documents:', docs.length);
  for (const doc of docs) {
    console.log('\n' + '─'.repeat(60));
    console.log('ID:', doc.id);
    console.log('Filename:', doc.fileName);
    console.log('Status:', doc.status);
    console.log('Category ID:', doc.categoryId);
    console.log('Created at:', doc.createdAt);
  }

  process.exit(0);
}

checkDB().catch(console.error);
