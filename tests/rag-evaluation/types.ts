/**
 * RAG Evaluation Test Framework Types
 *
 * Comprehensive type definitions for evaluating RAG system performance
 * against ground truth data extracted from source Excel files.
 */

// ============================================================================
// GROUND TRUTH TYPES
// ============================================================================

/**
 * Employee data from MDRT Excel file
 */
export interface EmployeeGroundTruth {
  sabon: string; // Employee ID (J00001, J00307, etc.)
  name: string;
  jobType: string; // 사업본부장, AM, SM, LP
  branch: string;
  office: string;
  commission: {
    total: number;
    보장성금액: number;
  };
  totalIncome: {
    total: number;
    신계약수입: number;
    보장성금액: number;
  };
  monthlyData: {
    [month: string]: {
      commission: number;
      보장성금액: number;
      totalIncome: number;
      신계약수입: number;
      총수입보장성: number;
    };
  };
  selfContract?: {
    commission: {
      total: number;
      included: number;
    };
    totalIncome: {
      total: number;
      included: number;
    };
  };
}

/**
 * Compensation detail from detail Excel file
 */
export interface CompensationDetailGroundTruth {
  sabon: string;
  name: string;
  period: string;
  team: string;
  jobType: string;
  commissionTotal: number;
  transactions: Array<{
    insuranceCompany: string;
    policyNumber: string;
    contractDate: string;
    status: string;
    paymentRound: number;
    premium: number;
    commission: number;
  }>;
}

/**
 * Insurance commission rate from FC commission file
 */
export interface CommissionRateGroundTruth {
  company: string;
  productName: string;
  paymentPeriod: string;
  rates: {
    firstYear: number;
    secondYear13: number;
    subsequent: number;
  };
}

/**
 * MDRT qualification standards
 */
export interface MdrtStandards {
  year: number;
  requirements: {
    commission: number;
    premium: number;
    income: number;
  };
  cot: {
    commission: number;
    premium: number;
    income: number;
  };
  tot: {
    commission: number;
    premium: number;
    income: number;
  };
}

/**
 * Aggregated statistics for comparison
 */
export interface AggregatedStats {
  totalEmployees: number;
  totalCommission: number;
  totalIncome: number;
  byJobType: {
    [jobType: string]: {
      count: number;
      totalCommission: number;
      avgCommission: number;
    };
  };
  byMonth: {
    [month: string]: {
      totalCommission: number;
      totalIncome: number;
    };
  };
}

/**
 * Complete ground truth data structure
 */
export interface GroundTruth {
  extractedAt: string;
  employees: EmployeeGroundTruth[];
  compensationDetails: CompensationDetailGroundTruth[];
  commissionRates: CommissionRateGroundTruth[];
  mdrtStandards: MdrtStandards;
  aggregations: AggregatedStats;
}

// ============================================================================
// TEST CASE TYPES
// ============================================================================

/**
 * Test categories for organizing test cases
 */
export type TestCategory =
  | 'employee_lookup' // Single employee data retrieval
  | 'employee_comparison' // Compare multiple employees
  | 'mdrt_calculation' // MDRT qualification calculations
  | 'commission_calculation' // Commission calculations
  | 'aggregation' // Summary/totals across data
  | 'temporal' // Time-based queries (monthly, quarterly)
  | 'policy_lookup' // Insurance policy/product lookup
  | 'rate_lookup' // Commission rate lookup
  | 'ranking' // Top/bottom performers
  | 'filtering' // Filtered queries (by job type, branch)
  | 'multi_step'; // Complex queries requiring multiple lookups

/**
 * Difficulty level for test cases
 */
export type TestDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/**
 * Expected answer format type
 */
export type AnswerType =
  | 'numeric' // Single number
  | 'numeric_range' // Number within acceptable range
  | 'text' // Text string
  | 'text_contains' // Text containing specific substring
  | 'list' // List of items
  | 'boolean' // Yes/No
  | 'json' // Structured JSON response
  | 'calculation'; // Calculation with formula verification

/**
 * Validation rule for expected answers
 */
export interface ValidationRule {
  type: AnswerType;
  expected: unknown;
  tolerance?: number; // For numeric comparisons (percentage)
  requiredFields?: string[]; // For JSON validation
  containsAll?: string[]; // For list/text_contains validation
  containsAny?: string[]; // At least one of these
  formula?: string; // For calculation verification
}

/**
 * Single test case definition
 */
export interface TestCase {
  id: string;
  category: TestCategory;
  difficulty: TestDifficulty;
  name: string;
  description: string;
  query: string; // Natural language query in Korean
  queryVariants?: string[]; // Alternative phrasings
  context?: {
    employeeId?: string;
    employeeNumber?: string; // 사번 (J00001, etc.)
    period?: string;
    namespace?: string;
  };
  expectedAnswer: ValidationRule;
  groundTruthSource: {
    type: 'employee' | 'compensation' | 'rate' | 'mdrt' | 'aggregation';
    path: string; // JSON path to ground truth value
    transform?: string; // Optional transformation function name
  };
  metadata?: {
    tags?: string[];
    relatedTests?: string[];
    notes?: string;
  };
}

/**
 * Test suite grouping related test cases
 */
export interface TestSuite {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  testCases: TestCase[];
}

// ============================================================================
// EVALUATION METRICS TYPES
// ============================================================================

/**
 * Metrics for evaluating answer correctness
 */
export interface CorrectnessMetrics {
  isCorrect: boolean;
  exactMatch: boolean;
  numericAccuracy?: number; // 0-1 for numeric comparisons
  textSimilarity?: number; // 0-1 for text comparisons
  containsRequired?: boolean;
  validationDetails: {
    rule: ValidationRule;
    actualValue: unknown;
    passed: boolean;
    reason?: string;
  };
}

/**
 * Metrics for evaluating retrieval quality
 */
export interface RetrievalMetrics {
  retrievedCount: number;
  relevantCount: number;
  precision: number; // relevant_retrieved / total_retrieved
  recall: number; // relevant_retrieved / total_relevant
  f1Score: number; // harmonic mean of precision and recall
  mrr: number; // Mean Reciprocal Rank
  ndcg: number; // Normalized Discounted Cumulative Gain
  avgScore: number; // Average retrieval score
  sources: Array<{
    id: string;
    score: number;
    relevant: boolean;
    namespace?: string;
  }>;
}

/**
 * Metrics for response quality
 */
export interface ResponseMetrics {
  responseTimeMs: number;
  tokenCount?: number;
  confidence?: number;
  clarificationNeeded: boolean;
  errorOccurred: boolean;
  errorMessage?: string;
}

/**
 * Single test result
 */
export interface TestResult {
  testCase: TestCase;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  ragResponse: {
    answer: string;
    sources: Array<{
      id: string;
      preview: string;
      score: number;
    }>;
    metadata?: Record<string, unknown>;
  };
  metrics: {
    correctness: CorrectnessMetrics;
    retrieval: RetrievalMetrics;
    response: ResponseMetrics;
  };
  timestamp: string;
}

/**
 * Aggregated test suite results
 */
export interface TestSuiteResult {
  suite: TestSuite;
  results: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
    passRate: number;
    avgResponseTime: number;
    avgRetrievalPrecision: number;
    avgRetrievalRecall: number;
    avgF1Score: number;
  };
  timestamp: string;
  duration: number;
}

/**
 * Complete evaluation report
 */
export interface EvaluationReport {
  id: string;
  name: string;
  description: string;
  suiteResults: TestSuiteResult[];
  overallSummary: {
    totalSuites: number;
    totalTests: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
    overallPassRate: number;
    byCategory: {
      [category in TestCategory]?: {
        total: number;
        passed: number;
        passRate: number;
      };
    };
    byDifficulty: {
      [difficulty in TestDifficulty]?: {
        total: number;
        passed: number;
        passRate: number;
      };
    };
  };
  configuration: {
    ragVersion: 'v1' | 'v2';
    useReranking: boolean;
    topK: number;
    rerankTopN: number;
    embeddingModel: string;
    rerankModel?: string;
  };
  timestamp: string;
  totalDuration: number;
}

// ============================================================================
// EVALUATION CONFIGURATION
// ============================================================================

/**
 * Configuration for RAG evaluation
 */
export interface EvaluationConfig {
  // RAG settings
  ragVersion: 'v1' | 'v2';
  useReranking: boolean;
  topK: number;
  rerankTopN: number;

  // Evaluation settings
  numericTolerance: number; // Default tolerance for numeric comparisons (e.g., 0.01 = 1%)
  textSimilarityThreshold: number; // Minimum similarity for text matching
  relevanceThreshold: number; // Score threshold for considering result relevant

  // Test filtering
  categories?: TestCategory[];
  difficulties?: TestDifficulty[];
  testIds?: string[];

  // Output settings
  verbose: boolean;
  saveResults: boolean;
  outputPath?: string;
}

/**
 * Default evaluation configuration
 */
export const DEFAULT_EVALUATION_CONFIG: EvaluationConfig = {
  ragVersion: 'v2',
  useReranking: true,
  topK: 20,
  rerankTopN: 5,
  numericTolerance: 0.01,
  textSimilarityThreshold: 0.8,
  relevanceThreshold: 0.35,
  verbose: true,
  saveResults: true,
  outputPath: './tests/rag-evaluation/results',
};
