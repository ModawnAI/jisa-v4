import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * Chat Settings Table
 * Stores AI agent configuration including name, welcome message,
 * signatures, and formatting rules for KakaoTalk responses.
 *
 * This is a singleton table - only one active row should exist.
 */
export const chatSettings = pgTable('chat_settings', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Agent Identity
  agentName: text('agent_name').notNull().default('지사앱 AI'),
  agentEmoji: text('agent_emoji').default('🤖'),

  // Welcome message for new users
  welcomeMessage: text('welcome_message').notNull().default(`안녕하세요! 👋
지사앱 AI입니다.

무엇을 도와드릴까요?

💡 "/" 로 시작하면
  개인 데이터 조회가
  가능합니다.`),

  // Signature/footer for responses
  signature: text('signature').default(''),
  signatureEnabled: boolean('signature_enabled').notNull().default(false),

  // Header template (prepended to responses)
  headerTemplate: text('header_template').default(''),
  headerEnabled: boolean('header_enabled').notNull().default(false),

  // Formatting settings
  maxLineWidth: integer('max_line_width').notNull().default(22),
  useEmojis: boolean('use_emojis').notNull().default(true),
  useIndentation: boolean('use_indentation').notNull().default(true),

  // Error response messages
  errorGeneric: text('error_generic').notNull().default(`죄송합니다.
오류가 발생했습니다.

잠시 후 다시
시도해주세요. 🙏`),

  errorNotRegistered: text('error_not_registered').notNull().default(`등록된 직원만
사용 가능합니다.

인증 코드로 먼저
등록해주세요. 🔐`),

  errorNoResults: text('error_no_results').notNull().default(`관련 정보를
찾지 못했습니다.

다른 키워드로
검색해보세요. 🔍`),

  // Rate limiting message
  rateLimitMessage: text('rate_limit_message').default(`요청이 너무 많습니다.

잠시 후 다시
시도해주세요. ⏳`),

  // Singleton flag
  isActive: boolean('is_active').notNull().default(true),

  // Audit
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_chat_settings_active').on(table.isActive),
]);

// Relations
export const chatSettingsRelations = relations(chatSettings, ({ one }) => ({
  updater: one(users, {
    fields: [chatSettings.updatedBy],
    references: [users.id],
  }),
}));

// Types
export type ChatSettings = typeof chatSettings.$inferSelect;
export type NewChatSettings = typeof chatSettings.$inferInsert;

/**
 * Default chat settings values
 */
export const DEFAULT_CHAT_SETTINGS: Partial<NewChatSettings> = {
  agentName: '지사앱 AI',
  agentEmoji: '🤖',
  maxLineWidth: 22,
  useEmojis: true,
  useIndentation: true,
  signatureEnabled: false,
  headerEnabled: false,
};
