/**
 * Intent Confidence Thresholds
 *
 * Defines confidence thresholds for routing queries
 * to appropriate processing paths.
 */

/**
 * Query route types
 */
export type QueryRoute = 'instant' | 'rag' | 'clarify' | 'fallback';

/**
 * Confidence thresholds for query routing
 */
export const INTENT_THRESHOLDS = {
  /**
   * Route to instant response (no RAG needed)
   * Used for: greetings, simple FAQs, predefined responses
   */
  INSTANT: 0.95,

  /**
   * Route to full RAG pipeline with high confidence
   * Query is clear, entities extracted, ready for vector search
   */
  RAG_HIGH_CONFIDENCE: 0.7,

  /**
   * Route to clarification flow
   * Query is somewhat understandable but needs more context
   */
  CLARIFICATION_THRESHOLD: 0.5,

  /**
   * Fallback to generic response
   * Query is too ambiguous or unrelated
   */
  FALLBACK: 0.3,
} as const;

/**
 * Relevance thresholds for search results
 */
export const RELEVANCE_THRESHOLDS = {
  /**
   * Minimum score for a result to be considered relevant
   */
  MINIMUM_RELEVANCE: 0.35,

  /**
   * Score above which result is considered highly relevant
   */
  HIGH_RELEVANCE: 0.7,

  /**
   * Score below which we should suggest clarification
   */
  LOW_RELEVANCE_WARNING: 0.45,
} as const;

/**
 * Processing timeout thresholds (ms)
 */
export const PROCESSING_TIMEOUTS = {
  /**
   * Max time for quick classification (Stage 0)
   */
  QUICK_CLASSIFICATION: 50,

  /**
   * Max time for intent understanding
   */
  INTENT_UNDERSTANDING: 3000,

  /**
   * Max time for embedding generation
   */
  EMBEDDING: 2000,

  /**
   * Max time for vector search
   */
  VECTOR_SEARCH: 2000,

  /**
   * Max time for response generation
   */
  RESPONSE_GENERATION: 10000,

  /**
   * Total pipeline timeout
   */
  TOTAL_PIPELINE: 15000,
} as const;

/**
 * Determine the route for a given confidence score
 */
export function getRouteForConfidence(confidence: number): QueryRoute {
  if (confidence >= INTENT_THRESHOLDS.INSTANT) return 'instant';
  if (confidence >= INTENT_THRESHOLDS.RAG_HIGH_CONFIDENCE) return 'rag';
  if (confidence >= INTENT_THRESHOLDS.CLARIFICATION_THRESHOLD) return 'clarify';
  return 'fallback';
}

/**
 * Check if confidence warrants proceeding with RAG
 */
export function shouldProceedWithRAG(confidence: number): boolean {
  return confidence >= INTENT_THRESHOLDS.RAG_HIGH_CONFIDENCE;
}

/**
 * Check if clarification should be requested
 */
export function shouldRequestClarification(confidence: number): boolean {
  return (
    confidence >= INTENT_THRESHOLDS.FALLBACK &&
    confidence < INTENT_THRESHOLDS.RAG_HIGH_CONFIDENCE
  );
}

/**
 * Check if results are relevant enough
 */
export function areResultsRelevant(avgScore: number): boolean {
  return avgScore >= RELEVANCE_THRESHOLDS.MINIMUM_RELEVANCE;
}

/**
 * Route descriptions for logging/debugging
 */
export const ROUTE_DESCRIPTIONS: Record<QueryRoute, string> = {
  instant: '즉시 응답 (RAG 불필요)',
  rag: 'RAG 파이프라인 실행',
  clarify: '명확화 질문 필요',
  fallback: '일반 응답 (의도 불명확)',
};
