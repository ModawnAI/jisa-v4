/**
 * Autonomous RAG System Types
 *
 * Type definitions for the autonomous document processing and
 * self-improving RAG pipeline.
 */

// =============================================================================
// Document Analysis Types
// =============================================================================

/**
 * Result of document analysis
 */
export interface DocumentAnalysis {
  /** Document type detected */
  documentType: 'excel' | 'pdf' | 'csv' | 'json' | 'unknown';

  /** File characteristics */
  fileInfo: {
    size: number;
    mimeType: string;
    fileName: string;
    extension: string;
  };

  /** Document structure details */
  structure: {
    /** Excel sheet analysis */
    sheets?: SheetAnalysis[];
    /** PDF section analysis */
    sections?: SectionAnalysis[];
    /** Detected tables */
    tables?: TableAnalysis[];
  };

  /** Confidence in the analysis (0-1) */
  confidence: number;

  /** Match to existing schema if found */
  suggestedSchemaId?: string;
  suggestedSchemaSlug?: string;

  /** Raw sample data */
  rawSample: Record<string, unknown>;

  /** Analysis timestamp */
  analyzedAt: Date;
}

/**
 * Excel sheet analysis
 */
export interface SheetAnalysis {
  /** Sheet name */
  name: string;

  /** Header row index (0-based) */
  headerRow: number;

  /** Column analysis */
  headers: ColumnAnalysis[];

  /** First data row index (0-based) */
  dataStartRow: number;

  /** Total row count */
  rowCount: number;

  /** Total column count */
  columnCount: number;

  /** Detected primary key columns */
  keyColumns: string[];

  /** Detected foreign key relations */
  foreignKeys: ForeignKeyRelation[];

  /** Sample data rows */
  sampleRows: Record<string, unknown>[];

  /** Sheet structure markers */
  structureMarkers: string[];
}

/**
 * Column analysis for a single column
 */
export interface ColumnAnalysis {
  /** Original column name/header */
  name: string;

  /** Normalized name */
  normalizedName: string;

  /** Column index (0-based) */
  index: number;

  /** Inferred data type */
  inferredType: ColumnType;

  /** Whether column allows nulls */
  nullable: boolean;

  /** Percentage of null values (0-1) */
  nullPercentage?: number;

  /** Uniqueness ratio (0-1, 1 = all unique) */
  uniqueness: number;

  /** Sample values from the column */
  sampleValues: unknown[];

  /** Semantic category if detected */
  semanticCategory?: SemanticCategory;

  /** Confidence in type inference */
  typeConfidence: number;

  /** Statistics for numeric columns */
  numericStats?: {
    min: number;
    max: number;
    avg: number;
    sum: number;
  };
}

/**
 * Column data types
 */
export type ColumnType =
  | 'string'
  | 'number'
  | 'integer'
  | 'decimal'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'id'
  | 'mixed'
  | 'unknown';

/**
 * Semantic categories for columns
 */
export type SemanticCategory =
  | 'employee_id'      // 사번
  | 'employee_name'    // 사원명
  | 'department'       // 부서/소속
  | 'job_type'         // 직종
  | 'date'             // 일반 날짜
  | 'period'           // 기간 (월, 분기)
  | 'amount'           // 금액
  | 'commission'       // 수수료
  | 'income'           // 수입
  | 'fyc'              // FYC (First Year Commission)
  | 'count'            // 건수
  | 'rate'             // 비율
  | 'status'           // 상태
  | 'insurance_company' // 보험사
  | 'product_name'     // 상품명
  | 'contractor_name'  // 계약자명
  | 'policy_number'    // 증권번호
  | 'other';

/**
 * Foreign key relation detection
 */
export interface ForeignKeyRelation {
  /** Source column */
  sourceColumn: string;
  /** Target table/sheet */
  targetTable: string;
  /** Target column */
  targetColumn: string;
  /** Confidence in detection */
  confidence: number;
}

/**
 * PDF section analysis
 */
export interface SectionAnalysis {
  /** Section title */
  title: string;
  /** Page number */
  pageNumber: number;
  /** Section level (1 = top-level) */
  level: number;
  /** Content preview */
  contentPreview: string;
  /** Word count */
  wordCount: number;
}

/**
 * Table analysis (for PDF/unstructured documents)
 */
export interface TableAnalysis {
  /** Table location */
  location: {
    pageNumber?: number;
    sheetName?: string;
    rowStart: number;
    rowEnd: number;
  };
  /** Column count */
  columnCount: number;
  /** Row count */
  rowCount: number;
  /** Headers if detected */
  headers?: string[];
  /** Sample data */
  sampleData: Record<string, unknown>[];
}

// =============================================================================
// Schema Discovery Types
// =============================================================================

/**
 * Discovered schema definition
 */
export interface DiscoveredSchema {
  /** Unique identifier */
  id: string;

  /** Schema version */
  version: number;

  /** Human-readable name */
  name: string;

  /** Display name (Korean) */
  displayName?: string;

  /** Schema slug for lookups */
  slug: string;

  /** Description */
  description: string;

  /** Entity type this schema represents */
  entityType: EntityType;

  /** Primary key field(s) */
  primaryKey: string[];

  /** Field definitions */
  fields: FieldDefinition[];

  /** Relationships to other schemas */
  relationships: RelationshipDefinition[];

  /** Processing hints */
  chunkingStrategy: ChunkingStrategy;

  /** Chunk types supported */
  chunkTypes?: string[];

  /** Supported intents */
  supportedIntents?: string[];

  /** Embedding template reference */
  embeddingTemplateId?: string;

  /** Query patterns this schema supports */
  queryPatterns: QueryPattern[];

  /** Source documents this was discovered from */
  sourceDocuments: string[];

  /** Discovery timestamp */
  discoveredAt: Date;

  /** Accuracy score from testing */
  accuracy: number;

  /** Usage count */
  usageCount: number;

  /** Active status */
  isActive: boolean;
}

/**
 * Entity types
 */
export type EntityType =
  | 'compensation'     // 보수 명세
  | 'contract'         // 계약 정보
  | 'employee'         // 직원 정보
  | 'mdrt'             // MDRT 현황
  | 'policy'           // 정책 문서
  | 'performance'      // 실적
  | 'other';

/**
 * Field definition
 */
export interface FieldDefinition {
  /** Field key (unique identifier) */
  key?: string;

  /** Field name (internal) */
  name: string;

  /** Display name (Korean) */
  displayName: string;

  /** Description */
  description?: string;

  /** Data type */
  type: ColumnType;

  /** Aliases (Korean/English synonyms) */
  aliases: string[];

  /** Semantic role */
  semanticRole: SemanticCategory;

  /** Whether field is required */
  required: boolean;

  /** Default value if not present */
  defaultValue?: unknown;

  /** For RAG: whether to include in index */
  indexable: boolean;

  /** For RAG: whether to use as filter */
  filterable: boolean;

  /** Whether field is searchable */
  isSearchable?: boolean;

  /** Whether field is filterable */
  isFilterable?: boolean;

  /** Whether field is computable */
  isComputable?: boolean;

  /** Sample values */
  sampleValues?: unknown[];

  /** Unit (for numeric fields) */
  unit?: string;

  /** For RAG: importance in embedding (0-1) */
  embeddingWeight: number;

  /** Validation rules */
  validation?: FieldValidation;
}

/**
 * Field validation rules
 */
export interface FieldValidation {
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Regex pattern (for strings) */
  pattern?: string;
  /** Enum of allowed values */
  enum?: unknown[];
  /** Custom validation message */
  message?: string;
}

/**
 * Relationship definition
 */
export interface RelationshipDefinition {
  /** Relationship name */
  name: string;
  /** Target schema slug */
  targetSchema: string;
  /** Source field(s) */
  sourceFields: string[];
  /** Target field(s) */
  targetFields: string[];
  /** Relationship type */
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

/**
 * Chunking strategy configuration
 */
export interface ChunkingStrategy {
  /** Chunking mode */
  mode: 'entity' | 'section' | 'fixed' | 'semantic';

  /** For entity mode: field to group by */
  groupByField?: string;

  /** For fixed mode: chunk size */
  chunkSize?: number;

  /** Chunk overlap */
  overlap?: number;

  /** Maximum chunk length */
  maxLength?: number;

  /** Include summary chunk */
  includeSummary?: boolean;
}

/**
 * Query pattern definition
 */
export interface QueryPattern {
  /** Pattern ID */
  id: string;

  /** Pattern template (e.g., "내 {field} 알려줘") */
  template: string;

  /** Intent this pattern maps to */
  intent: QueryIntent;

  /** Fields this pattern queries */
  targetFields: string[];

  /** Expected filter fields */
  expectedFilters: string[];

  /** Sample queries */
  examples: string[];

  /** Success rate from testing */
  successRate?: number;
}

/**
 * Query intent types
 */
export type QueryIntent =
  | 'direct_lookup'    // 직접 조회
  | 'aggregation'      // 집계
  | 'comparison'       // 비교
  | 'calculation'      // 계산
  | 'trend'            // 추세
  | 'general_qa';      // 일반 질문

// =============================================================================
// Ground Truth Types
// =============================================================================

/**
 * Ground truth for testing
 */
export interface GroundTruth {
  /** Schema this belongs to */
  schemaId: string;

  /** Document this was extracted from */
  documentId: string;

  /** Entities with ground truth values */
  entities: GroundTruthEntity[];

  /** Extraction timestamp */
  extractedAt: Date;

  /** Overall confidence */
  confidence: number;

  /** Extraction method */
  extractionMethod: 'auto' | 'manual' | 'verified';
}

/**
 * Single entity ground truth
 */
export interface GroundTruthEntity {
  /** Unique identifier for this entity */
  identifier: Record<string, unknown>;

  /** Field values with metadata */
  fields: Record<string, GroundTruthField>;
}

/**
 * Ground truth field value
 */
export interface GroundTruthField {
  /** The actual value */
  value: unknown;

  /** Confidence in this value */
  confidence: number;

  /** Source location (cell reference, line number) */
  source: string;

  /** Value type */
  type: ColumnType;
}

// =============================================================================
// Accuracy Testing Types
// =============================================================================

/**
 * Accuracy test definition
 */
export interface AccuracyTest {
  /** Test ID */
  id: string;

  /** Test name */
  name: string;

  /** Test description */
  description?: string;

  /** Schema this tests */
  schemaId: string;

  /** Test category */
  category: TestCategory;

  /** Test priority */
  priority: 'critical' | 'high' | 'medium' | 'low';

  /** Query to execute */
  query: string;

  /** Query pattern template */
  queryPattern?: string;

  /** Target entity to match */
  targetEntity: Record<string, unknown>;

  /** Expected fields in response */
  expectedFields: string[];

  /** Expected values */
  expectedValues: Record<string, unknown>;

  /** Value tolerance for numeric comparisons */
  valueTolerance: number;

  /** Allowed discrepancy types */
  allowedDiscrepancies?: DiscrepancyType[];

  /** Whether test is active */
  isActive: boolean;

  /** Ground truth reference */
  groundTruthId?: string;
}

/**
 * Test categories
 */
export type TestCategory =
  | 'compensation'
  | 'contract'
  | 'mdrt'
  | 'general'
  | 'edge_case';

/**
 * Accuracy test result
 */
export interface AccuracyResult {
  /** Test ID */
  testId: string;

  /** Test name */
  testName: string;

  /** Pipeline run ID */
  pipelineRunId?: string;

  /** Iteration number */
  iteration: number;

  /** Test status */
  status: TestStatus;

  /** Whether test passed */
  passed: boolean;

  /** Accuracy score (0-1) */
  accuracy: number;

  /** RAG response */
  response: string;

  /** Extracted values from response */
  extractedValues: Record<string, unknown>;

  /** Discrepancies found */
  discrepancies: Discrepancy[];

  /** Number of search results */
  searchResultsCount: number;

  /** Top result score */
  topScore: number;

  /** Filters used */
  filtersUsed: Record<string, unknown>;

  /** Namespace searched */
  namespaceSearched: string;

  /** Timing information */
  timing: {
    total: number;
    router?: number;
    search: number;
    generation: number;
  };

  /** Route type */
  routeType: string;

  /** Intent detected */
  intentType: string;

  /** Intent confidence */
  intentConfidence: number;

  /** Test timestamp */
  testedAt: Date;
}

/**
 * Test status
 */
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

/**
 * Discrepancy between expected and actual
 */
export interface Discrepancy {
  /** Field with discrepancy */
  field: string;

  /** Expected value */
  expected: unknown;

  /** Actual value */
  actual: unknown;

  /** Discrepancy type */
  type: DiscrepancyType;

  /** Severity */
  severity: DiscrepancySeverity;

  /** Error message */
  message?: string;
}

/**
 * Discrepancy types
 */
export type DiscrepancyType =
  | 'missing'           // Field not found in response
  | 'wrong_value'       // Value doesn't match
  | 'format_mismatch'   // Format differs (e.g., date format)
  | 'type_mismatch'     // Type differs (string vs number)
  | 'within_tolerance'; // Close but not exact

/**
 * Discrepancy severity
 */
export type DiscrepancySeverity = 'critical' | 'high' | 'medium' | 'low';

// =============================================================================
// Optimization Types
// =============================================================================

/**
 * Optimization action
 */
export interface OptimizationAction {
  /** Action ID */
  id: string;

  /** Schema being optimized */
  schemaId?: string;

  /** Pipeline run ID */
  pipelineRunId?: string;

  /** Iteration number */
  iteration?: number;

  /** Action type */
  actionType: OptimizationActionType;

  /** Target of the action */
  target: string;

  /** Target ID if applicable */
  targetId?: string;

  /** Change to apply */
  change: Record<string, unknown>;

  /** Reason for this action */
  reason: string;

  /** Confidence in this action */
  confidence: number;

  /** Failure patterns that triggered this */
  failurePatterns?: FailurePattern[];

  /** Tests affected by this action */
  affectedTests?: string[];

  /** Whether action has been applied */
  applied: boolean;

  /** Whether action succeeded */
  success?: boolean;

  /** Error if failed */
  error?: string;

  /** Accuracy before action */
  accuracyBefore?: number;

  /** Accuracy after action */
  accuracyAfter?: number;

  /** Improvement percentage */
  improvementPercent?: number;

  /** Whether action can be rolled back */
  canRollback: boolean;

  /** Whether action was rolled back */
  rolledBack: boolean;

  /** Previous state for rollback */
  previousState?: Record<string, unknown>;

  /** Timestamp */
  appliedAt: Date;
}

/**
 * Optimization action types
 */
export type OptimizationActionType =
  | 'schema_update'      // Update schema definition
  | 'embedding_update'   // Update embedding template
  | 'filter_fix'         // Fix filter matching
  | 'metadata_add'       // Add metadata field
  | 'field_alias'        // Add field alias
  | 'query_pattern';     // Add query pattern

/**
 * Failure pattern detected
 */
export interface FailurePattern {
  /** Pattern type */
  type: FailurePatternType;

  /** Field involved */
  field?: string;

  /** Query pattern involved */
  queryPattern?: string;

  /** Filter field (for filter mismatches) */
  filterField?: string;

  /** Stored field name */
  storedField?: string;

  /** Expected field name */
  expectedFieldName?: string;

  /** Suggested format */
  suggestedFormat?: string;

  /** Query terms (for low relevance) */
  queryTerms?: string[];

  /** Relevant fields */
  relevantFields?: string[];

  /** Average score (for low relevance) */
  avgScore?: number;

  /** Detected aliases */
  detectedAliases?: string[];

  /** Suggested source */
  suggestedSource?: string;

  /** Occurrence count */
  occurrences: number;

  /** Affected test IDs */
  affectedTestIds: string[];
}

/**
 * Failure pattern types
 */
export type FailurePatternType =
  | 'filter_mismatch'    // Period format, field name mismatches
  | 'low_relevance'      // Embedding text not matching queries
  | 'missing_field'      // Schema doesn't capture needed field
  | 'type_mismatch'      // Value type issues
  | 'parsing_error';     // Document parsing issues

// =============================================================================
// Pipeline Types
// =============================================================================

/**
 * Pipeline run state
 */
export interface PipelineState {
  /** Run ID */
  id: string;

  /** Document being processed */
  documentId?: string;

  /** Schema being used/discovered */
  schemaId?: string;

  /** Pipeline status */
  status: PipelineStatus;

  /** Current phase */
  currentPhase: PipelinePhase;

  /** Trigger type */
  triggerType: PipelineTrigger;

  /** Target accuracy */
  targetAccuracy: number;

  /** Maximum iterations */
  maxIterations: number;

  /** Results from each phase */
  analysis?: DocumentAnalysis;
  groundTruth?: GroundTruth;
  testResults?: AccuracyReport;
  optimizationPlan?: OptimizationPlan;

  /** Iteration tracking */
  totalIterations: number;
  accuracyHistory: number[];

  /** Test counts */
  testsRun: number;
  testsPassed: number;

  /** Optimization counts */
  optimizationsApplied: number;

  /** Final accuracy */
  finalAccuracy?: number;

  /** Error information */
  errorMessage?: string;
  errorStack?: string;

  /** Timing */
  startedAt: Date;
  completedAt?: Date;
  totalDurationMs?: number;
}

/**
 * Pipeline status
 */
export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Pipeline phases
 */
export type PipelinePhase =
  | 'analyzing'
  | 'discovering_schema'
  | 'parsing'
  | 'upserting'
  | 'extracting_ground_truth'
  | 'testing'
  | 'optimizing'
  | 'reprocessing'
  | 'completed'
  | 'failed';

/**
 * Pipeline trigger types
 */
export type PipelineTrigger =
  | 'document_upload'
  | 'manual'
  | 'scheduled'
  | 'reprocessing';

/**
 * Accuracy report
 */
export interface AccuracyReport {
  /** Report ID */
  id: string;

  /** Schema tested */
  schemaId: string;

  /** Overall accuracy */
  accuracy: number;

  /** Test results */
  results: AccuracyResult[];

  /** Results by category */
  byCategory: Record<TestCategory, CategoryStats>;

  /** Failure analysis */
  failureAnalysis?: FailureAnalysis;

  /** Report timestamp */
  generatedAt: Date;
}

/**
 * Category statistics
 */
export interface CategoryStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  accuracy: number;
}

/**
 * Failure analysis
 */
export interface FailureAnalysis {
  /** Total failures */
  totalFailures: number;

  /** Failures by type */
  byType: Record<DiscrepancyType, number>;

  /** Failures by field */
  byField: Record<string, number>;

  /** Detected patterns */
  patterns: FailurePattern[];

  /** Recommendations */
  recommendations: OptimizationAction[];
}

/**
 * Optimization plan
 */
export interface OptimizationPlan {
  /** Plan ID */
  id: string;

  /** Schema being optimized */
  schemaId: string;

  /** Actions to take */
  actions: OptimizationAction[];

  /** Estimated improvement */
  estimatedImprovement: number;

  /** Entities requiring reprocessing */
  requiredReprocessing: string[];

  /** Plan timestamp */
  createdAt: Date;
}

// =============================================================================
// Embedding Template Types
// =============================================================================

/**
 * Embedding template definition
 */
export interface EmbeddingTemplate {
  /** Template ID */
  id: string;

  /** Schema this belongs to */
  schemaId: string;

  /** Schema slug */
  schemaSlug: string;

  /** Template version */
  version: number;

  /** Template sections */
  sections: EmbeddingSection[];

  /** Semantic anchor keywords */
  semanticAnchors: string[];

  /** Maximum embedding text length */
  maxLength: number;

  /** Priority fields to include */
  priorityFields: string[];

  /** Performance metrics */
  avgRelevanceScore?: number;
  querySuccessRate?: number;
  totalQueries: number;

  /** Active status */
  isActive: boolean;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Embedding section
 */
export interface EmbeddingSection {
  /** Section name */
  name: string;

  /** Template string (handlebars-style) */
  template: string;

  /** Fields used in this section */
  fields: string[];

  /** Section weight (0-1) */
  weight: number;

  /** Conditional expression */
  conditional?: string;
}
