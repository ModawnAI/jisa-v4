import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { userRoleEnum } from './enums';
import { employees } from './employees';

export interface UserPermissions {
  documents?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
    process?: boolean;
    rollback?: boolean;
  };
  employees?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
    viewSensitive?: boolean;
  };
  categories?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  templates?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  rag?: {
    query?: boolean;
    queryAllEmployees?: boolean;
    viewLineage?: boolean;
  };
  admin?: {
    manageUsers?: boolean;
    viewAuditLogs?: boolean;
    manageSettings?: boolean;
  };
}

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Matches Supabase auth.users.id

  // Profile
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),

  // Role & Permissions
  role: userRoleEnum('role').default('employee').notNull(),
  permissions: jsonb('permissions').$type<UserPermissions>(),

  // Employee Link (if user is also an employee)
  employeeId: uuid('employee_id').references((): AnyPgColumn => employees.id, { onDelete: 'set null' }),

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('users_role_idx').on(table.role),
  index('users_employee_idx').on(table.employeeId),
]);

export const usersRelations = relations(users, ({ one }) => ({
  employee: one(employees, {
    fields: [users.employeeId],
    references: [employees.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
