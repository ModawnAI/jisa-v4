import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { documentStatusEnum } from './enums';
import { documentCategories, documentTypes } from './categories';
import { documentTemplates } from './templates';
import { employees } from './employees';
import { users } from './users';

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),

  // File Info
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  filePath: text('file_path').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  fileHash: text('file_hash'),

  // Classification
  categoryId: uuid('category_id').references(() => documentCategories.id),
  documentTypeId: uuid('document_type_id').references(() => documentTypes.id),
  templateId: uuid('template_id').references(() => documentTemplates.id),

  // Period (for recurring docs)
  period: text('period'), // "2025-02"

  // Processing Status
  status: documentStatusEnum('status').notNull().default('pending'),
  // 'pending' | 'processing' | 'completed' | 'failed' | 'partial'

  processedAt: timestamp('processed_at'),
  errorMessage: text('error_message'),

  // Metadata
  metadata: jsonb('metadata'),
  // {
  //   totalRows?: number;
  //   successCount?: number;
  //   errorCount?: number;
  //   ...
  // }

  // Ownership
  employeeId: uuid('employee_id').references(() => employees.id),
  uploadedBy: uuid('uploaded_by').references(() => users.id).notNull(),

  // Soft Delete
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references(() => users.id),

  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_document_category').on(table.categoryId),
  index('idx_document_template').on(table.templateId),
  index('idx_document_period').on(table.period),
  index('idx_document_status').on(table.status),
  index('idx_document_employee').on(table.employeeId),
]);

export const documentsRelations = relations(documents, ({ one }) => ({
  category: one(documentCategories, {
    fields: [documents.categoryId],
    references: [documentCategories.id],
  }),
  documentType: one(documentTypes, {
    fields: [documents.documentTypeId],
    references: [documentTypes.id],
  }),
  template: one(documentTemplates, {
    fields: [documents.templateId],
    references: [documentTemplates.id],
  }),
  employee: one(employees, {
    fields: [documents.employeeId],
    references: [employees.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  deleter: one(users, {
    fields: [documents.deletedBy],
    references: [users.id],
  }),
}));

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
