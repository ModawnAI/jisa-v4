import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  serial,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { processingStatusEnum } from './enums';
import { documents } from './documents';
import { documentTemplates } from './templates';
import { users } from './users';

export const processingBatches = pgTable('processing_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  batchNumber: serial('batch_number'),

  documentId: uuid('document_id').references(() => documents.id).notNull(),
  templateId: uuid('template_id').references(() => documentTemplates.id),
  templateVersion: integer('template_version'),

  period: text('period'),

  status: processingStatusEnum('status').notNull().default('pending'),
  // 'pending' | 'processing' | 'completed' | 'failed' | 'rolled_back'

  // Results
  totalRecords: integer('total_records'),
  successCount: integer('success_count'),
  errorCount: integer('error_count'),
  vectorIds: jsonb('vector_ids'), // string[]

  // Rollback
  isRolledBack: boolean('is_rolled_back').notNull().default(false),
  rolledBackAt: timestamp('rolled_back_at'),
  rolledBackBy: uuid('rolled_back_by').references(() => users.id),
  rollbackReason: text('rollback_reason'),

  // Inngest
  inngestRunId: text('inngest_run_id'),

  // Timing
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_batch_document').on(table.documentId),
  index('idx_batch_period').on(table.period),
  index('idx_batch_status').on(table.status),
]);

export const dataLineage = pgTable('data_lineage', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Source
  sourceDocumentId: uuid('source_document_id').references(() => documents.id).notNull(),
  sourceFileUrl: text('source_file_url').notNull(),
  sourceFileHash: text('source_file_hash').notNull(),

  // Processing
  processingBatchId: uuid('processing_batch_id').references(() => processingBatches.id).notNull(),
  templateId: uuid('template_id').references(() => documentTemplates.id),
  templateVersion: integer('template_version'),

  // Target
  targetPineconeId: text('target_pinecone_id').notNull(),
  targetNamespace: text('target_namespace').notNull(),
  targetEmployeeId: text('target_employee_id'),

  // Transform
  transformationLog: jsonb('transformation_log'),
  chunkIndex: integer('chunk_index'),
  originalRowRange: text('original_row_range'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_lineage_source').on(table.sourceDocumentId),
  index('idx_lineage_target').on(table.targetPineconeId),
  index('idx_lineage_employee').on(table.targetEmployeeId),
]);

export const batchesRelations = relations(processingBatches, ({ one, many }) => ({
  document: one(documents, {
    fields: [processingBatches.documentId],
    references: [documents.id],
  }),
  template: one(documentTemplates, {
    fields: [processingBatches.templateId],
    references: [documentTemplates.id],
  }),
  rollbackUser: one(users, {
    fields: [processingBatches.rolledBackBy],
    references: [users.id],
  }),
  lineage: many(dataLineage),
}));

export const lineageRelations = relations(dataLineage, ({ one }) => ({
  sourceDocument: one(documents, {
    fields: [dataLineage.sourceDocumentId],
    references: [documents.id],
  }),
  processingBatch: one(processingBatches, {
    fields: [dataLineage.processingBatchId],
    references: [processingBatches.id],
  }),
  template: one(documentTemplates, {
    fields: [dataLineage.templateId],
    references: [documentTemplates.id],
  }),
}));

// Conflict status enum
export const conflictStatusEnum = pgEnum('conflict_status', [
  'detected',
  'reviewing',
  'resolved_keep_existing',
  'resolved_keep_new',
  'resolved_merged',
  'dismissed',
]);

// Conflict type enum
export const conflictTypeEnum = pgEnum('conflict_type', [
  'duplicate_content',
  'version_mismatch',
  'category_mismatch',
  'metadata_conflict',
  'employee_mismatch',
]);

export const documentConflicts = pgTable('document_conflicts', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Documents involved
  newDocumentId: uuid('new_document_id').references(() => documents.id).notNull(),
  existingDocumentId: uuid('existing_document_id').references(() => documents.id),

  // Conflict info
  conflictType: conflictTypeEnum('conflict_type').notNull(),
  status: conflictStatusEnum('status').notNull().default('detected'),

  // Details
  conflictDetails: jsonb('conflict_details'), // ConflictDetails object
  // {
  //   similarityScore?: number;
  //   conflictingFields?: { field: string; existingValue: any; newValue: any }[];
  //   affectedVectorIds?: string[];
  //   suggestedResolution?: 'keep_existing' | 'keep_new' | 'merge';
  // }

  // Resolution
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  resolutionNotes: text('resolution_notes'),

  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_conflict_new_doc').on(table.newDocumentId),
  index('idx_conflict_existing_doc').on(table.existingDocumentId),
  index('idx_conflict_status').on(table.status),
]);

export const conflictsRelations = relations(documentConflicts, ({ one }) => ({
  newDocument: one(documents, {
    fields: [documentConflicts.newDocumentId],
    references: [documents.id],
    relationName: 'newDocument',
  }),
  existingDocument: one(documents, {
    fields: [documentConflicts.existingDocumentId],
    references: [documents.id],
    relationName: 'existingDocument',
  }),
  resolver: one(users, {
    fields: [documentConflicts.resolvedBy],
    references: [users.id],
  }),
}));

export type ProcessingBatch = typeof processingBatches.$inferSelect;
export type NewProcessingBatch = typeof processingBatches.$inferInsert;
export type DataLineage = typeof dataLineage.$inferSelect;
export type NewDataLineage = typeof dataLineage.$inferInsert;
export type DocumentConflict = typeof documentConflicts.$inferSelect;
export type NewDocumentConflict = typeof documentConflicts.$inferInsert;
