/**
 * Unified Vector Metadata Schema
 *
 * All documents share a common base with type-specific extensions.
 * This enables cross-type RAG queries like:
 * - "Compare MDRT status with actual commission for employee X"
 * - "Show all financial data for Q4 2025"
 */

// Document types that can be indexed
export type DocumentMetadataType =
  | 'mdrt'           // MDRT qualification data
  | 'compensation'   // Salary/commission data
  | 'policy'         // Company policies
  | 'contract'       // Contract terms
  | 'onboarding'     // Training materials
  | 'product'        // Product information
  | 'generic';       // Generic PDF/documents

// MDRT qualification levels
export type MdrtQualificationStatus = 'none' | 'on-pace' | 'mdrt' | 'cot' | 'tot';

/**
 * Base metadata present on ALL vectors
 */
export interface BaseVectorMetadata {
  // Identity
  documentId: string;
  documentType: DocumentMetadataType;
  metadataType: string;  // More specific: 'mdrt_quarterly', 'compensation_monthly'

  // Context
  categoryId: string;
  categoryName?: string;
  employeeId?: string;
  employeeName?: string;
  departmentName?: string;

  // Temporal
  period?: string;        // "2025-Q4", "2025-09"
  periodStart?: string;   // ISO date
  periodEnd?: string;

  // Content tracking
  chunkIndex: number;
  totalChunks?: number;
  contentHash: string;

  // Source tracking
  sourceFileName?: string;
  sourceSheetName?: string;
  sourceRowNumber?: number;
}

/**
 * MDRT-specific metadata extension
 */
export interface MdrtMetadata extends BaseVectorMetadata {
  documentType: 'mdrt';

  // MDRT metrics
  mdrtStatus?: MdrtQualificationStatus;
  totalIncome?: number;           // 총 수입 (원)
  totalCommission?: number;       // 총 커미션 (원)
  fyc?: number;                   // First Year Commission
  fycEquivalent?: number;         // FYC 환산액
  annualizedPremium?: number;     // 연환산보험료

  // Thresholds for context
  mdrtThreshold?: number;
  cotThreshold?: number;
  totThreshold?: number;
  progressPercentage?: number;    // Towards MDRT qualification
}

/**
 * Compensation-specific metadata extension
 */
export interface CompensationMetadata extends BaseVectorMetadata {
  documentType: 'compensation';

  // Financial summary
  totalIncome?: number;
  baseSalary?: number;
  totalCommission?: number;
  totalDeductions?: number;
  netPay?: number;

  // Commission breakdown
  contractCount?: number;
  newContractCount?: number;
  maintenanceFee?: number;
  promotionOR?: number;           // Override
  saiBonus?: number;

  // Contract details (if per-contract chunk)
  contractNumber?: string;
  productName?: string;
  contractAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
}

/**
 * Policy/document metadata extension
 */
export interface PolicyMetadata extends BaseVectorMetadata {
  documentType: 'policy' | 'contract' | 'onboarding' | 'product';

  // Document structure
  sectionTitle?: string;
  pageNumber?: number;

  // Access control
  clearanceLevel?: 'basic' | 'standard' | 'advanced';
}

/**
 * Generic document metadata
 */
export interface GenericMetadata extends BaseVectorMetadata {
  documentType: 'generic';

  pageNumber?: number;
  sectionTitle?: string;
}

/**
 * Union type for all vector metadata
 */
export type VectorMetadata =
  | MdrtMetadata
  | CompensationMetadata
  | PolicyMetadata
  | GenericMetadata;

/**
 * Helper to create base metadata
 */
export function createBaseMetadata(params: {
  documentId: string;
  documentType: DocumentMetadataType;
  metadataType: string;
  categoryId: string;
  chunkIndex: number;
  contentHash: string;
  employeeId?: string;
  period?: string;
}): BaseVectorMetadata {
  return {
    documentId: params.documentId,
    documentType: params.documentType,
    metadataType: params.metadataType,
    categoryId: params.categoryId,
    chunkIndex: params.chunkIndex,
    contentHash: params.contentHash,
    employeeId: params.employeeId,
    period: params.period,
  };
}

/**
 * Flatten metadata for Pinecone (removes undefined values)
 */
export function flattenMetadata(metadata: VectorMetadata): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        result[key] = JSON.stringify(value);
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}
