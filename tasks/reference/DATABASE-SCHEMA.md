# Database Schema Reference

> Drizzle ORM + PostgreSQL schema for JISA App

---

## 1. Setup

### 1.1 Installation

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

### 1.2 Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

### 1.3 Database Client

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
```

---

## 2. Schema Files Structure

```
lib/db/schema/
├── index.ts              # Re-exports all schemas
├── employees.ts          # Employees table
├── categories.ts         # Document categories
├── templates.ts          # Document templates
├── documents.ts          # Uploaded documents
├── knowledge-chunks.ts   # RAG chunks
├── processing.ts         # Processing batches & lineage
├── chat.ts               # Chat sessions
└── enums.ts              # Shared enums
```

---

## 3. Core Schemas

### 3.1 Employees

```typescript
// lib/db/schema/employees.ts
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
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
  managerId: uuid('manager_id').references(() => employees.id),

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
}, (table) => ({
  employeeIdIdx: index('idx_employee_id').on(table.employeeId),
  kakaoIdIdx: index('idx_kakao_id').on(table.kakaoId),
  departmentIdx: index('idx_department').on(table.department),
  isActiveIdx: index('idx_is_active').on(table.isActive),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  manager: one(employees, {
    fields: [employees.managerId],
    references: [employees.id],
    relationName: 'manager',
  }),
  subordinates: many(employees, {
    relationName: 'manager',
  }),
  documents: many(documents),
  chatSessions: many(chatSessions),
}));

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
```

### 3.2 Document Categories

```typescript
// lib/db/schema/categories.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clearanceLevelEnum, namespaceTypeEnum } from './enums';

export const documentCategories = pgTable('document_categories', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Basic Info
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),

  // Hierarchy
  parentId: uuid('parent_id').references(() => documentCategories.id),
  depth: integer('depth').notNull().default(0),
  path: text('path').notNull(),

  // Access Control
  minClearanceLevel: clearanceLevelEnum('min_clearance_level').notNull().default('basic'),
  namespaceType: namespaceTypeEnum('namespace_type').notNull().default('company'),

  // Display
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  color: text('color'),

  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => employees.id),
}, (table) => ({
  pathIdx: index('idx_category_path').on(table.path),
  parentIdx: index('idx_category_parent').on(table.parentId),
  slugIdx: index('idx_category_slug').on(table.slug),
}));

export const documentTypes = pgTable('document_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').references(() => documentCategories.id).notNull(),

  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),

  // JSON Schema for metadata
  metadataSchema: text('metadata_schema'), // JSON string

  defaultTemplateId: uuid('default_template_id'),
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categoriesRelations = relations(documentCategories, ({ one, many }) => ({
  parent: one(documentCategories, {
    fields: [documentCategories.parentId],
    references: [documentCategories.id],
    relationName: 'parent',
  }),
  children: many(documentCategories, {
    relationName: 'parent',
  }),
  documentTypes: many(documentTypes),
  documents: many(documents),
}));

export type DocumentCategory = typeof documentCategories.$inferSelect;
export type NewDocumentCategory = typeof documentCategories.$inferInsert;
```

### 3.3 Document Templates

```typescript
// lib/db/schema/templates.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { fileTypeEnum, processingModeEnum, chunkingStrategyEnum } from './enums';

export const documentTemplates = pgTable('document_templates', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Basic Info
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  categoryId: uuid('category_id').references(() => documentCategories.id).notNull(),
  documentTypeId: uuid('document_type_id').references(() => documentTypes.id),

  // File Processing
  fileType: fileTypeEnum('file_type').notNull(),
  processingMode: processingModeEnum('processing_mode').notNull().default('company'),

  // Versioning
  version: integer('version').notNull().default(1),
  isLatest: boolean('is_latest').notNull().default(true),
  previousVersionId: uuid('previous_version_id'),

  // Chunking
  chunkingStrategy: chunkingStrategyEnum('chunking_strategy').notNull().default('auto'),
  chunkSize: integer('chunk_size'),
  chunkOverlap: integer('chunk_overlap'),

  // Recurring
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringPeriod: text('recurring_period'), // 'monthly' | 'quarterly' | 'yearly'
  retentionDays: integer('retention_days'),

  isActive: boolean('is_active').notNull().default(true),

  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => employees.id),
}, (table) => ({
  slugIdx: index('idx_template_slug').on(table.slug),
  categoryIdx: index('idx_template_category').on(table.categoryId),
}));

export const templateColumnMappings = pgTable('template_column_mappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').references(() => documentTemplates.id).notNull(),

  // Source
  sourceColumn: text('source_column').notNull(),
  sourceColumnIndex: integer('source_column_index'),

  // Target
  targetField: text('target_field').notNull(),
  targetFieldType: text('target_field_type').notNull(), // 'string' | 'number' | 'date' | 'currency'

  // Role
  fieldRole: text('field_role').notNull().default('metadata'),
  // 'employee_identifier' | 'content' | 'metadata' | 'skip'

  // Transform
  transformFunction: text('transform_function'),
  defaultValue: text('default_value'),

  // Validation
  isRequired: boolean('is_required').notNull().default(false),
  validationRegex: text('validation_regex'),

  sortOrder: integer('sort_order').notNull().default(0),
});

export const templateVersions = pgTable('template_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').references(() => documentTemplates.id).notNull(),
  version: integer('version').notNull(),

  configSnapshot: jsonb('config_snapshot').notNull(),
  columnMappingsSnapshot: jsonb('column_mappings_snapshot').notNull(),

  changeReason: text('change_reason'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => employees.id),
});

export const templatesRelations = relations(documentTemplates, ({ one, many }) => ({
  category: one(documentCategories, {
    fields: [documentTemplates.categoryId],
    references: [documentCategories.id],
  }),
  columnMappings: many(templateColumnMappings),
  versions: many(templateVersions),
  documents: many(documents),
}));

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type NewDocumentTemplate = typeof documentTemplates.$inferInsert;
```

### 3.4 Documents

```typescript
// lib/db/schema/documents.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { documentStatusEnum } from './enums';

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),

  // File Info
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  filePath: text('file_path').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  fileHash: text('file_hash'),

  // Classification
  categoryId: uuid('category_id').references(() => documentCategories.id),
  documentTypeId: uuid('document_type_id').references(() => documentTypes.id),
  templateId: uuid('template_id').references(() => documentTemplates.id),

  // Period (for recurring docs)
  period: text('period'), // "2025-02"

  // Processing Status
  status: documentStatusEnum('status').notNull().default('pending'),
  // 'pending' | 'processing' | 'completed' | 'failed' | 'partial'

  processedAt: timestamp('processed_at'),
  errorMessage: text('error_message'),

  // Metadata
  metadata: jsonb('metadata'),
  // {
  //   totalRows?: number;
  //   successCount?: number;
  //   errorCount?: number;
  //   ...
  // }

  // Ownership
  employeeId: uuid('employee_id').references(() => employees.id),
  uploadedBy: uuid('uploaded_by').references(() => employees.id).notNull(),

  // Soft Delete
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references(() => employees.id),

  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index('idx_document_category').on(table.categoryId),
  templateIdx: index('idx_document_template').on(table.templateId),
  periodIdx: index('idx_document_period').on(table.period),
  statusIdx: index('idx_document_status').on(table.status),
  employeeIdx: index('idx_document_employee').on(table.employeeId),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  category: one(documentCategories, {
    fields: [documents.categoryId],
    references: [documentCategories.id],
  }),
  template: one(documentTemplates, {
    fields: [documents.templateId],
    references: [documentTemplates.id],
  }),
  employee: one(employees, {
    fields: [documents.employeeId],
    references: [employees.id],
  }),
  chunks: many(knowledgeChunks),
  processingBatches: many(processingBatches),
}));

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
```

### 3.5 Knowledge Chunks

```typescript
// lib/db/schema/knowledge-chunks.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  vector,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Source
  documentId: uuid('document_id').references(() => documents.id).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  totalChunks: integer('total_chunks').notNull(),

  // Content
  content: text('content').notNull(),
  contentHash: text('content_hash').notNull(),

  // Embedding
  embedding: vector('embedding', { dimensions: 3072 }),
  embeddingModel: text('embedding_model').default('text-embedding-3-large'),

  // Pinecone Reference
  pineconeId: text('pinecone_id').notNull().unique(),
  pineconeNamespace: text('pinecone_namespace').notNull(),

  // Metadata (denormalized for quick access)
  employeeId: text('employee_id'),
  categorySlug: text('category_slug'),
  period: text('period'),

  // Extended Metadata
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  documentIdx: index('idx_chunk_document').on(table.documentId),
  pineconeIdIdx: index('idx_chunk_pinecone').on(table.pineconeId),
  namespaceIdx: index('idx_chunk_namespace').on(table.pineconeNamespace),
  employeeIdx: index('idx_chunk_employee').on(table.employeeId),
}));

export const chunksRelations = relations(knowledgeChunks, ({ one }) => ({
  document: one(documents, {
    fields: [knowledgeChunks.documentId],
    references: [documents.id],
  }),
}));

export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type NewKnowledgeChunk = typeof knowledgeChunks.$inferInsert;
```

### 3.6 Processing & Lineage

```typescript
// lib/db/schema/processing.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  serial,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { processingStatusEnum } from './enums';

export const processingBatches = pgTable('processing_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  batchNumber: serial('batch_number'),

  documentId: uuid('document_id').references(() => documents.id).notNull(),
  templateId: uuid('template_id').references(() => documentTemplates.id),
  templateVersion: integer('template_version'),

  period: text('period'),

  status: processingStatusEnum('status').notNull().default('pending'),
  // 'pending' | 'processing' | 'completed' | 'failed' | 'rolled_back'

  // Results
  totalRecords: integer('total_records'),
  successCount: integer('success_count'),
  errorCount: integer('error_count'),
  vectorIds: jsonb('vector_ids'), // string[]

  // Rollback
  isRolledBack: boolean('is_rolled_back').notNull().default(false),
  rolledBackAt: timestamp('rolled_back_at'),
  rolledBackBy: uuid('rolled_back_by').references(() => employees.id),
  rollbackReason: text('rollback_reason'),

  // Inngest
  inngestRunId: text('inngest_run_id'),

  // Timing
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  documentIdx: index('idx_batch_document').on(table.documentId),
  periodIdx: index('idx_batch_period').on(table.period),
  statusIdx: index('idx_batch_status').on(table.status),
}));

export const dataLineage = pgTable('data_lineage', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Source
  sourceDocumentId: uuid('source_document_id').references(() => documents.id).notNull(),
  sourceFileUrl: text('source_file_url').notNull(),
  sourceFileHash: text('source_file_hash').notNull(),

  // Processing
  processingBatchId: uuid('processing_batch_id').references(() => processingBatches.id).notNull(),
  templateId: uuid('template_id').references(() => documentTemplates.id),
  templateVersion: integer('template_version'),

  // Target
  targetPineconeId: text('target_pinecone_id').notNull(),
  targetNamespace: text('target_namespace').notNull(),
  targetEmployeeId: text('target_employee_id'),

  // Transform
  transformationLog: jsonb('transformation_log'),
  chunkIndex: integer('chunk_index'),
  originalRowRange: text('original_row_range'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index('idx_lineage_source').on(table.sourceDocumentId),
  targetIdx: index('idx_lineage_target').on(table.targetPineconeId),
  employeeIdx: index('idx_lineage_employee').on(table.targetEmployeeId),
}));

export const batchesRelations = relations(processingBatches, ({ one, many }) => ({
  document: one(documents, {
    fields: [processingBatches.documentId],
    references: [documents.id],
  }),
  template: one(documentTemplates, {
    fields: [processingBatches.templateId],
    references: [documentTemplates.id],
  }),
  lineage: many(dataLineage),
}));

export type ProcessingBatch = typeof processingBatches.$inferSelect;
export type DataLineage = typeof dataLineage.$inferSelect;
```

### 3.7 Chat

```typescript
// lib/db/schema/chat.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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
}, (table) => ({
  employeeIdx: index('idx_session_employee').on(table.employeeId),
}));

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
}, (table) => ({
  sessionIdx: index('idx_message_session').on(table.sessionId),
}));

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
export type ChatMessage = typeof chatMessages.$inferSelect;
```

---

## 4. Enums

```typescript
// lib/db/schema/enums.ts
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
```

---

## 5. Schema Index

```typescript
// lib/db/schema/index.ts
export * from './enums';
export * from './employees';
export * from './categories';
export * from './templates';
export * from './documents';
export * from './knowledge-chunks';
export * from './processing';
export * from './chat';
```

---

## 6. Migration Commands

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate

# Push schema directly (dev only)
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

### package.json scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx lib/db/seed.ts"
  }
}
```

---

## 7. Seed Data

```typescript
// lib/db/seed.ts
import { db } from './index';
import { documentCategories, documentTypes, employees } from './schema';

async function seed() {
  console.log('Seeding database...');

  // Seed categories
  const categories = await db.insert(documentCategories).values([
    {
      name: '온보딩/교육',
      slug: 'onboarding',
      icon: 'GraduationCap',
      path: 'onboarding',
      namespaceType: 'company',
      minClearanceLevel: 'basic',
      sortOrder: 1,
    },
    {
      name: '정책/규정',
      slug: 'policy',
      icon: 'Scroll',
      path: 'policy',
      namespaceType: 'company',
      minClearanceLevel: 'basic',
      sortOrder: 2,
    },
    {
      name: '상품 정보',
      slug: 'product',
      icon: 'Package',
      path: 'product',
      namespaceType: 'company',
      minClearanceLevel: 'standard',
      sortOrder: 3,
    },
    {
      name: '개인 보상',
      slug: 'personal-compensation',
      icon: 'Wallet',
      path: 'personal-compensation',
      namespaceType: 'employee',
      minClearanceLevel: 'basic',
      sortOrder: 4,
    },
  ]).returning();

  console.log(`Seeded ${categories.length} categories`);

  // Seed admin employee
  const [admin] = await db.insert(employees).values({
    employeeId: 'ADMIN001',
    name: '관리자',
    email: 'admin@contractorhub.com',
    clearanceLevel: 'advanced',
  }).returning();

  console.log(`Seeded admin: ${admin.employeeId}`);

  console.log('Seeding complete!');
}

seed().catch(console.error);
```

---

## 8. Query Examples

### 8.1 Basic Queries

```typescript
// List with filters
const employees = await db.query.employees.findMany({
  where: and(
    eq(employees.isActive, true),
    eq(employees.department, '영업부')
  ),
  orderBy: desc(employees.createdAt),
  limit: 20,
  offset: 0,
});

// Single with relations
const employee = await db.query.employees.findFirst({
  where: eq(employees.id, id),
  with: {
    documents: {
      where: eq(documents.status, 'completed'),
      orderBy: desc(documents.createdAt),
      limit: 10,
    },
    chatSessions: {
      orderBy: desc(chatSessions.updatedAt),
      limit: 5,
    },
  },
});

// Category tree
const categories = await db.query.documentCategories.findMany({
  where: isNull(documentCategories.parentId),
  with: {
    children: {
      with: {
        children: true,
      },
    },
  },
  orderBy: asc(documentCategories.sortOrder),
});
```

### 8.2 Complex Queries

```typescript
// Aggregation
const stats = await db
  .select({
    status: documents.status,
    count: sql<number>`count(*)`,
  })
  .from(documents)
  .where(eq(documents.templateId, templateId))
  .groupBy(documents.status);

// Join query
const results = await db
  .select({
    document: documents,
    employee: employees,
    template: documentTemplates,
  })
  .from(documents)
  .leftJoin(employees, eq(documents.employeeId, employees.id))
  .leftJoin(documentTemplates, eq(documents.templateId, documentTemplates.id))
  .where(eq(documents.period, '2025-02'))
  .orderBy(desc(documents.createdAt));

// Transaction
await db.transaction(async (tx) => {
  const [doc] = await tx.insert(documents).values(docData).returning();

  await tx.insert(processingBatches).values({
    documentId: doc.id,
    status: 'pending',
  });

  return doc;
});
```

---

## 9. Database Diagram

```
┌─────────────────┐     ┌─────────────────┐
│   employees     │     │ document_       │
│─────────────────│     │ categories      │
│ id              │←┐   │─────────────────│
│ employee_id     │ │   │ id              │←─┐
│ name            │ │   │ name            │  │
│ clearance_level │ │   │ slug            │  │
│ ...             │ │   │ parent_id       │──┘
└────────┬────────┘ │   │ namespace_type  │
         │          │   └────────┬────────┘
         │          │            │
         │          │   ┌────────┴────────┐
         │          │   │ document_       │
         │          │   │ templates       │
         │          │   │─────────────────│
         │          │   │ id              │←─┐
         │          │   │ category_id     │──┤
         │          │   │ processing_mode │  │
         │          │   │ ...             │  │
         │          │   └────────┬────────┘  │
         │          │            │           │
         │          │   ┌────────┴────────┐  │
         │          │   │   documents     │  │
         │          │   │─────────────────│  │
         │          └───│ employee_id     │  │
         │              │ category_id     │──┘
         │              │ template_id     │
         │              │ status          │
         │              └────────┬────────┘
         │                       │
         │              ┌────────┴────────┐
         │              │ knowledge_      │
         │              │ chunks          │
         │              │─────────────────│
         │              │ document_id     │
         │              │ pinecone_id     │
         │              │ embedding       │
         │              └─────────────────┘
         │
┌────────┴────────┐
│ chat_sessions   │
│─────────────────│
│ employee_id     │
│ ...             │
└────────┬────────┘
         │
┌────────┴────────┐
│ chat_messages   │
│─────────────────│
│ session_id      │
│ role            │
│ content         │
└─────────────────┘
```
