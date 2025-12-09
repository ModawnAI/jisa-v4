/**
 * RAG Metrics Schema
 *
 * Tracks detailed metrics for RAG pipeline performance,
 * query routing decisions, and clarification flows.
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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { employees } from './employees';

/**
 * Query route types
 */
export const ROUTE_TYPES = {
  INSTANT: 'instant',
  RAG: 'rag',
  CLARIFY: 'clarify',
  FALLBACK: 'fallback',
} as const;

export type RouteType = (typeof ROUTE_TYPES)[keyof typeof ROUTE_TYPES];

/**
 * RAG pipeline metrics
 * Tracks detailed timing and quality metrics for each query
 */
export const ragMetrics = pgTable(
  'rag_metrics',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Session identification
    sessionId: text('session_id'),
    employeeId: uuid('employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),

    // Query details
    query: text('query').notNull(),
    normalizedQuery: text('normalized_query'),

    // Routing decision
    route: text('route').notNull().$type<RouteType>(),
    routeConfidence: real('route_confidence'),
    routeReason: text('route_reason'),

    // Intent analysis
    intentType: text('intent_type'),
    intentConfidence: real('intent_confidence'),
    templateType: text('template_type'),
    calculationType: text('calculation_type'),

    // Timing breakdown (milliseconds)
    routerTimeMs: integer('router_time_ms'),
    intentTimeMs: integer('intent_time_ms'),
    embeddingTimeMs: integer('embedding_time_ms'),
    searchTimeMs: integer('search_time_ms'),
    calculationTimeMs: integer('calculation_time_ms'),
    generationTimeMs: integer('generation_time_ms'),
    totalTimeMs: integer('total_time_ms'),

    // Search metrics
    namespacesSearched: jsonb('namespaces_searched').$type<string[]>(),
    resultsCount: integer('results_count'),
    topResultScore: real('top_result_score'),
    avgResultScore: real('avg_result_score'),

    // Clarification tracking
    clarificationAsked: boolean('clarification_asked').default(false),
    clarificationType: text('clarification_type'),
    clarificationResolved: boolean('clarification_resolved'),

    // Quality indicators
    successful: boolean('successful').notNull().default(true),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),

    // Response metadata
    responseLength: integer('response_length'),
    tokensUsed: integer('tokens_used'),

    // Additional metadata
    metadata: jsonb('metadata').$type<{
      schemaVersion?: string;
      modelUsed?: string;
      filters?: Record<string, unknown>;
      namespaceWeights?: Record<string, number>;
      calculationResult?: unknown;
      matchedPattern?: string;
    }>(),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_rag_metrics_session').on(table.sessionId),
    index('idx_rag_metrics_employee').on(table.employeeId),
    index('idx_rag_metrics_route').on(table.route),
    index('idx_rag_metrics_intent').on(table.intentType),
    index('idx_rag_metrics_created').on(table.createdAt),
    index('idx_rag_metrics_successful').on(table.successful),
  ]
);

/**
 * Schema discovery logs
 * Tracks when schemas are discovered/refreshed
 */
export const schemaDiscoveryLogs = pgTable(
  'schema_discovery_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Discovery context
    namespaces: jsonb('namespaces').$type<string[]>().notNull(),
    triggeredBy: text('triggered_by').notNull(), // 'cache_miss' | 'document_upload' | 'document_delete' | 'manual'

    // Results
    schemasDiscovered: integer('schemas_discovered'),
    totalVectors: integer('total_vectors'),
    discoveryTimeMs: integer('discovery_time_ms'),

    // Schema details
    schemaDetails: jsonb('schema_details').$type<
      Array<{
        templateType: string;
        namespace: string;
        fieldCount: number;
        vectorCount: number;
      }>
    >(),

    // Status
    successful: boolean('successful').notNull().default(true),
    errorMessage: text('error_message'),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_schema_discovery_created').on(table.createdAt),
    index('idx_schema_discovery_triggered').on(table.triggeredBy),
  ]
);

/**
 * Clarification sessions
 * Tracks multi-turn clarification conversations
 */
export const clarificationSessions = pgTable(
  'clarification_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Session context
    sessionId: text('session_id').notNull(),
    employeeId: uuid('employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),

    // Original query
    originalQuery: text('original_query').notNull(),
    originalConfidence: real('original_confidence'),

    // Clarification details
    clarificationType: text('clarification_type').notNull(),
    questionAsked: text('question_asked').notNull(),
    userResponse: text('user_response'),

    // Resolution
    resolved: boolean('resolved').default(false),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    finalConfidence: real('final_confidence'),

    // Partial intent storage
    partialIntent: jsonb('partial_intent').$type<Record<string, unknown>>(),
    mergedIntent: jsonb('merged_intent').$type<Record<string, unknown>>(),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_clarification_session').on(table.sessionId),
    index('idx_clarification_employee').on(table.employeeId),
    index('idx_clarification_resolved').on(table.resolved),
    index('idx_clarification_created').on(table.createdAt),
  ]
);

// Relations
export const ragMetricsRelations = relations(ragMetrics, ({ one }) => ({
  employee: one(employees, {
    fields: [ragMetrics.employeeId],
    references: [employees.id],
  }),
}));

export const clarificationSessionsRelations = relations(
  clarificationSessions,
  ({ one }) => ({
    employee: one(employees, {
      fields: [clarificationSessions.employeeId],
      references: [employees.id],
    }),
  })
);

/**
 * RAG Query Logs
 * Detailed logs for each RAG query (V2 architecture)
 */
export const ragQueryLogs = pgTable(
  'rag_query_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Session context
    sessionId: text('session_id'),
    userId: text('user_id'),

    // Query and response
    query: text('query').notNull(),
    answer: text('answer').notNull(),

    // Metrics (JSON for flexibility)
    metrics: jsonb('metrics').$type<{
      queryUnderstanding: { timeMs: number; expandedQueries: number };
      broadRetrieval: { timeMs: number; denseResults: number; sparseResults: number; fusedResults: number };
      reranking: { timeMs: number; model: string; inputCount: number; outputCount: number };
      contextAssembly: { timeMs: number; chunksExpanded: number; tokensUsed: number };
      generation: { timeMs: number; model: string; tokensIn: number; tokensOut: number };
      total: { timeMs: number };
    }>(),

    // Result stats
    resultCount: integer('result_count').default(0),
    topScore: text('top_score'),
    confidence: text('confidence'),

    // Status
    wasSuccessful: boolean('was_successful').default(true),
    errorMessage: text('error_message'),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_rag_query_logs_session').on(table.sessionId),
    index('idx_rag_query_logs_user').on(table.userId),
    index('idx_rag_query_logs_created').on(table.createdAt),
    index('idx_rag_query_logs_successful').on(table.wasSuccessful),
  ]
);

/**
 * RAG Daily Metrics
 * Aggregated daily statistics for monitoring
 */
export const ragDailyMetrics = pgTable(
  'rag_daily_metrics',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Date (stored as date string YYYY-MM-DD)
    date: text('date').notNull().unique(),

    // Volume
    totalQueries: integer('total_queries').default(0),
    successfulQueries: integer('successful_queries').default(0),

    // Latency (stored as JSON for percentiles)
    avgLatencyMs: real('avg_latency_ms'),
    p50LatencyMs: real('p50_latency_ms'),
    p95LatencyMs: real('p95_latency_ms'),
    p99LatencyMs: real('p99_latency_ms'),

    // Quality metrics
    avgResultCount: real('avg_result_count'),
    avgConfidence: real('avg_confidence'),
    avgTopScore: real('avg_top_score'),

    // Cache metrics
    cacheHitRate: real('cache_hit_rate'),
    embeddingCacheHits: integer('embedding_cache_hits').default(0),
    embeddingCacheMisses: integer('embedding_cache_misses').default(0),

    // Stage breakdown (JSON for flexibility)
    stageMetrics: jsonb('stage_metrics').$type<{
      queryUnderstanding: { avgMs: number; p95Ms: number };
      retrieval: { avgMs: number; p95Ms: number };
      reranking: { avgMs: number; p95Ms: number };
      generation: { avgMs: number; p95Ms: number };
    }>(),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_rag_daily_metrics_date').on(table.date),
  ]
);

/**
 * Processing Checkpoints
 * Tracks document processing progress for resumable uploads
 */
export const processingCheckpoints = pgTable(
  'processing_checkpoints',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Document reference
    documentId: uuid('document_id').notNull(),
    batchId: uuid('batch_id'),

    // Progress tracking
    lastProcessedChunk: integer('last_processed_chunk').default(0),
    totalChunks: integer('total_chunks').notNull(),

    // Status
    status: text('status').$type<'in_progress' | 'completed' | 'failed' | 'paused'>().notNull(),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').default(0),

    // Checkpoint data (serialized state)
    checkpointData: jsonb('checkpoint_data').$type<{
      lastVectorIds?: string[];
      processedRows?: number[];
      partialResults?: unknown;
    }>(),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_processing_checkpoints_document').on(table.documentId),
    index('idx_processing_checkpoints_batch').on(table.batchId),
    index('idx_processing_checkpoints_status').on(table.status),
  ]
);

// Types
export type RagMetric = typeof ragMetrics.$inferSelect;
export type NewRagMetric = typeof ragMetrics.$inferInsert;

export type SchemaDiscoveryLog = typeof schemaDiscoveryLogs.$inferSelect;
export type NewSchemaDiscoveryLog = typeof schemaDiscoveryLogs.$inferInsert;

export type ClarificationSession = typeof clarificationSessions.$inferSelect;
export type NewClarificationSession = typeof clarificationSessions.$inferInsert;

export type RagQueryLog = typeof ragQueryLogs.$inferSelect;
export type NewRagQueryLog = typeof ragQueryLogs.$inferInsert;

export type RagDailyMetric = typeof ragDailyMetrics.$inferSelect;
export type NewRagDailyMetric = typeof ragDailyMetrics.$inferInsert;

export type ProcessingCheckpoint = typeof processingCheckpoints.$inferSelect;
export type NewProcessingCheckpoint = typeof processingCheckpoints.$inferInsert;
