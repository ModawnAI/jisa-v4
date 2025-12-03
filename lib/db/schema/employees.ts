import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clearanceLevelEnum } from './enums';

export const employees = pgTable('employees', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Identification
  employeeId: text('employee_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),

  // Organization
  department: text('department'),
  position: text('position'),
  managerId: uuid('manager_id').references((): AnyPgColumn => employees.id),

  // Access Control
  clearanceLevel: clearanceLevelEnum('clearance_level').notNull().default('basic'),
  kakaoId: text('kakao_id').unique(),
  supabaseUserId: uuid('supabase_user_id').unique(),

  // Status
  isActive: boolean('is_active').notNull().default(true),
  hireDate: timestamp('hire_date'),
  terminationDate: timestamp('termination_date'),

  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
  createdBy: uuid('created_by'),
}, (table) => [
  index('idx_employee_id').on(table.employeeId),
  index('idx_kakao_id').on(table.kakaoId),
  index('idx_department').on(table.department),
  index('idx_is_active').on(table.isActive),
]);

export const employeesRelations = relations(employees, ({ one, many }) => ({
  manager: one(employees, {
    fields: [employees.managerId],
    references: [employees.id],
    relationName: 'manager',
  }),
  subordinates: many(employees, {
    relationName: 'manager',
  }),
}));

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
