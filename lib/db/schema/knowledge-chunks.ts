import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { documents } from './documents';

export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Source
  documentId: uuid('document_id').references(() => documents.id).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  totalChunks: integer('total_chunks').notNull(),

  // Content
  content: text('content').notNull(),
  contentHash: text('content_hash').notNull(),

  // Embedding - Note: Vector type requires pgvector extension
  // embedding: vector('embedding', { dimensions: 3072 }),
  embeddingModel: text('embedding_model').default('text-embedding-3-large'),

  // Pinecone Reference
  pineconeId: text('pinecone_id').notNull().unique(),
  pineconeNamespace: text('pinecone_namespace').notNull(),

  // Metadata (denormalized for quick access)
  employeeId: text('employee_id'),
  categorySlug: text('category_slug'),
  period: text('period'),

  // Extended Metadata
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_chunk_document').on(table.documentId),
  index('idx_chunk_pinecone').on(table.pineconeId),
  index('idx_chunk_namespace').on(table.pineconeNamespace),
  index('idx_chunk_employee').on(table.employeeId),
]);

export const chunksRelations = relations(knowledgeChunks, ({ one }) => ({
  document: one(documents, {
    fields: [knowledgeChunks.documentId],
    references: [documents.id],
  }),
}));

export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type NewKnowledgeChunk = typeof knowledgeChunks.$inferInsert;
