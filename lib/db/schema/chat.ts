import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { employees } from './employees';

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),

  title: text('title'),
  summary: text('summary'),

  // Metadata
  metadata: jsonb('metadata'),
  // {
  //   messageCount?: number;
  //   lastQueryTopics?: string[];
  //   ...
  // }

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_session_employee').on(table.employeeId),
]);

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => chatSessions.id).notNull(),

  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),

  // RAG Context
  sourceChunkIds: jsonb('source_chunk_ids'), // string[]
  ragContext: jsonb('rag_context'),

  // Token Usage
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_message_session').on(table.sessionId),
]);

export const sessionsRelations = relations(chatSessions, ({ one, many }) => ({
  employee: one(employees, {
    fields: [chatSessions.employeeId],
    references: [employees.id],
  }),
  messages: many(chatMessages),
}));

export const messagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
