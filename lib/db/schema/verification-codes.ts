import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { employees } from './employees';
import { users } from './users';

/**
 * Verification codes for linking KakaoTalk users to employees
 * Used in the KakaoTalk chatbot verification flow
 *
 * Code format: EMP-{employee_id}-{random_suffix}
 * Example: EMP-00124-X7K
 */
export const verificationCodes = pgTable('verification_codes', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Verification code (format: EMP-{employee_id}-{random})
  code: text('code').notNull().unique(),

  // KakaoTalk user who used this code (null until used)
  kakaoUserId: text('kakao_user_id'),

  // Target employee to link
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'cascade' }),

  // Employee identification for lookup (사번)
  employeeCode: text('employee_code'),

  // Status: active, used, expired, revoked
  status: text('status').notNull().default('active'),

  // Role assigned when code is used: ceo, admin, manager, senior, junior, user
  role: text('role').notNull().default('user'),

  // Subscription tier: enterprise, pro, basic, free
  tier: text('tier').notNull().default('free'),

  // Employee RAG namespace (format: emp_{employee_uuid})
  pineconeNamespace: text('pinecone_namespace'),

  // Usage limits
  maxUses: integer('max_uses').notNull().default(1),
  currentUses: integer('current_uses').notNull().default(0),

  // Description for admin reference
  description: text('description'),

  // Expiration and usage tracking
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),

  // Audit
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => [
  index('idx_verification_code').on(table.code),
  index('idx_verification_kakao').on(table.kakaoUserId),
  index('idx_verification_employee').on(table.employeeId),
  index('idx_verification_expires').on(table.expiresAt),
  index('idx_verification_status').on(table.status),
]);

export const verificationCodesRelations = relations(verificationCodes, ({ one }) => ({
  employee: one(employees, {
    fields: [verificationCodes.employeeId],
    references: [employees.id],
  }),
  creator: one(users, {
    fields: [verificationCodes.createdBy],
    references: [users.id],
  }),
}));

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;
