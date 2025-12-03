import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { employees } from './employees';

/**
 * KakaoTalk user profiles for chatbot integration
 * Links KakaoTalk users to employees for RBAC
 */
export const kakaoProfiles = pgTable('kakao_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),

  // KakaoTalk identification
  kakaoUserId: text('kakao_user_id').notNull().unique(),
  displayName: text('display_name'),
  profileImageUrl: text('profile_image_url'),

  // Employee linkage (via verification)
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'set null' }),

  // Subscription tier for RBAC
  subscriptionTier: text('subscription_tier').notNull().default('free'),

  // Verification status
  isVerified: boolean('is_verified').notNull().default(false),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),

  // Activity tracking
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  messageCount: text('message_count').default('0'),

  // Audit
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_kakao_user_id').on(table.kakaoUserId),
  index('idx_kakao_employee_id').on(table.employeeId),
  index('idx_kakao_verified').on(table.isVerified),
]);

export const kakaoProfilesRelations = relations(kakaoProfiles, ({ one }) => ({
  employee: one(employees, {
    fields: [kakaoProfiles.employeeId],
    references: [employees.id],
  }),
}));

export type KakaoProfile = typeof kakaoProfiles.$inferSelect;
export type NewKakaoProfile = typeof kakaoProfiles.$inferInsert;
