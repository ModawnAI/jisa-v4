/**
 * Autonomous RAG System Schema
 *
 * Tables for ground truth storage, accuracy testing,
 * and self-optimization tracking.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { documents } from './documents';
import { ragTemplateSchemas } from './rag-schema';

// ============ Enums ============

export const testStatusEnum = pgEnum('test_status', [
  'pending',
  'running',
  'passed',
  'failed',
  'skipped',
]);

export const optimizationActionTypeEnum = pgEnum('optimization_action_type', [
  'schema_update',
  'embedding_update',
  'filter_fix',
  'metadata_add',
  'field_alias',
  'query_pattern',
]);

export const discrepancyTypeEnum = pgEnum('discrepancy_type', [
  'missing',
  'wrong_value',
  'format_mismatch',
  'type_mismatch',
  'within_tolerance',
]);

export const discrepancySeverityEnum = pgEnum('discrepancy_severity', [
  'critical',
  'high',
  'medium',
  'low',
]);

// ============ Embedding Templates ============

/**
 * Embedding Templates
 *
 * Defines how entity data is converted to embedding text
 * for optimal semantic search matching.
 */
export const embeddingTemplates = pgTable(
  'embedding_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Link to schema
    schemaId: uuid('schema_id').references(() => ragTemplateSchemas.id, {
      onDelete: 'cascade',
    }),
    schemaSlug: text('schema_slug').notNull(),
    version: integer('version').notNull().default(1),

    // Template definition
    sections: jsonb('sections').$type<EmbeddingSection[]>().notNull(),
    semanticAnchors: jsonb('semantic_anchors').$type<string[]>().default([]),
    maxLength: integer('max_length').notNull().default(8000),
    priorityFields: jsonb('priority_fields').$type<string[]>().default([]),

    // Performance metrics (auto-updated by optimizer)
    avgRelevanceScore: real('avg_relevance_score'),
    querySuccessRate: real('query_success_rate'),
    totalQueries: integer('total_queries').default(0),

    // Status
    isActive: boolean('is_active').notNull().default(true),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_embedding_template_schema').on(table.schemaId),
    index('idx_embedding_template_slug').on(table.schemaSlug),
    uniqueIndex('idx_embedding_template_unique').on(
      table.schemaSlug,
      table.version
    ),
  ]
);

// ============ Ground Truth ============

/**
 * Ground Truth
 *
 * Stores extracted "correct" values from documents
 * for RAG accuracy testing.
 */
export const groundTruth = pgTable(
  'ground_truth',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Source reference
    schemaId: uuid('schema_id').references(() => ragTemplateSchemas.id, {
      onDelete: 'cascade',
    }),
    documentId: uuid('document_id').references(() => documents.id, {
      onDelete: 'cascade',
    }),

    // Entity identification (e.g., { employeeId: 'J00307', period: '202509' })
    entityIdentifier: jsonb('entity_identifier')
      .$type<Record<string, string | number>>()
      .notNull(),

    // Field values with confidence and source
    fieldValues: jsonb('field_values')
      .$type<Record<string, GroundTruthFieldValue>>()
      .notNull(),

    // Extraction metadata
    extractedAt: timestamp('extracted_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    confidence: real('confidence').notNull().default(1.0),
    extractionMethod: text('extraction_method').notNull().default('auto'), // 'auto' | 'manual' | 'llm'

    // Validity
    isValid: boolean('is_valid').notNull().default(true),
    invalidatedReason: text('invalidated_reason'),
    validUntil: timestamp('valid_until', { withTimezone: true }),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_ground_truth_schema').on(table.schemaId),
    index('idx_ground_truth_document').on(table.documentId),
    index('idx_ground_truth_entity').on(table.entityIdentifier),
    index('idx_ground_truth_valid').on(table.isValid),
  ]
);

// ============ Accuracy Tests ============

/**
 * Accuracy Tests
 *
 * Test case definitions for RAG accuracy testing.
 */
export const accuracyTests = pgTable(
  'accuracy_tests',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Grouping
    schemaId: uuid('schema_id').references(() => ragTemplateSchemas.id, {
      onDelete: 'cascade',
    }),
    testSuiteId: text('test_suite_id'), // For grouping related tests
    category: text('category').notNull(), // 'compensation', 'contract', 'mdrt', etc.
    priority: text('priority').notNull().default('medium'), // 'critical', 'high', 'medium', 'low'

    // Test definition
    name: text('name').notNull(),
    description: text('description'),
    query: text('query').notNull(),
    queryPattern: text('query_pattern'), // Template pattern e.g., "내 {field} 알려줘"

    // Target entity
    targetEntity: jsonb('target_entity')
      .$type<Record<string, string | number>>()
      .notNull(),

    // Expectations
    expectedFields: jsonb('expected_fields').$type<string[]>().notNull(),
    expectedValues: jsonb('expected_values')
      .$type<Record<string, ExpectedValue>>()
      .notNull(),

    // Validation config
    valueTolerance: real('value_tolerance').default(0.02), // 2% default tolerance
    allowedDiscrepancies: jsonb('allowed_discrepancies').$type<string[]>(),

    // Status
    isActive: boolean('is_active').notNull().default(true),

    // Auto-generated vs manual
    generatedFrom: text('generated_from'), // 'ground_truth', 'query_log', 'manual'
    groundTruthId: uuid('ground_truth_id').references(() => groundTruth.id),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_accuracy_test_schema').on(table.schemaId),
    index('idx_accuracy_test_suite').on(table.testSuiteId),
    index('idx_accuracy_test_category').on(table.category),
    index('idx_accuracy_test_active').on(table.isActive),
  ]
);

/**
 * Accuracy Results
 *
 * Results from running accuracy tests.
 */
export const accuracyResults = pgTable(
  'accuracy_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Test reference
    testId: uuid('test_id')
      .references(() => accuracyTests.id, { onDelete: 'cascade' })
      .notNull(),

    // Pipeline run context
    pipelineRunId: uuid('pipeline_run_id'),
    iteration: integer('iteration').default(0),

    // Results
    status: testStatusEnum('status').notNull(),
    passed: boolean('passed').notNull(),
    accuracy: real('accuracy').notNull(), // 0-1 score

    // Response details
    response: text('response'),
    extractedValues: jsonb('extracted_values').$type<
      Record<string, unknown>
    >(),

    // Discrepancies
    discrepancies: jsonb('discrepancies').$type<Discrepancy[]>(),
    discrepancyCount: integer('discrepancy_count').default(0),

    // Debug info
    searchResultsCount: integer('search_results_count'),
    topScore: real('top_score'),
    filtersUsed: jsonb('filters_used').$type<Record<string, unknown>>(),
    namespaceSearched: text('namespace_searched'),

    // Timing
    processingTimeMs: integer('processing_time_ms'),
    routerTimeMs: integer('router_time_ms'),
    searchTimeMs: integer('search_time_ms'),
    generationTimeMs: integer('generation_time_ms'),

    // Route taken
    routeType: text('route_type'), // 'instant', 'rag', 'clarify', 'fallback'
    intentType: text('intent_type'),
    intentConfidence: real('intent_confidence'),

    // Audit
    testedAt: timestamp('tested_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_accuracy_result_test').on(table.testId),
    index('idx_accuracy_result_pipeline').on(table.pipelineRunId),
    index('idx_accuracy_result_passed').on(table.passed),
    index('idx_accuracy_result_tested').on(table.testedAt),
  ]
);

// ============ Optimization ============

/**
 * Optimization Actions
 *
 * Tracks self-improvement actions taken by the system.
 */
export const optimizationActions = pgTable(
  'optimization_actions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Context
    schemaId: uuid('schema_id').references(() => ragTemplateSchemas.id),
    pipelineRunId: uuid('pipeline_run_id'),
    iteration: integer('iteration'),

    // Action details
    actionType: optimizationActionTypeEnum('action_type').notNull(),
    target: text('target').notNull(), // e.g., 'schema', 'embedding_template', 'filter'
    targetId: uuid('target_id'), // Reference to modified entity

    // What changed
    change: jsonb('change').$type<OptimizationChange>().notNull(),
    reason: text('reason').notNull(),
    confidence: real('confidence').notNull(),

    // Trigger analysis
    failurePatterns: jsonb('failure_patterns').$type<FailurePattern[]>(),
    affectedTests: jsonb('affected_tests').$type<string[]>(),

    // Result
    applied: boolean('applied').notNull().default(false),
    success: boolean('success'),
    error: text('error'),

    // Impact measurement
    accuracyBefore: real('accuracy_before'),
    accuracyAfter: real('accuracy_after'),
    improvementPercent: real('improvement_percent'),

    // Rollback support
    canRollback: boolean('can_rollback').default(true),
    rolledBack: boolean('rolled_back').default(false),
    previousState: jsonb('previous_state'),

    // Audit
    appliedAt: timestamp('applied_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_optimization_schema').on(table.schemaId),
    index('idx_optimization_pipeline').on(table.pipelineRunId),
    index('idx_optimization_type').on(table.actionType),
    index('idx_optimization_applied').on(table.applied),
    index('idx_optimization_success').on(table.success),
  ]
);

/**
 * Pipeline Runs
 *
 * Tracks autonomous pipeline execution history.
 */
export const pipelineRuns = pgTable(
  'pipeline_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Source
    documentId: uuid('document_id').references(() => documents.id),
    schemaId: uuid('schema_id').references(() => ragTemplateSchemas.id),
    triggerType: text('trigger_type').notNull(), // 'document_upload', 'manual', 'scheduled'

    // Status
    status: text('status').notNull().default('pending'), // 'pending', 'running', 'completed', 'failed'
    currentPhase: text('current_phase'), // 'analyzing', 'parsing', 'upserting', 'testing', 'optimizing'

    // Configuration
    targetAccuracy: real('target_accuracy').default(0.95),
    maxIterations: integer('max_iterations').default(5),

    // Results
    finalAccuracy: real('final_accuracy'),
    totalIterations: integer('total_iterations').default(0),
    accuracyHistory: jsonb('accuracy_history').$type<number[]>().default([]),

    // Counts
    testsRun: integer('tests_run').default(0),
    testsPassed: integer('tests_passed').default(0),
    optimizationsApplied: integer('optimizations_applied').default(0),

    // Error tracking
    errorMessage: text('error_message'),
    errorStack: text('error_stack'),

    // Timing
    startedAt: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    totalDurationMs: integer('total_duration_ms'),
  },
  (table) => [
    index('idx_pipeline_run_document').on(table.documentId),
    index('idx_pipeline_run_schema').on(table.schemaId),
    index('idx_pipeline_run_status').on(table.status),
    index('idx_pipeline_run_started').on(table.startedAt),
  ]
);

// ============ Relations ============

export const embeddingTemplatesRelations = relations(
  embeddingTemplates,
  ({ one }) => ({
    schema: one(ragTemplateSchemas, {
      fields: [embeddingTemplates.schemaId],
      references: [ragTemplateSchemas.id],
    }),
  })
);

export const groundTruthRelations = relations(groundTruth, ({ one }) => ({
  schema: one(ragTemplateSchemas, {
    fields: [groundTruth.schemaId],
    references: [ragTemplateSchemas.id],
  }),
  document: one(documents, {
    fields: [groundTruth.documentId],
    references: [documents.id],
  }),
}));

export const accuracyTestsRelations = relations(
  accuracyTests,
  ({ one, many }) => ({
    schema: one(ragTemplateSchemas, {
      fields: [accuracyTests.schemaId],
      references: [ragTemplateSchemas.id],
    }),
    groundTruth: one(groundTruth, {
      fields: [accuracyTests.groundTruthId],
      references: [groundTruth.id],
    }),
    results: many(accuracyResults),
  })
);

export const accuracyResultsRelations = relations(
  accuracyResults,
  ({ one }) => ({
    test: one(accuracyTests, {
      fields: [accuracyResults.testId],
      references: [accuracyTests.id],
    }),
    pipelineRun: one(pipelineRuns, {
      fields: [accuracyResults.pipelineRunId],
      references: [pipelineRuns.id],
    }),
  })
);

export const optimizationActionsRelations = relations(
  optimizationActions,
  ({ one }) => ({
    schema: one(ragTemplateSchemas, {
      fields: [optimizationActions.schemaId],
      references: [ragTemplateSchemas.id],
    }),
    pipelineRun: one(pipelineRuns, {
      fields: [optimizationActions.pipelineRunId],
      references: [pipelineRuns.id],
    }),
  })
);

export const pipelineRunsRelations = relations(
  pipelineRuns,
  ({ one, many }) => ({
    document: one(documents, {
      fields: [pipelineRuns.documentId],
      references: [documents.id],
    }),
    schema: one(ragTemplateSchemas, {
      fields: [pipelineRuns.schemaId],
      references: [ragTemplateSchemas.id],
    }),
    accuracyResults: many(accuracyResults),
    optimizationActions: many(optimizationActions),
  })
);

// ============ Type Definitions ============

export interface EmbeddingSection {
  name: string;
  template: string; // Handlebars-style template
  fields: string[];
  weight: number; // 0-1 importance
  conditional?: string; // Only include if condition met
}

export interface GroundTruthFieldValue {
  value: string | number | boolean | null;
  confidence: number;
  source: string; // Cell reference, line number, etc.
  extractedAt?: string;
}

export interface ExpectedValue {
  value: string | number | boolean | null;
  type: 'exact' | 'contains' | 'regex' | 'numeric_range' | 'boolean_check';
  tolerance?: number; // For numeric comparisons
  checkFunction?: string; // For custom validation
}

export interface Discrepancy {
  field: string;
  expected: unknown;
  actual: unknown;
  type: 'missing' | 'wrong_value' | 'format_mismatch' | 'type_mismatch' | 'within_tolerance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  details?: string;
}

export interface OptimizationChange {
  type: string;
  before?: unknown;
  after: unknown;
  affectedFields?: string[];
}

export interface FailurePattern {
  type:
    | 'filter_mismatch'
    | 'low_relevance'
    | 'missing_field'
    | 'value_mismatch'
    | 'format_error';
  field?: string;
  queryPattern?: string;
  avgScore?: number;
  occurrences: number;
  suggestedFix?: string;
}

// Export types
export type EmbeddingTemplate = typeof embeddingTemplates.$inferSelect;
export type NewEmbeddingTemplate = typeof embeddingTemplates.$inferInsert;

export type GroundTruth = typeof groundTruth.$inferSelect;
export type NewGroundTruth = typeof groundTruth.$inferInsert;

export type AccuracyTest = typeof accuracyTests.$inferSelect;
export type NewAccuracyTest = typeof accuracyTests.$inferInsert;

export type AccuracyResult = typeof accuracyResults.$inferSelect;
export type NewAccuracyResult = typeof accuracyResults.$inferInsert;

export type OptimizationAction = typeof optimizationActions.$inferSelect;
export type NewOptimizationAction = typeof optimizationActions.$inferInsert;

export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type NewPipelineRun = typeof pipelineRuns.$inferInsert;
