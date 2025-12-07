/**
 * Detailed Employee Records Schema
 *
 * These tables store individual contract-level records from compensation Excel files.
 * Each record maintains a reference to the source document and employee.
 */

import { pgTable, uuid, text, decimal, date, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { documents } from './documents';
import { relations } from 'drizzle-orm';

// =============================================================================
// Employee Commissions (건별수수료)
// =============================================================================

export const employeeCommissions = pgTable('employee_commissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: text('employee_id').notNull(), // 사번
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  period: text('period').notNull(), // 마감년월 (e.g., '202509')
  insuranceCompany: text('insurance_company'), // 보험사
  policyNumber: text('policy_number'), // 증권번호
  contractorName: text('contractor_name'), // 계약자명
  productName: text('product_name'), // 상품명
  contractDate: date('contract_date'), // 계약일
  paymentDate: date('payment_date'), // 지급일
  commissionAmount: decimal('commission_amount', { precision: 15, scale: 2 }).notNull().default('0'), // 수수료금액
  commissionRate: decimal('commission_rate', { precision: 5, scale: 4 }), // 수수료율
  premiumAmount: decimal('premium_amount', { precision: 15, scale: 2 }), // 보험료
  rawData: jsonb('raw_data'), // Original row data
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_employee_commissions_employee_period').on(table.employeeId, table.period),
  index('idx_employee_commissions_document').on(table.documentId),
  index('idx_employee_commissions_insurance').on(table.insuranceCompany),
]);

export const employeeCommissionsRelations = relations(employeeCommissions, ({ one }) => ({
  document: one(documents, {
    fields: [employeeCommissions.documentId],
    references: [documents.id],
  }),
}));

// =============================================================================
// Employee Overrides (건별OR)
// =============================================================================

export const employeeOverrides = pgTable('employee_overrides', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: text('employee_id').notNull(), // 사번 (manager receiving OR)
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  period: text('period').notNull(), // 마감년월
  insuranceCompany: text('insurance_company'), // 보험사
  agentId: text('agent_id'), // 설계사 사번
  agentName: text('agent_name'), // 설계사명
  policyNumber: text('policy_number'), // 증권번호
  contractorName: text('contractor_name'), // 계약자명
  overrideAmount: decimal('override_amount', { precision: 15, scale: 2 }).notNull().default('0'), // OR금액
  overrideRate: decimal('override_rate', { precision: 5, scale: 4 }), // OR율
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_employee_overrides_employee_period').on(table.employeeId, table.period),
  index('idx_employee_overrides_document').on(table.documentId),
]);

export const employeeOverridesRelations = relations(employeeOverrides, ({ one }) => ({
  document: one(documents, {
    fields: [employeeOverrides.documentId],
    references: [documents.id],
  }),
}));

// =============================================================================
// Employee Incentives (시책건별)
// =============================================================================

export const employeeIncentives = pgTable('employee_incentives', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: text('employee_id').notNull(), // 사번
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  period: text('period').notNull(), // 마감년월
  insuranceCompany: text('insurance_company'), // 보험사
  policyNumber: text('policy_number'), // 증권번호
  contractorName: text('contractor_name'), // 계약자명
  productName: text('product_name'), // 상품명
  incentiveType: text('incentive_type'), // 시책종류
  incentiveAmount: decimal('incentive_amount', { precision: 15, scale: 2 }).notNull().default('0'), // 시책금액
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_employee_incentives_employee_period').on(table.employeeId, table.period),
  index('idx_employee_incentives_document').on(table.documentId),
]);

export const employeeIncentivesRelations = relations(employeeIncentives, ({ one }) => ({
  document: one(documents, {
    fields: [employeeIncentives.documentId],
    references: [documents.id],
  }),
}));

// =============================================================================
// Employee Clawbacks (환수)
// =============================================================================

export const employeeClawbacks = pgTable('employee_clawbacks', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: text('employee_id').notNull(), // 사번
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  period: text('period').notNull(), // 마감년월
  insuranceCompany: text('insurance_company'), // 보험사
  policyNumber: text('policy_number'), // 증권번호
  contractorName: text('contractor_name'), // 계약자명
  clawbackType: text('clawback_type'), // 환수유형 (commission/override/incentive)
  clawbackReason: text('clawback_reason'), // 환수사유
  clawbackAmount: decimal('clawback_amount', { precision: 15, scale: 2 }).notNull().default('0'), // 환수금액
  originalPaymentDate: date('original_payment_date'), // 원래지급일
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_employee_clawbacks_employee_period').on(table.employeeId, table.period),
  index('idx_employee_clawbacks_document').on(table.documentId),
]);

export const employeeClawbacksRelations = relations(employeeClawbacks, ({ one }) => ({
  document: one(documents, {
    fields: [employeeClawbacks.documentId],
    references: [documents.id],
  }),
}));

// =============================================================================
// Employee Performance (업적)
// =============================================================================

export const employeePerformance = pgTable('employee_performance', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: text('employee_id').notNull(), // 사번
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  period: text('period').notNull(), // 마감년월
  insuranceCompany: text('insurance_company'), // 보험사
  performanceType: text('performance_type'), // 업적유형 (monthly/quarterly/yearly)
  metricName: text('metric_name'), // 지표명
  metricValue: decimal('metric_value', { precision: 15, scale: 2 }), // 지표값
  targetValue: decimal('target_value', { precision: 15, scale: 2 }), // 목표값
  achievementRate: decimal('achievement_rate', { precision: 10, scale: 4 }), // 달성률 (can exceed 100% significantly for MDRT)
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_employee_performance_employee_period').on(table.employeeId, table.period),
  index('idx_employee_performance_document').on(table.documentId),
]);

export const employeePerformanceRelations = relations(employeePerformance, ({ one }) => ({
  document: one(documents, {
    fields: [employeePerformance.documentId],
    references: [documents.id],
  }),
}));

// =============================================================================
// Employee Allowances (추가수당)
// =============================================================================

export const employeeAllowances = pgTable('employee_allowances', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: text('employee_id').notNull(), // 사번
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  period: text('period').notNull(), // 마감년월
  allowanceType: text('allowance_type').notNull(), // 수당유형
  allowanceName: text('allowance_name'), // 수당명
  allowanceAmount: decimal('allowance_amount', { precision: 15, scale: 2 }).notNull().default('0'), // 수당금액
  description: text('description'), // 설명
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_employee_allowances_employee_period').on(table.employeeId, table.period),
  index('idx_employee_allowances_document').on(table.documentId),
]);

export const employeeAllowancesRelations = relations(employeeAllowances, ({ one }) => ({
  document: one(documents, {
    fields: [employeeAllowances.documentId],
    references: [documents.id],
  }),
}));

// =============================================================================
// Type Exports
// =============================================================================

export type EmployeeCommission = typeof employeeCommissions.$inferSelect;
export type NewEmployeeCommission = typeof employeeCommissions.$inferInsert;

export type EmployeeOverride = typeof employeeOverrides.$inferSelect;
export type NewEmployeeOverride = typeof employeeOverrides.$inferInsert;

export type EmployeeIncentive = typeof employeeIncentives.$inferSelect;
export type NewEmployeeIncentive = typeof employeeIncentives.$inferInsert;

export type EmployeeClawback = typeof employeeClawbacks.$inferSelect;
export type NewEmployeeClawback = typeof employeeClawbacks.$inferInsert;

export type EmployeePerformanceRecord = typeof employeePerformance.$inferSelect;
export type NewEmployeePerformanceRecord = typeof employeePerformance.$inferInsert;

export type EmployeeAllowance = typeof employeeAllowances.$inferSelect;
export type NewEmployeeAllowance = typeof employeeAllowances.$inferInsert;
