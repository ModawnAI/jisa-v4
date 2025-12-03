import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * Prompt template types for different RAG pipeline stages
 */
export const promptTypeEnum = pgEnum('prompt_type', [
  'system',              // Base system prompt for AI personality
  'query_enhancement',   // Query optimization for Pinecone search
  'answer_generation',   // Final answer generation
  'commission_detection', // Commission query detection
  'employee_rag',        // Employee-specific RAG prompts
  'error_response',      // Error message templates
  'greeting',            // Greeting/welcome messages
  'no_results',          // No results found messages
]);

/**
 * Prompt template categories for organization
 */
export const promptCategoryEnum = pgEnum('prompt_category', [
  'kakao_chat',      // KakaoTalk chatbot prompts
  'admin_chat',      // Admin interface chat
  'document_processing', // Document processing prompts
  'analytics',       // Analytics/reporting prompts
]);

/**
 * Prompt templates for Gemini API - Admin editable
 * Supports variable interpolation using {{variable_name}} syntax
 */
export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Template identification
  name: text('name').notNull(),
  slug: text('slug').notNull(), // URL-safe identifier
  description: text('description'),

  // Classification
  type: promptTypeEnum('type').notNull(),
  category: promptCategoryEnum('category').notNull().default('kakao_chat'),

  // Template content
  content: text('content').notNull(),

  // Variable definitions for the template
  variables: jsonb('variables').$type<PromptVariable[]>().default([]),

  // Model configuration
  modelConfig: jsonb('model_config').$type<ModelConfig>().default({
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    maxOutputTokens: 1024,
  }),

  // Versioning
  version: integer('version').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),

  // Metadata for context-aware prompt selection
  metadata: jsonb('metadata').$type<PromptMetadata>(),

  // Audit
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_prompt_type').on(table.type),
  index('idx_prompt_category').on(table.category),
  index('idx_prompt_active').on(table.isActive),
  index('idx_prompt_default').on(table.isDefault),
  unique('uq_prompt_slug_version').on(table.slug, table.version),
]);

/**
 * Prompt template versions for history tracking
 */
export const promptTemplateVersions = pgTable('prompt_template_versions', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Reference to main template
  templateId: uuid('template_id').references(() => promptTemplates.id, { onDelete: 'cascade' }).notNull(),

  // Version details
  version: integer('version').notNull(),
  content: text('content').notNull(),
  variables: jsonb('variables').$type<PromptVariable[]>(),
  modelConfig: jsonb('model_config').$type<ModelConfig>(),

  // Change tracking
  changeNote: text('change_note'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_version_template').on(table.templateId),
  index('idx_version_number').on(table.version),
]);

// Relations
export const promptTemplatesRelations = relations(promptTemplates, ({ one, many }) => ({
  creator: one(users, {
    fields: [promptTemplates.createdBy],
    references: [users.id],
    relationName: 'promptCreator',
  }),
  updater: one(users, {
    fields: [promptTemplates.updatedBy],
    references: [users.id],
    relationName: 'promptUpdater',
  }),
  versions: many(promptTemplateVersions),
}));

export const promptTemplateVersionsRelations = relations(promptTemplateVersions, ({ one }) => ({
  template: one(promptTemplates, {
    fields: [promptTemplateVersions.templateId],
    references: [promptTemplates.id],
  }),
  creator: one(users, {
    fields: [promptTemplateVersions.createdBy],
    references: [users.id],
  }),
}));

// Types
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type NewPromptTemplate = typeof promptTemplates.$inferInsert;
export type PromptTemplateVersion = typeof promptTemplateVersions.$inferSelect;
export type NewPromptTemplateVersion = typeof promptTemplateVersions.$inferInsert;

/**
 * Variable definition for template interpolation
 */
export interface PromptVariable {
  name: string;           // Variable name (e.g., "user_query")
  description: string;    // Description for admin UI
  required: boolean;      // Whether variable is required
  defaultValue?: string;  // Default value if not provided
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  source?: 'user_input' | 'system' | 'database' | 'context';
}

/**
 * Model configuration for Gemini API
 */
export interface ModelConfig {
  model: string;          // e.g., "gemini-2.0-flash"
  temperature?: number;   // 0.0 - 1.0
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

/**
 * Additional metadata for context-aware prompt selection
 */
export interface PromptMetadata {
  // Query type detection keywords
  keywords?: string[];
  // Clearance level requirements
  minClearanceLevel?: 'basic' | 'standard' | 'advanced';
  // Category filters
  documentCategories?: string[];
  // Feature flags
  features?: string[];
  // Custom data for prompt generation
  customData?: Record<string, unknown>;
}

/**
 * Predefined prompt template slugs for system use
 */
export const PROMPT_SLUGS = {
  // System prompts
  SYSTEM_DEFAULT: 'system-default',
  SYSTEM_KOREAN: 'system-korean',

  // Query enhancement
  QUERY_ENHANCE_DEFAULT: 'query-enhance-default',
  QUERY_ENHANCE_HANWHA: 'query-enhance-hanwha',
  QUERY_ENHANCE_SCHEDULE: 'query-enhance-schedule',

  // Answer generation
  ANSWER_DEFAULT: 'answer-default',
  ANSWER_COMMISSION: 'answer-commission',
  ANSWER_EMPLOYEE: 'answer-employee',

  // Detection
  COMMISSION_DETECT: 'commission-detect',

  // Responses
  NO_RESULTS: 'no-results',
  ERROR_GENERIC: 'error-generic',
  GREETING: 'greeting',
} as const;
