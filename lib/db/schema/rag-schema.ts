/**
 * RAG Schema Registry
 *
 * Dynamic schema definitions for the Intent-Aware RAG system.
 * Allows new document types to be added without code changes.
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  index,
  real,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { documentTemplates } from './templates';

/**
 * RAG Template Schemas
 *
 * Defines metadata fields and query patterns for each document template.
 * This allows the query understanding system to dynamically learn
 * what fields are available and how to query them.
 */
export const ragTemplateSchemas = pgTable('rag_template_schemas', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Link to document template
  templateId: uuid('template_id').references(() => documentTemplates.id, { onDelete: 'cascade' }),
  templateSlug: text('template_slug').notNull(), // e.g., 'mdrt', 'compensation', 'training'

  // Human-readable info
  displayName: text('display_name').notNull(),
  description: text('description'),

  // Available metadata fields for this template
  metadataFields: jsonb('metadata_fields').$type<MetadataFieldDefinition[]>().notNull(),

  // Chunk types this template produces
  chunkTypes: jsonb('chunk_types').$type<ChunkTypeDefinition[]>().notNull(),

  // Supported intents and their configurations
  supportedIntents: jsonb('supported_intents').$type<IntentConfiguration[]>().notNull(),

  // Calculation definitions
  calculations: jsonb('calculations').$type<CalculationDefinition[]>(),

  // Example queries for few-shot learning
  exampleQueries: jsonb('example_queries').$type<ExampleQuery[]>(),

  // Priority for conflict resolution
  priority: integer('priority').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),

  // Audit
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_rag_schema_template').on(table.templateId),
  index('idx_rag_schema_slug').on(table.templateSlug),
  index('idx_rag_schema_active').on(table.isActive),
]);

/**
 * Query Intent Logs
 *
 * Logs query understanding results for feedback and improvement.
 * Used to identify patterns, failures, and optimization opportunities.
 */
export const queryIntentLogs = pgTable('query_intent_logs', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Original query
  originalQuery: text('original_query').notNull(),

  // Parsed intent (full JSON)
  parsedIntent: jsonb('parsed_intent').$type<ParsedIntentLog>().notNull(),

  // Execution details
  templateUsed: text('template_used'),
  filtersApplied: jsonb('filters_applied'),
  calculationPerformed: text('calculation_performed'),

  // Results
  successful: boolean('successful').notNull().default(true),
  resultsCount: integer('results_count'),
  responseTimeMs: integer('response_time_ms'),

  // Feedback
  userFeedback: text('user_feedback'), // 'helpful' | 'not_helpful' | 'wrong'
  feedbackDetails: text('feedback_details'),
  correctedIntent: jsonb('corrected_intent'),

  // Context
  employeeId: text('employee_id'),
  sessionId: text('session_id'),

  // For learning
  confidence: real('confidence'),
  wasAmbiguous: boolean('was_ambiguous').default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_intent_log_template').on(table.templateUsed),
  index('idx_intent_log_feedback').on(table.userFeedback),
  index('idx_intent_log_success').on(table.successful),
  index('idx_intent_log_created').on(table.createdAt),
]);

/**
 * Metadata Discovery Cache
 *
 * Caches discovered metadata from Pinecone for faster schema updates.
 */
export const metadataDiscoveryCache = pgTable('metadata_discovery_cache', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Namespace being analyzed
  namespace: text('namespace').notNull(),

  // Discovered metadata keys and sample values
  discoveredFields: jsonb('discovered_fields').$type<DiscoveredField[]>().notNull(),

  // Statistics
  sampleSize: integer('sample_size').notNull(),
  uniqueValuesPerField: jsonb('unique_values_per_field'),

  // Timestamps
  discoveredAt: timestamp('discovered_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => [
  index('idx_discovery_namespace').on(table.namespace),
  index('idx_discovery_expires').on(table.expiresAt),
]);

// Relations
export const ragTemplateSchemasRelations = relations(ragTemplateSchemas, ({ one }) => ({
  template: one(documentTemplates, {
    fields: [ragTemplateSchemas.templateId],
    references: [documentTemplates.id],
  }),
}));

// ============ Type Definitions ============

export interface MetadataFieldDefinition {
  key: string;                    // e.g., 'totalCommission'
  displayName: string;            // e.g., '총 커미션'
  type: 'number' | 'string' | 'boolean' | 'date' | 'json';
  description?: string;
  isSearchable: boolean;          // Can be used in semantic search
  isFilterable: boolean;          // Can be used as Pinecone filter
  isComputable: boolean;          // Can be used in calculations
  sampleValues?: (string | number | boolean)[];
  unit?: string;                  // e.g., 'KRW', '%'
  aliases?: string[];             // Alternative names users might use
}

export interface ChunkTypeDefinition {
  type: string;                   // e.g., 'summary', 'monthly_detail'
  displayName: string;
  description?: string;
  typicalUseCase: string;         // When to prefer this chunk type
}

export interface IntentConfiguration {
  intent: 'direct_lookup' | 'calculation' | 'comparison' | 'aggregation' | 'general_qa';
  isSupported: boolean;
  preferredChunkTypes?: string[];
  requiredFields?: string[];
  defaultTopK: number;
  notes?: string;
}

export interface CalculationDefinition {
  type: string;                   // e.g., 'mdrt_gap'
  displayName: string;
  description: string;
  formula: string;                // e.g., 'MDRT_STANDARD - totalCommission'
  requiredFields: string[];
  parameters?: {
    name: string;
    type: string;
    description: string;
    defaultValue?: unknown;
    options?: { value: unknown; label: string }[];
  }[];
  resultFormat: string;           // e.g., 'currency', 'percentage', 'number'
}

export interface ExampleQuery {
  query: string;
  expectedIntent: string;
  expectedTemplate: string;
  expectedFields?: string[];
  expectedCalculation?: string;
  notes?: string;
}

export interface ParsedIntentLog {
  intent: string;
  template: string;
  fields: string[];
  calculation?: {
    type: string;
    params?: Record<string, unknown>;
  };
  filters: Record<string, unknown>;
  semanticSearch: {
    enabled: boolean;
    query?: string;
    topK: number;
  };
  confidence: number;
}

export interface DiscoveredField {
  key: string;
  inferredType: 'number' | 'string' | 'boolean' | 'date' | 'json' | 'unknown';
  occurrenceCount: number;
  sampleValues: unknown[];
  nullCount: number;
}

// Export types
export type RagTemplateSchema = typeof ragTemplateSchemas.$inferSelect;
export type NewRagTemplateSchema = typeof ragTemplateSchemas.$inferInsert;
export type QueryIntentLog = typeof queryIntentLogs.$inferSelect;
export type NewQueryIntentLog = typeof queryIntentLogs.$inferInsert;
export type MetadataDiscoveryCache = typeof metadataDiscoveryCache.$inferSelect;
export type NewMetadataDiscoveryCache = typeof metadataDiscoveryCache.$inferInsert;
