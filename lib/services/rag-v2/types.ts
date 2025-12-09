/**
 * RAG V2 Types
 *
 * Core types for the enhanced RAG pipeline with:
 * - Multi-stage retrieval
 * - Hybrid search (dense + sparse)
 * - Cross-encoder reranking
 * - Tiered metadata
 */

// =============================================================================
// Embedding Types
// =============================================================================

export interface DenseEmbedding {
  values: number[];
  dimensions: number;
  model: string;
}

export interface SparseEmbedding {
  indices: number[];
  values: number[];
  tokens: string[];
}

export interface HybridEmbedding {
  dense: DenseEmbedding;
  sparse?: SparseEmbedding;
  contentHash: string;
  /** True if dense embedding was retrieved from cache */
  cached?: boolean;
}

// =============================================================================
// Search Types
// =============================================================================

export interface SearchQuery {
  text: string;
  embedding?: DenseEmbedding;
  sparseEmbedding?: SparseEmbedding;
  filters?: Record<string, unknown>;
  topK: number;
  namespaces: string[];
  includeMetadata?: boolean;
}

export interface SearchMatch {
  id: string;
  score: number;
  namespace: string;
  metadata: TieredMetadata;
  /** Full content fetched from DB (only after context assembly) */
  fullContent?: string;
  /** Source of this result (dense, sparse, or fused) */
  source: 'dense' | 'sparse' | 'fused';
}

export interface SearchResults {
  matches: SearchMatch[];
  totalFound: number;
  searchTimeMs: number;
  strategy: 'dense' | 'sparse' | 'hybrid';
}

// =============================================================================
// Tiered Metadata Architecture
// =============================================================================

/**
 * Pinecone-stored metadata (compact, < 4KB)
 * Only filter fields + preview
 */
export interface PineconeMetadata {
  // Core identifiers
  documentId: string;
  chunkRef: string;  // Reference to full content in Supabase
  organizationId: string;

  // Filter fields
  employeeId?: string;
  metadataType: 'employee' | 'mdrt' | 'generic' | 'policy' | 'contract';
  period?: string;  // YYYYMM format
  clearanceLevel: 'basic' | 'standard' | 'advanced';

  // Compact preview for quick display (< 1KB)
  preview: string;

  // Numeric fields for filtering
  createdAt: number;  // Unix timestamp

  // Optional type-specific filter fields
  company?: string;
  chunkType?: string;

  // Parent chunk reference for hierarchical retrieval
  parentChunkRef?: string;
}

/**
 * Supabase-stored full content
 * Complete searchable text and structured data
 */
export interface SupabaseChunkContent {
  id: string;  // Same as chunkRef
  documentId: string;

  // Full searchable text (unlimited size)
  fullContent: string;

  // Structured data for calculations/aggregations
  structuredData?: Record<string, unknown>;

  // Search keywords for sparse retrieval
  searchKeywords: string[];

  // Additional metadata not in Pinecone
  processingInfo: {
    processorType: string;
    chunkIndex: number;
    contentHash: string;
    createdAt: string;
  };
}

/**
 * Combined tiered metadata
 */
export interface TieredMetadata extends PineconeMetadata {
  // Populated after Supabase lookup
  fullContent?: string;
  structuredData?: Record<string, unknown>;
  searchKeywords?: string[];
}

// =============================================================================
// Reranking Types
// =============================================================================

export interface RerankRequest {
  query: string;
  documents: Array<{
    id: string;
    text: string;
    metadata?: Record<string, unknown>;
  }>;
  topN: number;
  model?: 'cohere' | 'bge' | 'cross-encoder';
}

export interface RerankResult {
  id: string;
  score: number;
  originalRank: number;
  newRank: number;
}

export interface RerankResponse {
  results: RerankResult[];
  model: string;
  processingTimeMs: number;
}

// =============================================================================
// Multi-Stage RAG Types
// =============================================================================

export interface QueryUnderstanding {
  originalQuery: string;
  expandedQueries: string[];
  intent: {
    type: 'lookup' | 'calculation' | 'comparison' | 'aggregation' | 'general';
    confidence: number;
  };
  entities: {
    period?: string;
    employee?: string;
    company?: string;
    fields?: string[];
  };
  isTimeSensitive: boolean;
  needsMultipleDocTypes: boolean;
}

export interface RetrievalConfig {
  // Stage 1: Broad retrieval
  broadTopK: number;  // Default: 50

  // Stage 2: Reranking
  rerankTopN: number;  // Default: 10
  rerankModel: 'cohere' | 'bge' | 'cross-encoder';

  // Stage 3: Diversity
  useMmr: boolean;  // Maximal Marginal Relevance
  mmrLambda: number;  // Default: 0.7 (higher = more relevance)

  // Hybrid search weights
  denseWeight: number;  // Default: 0.7
  sparseWeight: number;  // Default: 0.3

  // RRF constant
  rrfK: number;  // Default: 60
}

export interface RAGContext {
  employeeId: string;
  employeeNumber?: string;
  organizationId: string;
  namespace: string;
  additionalNamespaces?: string[];
  sessionId?: string;
  clearanceLevel?: 'basic' | 'standard' | 'advanced';
}

export interface RAGStageMetrics {
  queryUnderstanding: {
    timeMs: number;
    expandedQueries: number;
  };
  broadRetrieval: {
    timeMs: number;
    denseResults: number;
    sparseResults: number;
    fusedResults: number;
  };
  reranking: {
    timeMs: number;
    model: string;
    inputCount: number;
    outputCount: number;
  };
  contextAssembly: {
    timeMs: number;
    chunksExpanded: number;
    tokensUsed: number;
  };
  generation: {
    timeMs: number;
    model: string;
    tokensIn: number;
    tokensOut: number;
  };
  total: {
    timeMs: number;
  };
}

export interface RAGResult {
  answer: string;
  sources: Array<{
    id: string;
    preview: string;
    score: number;
    metadata: TieredMetadata;
  }>;
  metrics: RAGStageMetrics;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  confidence: number;
}

// =============================================================================
// Cache Types
// =============================================================================

export interface CacheConfig {
  embeddings: {
    enabled: boolean;
    ttlSeconds: number;  // Default: 30 days
  };
  queries: {
    enabled: boolean;
    ttlSeconds: number;  // Default: 1 hour
  };
  chunks: {
    enabled: boolean;
    ttlSeconds: number;  // Default: 24 hours
  };
}

export interface CachedEmbedding {
  hash: string;
  dense: number[];
  sparse?: SparseEmbedding;
  model: string;
  createdAt: number;
}

// =============================================================================
// Processing Types (for document upload)
// =============================================================================

export interface ParentChildChunk {
  parent: {
    id: string;
    content: string;
    metadata: Record<string, unknown>;
  };
  children: Array<{
    id: string;
    content: string;
    embeddingText: string;
    metadata: Record<string, unknown>;
  }>;
}

export interface ProcessingCheckpoint {
  documentId: string;
  lastProcessedChunk: number;
  totalChunks: number;
  status: 'in_progress' | 'completed' | 'failed' | 'paused';
  error?: string;
  checkpointData?: {
    lastVectorIds?: string[];
    processedRows?: number[];
    partialResults?: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Namespace Strategy
// =============================================================================

export type ConsolidatedNamespace =
  | `org_${string}_employee`  // All employee data for org
  | `org_${string}_public`    // Public documents for org
  | `org_${string}_policy`    // Policies/announcements for org
  | 'global_public';          // Cross-org public content

export interface NamespaceConfig {
  strategy: 'consolidated' | 'per_employee';
  prefix: string;
  includeEmployeeFilter: boolean;
}

// =============================================================================
// Observability
// =============================================================================

export interface RAGQueryLog {
  id: string;
  sessionId?: string;
  userId?: string;
  query: string;
  answer: string;
  metrics: RAGStageMetrics;
  resultCount: number;
  topScore: number;
  confidence: number;
  wasSuccessful: boolean;
  errorMessage?: string;
  createdAt: Date;
}

export interface RAGMetricsSummary {
  period: string;  // e.g., "2024-01-15"
  totalQueries: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  avgResultCount: number;
  avgConfidence: number;
  cacheHitRate: number;
  errorRate: number;
  byStage: {
    queryUnderstanding: { avgMs: number };
    retrieval: { avgMs: number };
    reranking: { avgMs: number };
    generation: { avgMs: number };
  };
}
