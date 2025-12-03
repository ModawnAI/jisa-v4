import type {
  ClearanceLevel,
  EmployeeStatus,
  EmploymentType,
  ProcessingMode,
  ProcessingStatus,
  DocumentType,
  FileType,
  ConflictStatus,
  UserRole,
} from '@/lib/constants';

// === API Response Types ===
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// === Employee Types ===
export interface Employee {
  id: string;
  organizationId: string;
  employeeNumber: string;
  name: string;
  phone: string;
  email: string | null;
  department: string | null;
  position: string | null;
  clearanceLevel: ClearanceLevel;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  hireDate: Date;
  kakaoLinked: boolean;
  kakaoUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeFormData {
  employeeNumber: string;
  name: string;
  phone: string;
  email?: string;
  department?: string;
  position?: string;
  clearanceLevel: ClearanceLevel;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  hireDate: string;
}

// === Category Types ===
export interface Category {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

// === Template Types ===
export interface Template {
  id: string;
  organizationId: string;
  categoryId: string;
  name: string;
  description: string | null;
  content: string;
  variables: TemplateVariable[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency';
  required: boolean;
  defaultValue?: string;
}

export interface TemplateFormData {
  categoryId: string;
  name: string;
  description?: string;
  content: string;
  variables: TemplateVariable[];
  isActive: boolean;
}

// === Document Types ===
export interface Document {
  id: string;
  organizationId: string;
  categoryId: string;
  templateId: string | null;
  employeeId: string | null;
  title: string;
  content: string;
  originalFileName: string | null;
  fileType: FileType | null;
  processingMode: ProcessingMode;
  processingStatus: ProcessingStatus;
  documentType: DocumentType;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentUploadData {
  categoryId: string;
  templateId?: string;
  processingMode: ProcessingMode;
  file: File;
}

// === RAG Types ===
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: DocumentSource[];
  timestamp: Date;
}

export interface DocumentSource {
  documentId: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
}

export interface ChatRequest {
  message: string;
  employeeId?: string;
  conversationId?: string;
}

export interface ChatResponse {
  message: string;
  sources: DocumentSource[];
  conversationId: string;
}

// === Embedding Types ===
export interface EmbeddingChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata: ChunkMetadata;
  createdAt: Date;
}

export interface ChunkMetadata {
  documentTitle: string;
  categoryId: string;
  employeeId?: string;
  chunkIndex: number;
  totalChunks: number;
  namespace: string;
}

// === Lineage Types ===
export interface LineageNode {
  id: string;
  type: 'document' | 'chunk' | 'embedding';
  title: string;
  metadata: Record<string, unknown>;
}

export interface LineageEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

// === Compensation Types ===
export interface CompensationRecord {
  id: string;
  employeeId: string;
  period: string; // YYYY-MM format
  baseSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  details: CompensationDetail[];
  calculatedAt: Date;
}

export interface CompensationDetail {
  category: string;
  description: string;
  amount: number;
  type: 'allowance' | 'deduction';
}

// === Conflict Types ===
export interface Conflict {
  id: string;
  documentId: string;
  employeeId: string;
  existingValue: string;
  newValue: string;
  fieldName: string;
  status: ConflictStatus;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

// === User/Auth Types ===
export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  defaultClearanceLevel: ClearanceLevel;
  allowSelfRegistration: boolean;
  kakaoIntegrationEnabled: boolean;
}

// === Filter Types ===
export interface EmployeeFilters {
  search?: string;
  status?: EmployeeStatus;
  clearanceLevel?: ClearanceLevel;
  department?: string;
  employmentType?: EmploymentType;
}

export interface DocumentFilters {
  search?: string;
  categoryId?: string;
  processingStatus?: ProcessingStatus;
  documentType?: DocumentType;
  dateFrom?: string;
  dateTo?: string;
}

// === Table Types ===
export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
}
