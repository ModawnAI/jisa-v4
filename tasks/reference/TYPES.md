# TypeScript Types Reference

Complete type definitions for JISA App.

---

## Core Types

### API Response Types

```typescript
// types/api.ts

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  };
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Common query parameters
 */
export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
```

---

## Auth Types

```typescript
// types/auth.ts

import type { User, Session } from "@supabase/supabase-js";

/**
 * Extended user with organization context
 */
export interface AuthUser extends User {
  organization_id: string;
  role: UserRole;
  name: string;
  avatar_url?: string;
}

/**
 * User roles in the system
 */
export type UserRole = "super_admin" | "admin" | "manager" | "viewer";

/**
 * Auth session with user data
 */
export interface AuthSession {
  session: Session | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Signup data
 */
export interface SignupData {
  email: string;
  password: string;
  name: string;
  organization_name?: string;
}

/**
 * Auth context value
 */
export interface AuthContextValue {
  session: AuthSession;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (data: SignupData) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
```

---

## Employee Types

```typescript
// types/employee.ts

import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { employees } from "@/db/schema";

/**
 * Employee record from database
 */
export type Employee = InferSelectModel<typeof employees>;

/**
 * Employee insert data
 */
export type EmployeeInsert = InferInsertModel<typeof employees>;

/**
 * Employee update data (partial)
 */
export type EmployeeUpdate = Partial<Omit<EmployeeInsert, "id" | "created_at">>;

/**
 * Clearance level for document access
 */
export type ClearanceLevel = "basic" | "standard" | "elevated" | "full";

/**
 * Employee status
 */
export type EmployeeStatus = "active" | "inactive" | "pending" | "terminated";

/**
 * Employee with related data
 */
export interface EmployeeWithRelations extends Employee {
  documents_count?: number;
  knowledge_chunks_count?: number;
  last_chat_at?: Date;
}

/**
 * Employee list filters
 */
export interface EmployeeFilters extends ListParams {
  status?: EmployeeStatus;
  clearance_level?: ClearanceLevel;
  department?: string;
}

/**
 * Employee form data
 */
export interface EmployeeFormData {
  name: string;
  employee_number: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
  hire_date?: Date;
  clearance_level: ClearanceLevel;
  status: EmployeeStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Bulk employee import data
 */
export interface EmployeeImportRow {
  name: string;
  employee_number: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
}

/**
 * Employee import result
 */
export interface EmployeeImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}
```

---

## Document Types

```typescript
// types/document.ts

import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { documents } from "@/db/schema";

/**
 * Document record from database
 */
export type Document = InferSelectModel<typeof documents>;

/**
 * Document insert data
 */
export type DocumentInsert = InferInsertModel<typeof documents>;

/**
 * File types supported
 */
export type FileType = "pdf" | "xlsx" | "xls" | "csv" | "docx" | "txt";

/**
 * Document processing status
 */
export type DocumentStatus =
  | "pending"      // Uploaded, awaiting processing
  | "processing"   // Currently being processed
  | "completed"    // Successfully processed
  | "failed"       // Processing failed
  | "archived";    // Soft deleted

/**
 * Namespace type for vector storage
 */
export type NamespaceType = "company" | "employee";

/**
 * Document with file info
 */
export interface DocumentWithFile extends Document {
  file_url: string;
  file_size: number;
  file_name: string;
  mime_type: string;
}

/**
 * Document with relations
 */
export interface DocumentWithRelations extends Document {
  category?: Category;
  employee?: Employee;
  chunks_count?: number;
  processing_batch?: ProcessingBatch;
}

/**
 * Document upload payload
 */
export interface DocumentUploadPayload {
  file: File;
  category_id?: string;
  employee_id?: string;
  namespace_type: NamespaceType;
  metadata?: Record<string, unknown>;
}

/**
 * Document list filters
 */
export interface DocumentFilters extends ListParams {
  status?: DocumentStatus;
  file_type?: FileType;
  category_id?: string;
  employee_id?: string;
  namespace_type?: NamespaceType;
  from_date?: Date;
  to_date?: Date;
}

/**
 * Document processing options
 */
export interface ProcessingOptions {
  template_id?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  extract_tables?: boolean;
  generate_summary?: boolean;
}
```

---

## Category Types

```typescript
// types/category.ts

import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { categories } from "@/db/schema";

/**
 * Category record from database
 */
export type Category = InferSelectModel<typeof categories>;

/**
 * Category insert data
 */
export type CategoryInsert = InferInsertModel<typeof categories>;

/**
 * Category update data
 */
export type CategoryUpdate = Partial<Omit<CategoryInsert, "id" | "created_at">>;

/**
 * Category with hierarchy
 */
export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
  documents_count?: number;
}

/**
 * Flat category for select dropdown
 */
export interface CategoryOption {
  id: string;
  name: string;
  path: string;  // "Parent > Child > Grandchild"
  depth: number;
}

/**
 * Category form data
 */
export interface CategoryFormData {
  name: string;
  description?: string;
  parent_id?: string;
  color?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Category tree node (for tree view)
 */
export interface CategoryTreeNode {
  id: string;
  name: string;
  children: CategoryTreeNode[];
  isExpanded: boolean;
  isSelected: boolean;
}
```

---

## Template Types

```typescript
// types/template.ts

import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { templates } from "@/db/schema";

/**
 * Template record from database
 */
export type Template = InferSelectModel<typeof templates>;

/**
 * Template insert data
 */
export type TemplateInsert = InferInsertModel<typeof templates>;

/**
 * Processing mode for templates
 */
export type ProcessingMode =
  | "standard"       // Normal processing
  | "employee_split" // Split by employee identifier
  | "batch"          // Batch processing
  | "custom";        // Custom logic

/**
 * Template field definition
 */
export interface TemplateField {
  id: string;
  name: string;
  source_column: string;    // Excel column name or letter
  data_type: FieldDataType;
  is_required: boolean;
  is_identifier: boolean;   // Used for employee matching
  default_value?: unknown;
  validation?: FieldValidation;
  transformation?: FieldTransformation;
}

/**
 * Field data types
 */
export type FieldDataType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "currency"
  | "percentage";

/**
 * Field validation rules
 */
export interface FieldValidation {
  type: "regex" | "range" | "enum" | "custom";
  value: string | number[] | string[];
  message: string;
}

/**
 * Field transformation
 */
export interface FieldTransformation {
  type: "trim" | "uppercase" | "lowercase" | "format" | "calculate";
  params?: Record<string, unknown>;
}

/**
 * Template column mapping
 */
export interface ColumnMapping {
  excel_column: string;  // A, B, C or column name
  field_id: string;
  sample_values?: string[];
}

/**
 * Template with full configuration
 */
export interface TemplateWithConfig extends Template {
  fields: TemplateField[];
  column_mappings: ColumnMapping[];
  processing_config: ProcessingConfig;
}

/**
 * Processing configuration
 */
export interface ProcessingConfig {
  mode: ProcessingMode;
  employee_identifier_field?: string;
  header_row: number;
  start_row: number;
  end_row?: number;
  skip_empty_rows: boolean;
  date_format: string;
  number_format: string;
}

/**
 * Template form data
 */
export interface TemplateFormData {
  name: string;
  description?: string;
  category_id?: string;
  file_type: FileType;
  fields: TemplateField[];
  processing_config: ProcessingConfig;
}
```

---

## Knowledge/RAG Types

```typescript
// types/knowledge.ts

import type { InferSelectModel } from "drizzle-orm";
import type { knowledge_chunks } from "@/db/schema";

/**
 * Knowledge chunk record
 */
export type KnowledgeChunk = InferSelectModel<typeof knowledge_chunks>;

/**
 * Vector search result
 */
export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: ChunkMetadata;
}

/**
 * Chunk metadata stored with vector
 */
export interface ChunkMetadata {
  document_id: string;
  document_title: string;
  category_id?: string;
  category_name?: string;
  employee_id?: string;
  employee_name?: string;
  namespace: string;
  chunk_index: number;
  total_chunks: number;
  source_page?: number;
  source_row?: number;
  created_at: string;
}

/**
 * RAG context for chat
 */
export interface RAGContext {
  chunks: SearchResult[];
  total_score: number;
  sources: SourceReference[];
}

/**
 * Source reference for citation
 */
export interface SourceReference {
  document_id: string;
  document_title: string;
  category?: string;
  page?: number;
  row?: number;
  relevance: number;
}

/**
 * Namespace statistics
 */
export interface NamespaceStats {
  namespace: string;
  type: NamespaceType;
  vector_count: number;
  document_count: number;
  last_updated: Date;
}

/**
 * Knowledge sync options
 */
export interface SyncOptions {
  namespace?: string;
  force_reindex?: boolean;
  document_ids?: string[];
}

/**
 * Embedding request
 */
export interface EmbeddingRequest {
  text: string | string[];
  model?: string;
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
```

---

## Chat Types

```typescript
// types/chat.ts

import type { InferSelectModel } from "drizzle-orm";
import type { chat_sessions, chat_messages } from "@/db/schema";

/**
 * Chat session record
 */
export type ChatSession = InferSelectModel<typeof chat_sessions>;

/**
 * Chat message record
 */
export type ChatMessage = InferSelectModel<typeof chat_messages>;

/**
 * Message role
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * Chat message with metadata
 */
export interface ChatMessageWithMeta extends ChatMessage {
  sources?: SourceReference[];
  processing_time?: number;
  token_usage?: TokenUsage;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Chat request payload
 */
export interface ChatRequest {
  message: string;
  session_id?: string;
  employee_id?: string;
  context_type?: "company" | "personal" | "both";
  max_sources?: number;
  stream?: boolean;
}

/**
 * Chat response (non-streaming)
 */
export interface ChatResponse {
  message: string;
  session_id: string;
  sources: SourceReference[];
  processing_time: number;
}

/**
 * Streaming chat chunk
 */
export interface ChatStreamChunk {
  type: "text" | "source" | "done" | "error";
  content?: string;
  source?: SourceReference;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Chat history entry
 */
export interface ChatHistoryEntry {
  id: string;
  role: MessageRole;
  content: string;
  created_at: Date;
  sources?: SourceReference[];
}

/**
 * Chat session with messages
 */
export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatHistoryEntry[];
  total_messages: number;
}
```

---

## Processing Types

```typescript
// types/processing.ts

import type { InferSelectModel } from "drizzle-orm";
import type { processing_batches } from "@/db/schema";

/**
 * Processing batch record
 */
export type ProcessingBatch = InferSelectModel<typeof processing_batches>;

/**
 * Batch status
 */
export type BatchStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "rolled_back";

/**
 * Processing batch with details
 */
export interface BatchWithDetails extends ProcessingBatch {
  documents: Document[];
  chunks_created: number;
  chunks_failed: number;
  error_details?: BatchError[];
}

/**
 * Batch error detail
 */
export interface BatchError {
  document_id: string;
  document_name: string;
  error_code: string;
  error_message: string;
  stack_trace?: string;
}

/**
 * Processing progress
 */
export interface ProcessingProgress {
  batch_id: string;
  total_documents: number;
  processed_documents: number;
  current_document?: string;
  status: BatchStatus;
  started_at: Date;
  estimated_completion?: Date;
}

/**
 * Rollback request
 */
export interface RollbackRequest {
  batch_id: string;
  reason: string;
  delete_documents?: boolean;
}

/**
 * Rollback result
 */
export interface RollbackResult {
  success: boolean;
  vectors_deleted: number;
  documents_deleted: number;
  chunks_deleted: number;
}

/**
 * Processing job payload (for Inngest)
 */
export interface ProcessingJobPayload {
  batch_id: string;
  document_ids: string[];
  template_id?: string;
  options: ProcessingOptions;
}

/**
 * Processing job result
 */
export interface ProcessingJobResult {
  batch_id: string;
  success: boolean;
  documents_processed: number;
  chunks_created: number;
  errors: BatchError[];
  duration_ms: number;
}
```

---

## UI/Form Types

```typescript
// types/ui.ts

import type { ReactNode } from "react";

/**
 * Page header props
 */
export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Empty state props
 */
export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

/**
 * Stats card props
 */
export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon?: ReactNode;
}

/**
 * Data table column definition
 */
export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

/**
 * Confirm dialog props
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
}

/**
 * File upload result
 */
export interface FileUploadResult {
  file: File;
  preview?: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  response?: unknown;
}

/**
 * Toast notification
 */
export interface ToastData {
  id?: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

---

## Utility Types

```typescript
// types/utils.ts

/**
 * Make specific keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Extract array element type
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/**
 * Async function return type
 */
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;

/**
 * Form field state
 */
export interface FieldState<T> {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

/**
 * Action result for server actions
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

---

## Type Exports

```typescript
// types/index.ts

// API types
export type { ApiResponse, PaginatedResponse, ListParams } from "./api";

// Auth types
export type {
  AuthUser,
  UserRole,
  AuthSession,
  LoginCredentials,
  SignupData,
  AuthContextValue,
} from "./auth";

// Employee types
export type {
  Employee,
  EmployeeInsert,
  EmployeeUpdate,
  ClearanceLevel,
  EmployeeStatus,
  EmployeeWithRelations,
  EmployeeFilters,
  EmployeeFormData,
} from "./employee";

// Document types
export type {
  Document,
  DocumentInsert,
  FileType,
  DocumentStatus,
  NamespaceType,
  DocumentWithFile,
  DocumentWithRelations,
  DocumentUploadPayload,
  DocumentFilters,
} from "./document";

// Category types
export type {
  Category,
  CategoryInsert,
  CategoryUpdate,
  CategoryWithChildren,
  CategoryOption,
  CategoryFormData,
} from "./category";

// Template types
export type {
  Template,
  TemplateInsert,
  ProcessingMode,
  TemplateField,
  FieldDataType,
  TemplateWithConfig,
  ProcessingConfig,
  TemplateFormData,
} from "./template";

// Knowledge types
export type {
  KnowledgeChunk,
  SearchResult,
  ChunkMetadata,
  RAGContext,
  SourceReference,
  NamespaceStats,
} from "./knowledge";

// Chat types
export type {
  ChatSession,
  ChatMessage,
  MessageRole,
  ChatMessageWithMeta,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  ChatHistoryEntry,
} from "./chat";

// Processing types
export type {
  ProcessingBatch,
  BatchStatus,
  BatchWithDetails,
  ProcessingProgress,
  RollbackRequest,
  RollbackResult,
} from "./processing";

// UI types
export type {
  PageHeaderProps,
  EmptyStateProps,
  StatsCardProps,
  TableColumn,
  ConfirmDialogProps,
  FileUploadResult,
  ToastData,
} from "./ui";

// Utility types
export type {
  RequireKeys,
  OptionalKeys,
  DeepPartial,
  Nullable,
  ArrayElement,
  AsyncReturnType,
  ActionResult,
} from "./utils";
```
