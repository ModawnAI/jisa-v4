/**
 * Document Processor Types and Interfaces
 *
 * Provides abstraction for processing different document types with
 * specialized metadata extraction and namespace strategies.
 */

// =============================================================================
// Namespace Strategies
// =============================================================================

/**
 * Namespace strategy determines how vectors are organized in Pinecone
 * for access control and data isolation.
 */
export type NamespaceStrategy =
  | 'organization'   // org_{orgId} - Company-wide docs (policies, announcements)
  | 'employee'       // emp_{employeeId} - Personal data (compensation, contracts)
  | 'department'     // dept_{deptId} - Team-level docs
  | 'document'       // doc_{docId} - Document-specific (large PDFs)
  | 'public';        // public - General/everyone accessible docs

// =============================================================================
// Metadata Types
// =============================================================================

/**
 * Base metadata for all vector records.
 * Common fields across all document types.
 */
export interface BaseVectorMetadata {
  // Core identifiers
  documentId: string;
  organizationId: string;
  chunkIndex: number;

  // Access control
  clearanceLevel: 'basic' | 'standard' | 'advanced';

  // Source tracking
  source: string;
  sourceType: 'pdf' | 'excel' | 'csv' | 'text';
  templateId?: string;

  // Temporal context
  createdAt: string;
  documentDate?: string;        // Date the document refers to (e.g., 마감월)
  processingBatchId?: string;

  // Content hashing for deduplication
  contentHash?: string;

  // Allow additional fields
  [key: string]: string | number | boolean | string[] | null | undefined;
}

/**
 * Employee-specific metadata for compensation and HR documents.
 * Mirrors the Python `EmployeeDataStructure` metadata fields.
 */
export interface EmployeeVectorMetadata extends BaseVectorMetadata {
  // Employee identification (사원 정보)
  employeeId: string;           // 사번
  employeeName?: string;        // 사원명

  // Employment details (근무 정보)
  jobType?: string;             // 직종
  department?: string;          // 소속
  appointmentDate?: string;     // 위촉일

  // Financial context (재무 정보)
  finalPayment?: number;        // 최종지급액
  totalCommission?: number;     // 총_커미션
  totalOverride?: number;       // 총_오버라이드
  contractCount?: number;       // 계약건수

  // Metadata marker
  metadataType: 'employee';
}

/**
 * Contract-specific metadata for insurance contract documents.
 */
export interface ContractVectorMetadata extends BaseVectorMetadata {
  // Contract identification
  contractNumber?: string;      // 증권번호
  employeeId?: string;          // 담당 사번

  // Insurance details
  insuranceCompany?: string;    // 보험사
  productName?: string;         // 상품명
  contractDate?: string;        // 계약일
  contractStatus?: string;      // 계약상태

  // Financial details
  premium?: number;             // 보험료
  commission?: number;          // 수수료

  // Metadata marker
  metadataType: 'contract';
}

/**
 * Policy document metadata for company policies and guidelines.
 */
export interface PolicyVectorMetadata extends BaseVectorMetadata {
  // Policy identification
  policyType?: string;          // 정책 유형
  effectiveDate?: string;       // 시행일
  expirationDate?: string;      // 만료일
  version?: string;             // 버전

  // Scope
  applicableDepartments?: string[];  // 적용 부서
  applicableRoles?: string[];        // 적용 직급

  // Metadata marker
  metadataType: 'policy';
}

/**
 * Generic document metadata for unstructured PDFs and other documents.
 */
export interface GenericVectorMetadata extends BaseVectorMetadata {
  // PDF-specific
  pageNumber?: number;
  totalPages?: number;

  // Document structure
  sectionTitle?: string;
  chapterTitle?: string;

  // Metadata marker
  metadataType: 'generic';
}

/**
 * MDRT (Million Dollar Round Table) metadata for performance tracking documents.
 * Used for MDRT qualification tracking, commission reports, and performance files.
 */
export interface MdrtVectorMetadata extends BaseVectorMetadata {
  // Employee identification
  employeeId: string;           // 사번 (J#####)
  employeeName?: string;        // 사원이름

  // Organization structure
  branch?: string;              // 지사
  team?: string;                // 지점
  jobType?: string;             // 직종 (사업본부장/AM/SM/LP)

  // Reporting period
  fiscalYear?: string;          // 회계연도 (2025)
  quarter?: string;             // 분기 (Q1-Q4)
  reportDate?: string;          // 보고서 기준일

  // Financial Summary - Commission
  totalCommission?: number;     // A.커미션 합계
  lifeInsuranceCommission?: number; // 보장성금액

  // Financial Summary - Income
  totalIncome?: number;         // B.총수입 합계
  newContractIncome?: number;   // B1.신계약수입
  lifeInsuranceIncome?: number; // B2.보장성금액

  // MDRT Qualification Status
  mdrtStatus?: 'none' | 'on-pace' | 'mdrt' | 'cot' | 'tot';
  mdrtProgress?: number;        // Percentage toward threshold (0-100+)
  mdrtThreshold?: number;       // The threshold amount for qualification

  // Self-contract adjustments
  selfContractCommission?: number;
  selfContractIncome?: number;
  selfContractDeduction?: number;

  // Monthly data availability
  monthlyDataAvailable?: string[]; // ['2024-12', '2025-01', ...]

  // Metadata marker
  metadataType: 'mdrt';
}

/**
 * Union type for all metadata variants.
 */
export type VectorMetadata =
  | BaseVectorMetadata
  | EmployeeVectorMetadata
  | ContractVectorMetadata
  | PolicyVectorMetadata
  | GenericVectorMetadata
  | MdrtVectorMetadata;

// =============================================================================
// Processor Types
// =============================================================================

/**
 * Represents a processed chunk ready for embedding and upsert.
 */
export interface ProcessedChunk {
  /** Unique vector ID for Pinecone */
  vectorId: string;

  /** Text content for embedding generation */
  embeddingText: string;

  /** Raw content (may differ from embedding text) */
  content: string;

  /** Metadata to store with the vector */
  metadata: VectorMetadata;

  /** Target Pinecone namespace */
  namespace: string;

  /** Sequential chunk index within the document */
  chunkIndex: number;

  /** Content hash for deduplication */
  contentHash: string;

  /** Optional unique identifier for the chunk */
  chunkId?: string;
}

/**
 * Result of document processing.
 */
export interface ProcessorResult {
  /** Processed chunks ready for embedding */
  chunks: ProcessedChunk[];

  /** Namespace strategy used for this document */
  namespaceStrategy: NamespaceStrategy;

  /** Optional aggregated data (e.g., financial summaries) */
  aggregations?: Record<string, unknown>;

  /** Named entities extracted from the document */
  entities?: ExtractedEntity[];

  /** Detailed records extracted from the document */
  detailedRecords?: DetailedRecords;

  /** Processing metadata */
  processingInfo: {
    processorType: string;
    processingTime: number;
    sourceFileSize: number;
    totalChunks: number;
  };
}

/**
 * Entity extracted from document content.
 */
export interface ExtractedEntity {
  type: 'employee' | 'contract' | 'company' | 'date' | 'amount' | 'other';
  value: string;
  normalizedValue?: string;
  confidence: number;
  sourceLocation?: {
    page?: number;
    row?: number;
    column?: string;
  };
}

/**
 * Options for document processing.
 */
export interface ProcessorOptions {
  /** Target organization ID */
  organizationId: string;

  /** Optional template ID for schema-driven processing */
  templateId?: string;

  /** Document category ID */
  categoryId?: string;

  /** Processing mode from template */
  processingMode?: 'company' | 'employee_split' | 'employee_aggregate';

  /** Default clearance level if not determined from content */
  defaultClearance?: 'basic' | 'standard' | 'advanced';

  /** Clearance level for the document */
  clearanceLevel?: 'basic' | 'standard' | 'advanced';

  /** Maximum chunk size in characters */
  maxChunkSize?: number;

  /** Chunk size (alias for maxChunkSize) */
  chunkSize?: number;

  /** Chunk overlap in characters */
  chunkOverlap?: number;

  /** Original file name for source tracking */
  originalFileName?: string;

  /** Document ID for metadata */
  documentId?: string;

  /** Processing batch ID for tracking */
  processingBatchId?: string;

  /** Template configuration */
  templateConfig?: {
    processingMode?: string;
    columnMappings?: Array<{
      sourceColumn: string;
      targetField: string;
      fieldRole?: string;
    }>;
  };
}

/**
 * Document representation for processing.
 */
export interface DocumentForProcessing {
  id: string;
  organizationId: string;
  categoryId?: string | null;
  templateId?: string | null;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileType: string;
  storageUrl?: string;
  clearanceLevel?: 'basic' | 'standard' | 'advanced';
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Processor Interface
// =============================================================================

/**
 * Base interface for document processors.
 * Each processor handles a specific document type with specialized
 * metadata extraction and namespace assignment.
 */
export interface DocumentProcessor {
  /** Unique processor type identifier */
  readonly type: string;

  /** Human-readable name */
  readonly name: string;

  /** Supported MIME types */
  readonly supportedMimeTypes: string[];

  /** Priority for auto-selection (higher = preferred) */
  readonly priority: number;

  /**
   * Check if this processor can handle the given document.
   * @param document Document to check
   * @returns true if this processor can handle the document
   */
  canProcess(document: DocumentForProcessing): boolean;

  /**
   * Process document content and generate chunks.
   * @param content Raw file content
   * @param document Document metadata
   * @param options Processing options
   * @returns Processed result with chunks and metadata
   */
  process(
    content: Buffer | string,
    document: DocumentForProcessing,
    options: ProcessorOptions
  ): Promise<ProcessorResult>;

  /**
   * Determine the appropriate namespace strategy for the document.
   * @param document Document metadata
   * @param options Processing options
   * @returns Namespace strategy to use
   */
  getNamespaceStrategy(
    document: DocumentForProcessing,
    options: ProcessorOptions
  ): NamespaceStrategy;

  /**
   * Generate the actual namespace string.
   * @param strategy Namespace strategy
   * @param context Context for namespace generation
   * @returns Namespace string for Pinecone
   */
  generateNamespace(
    strategy: NamespaceStrategy,
    context: NamespaceContext
  ): string;
}

/**
 * Context for namespace generation.
 */
export interface NamespaceContext {
  organizationId: string;
  employeeId?: string;
  departmentId?: string;
  documentId?: string;
}

// =============================================================================
// Registry Types
// =============================================================================

/**
 * Processor registration entry.
 */
export interface ProcessorRegistration {
  processor: DocumentProcessor;
  isDefault?: boolean;
}

/**
 * Processor selection criteria.
 */
export interface ProcessorSelectionCriteria {
  mimeType?: string;
  templateId?: string;
  categoryId?: string;
  fileName?: string;
}

// =============================================================================
// Type Guards
// =============================================================================

export function isEmployeeMetadata(
  metadata: VectorMetadata
): metadata is EmployeeVectorMetadata {
  return (
    'metadataType' in metadata &&
    metadata.metadataType === 'employee'
  );
}

export function isContractMetadata(
  metadata: VectorMetadata
): metadata is ContractVectorMetadata {
  return (
    'metadataType' in metadata &&
    metadata.metadataType === 'contract'
  );
}

export function isPolicyMetadata(
  metadata: VectorMetadata
): metadata is PolicyVectorMetadata {
  return (
    'metadataType' in metadata &&
    metadata.metadataType === 'policy'
  );
}

export function isGenericMetadata(
  metadata: VectorMetadata
): metadata is GenericVectorMetadata {
  return (
    'metadataType' in metadata &&
    metadata.metadataType === 'generic'
  );
}

export function isMdrtMetadata(
  metadata: VectorMetadata
): metadata is MdrtVectorMetadata {
  return (
    'metadataType' in metadata &&
    metadata.metadataType === 'mdrt'
  );
}

// =============================================================================
// MDRT Processing Types
// =============================================================================

/**
 * Monthly data for MDRT performance tracking
 */
export interface MdrtMonthlyData {
  month: string;                    // e.g., '2025-01'
  paymentMonth: string;             // e.g., '1월 보수'
  performanceMonth: string;         // e.g., '24.12월 실적'
  commissionTotal: number;          // A.커미션 합계
  commissionProtection: number;     // A.커미션 보장성금액
  incomeTotal: number;              // B.총수입 합계
  incomeNewContract: number;        // B1.신계약수입
  incomeProtection: number;         // B2.보장성금액
}

/**
 * MDRT qualification thresholds
 */
export interface MdrtThresholds {
  fyc: {
    onPace: number;
    mdrt: number;
    cot: number;
    tot: number;
  };
  agi: {
    onPace: number;
    mdrt: number;
    cot: number;
    tot: number;
  };
}

/**
 * Performance record for tracking employee metrics
 */
export interface PerformanceRecord {
  employeeId: string;
  employeeName?: string;
  period: string;
  performanceType?: string;
  metricName?: string;
  metricValue?: number;
  targetValue?: number;
  achievementRate?: number;
  metrics?: Record<string, unknown>;
  rawData?: Record<string, unknown>;
  sourceInfo?: {
    documentId: string;
    rowIndex: number;
  };
}

/**
 * Detailed records extracted from documents
 */
export interface DetailedRecords {
  commissions: unknown[];
  overrides: unknown[];
  incentives: unknown[];
  clawbacks: unknown[];
  performance: PerformanceRecord[];
  allowances: unknown[];
}

/**
 * Result of structure detection for document processors
 */
export interface StructureDetectionResult {
  matches: boolean;
  confidence: number;
  reason: string;
  detectedMarkers?: string[];
  detectedSheets?: string[];
  markers?: string[];
  suggestedProcessor?: string;
}
