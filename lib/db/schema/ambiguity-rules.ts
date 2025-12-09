/**
 * Ambiguous Keyword Rules Schema
 *
 * Stores rules for detecting when user queries could match multiple
 * document types, triggering clarification flows.
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  numeric,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Option for clarification choice
 */
export interface ClarificationOption {
  label: string;           // Display text (e.g., "급여/실수령액")
  template: string;        // Template slug (e.g., "compensation")
  description: string;     // Help text (e.g., "이번달 실제 받은 금액")
  metadataType?: string;   // Optional specific metadata type filter
}

/**
 * Ambiguous Keyword Rules Table
 */
export const ambiguousKeywordRules = pgTable('ambiguous_keyword_rules', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Keywords that trigger this rule (array for synonyms)
  keywords: text('keywords').array().notNull(),

  // Which templates could match these keywords
  competingTemplates: text('competing_templates').array().notNull(),

  // The question to ask user for clarification (Korean)
  clarificationQuestion: text('clarification_question').notNull(),

  // Options for user to choose from
  options: jsonb('options').$type<ClarificationOption[]>().notNull().default([]),

  // Score threshold - if competing results within this ratio, trigger clarification
  scoreThreshold: numeric('score_threshold', { precision: 3, scale: 2 }).default('0.85'),

  // Priority for rule matching (higher = checked first)
  priority: integer('priority').notNull().default(0),

  // Whether this rule is active
  isActive: boolean('is_active').notNull().default(true),

  // Audit fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => [
  index('idx_ambiguous_keywords_gin').using('gin', table.keywords),
  index('idx_ambiguous_active_priority').on(table.isActive, table.priority),
]);

// Type inference
export type AmbiguousKeywordRule = typeof ambiguousKeywordRules.$inferSelect;
export type NewAmbiguousKeywordRule = typeof ambiguousKeywordRules.$inferInsert;
