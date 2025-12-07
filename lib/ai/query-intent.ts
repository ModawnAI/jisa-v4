/**
 * Query Intent Types for Enhanced RAG
 *
 * Defines the structure for parsed user queries
 * that enable intent-aware vector search.
 */

/**
 * Primary intent classification
 */
export type QueryIntentType =
  | 'direct_lookup'   // Single field retrieval
  | 'calculation'     // Computation required (e.g., MDRT gap)
  | 'comparison'      // Period or item comparison
  | 'aggregation'     // Sum, count, average
  | 'general_qa';     // Pure semantic search

/**
 * Template type determines metadata schema
 */
export type TemplateType = 'compensation' | 'mdrt' | 'general';

/**
 * Calculation types supported by the RAG engine
 */
export type CalculationType =
  | 'mdrt_gap'        // Gap to MDRT achievement
  | 'period_diff'     // Difference between periods
  | 'sum'             // Sum of values
  | 'average'         // Average calculation
  | 'count'           // Count items
  | 'percentage'      // Percentage calculation
  | 'tax_reverse';    // Reverse tax calculation

/**
 * MDRT standard types
 */
export type MdrtStandard = 'fycMdrt' | 'fycCot' | 'fycTot' | 'agiMdrt' | 'agiCot' | 'agiTot';

/**
 * Calculation parameters
 */
export interface CalculationParams {
  type: CalculationType;
  params?: {
    standard?: MdrtStandard;
    periods?: string[];
    field?: string;
    [key: string]: unknown;
  };
}

/**
 * Pinecone filter configuration
 */
export interface QueryFilters {
  period?: string;           // "2024-12" or "latest"
  company?: string;          // Insurance company filter
  metadataType?: string;     // "mdrt" | "employee" | "summary"
  chunkType?: string;        // "summary" | "monthly_detail" | "contract"
  category?: string;         // Commission category
}

/**
 * Semantic search configuration
 */
export interface SemanticSearchConfig {
  enabled: boolean;
  query?: string;            // Reformulated search query
  topK: number;
}

/**
 * Complete query intent structure
 */
export interface QueryIntent {
  // Primary intent classification
  intent: QueryIntentType;

  // Template type determines metadata schema
  template: TemplateType;

  // Specific fields to retrieve
  fields: string[];

  // For calculations
  calculation?: CalculationParams;

  // Filters for Pinecone
  filters: QueryFilters;

  // Semantic search parameters
  semanticSearch: SemanticSearchConfig;

  // Confidence score (0-1)
  confidence: number;

  // Original query for reference
  originalQuery?: string;

  // Additional context extracted
  extractedEntities?: {
    period?: string;
    company?: string;
    amount?: number;
    [key: string]: unknown;
  };
}

/**
 * Query understanding result with additional metadata
 */
export interface QueryUnderstandingResult {
  intent: QueryIntent;
  processingTime: number;
  modelUsed: string;
}

/**
 * RAG execution result
 */
export interface RAGExecutionResult {
  answer: string;
  sources: string[];
  metadata?: {
    intent: QueryIntentType;
    template: TemplateType;
    calculationResult?: number | Record<string, number>;
    confidence: number;
    processingTime: number;
  };
}

/**
 * MDRT Standards (2024)
 */
export const MDRT_STANDARDS: Record<MdrtStandard, number> = {
  fycMdrt: 54_000_000,    // FYC MDRT 기준
  fycCot: 162_000_000,    // FYC COT 기준 (3x MDRT)
  fycTot: 324_000_000,    // FYC TOT 기준 (6x MDRT)
  agiMdrt: 97_200_000,    // AGI MDRT 기준
  agiCot: 291_600_000,    // AGI COT 기준
  agiTot: 583_200_000,    // AGI TOT 기준
};

/**
 * Field display names in Korean
 */
export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  // Compensation fields
  finalPayment: '최종지급액',
  totalCommission: '총 커미션',
  totalOverride: '총 오버라이드',
  totalIncentive: '총 시책금',
  totalClawback: '총 환수금',
  contractCount: '계약 건수',

  // MDRT fields
  fycMdrtStatus: 'FYC MDRT 상태',
  fycMdrtProgress: 'FYC MDRT 진행률',
  agiMdrtStatus: 'AGI MDRT 상태',
  agiMdrtProgress: 'AGI MDRT 진행률',
  totalIncome: '총 소득',
  monthlyCommissions: '월별 커미션',
};
