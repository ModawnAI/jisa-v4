# Phase 1: Database Schema & Migrations

**Duration**: 3-4 days
**Dependencies**: Phase 0 complete
**Deliverables**: Complete Drizzle schema, migrations, seed data

---

## Task 1.1: Drizzle ORM Setup

### 1.1.1 Install Drizzle Dependencies

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit @types/pg
```

### 1.1.2 Create Drizzle Configuration

**File**: `drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

### 1.1.3 Create Database Connection

**File**: `lib/db/index.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// For query purposes
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });
```

### Tests for 1.1
- [ ] Database connection test
- [ ] Schema introspection test

---

## Task 1.2: Core Schema Definitions

### 1.2.1 Enums and Types

**File**: `lib/db/schema/enums.ts`

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

// Employee related enums
export const employeeStatusEnum = pgEnum('employee_status', [
  'active',
  'inactive',
  'on_leave',
  'terminated',
]);

export const clearanceLevelEnum = pgEnum('clearance_level', [
  'basic',
  'standard',
  'advanced',
]);

export const employmentTypeEnum = pgEnum('employment_type', [
  'full_time',
  'part_time',
  'contract',
  'intern',
]);

// Document processing enums
export const processingStatusEnum = pgEnum('processing_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'rolled_back',
]);

export const documentTypeEnum = pgEnum('document_type', [
  'general',           // Company-wide documents
  'employee_specific', // Individual employee documents
]);

export const processingModeEnum = pgEnum('processing_mode', [
  'company_wide',      // Goes to company namespace only
  'employee_split',    // Splits to employee namespaces
]);

// Conflict resolution enums
export const conflictStatusEnum = pgEnum('conflict_status', [
  'detected',
  'pending_review',
  'resolved_keep_existing',
  'resolved_keep_new',
  'resolved_merged',
  'auto_resolved',
]);

export const conflictTypeEnum = pgEnum('conflict_type', [
  'duplicate_content',
  'version_mismatch',
  'category_mismatch',
  'metadata_conflict',
]);

// Audit enums
export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'restore',
  'rollback',
  'access',
]);
```

### 1.2.2 Organizations Schema

**File**: `lib/db/schema/organizations.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),

  // Settings
  pineconeNamespace: varchar('pinecone_namespace', { length: 255 }).notNull().unique(),
  settings: text('settings').$type<OrganizationSettings>(),

  // Status
  isActive: boolean('is_active').default(true).notNull(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export interface OrganizationSettings {
  maxEmployees?: number;
  maxStorageGB?: number;
  features?: string[];
  ragSettings?: {
    defaultTopK?: number;
    similarityThreshold?: number;
  };
}

export const organizationsRelations = relations(organizations, ({ many }) => ({
  employees: many(employees),
  categories: many(categories),
  templates: many(templates),
  documents: many(documents),
}));
```

### 1.2.3 Employees Schema

**File**: `lib/db/schema/employees.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, boolean, date, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { employeeStatusEnum, clearanceLevelEnum, employmentTypeEnum } from './enums';

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

  // Basic Info
  employeeNumber: varchar('employee_number', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),

  // Employment Details
  department: varchar('department', { length: 255 }),
  position: varchar('position', { length: 255 }),
  employmentType: employmentTypeEnum('employment_type').default('full_time').notNull(),
  hireDate: date('hire_date'),
  terminationDate: date('termination_date'),

  // Security
  clearanceLevel: clearanceLevelEnum('clearance_level').default('basic').notNull(),
  pineconeNamespace: varchar('pinecone_namespace', { length: 255 }).notNull().unique(),

  // Status
  status: employeeStatusEnum('status').default('active').notNull(),

  // Metadata for RAG
  ragMetadata: jsonb('rag_metadata').$type<EmployeeRAGMetadata>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdIdx: index('employees_org_id_idx').on(table.organizationId),
  employeeNumberIdx: index('employees_number_idx').on(table.organizationId, table.employeeNumber),
  statusIdx: index('employees_status_idx').on(table.status),
  departmentIdx: index('employees_department_idx').on(table.department),
}));

export interface EmployeeRAGMetadata {
  vectorCount?: number;
  lastSyncAt?: string;
  categories?: string[];
  documentCount?: number;
}

export const employeesRelations = relations(employees, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [employees.organizationId],
    references: [organizations.id],
  }),
  documents: many(employeeDocuments),
  dataLineage: many(dataLineage),
}));
```

### 1.2.4 Categories Schema (Dynamic Categories)

**File**: `lib/db/schema/categories.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

  // Hierarchy
  parentId: uuid('parent_id').references((): any => categories.id, { onDelete: 'set null' }),

  // Category Info
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }), // Phosphor icon name
  color: varchar('color', { length: 20 }), // Tailwind color class

  // Ordering
  sortOrder: integer('sort_order').default(0).notNull(),

  // Configuration
  config: jsonb('config').$type<CategoryConfig>(),

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  isSystem: boolean('is_system').default(false).notNull(), // System categories can't be deleted

  // Statistics (denormalized for performance)
  documentCount: integer('document_count').default(0).notNull(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgSlugIdx: uniqueIndex('categories_org_slug_idx').on(table.organizationId, table.slug),
  parentIdx: index('categories_parent_idx').on(table.parentId),
  sortIdx: index('categories_sort_idx').on(table.organizationId, table.sortOrder),
}));

export interface CategoryConfig {
  // Which fields from Excel should be extracted
  extractFields?: string[];
  // Default clearance level for documents in this category
  defaultClearance?: 'basic' | 'standard' | 'advanced';
  // RAG settings for this category
  ragSettings?: {
    chunkSize?: number;
    chunkOverlap?: number;
    embeddingModel?: string;
  };
  // Validation rules
  validationRules?: {
    requiredFields?: string[];
    fileTypes?: string[];
    maxFileSizeMB?: number;
  };
}

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [categories.organizationId],
    references: [organizations.id],
  }),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryHierarchy',
  }),
  children: many(categories, { relationName: 'categoryHierarchy' }),
  templates: many(templates),
  documents: many(documents),
}));
```

### 1.2.5 Templates Schema

**File**: `lib/db/schema/templates.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { categories } from './categories';
import { processingModeEnum } from './enums';

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),

  // Template Info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  version: varchar('version', { length: 20 }).default('1.0').notNull(),

  // Processing Configuration
  processingMode: processingModeEnum('processing_mode').default('company_wide').notNull(),

  // Column Mapping
  columnMapping: jsonb('column_mapping').$type<ColumnMapping>().notNull(),

  // Validation Rules
  validationRules: jsonb('validation_rules').$type<ValidationRule[]>(),

  // RAG Configuration
  ragConfig: jsonb('rag_config').$type<TemplateRAGConfig>(),

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('templates_org_idx').on(table.organizationId),
  categoryIdx: index('templates_category_idx').on(table.categoryId),
}));

export interface ColumnMapping {
  // Which column contains employee identifier (for employee_split mode)
  employeeIdentifierColumn?: string;

  // Column to field mapping
  columns: {
    [excelColumn: string]: {
      fieldName: string;
      dataType: 'string' | 'number' | 'date' | 'boolean';
      isRequired: boolean;
      defaultValue?: any;
      transform?: 'uppercase' | 'lowercase' | 'trim' | 'date_parse';
    };
  };

  // Skip rows configuration
  headerRow: number;
  dataStartRow: number;

  // Sheet configuration
  sheetName?: string;
  sheetIndex?: number;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'regex' | 'range' | 'enum' | 'unique' | 'date_format';
  value?: any;
  message: string;
}

export interface TemplateRAGConfig {
  // How to combine columns for embedding
  embeddingTemplate: string; // e.g., "{{name}}: {{description}} ({{category}})"

  // Metadata to include in vector
  metadataFields: string[];

  // Chunking strategy
  chunkStrategy: 'row' | 'group' | 'document';
  groupByColumn?: string; // For 'group' strategy

  // Processing settings
  batchSize: number;
  skipDuplicates: boolean;
}

export const templatesRelations = relations(templates, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [templates.organizationId],
    references: [organizations.id],
  }),
  category: one(categories, {
    fields: [templates.categoryId],
    references: [categories.id],
  }),
  documents: many(documents),
}));
```

### Tests for 1.2
- [ ] Schema type validation
- [ ] Enum value tests
- [ ] JSON type tests

---

## Task 1.3: Document Processing Schema

### 1.3.1 Documents Schema

**File**: `lib/db/schema/documents.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, bigint, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { categories } from './categories';
import { templates } from './templates';
import { processingStatusEnum, documentTypeEnum, processingModeEnum } from './enums';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  templateId: uuid('template_id').references(() => templates.id, { onDelete: 'set null' }),

  // Document Info
  fileName: varchar('file_name', { length: 500 }).notNull(),
  originalFileName: varchar('original_file_name', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),

  // Storage
  storagePath: varchar('storage_path', { length: 1000 }).notNull(),
  storageUrl: text('storage_url'),

  // Processing Configuration
  documentType: documentTypeEnum('document_type').default('general').notNull(),
  processingMode: processingModeEnum('processing_mode').default('company_wide').notNull(),

  // Processing Status
  processingStatus: processingStatusEnum('processing_status').default('pending').notNull(),
  processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
  processingCompletedAt: timestamp('processing_completed_at', { withTimezone: true }),
  processingError: text('processing_error'),

  // Version Control
  version: integer('version').default(1).notNull(),
  parentDocumentId: uuid('parent_document_id').references((): any => documents.id),
  isLatest: boolean('is_latest').default(true).notNull(),

  // Processing Results
  processingResult: jsonb('processing_result').$type<ProcessingResult>(),

  // Metadata
  metadata: jsonb('metadata').$type<DocumentMetadata>(),

  // Uploaded by
  uploadedBy: uuid('uploaded_by'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('documents_org_idx').on(table.organizationId),
  categoryIdx: index('documents_category_idx').on(table.categoryId),
  statusIdx: index('documents_status_idx').on(table.processingStatus),
  versionIdx: index('documents_version_idx').on(table.parentDocumentId, table.version),
  latestIdx: index('documents_latest_idx').on(table.organizationId, table.isLatest),
}));

export interface ProcessingResult {
  totalRows: number;
  processedRows: number;
  skippedRows: number;
  errorRows: number;

  // For employee_split mode
  employeeBreakdown?: {
    employeeId: string;
    employeeName: string;
    rowCount: number;
    vectorCount: number;
  }[];

  // Vector statistics
  vectorsCreated: number;
  namespacesUpdated: string[];

  // Timing
  processingTimeMs: number;

  // Errors
  errors?: {
    row: number;
    field?: string;
    message: string;
  }[];
}

export interface DocumentMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  source?: string;
  effectiveDate?: string;
  expirationDate?: string;
  customFields?: Record<string, any>;
}

export const documentsRelations = relations(documents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [documents.organizationId],
    references: [organizations.id],
  }),
  category: one(categories, {
    fields: [documents.categoryId],
    references: [categories.id],
  }),
  template: one(templates, {
    fields: [documents.templateId],
    references: [templates.id],
  }),
  parentDocument: one(documents, {
    fields: [documents.parentDocumentId],
    references: [documents.id],
    relationName: 'documentVersions',
  }),
  versions: many(documents, { relationName: 'documentVersions' }),
  employeeDocuments: many(employeeDocuments),
  processingBatches: many(processingBatches),
  dataLineage: many(dataLineage),
  conflicts: many(conflicts),
}));
```

### 1.3.2 Employee Documents Junction

**File**: `lib/db/schema/employee-documents.ts`

```typescript
import { pgTable, uuid, timestamp, integer, jsonb, index, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { employees } from './employees';
import { documents } from './documents';

export const employeeDocuments = pgTable('employee_documents', {
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),

  // Processing details for this employee's portion
  rowRange: jsonb('row_range').$type<{ start: number; end: number }>(),
  vectorIds: jsonb('vector_ids').$type<string[]>(),
  vectorCount: integer('vector_count').default(0).notNull(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.employeeId, table.documentId] }),
  employeeIdx: index('employee_documents_employee_idx').on(table.employeeId),
  documentIdx: index('employee_documents_document_idx').on(table.documentId),
}));

export const employeeDocumentsRelations = relations(employeeDocuments, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeDocuments.employeeId],
    references: [employees.id],
  }),
  document: one(documents, {
    fields: [employeeDocuments.documentId],
    references: [documents.id],
  }),
}));
```

### 1.3.3 Processing Batches Schema

**File**: `lib/db/schema/processing-batches.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { documents } from './documents';
import { processingStatusEnum } from './enums';

export const processingBatches = pgTable('processing_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),

  // Batch Info
  batchNumber: integer('batch_number').notNull(),
  totalBatches: integer('total_batches').notNull(),

  // Row Range
  startRow: integer('start_row').notNull(),
  endRow: integer('end_row').notNull(),

  // Status
  status: processingStatusEnum('status').default('pending').notNull(),

  // Results
  processedRows: integer('processed_rows').default(0).notNull(),
  vectorsCreated: integer('vectors_created').default(0).notNull(),
  errors: jsonb('errors').$type<BatchError[]>(),

  // Timing
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  // Inngest Job Reference
  inngestRunId: varchar('inngest_run_id', { length: 255 }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  documentIdx: index('processing_batches_document_idx').on(table.documentId),
  statusIdx: index('processing_batches_status_idx').on(table.status),
}));

export interface BatchError {
  row: number;
  field?: string;
  message: string;
  severity: 'warning' | 'error';
}

export const processingBatchesRelations = relations(processingBatches, ({ one }) => ({
  document: one(documents, {
    fields: [processingBatches.documentId],
    references: [documents.id],
  }),
}));
```

### Tests for 1.3
- [ ] Document creation test
- [ ] Employee document junction test
- [ ] Processing batch creation test

---

## Task 1.4: Data Lineage & Audit Schema

### 1.4.1 Data Lineage Schema

**File**: `lib/db/schema/data-lineage.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { documents } from './documents';
import { employees } from './employees';

export const dataLineage = pgTable('data_lineage', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Source Reference
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'set null' }),

  // Vector Reference
  vectorId: varchar('vector_id', { length: 255 }).notNull(),
  namespace: varchar('namespace', { length: 255 }).notNull(),

  // Source Data
  sourceRow: jsonb('source_row').$type<Record<string, any>>().notNull(),
  sourceRowNumber: integer('source_row_number').notNull(),

  // Embedded Content
  embeddedContent: text('embedded_content').notNull(),

  // Metadata at time of embedding
  embeddingMetadata: jsonb('embedding_metadata').$type<EmbeddingMetadata>().notNull(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  documentIdx: index('data_lineage_document_idx').on(table.documentId),
  employeeIdx: index('data_lineage_employee_idx').on(table.employeeId),
  vectorIdx: index('data_lineage_vector_idx').on(table.vectorId),
  namespaceIdx: index('data_lineage_namespace_idx').on(table.namespace),
}));

export interface EmbeddingMetadata {
  categoryId?: string;
  categoryName?: string;
  templateId?: string;
  templateName?: string;
  documentVersion: number;
  embeddingModel: string;
  embeddingDimension: number;
  processingTimestamp: string;
  contentHash: string;
}

export const dataLineageRelations = relations(dataLineage, ({ one }) => ({
  document: one(documents, {
    fields: [dataLineage.documentId],
    references: [documents.id],
  }),
  employee: one(employees, {
    fields: [dataLineage.employeeId],
    references: [employees.id],
  }),
}));

// Import for the integer type used above
import { integer } from 'drizzle-orm/pg-core';
```

### 1.4.2 Conflicts Schema

**File**: `lib/db/schema/conflicts.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { documents } from './documents';
import { conflictStatusEnum, conflictTypeEnum } from './enums';

export const conflicts = pgTable('conflicts', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Document Reference
  newDocumentId: uuid('new_document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  existingDocumentId: uuid('existing_document_id').references(() => documents.id, { onDelete: 'set null' }),

  // Conflict Details
  conflictType: conflictTypeEnum('conflict_type').notNull(),
  status: conflictStatusEnum('status').default('detected').notNull(),

  // Conflict Data
  conflictDetails: jsonb('conflict_details').$type<ConflictDetails>().notNull(),

  // Resolution
  resolvedBy: uuid('resolved_by'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionNotes: text('resolution_notes'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  newDocIdx: index('conflicts_new_doc_idx').on(table.newDocumentId),
  existingDocIdx: index('conflicts_existing_doc_idx').on(table.existingDocumentId),
  statusIdx: index('conflicts_status_idx').on(table.status),
}));

export interface ConflictDetails {
  // Content similarity for duplicate detection
  similarityScore?: number;

  // Specific conflicting fields
  conflictingFields?: {
    field: string;
    existingValue: any;
    newValue: any;
  }[];

  // Affected rows
  affectedRows?: number[];

  // Affected vectors
  affectedVectorIds?: string[];

  // Suggested resolution
  suggestedResolution?: 'keep_existing' | 'keep_new' | 'merge';
  suggestedMergeStrategy?: string;
}

export const conflictsRelations = relations(conflicts, ({ one }) => ({
  newDocument: one(documents, {
    fields: [conflicts.newDocumentId],
    references: [documents.id],
    relationName: 'newDocumentConflicts',
  }),
  existingDocument: one(documents, {
    fields: [conflicts.existingDocumentId],
    references: [documents.id],
    relationName: 'existingDocumentConflicts',
  }),
}));
```

### 1.4.3 Audit Log Schema

**File**: `lib/db/schema/audit-logs.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, jsonb, index, inet } from 'drizzle-orm/pg-core';
import { auditActionEnum } from './enums';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Organization scope
  organizationId: uuid('organization_id').notNull(),

  // Actor
  userId: uuid('user_id'),
  userEmail: varchar('user_email', { length: 255 }),
  userRole: varchar('user_role', { length: 50 }),

  // Action
  action: auditActionEnum('action').notNull(),
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceId: uuid('resource_id'),
  resourceName: varchar('resource_name', { length: 500 }),

  // Details
  details: jsonb('details').$type<AuditDetails>(),

  // Request Info
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  requestId: varchar('request_id', { length: 100 }),

  // Timestamp
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('audit_logs_org_idx').on(table.organizationId),
  userIdx: index('audit_logs_user_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

export interface AuditDetails {
  // Before/After for updates
  before?: Record<string, any>;
  after?: Record<string, any>;

  // Changed fields
  changedFields?: string[];

  // Additional context
  context?: Record<string, any>;

  // Error info if action failed
  error?: {
    code: string;
    message: string;
  };
}
```

### Tests for 1.4
- [ ] Data lineage tracking test
- [ ] Conflict detection test
- [ ] Audit log creation test

---

## Task 1.5: Schema Index & Migrations

### 1.5.1 Schema Index

**File**: `lib/db/schema/index.ts`

```typescript
// Enums
export * from './enums';

// Core tables
export * from './organizations';
export * from './employees';
export * from './categories';
export * from './templates';

// Documents
export * from './documents';
export * from './employee-documents';
export * from './processing-batches';

// Lineage & Audit
export * from './data-lineage';
export * from './conflicts';
export * from './audit-logs';
```

### 1.5.2 Generate Migration

```bash
npm run db:generate
```

### 1.5.3 Run Migration

**File**: `lib/db/migrate.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const runMigration = async () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  console.log('Running migrations...');

  await migrate(db, { migrationsFolder: './lib/db/migrations' });

  console.log('Migrations complete!');

  await sql.end();
  process.exit(0);
};

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

### 1.5.4 Package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx lib/db/migrate.ts",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx lib/db/seed.ts"
  }
}
```

---

## Task 1.6: Seed Data

### 1.6.1 Seed Script

**File**: `lib/db/seed.ts`

```typescript
import { db } from './index';
import { organizations, employees, categories } from './schema';

const seed = async () => {
  console.log('Seeding database...');

  // Create demo organization
  const [org] = await db.insert(organizations).values({
    name: '지사앱 데모',
    slug: 'jisa-demo',
    pineconeNamespace: 'org_jisa_demo',
    description: '지사앱 데모 조직',
    settings: {
      maxEmployees: 100,
      maxStorageGB: 10,
      features: ['rag', 'excel_processing', 'employee_split'],
    },
  }).returning();

  console.log('Created organization:', org.name);

  // Create demo employees
  const demoEmployees = [
    { name: '김철수', employeeNumber: 'EMP001', department: '영업부', position: '과장' },
    { name: '이영희', employeeNumber: 'EMP002', department: '인사부', position: '대리' },
    { name: '박민수', employeeNumber: 'EMP003', department: '개발팀', position: '선임' },
    { name: '정수진', employeeNumber: 'EMP004', department: '마케팅', position: '사원' },
    { name: '최동훈', employeeNumber: 'EMP005', department: '영업부', position: '부장' },
  ];

  for (const emp of demoEmployees) {
    await db.insert(employees).values({
      organizationId: org.id,
      ...emp,
      pineconeNamespace: `emp_${emp.employeeNumber.toLowerCase()}`,
      email: `${emp.employeeNumber.toLowerCase()}@demo.com`,
      clearanceLevel: 'standard',
    });
  }

  console.log(`Created ${demoEmployees.length} employees`);

  // Create demo categories
  const demoCategories = [
    { name: '인사/급여', slug: 'hr-payroll', icon: 'Users', color: 'blue', isSystem: true },
    { name: '계약/법무', slug: 'contracts', icon: 'FileText', color: 'green', isSystem: true },
    { name: '영업/매출', slug: 'sales', icon: 'TrendUp', color: 'amber', isSystem: true },
    { name: '교육/훈련', slug: 'training', icon: 'GraduationCap', color: 'purple', isSystem: false },
    { name: '복리후생', slug: 'benefits', icon: 'Gift', color: 'pink', isSystem: false },
  ];

  for (let i = 0; i < demoCategories.length; i++) {
    await db.insert(categories).values({
      organizationId: org.id,
      ...demoCategories[i],
      sortOrder: i,
    });
  }

  console.log(`Created ${demoCategories.length} categories`);

  console.log('Seeding complete!');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
```

### Tests for 1.6
- [ ] Seed script execution test
- [ ] Data integrity verification

---

## Phase Completion Checklist

- [ ] All schema files created
- [ ] drizzle.config.ts configured
- [ ] Database connection working
- [ ] Migrations generated
- [ ] Migrations applied successfully
- [ ] Seed data created
- [ ] Drizzle Studio accessible
- [ ] All schema tests passing
- [ ] TypeScript types exported correctly
- [ ] Relations working correctly

---

## Next Phase

→ [Phase 2: Authentication & Authorization](./PHASE-02-AUTH.md)
