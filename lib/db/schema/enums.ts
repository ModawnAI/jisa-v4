import { pgEnum } from 'drizzle-orm/pg-core';

export const clearanceLevelEnum = pgEnum('clearance_level', [
  'basic',
  'standard',
  'advanced',
]);

export const namespaceTypeEnum = pgEnum('namespace_type', [
  'company',
  'employee',
]);

export const fileTypeEnum = pgEnum('file_type', [
  'excel',
  'csv',
  'pdf',
  'word',
]);

export const processingModeEnum = pgEnum('processing_mode', [
  'company',
  'employee_split',
  'employee_aggregate',
]);

export const chunkingStrategyEnum = pgEnum('chunking_strategy', [
  'auto',
  'row_per_chunk',
  'fixed_size',
  'semantic',
]);

export const documentStatusEnum = pgEnum('document_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'partial',
]);

export const processingStatusEnum = pgEnum('processing_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'rolled_back',
]);

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'org_admin',
  'manager',
  'employee',
  'viewer',
]);
