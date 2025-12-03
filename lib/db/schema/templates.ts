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
import { fileTypeEnum, processingModeEnum, chunkingStrategyEnum } from './enums';
import { documentCategories, documentTypes } from './categories';
import { users } from './users';

export const documentTemplates = pgTable('document_templates', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Basic Info
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  categoryId: uuid('category_id').references(() => documentCategories.id).notNull(),
  documentTypeId: uuid('document_type_id').references(() => documentTypes.id),

  // File Processing
  fileType: fileTypeEnum('file_type').notNull(),
  processingMode: processingModeEnum('processing_mode').notNull().default('company'),

  // Versioning
  version: integer('version').notNull().default(1),
  isLatest: boolean('is_latest').notNull().default(true),
  previousVersionId: uuid('previous_version_id'),

  // Chunking
  chunkingStrategy: chunkingStrategyEnum('chunking_strategy').notNull().default('auto'),
  chunkSize: integer('chunk_size'),
  chunkOverlap: integer('chunk_overlap'),

  // Recurring
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringPeriod: text('recurring_period'), // 'monthly' | 'quarterly' | 'yearly'
  retentionDays: integer('retention_days'),

  isActive: boolean('is_active').notNull().default(true),

  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => [
  index('idx_template_slug').on(table.slug),
  index('idx_template_category').on(table.categoryId),
]);

export const templateColumnMappings = pgTable('template_column_mappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').references(() => documentTemplates.id).notNull(),

  // Source
  sourceColumn: text('source_column').notNull(),
  sourceColumnIndex: integer('source_column_index'),

  // Target
  targetField: text('target_field').notNull(),
  targetFieldType: text('target_field_type').notNull(), // 'string' | 'number' | 'date' | 'currency'

  // Role
  fieldRole: text('field_role').notNull().default('metadata'),
  // 'employee_identifier' | 'content' | 'metadata' | 'skip'

  // Transform
  transformFunction: text('transform_function'),
  defaultValue: text('default_value'),

  // Validation
  isRequired: boolean('is_required').notNull().default(false),
  validationRegex: text('validation_regex'),

  sortOrder: integer('sort_order').notNull().default(0),
});

export const templateVersions = pgTable('template_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').references(() => documentTemplates.id).notNull(),
  version: integer('version').notNull(),

  configSnapshot: jsonb('config_snapshot').notNull(),
  columnMappingsSnapshot: jsonb('column_mappings_snapshot').notNull(),

  changeReason: text('change_reason'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
});

export const templatesRelations = relations(documentTemplates, ({ one, many }) => ({
  category: one(documentCategories, {
    fields: [documentTemplates.categoryId],
    references: [documentCategories.id],
  }),
  documentType: one(documentTypes, {
    fields: [documentTemplates.documentTypeId],
    references: [documentTypes.id],
  }),
  columnMappings: many(templateColumnMappings),
  versions: many(templateVersions),
  creator: one(users, {
    fields: [documentTemplates.createdBy],
    references: [users.id],
  }),
}));

export const columnMappingsRelations = relations(templateColumnMappings, ({ one }) => ({
  template: one(documentTemplates, {
    fields: [templateColumnMappings.templateId],
    references: [documentTemplates.id],
  }),
}));

export const templateVersionsRelations = relations(templateVersions, ({ one }) => ({
  template: one(documentTemplates, {
    fields: [templateVersions.templateId],
    references: [documentTemplates.id],
  }),
  creator: one(users, {
    fields: [templateVersions.createdBy],
    references: [users.id],
  }),
}));

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type NewDocumentTemplate = typeof documentTemplates.$inferInsert;
export type TemplateColumnMapping = typeof templateColumnMappings.$inferSelect;
export type NewTemplateColumnMapping = typeof templateColumnMappings.$inferInsert;
export type TemplateVersion = typeof templateVersions.$inferSelect;
export type NewTemplateVersion = typeof templateVersions.$inferInsert;
