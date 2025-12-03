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
import { employees } from './employees';
import { kakaoProfiles } from './kakao-profiles';

/**
 * Query type for categorization
 */
export const QUERY_TYPES = {
  RAG: 'rag',
  EMPLOYEE_RAG: 'employee_rag',
  COMMISSION: 'commission',
  GENERAL: 'general',
} as const;

export type QueryType = typeof QUERY_TYPES[keyof typeof QUERY_TYPES];

/**
 * Query logs for analytics and debugging
 * Tracks all RAG queries from KakaoTalk chatbot
 */
export const queryLogs = pgTable('query_logs', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Source identification
  kakaoUserId: text('kakao_user_id').notNull(),
  kakaoProfileId: uuid('kakao_profile_id').references(() => kakaoProfiles.id, { onDelete: 'set null' }),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'set null' }),
  sessionId: text('session_id'),

  // Query details
  query: text('query').notNull(),
  enhancedQuery: text('enhanced_query'),
  queryType: text('query_type').notNull().default('rag'),

  // Response details
  response: text('response'),
  responseTimeMs: integer('response_time_ms'),
  tokensUsed: integer('tokens_used'),

  // Results metrics
  resultsCount: integer('results_count').default(0),
  maxRelevanceScore: text('max_relevance_score'),

  // Status
  successful: boolean('successful').notNull().default(true),
  errorMessage: text('error_message'),

  // Additional metadata
  metadata: jsonb('metadata').$type<{
    filters?: Record<string, unknown>;
    namespaces?: string[];
    promptTemplateId?: string;
    modelUsed?: string;
    rbacApplied?: boolean;
  }>(),

  // Audit
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_query_log_kakao').on(table.kakaoUserId),
  index('idx_query_log_employee').on(table.employeeId),
  index('idx_query_log_type').on(table.queryType),
  index('idx_query_log_successful').on(table.successful),
  index('idx_query_log_created').on(table.createdAt),
]);

export const queryLogsRelations = relations(queryLogs, ({ one }) => ({
  kakaoProfile: one(kakaoProfiles, {
    fields: [queryLogs.kakaoProfileId],
    references: [kakaoProfiles.id],
  }),
  employee: one(employees, {
    fields: [queryLogs.employeeId],
    references: [employees.id],
  }),
}));

export type QueryLog = typeof queryLogs.$inferSelect;
export type NewQueryLog = typeof queryLogs.$inferInsert;
