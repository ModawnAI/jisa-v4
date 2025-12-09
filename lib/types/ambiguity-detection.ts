/**
 * Ambiguity Detection Types
 *
 * Types for detecting and handling ambiguous queries
 * that could match multiple document types.
 */

import type { TemplateType } from '@/lib/ai/query-intent';
import type { ClarificationOption } from '@/lib/db/schema/ambiguity-rules';

// Re-export for consumers
export type { ClarificationOption };

/**
 * Result of checking if a query contains ambiguous keywords
 */
export interface AmbiguousKeywordMatch {
  /** Whether ambiguous keywords were found */
  hasAmbiguousKeywords: boolean;
  /** The matched keywords from the query */
  matchedKeywords: string[];
  /** Templates that could match */
  competingTemplates: string[];
  /** The rule that matched (if any) */
  ruleId?: string;
  /** Clarification question to ask */
  clarificationQuestion?: string;
  /** Options for user to choose */
  options?: ClarificationOption[];
  /** Score threshold from the rule */
  scoreThreshold?: number;
}

/**
 * Result of analyzing search results for ambiguity
 */
export interface ResultAmbiguityAnalysis {
  /** Whether results are ambiguous (multiple types with close scores) */
  isAmbiguous: boolean;
  /** The document types found in results */
  documentTypes: string[];
  /** Score distribution by type */
  scoresByType: Record<string, {
    topScore: number;
    count: number;
    avgScore: number;
  }>;
  /** Types that are competing (close scores) */
  competingTypes?: string[];
  /** The dominant type (if not ambiguous) */
  dominantType?: string;
  /** Score ratio between top two types */
  scoreRatio?: number;
}

/**
 * Combined ambiguity detection result
 */
export interface AmbiguityDetectionResult {
  /** Whether clarification is needed */
  needsClarification: boolean;
  /** Reason for the detection */
  reason: 'keyword_match' | 'result_distribution' | 'both' | 'none';
  /** Keyword analysis result */
  keywordAnalysis: AmbiguousKeywordMatch;
  /** Result distribution analysis (if search was performed) */
  resultAnalysis?: ResultAmbiguityAnalysis;
  /** The clarification to show user */
  clarification?: {
    question: string;
    options: ClarificationOption[];
    originalQuery: string;
  };
}

/**
 * User's response to clarification
 */
export interface ClarificationResponse {
  /** Selected option index (1-based) */
  selectedIndex?: number;
  /** Selected template */
  selectedTemplate?: TemplateType;
  /** Selected metadata type filter */
  selectedMetadataType?: string;
  /** Raw user response text */
  rawResponse: string;
}

/**
 * Search result with source metadata for ambiguity detection
 */
export interface SearchResultWithSource {
  id: string;
  score: number;
  metadata?: {
    metadataType?: string;
    documentType?: string;
    [key: string]: unknown;
  };
}

/**
 * Configuration for ambiguity detection
 */
export interface AmbiguityDetectionConfig {
  /** Minimum score difference to consider results competing (default: 0.15) */
  scoreThreshold: number;
  /** Minimum number of results from a type to consider it competing (default: 2) */
  minResultsPerType: number;
  /** Whether to check keywords before search (default: true) */
  checkKeywordsBeforeSearch: boolean;
  /** Whether to analyze result distribution (default: true) */
  analyzeResultDistribution: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_AMBIGUITY_CONFIG: AmbiguityDetectionConfig = {
  scoreThreshold: 0.15,  // If scores are within 15% of each other
  minResultsPerType: 2,
  checkKeywordsBeforeSearch: true,
  analyzeResultDistribution: true,
};

/**
 * Explicit template trigger keywords
 * These keywords strongly indicate a specific template, bypassing ambiguity detection
 */
export const EXPLICIT_TEMPLATE_TRIGGERS: Record<string, string[]> = {
  compensation: [
    '급여', '월급', '실수령', '지급', '명세', '세후', '세전',
    '오버라이드', '환수', '차감', '입금', '통장', '급여명세',
    '건별', '계약별', '수당',
  ],
  mdrt: [
    'mdrt', '엠디알티', 'cot', 'tot', '달성', '진행률',
    '자격', '목표', '남은 금액', '부족', '달성현황',
    'fyc', 'agi', '연환산',
  ],
};

/**
 * Check if query explicitly triggers a specific template
 */
export function getExplicitTemplate(query: string): TemplateType | null {
  const normalizedQuery = query.toLowerCase();

  for (const [template, triggers] of Object.entries(EXPLICIT_TEMPLATE_TRIGGERS)) {
    for (const trigger of triggers) {
      if (normalizedQuery.includes(trigger.toLowerCase())) {
        return template as TemplateType;
      }
    }
  }

  return null;
}
