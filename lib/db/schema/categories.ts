import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clearanceLevelEnum, namespaceTypeEnum } from './enums';
import { users } from './users';

export const documentCategories = pgTable('document_categories', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Basic Info
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),

  // Hierarchy (self-referencing)
  parentId: uuid('parent_id').references((): AnyPgColumn => documentCategories.id),
  depth: integer('depth').notNull().default(0),
  path: text('path').notNull(),

  // Access Control
  minClearanceLevel: clearanceLevelEnum('min_clearance_level').notNull().default('basic'),
  namespaceType: namespaceTypeEnum('namespace_type').notNull().default('company'),

  // Display
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  color: text('color'),

  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => [
  index('idx_category_path').on(table.path),
  index('idx_category_parent').on(table.parentId),
  index('idx_category_slug').on(table.slug),
]);

export const documentTypes = pgTable('document_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').references(() => documentCategories.id).notNull(),

  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),

  // JSON Schema for metadata
  metadataSchema: text('metadata_schema'), // JSON string

  defaultTemplateId: uuid('default_template_id'),
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categoriesRelations = relations(documentCategories, ({ one, many }) => ({
  parent: one(documentCategories, {
    fields: [documentCategories.parentId],
    references: [documentCategories.id],
    relationName: 'parent',
  }),
  children: many(documentCategories, {
    relationName: 'parent',
  }),
  documentTypes: many(documentTypes),
  creator: one(users, {
    fields: [documentCategories.createdBy],
    references: [users.id],
  }),
}));

export const documentTypesRelations = relations(documentTypes, ({ one }) => ({
  category: one(documentCategories, {
    fields: [documentTypes.categoryId],
    references: [documentCategories.id],
  }),
}));

export type DocumentCategory = typeof documentCategories.$inferSelect;
export type NewDocumentCategory = typeof documentCategories.$inferInsert;
export type DocumentType = typeof documentTypes.$inferSelect;
export type NewDocumentType = typeof documentTypes.$inferInsert;
