/**
 * RAG V2 Module Exports
 *
 * Enhanced RAG pipeline with hybrid search, Cohere reranking, and caching.
 */

// Types
export * from './types';

// Services
export { cacheService } from './cache.service';
export { embeddingService, generateContentHash } from './embedding.service';
export { rerankService } from './rerank.service';
export { hybridSearchService } from './hybrid-search.service';
export { ragV2Service } from './rag.service';
export { observabilityService } from './observability.service';
export { streamingProcessorService } from './streaming-processor.service';

// Re-export for convenience
export type {
  // Embedding types
  DenseEmbedding,
  SparseEmbedding,
  HybridEmbedding,
  // Search types
  SearchQuery,
  SearchMatch,
  SearchResults,
  // Metadata types
  PineconeMetadata,
  TieredMetadata,
  SupabaseChunkContent,
  // RAG types
  RAGContext,
  RAGResult,
  RAGStageMetrics,
  QueryUnderstanding,
  RetrievalConfig,
  // Rerank types
  RerankRequest,
  RerankResult,
  RerankResponse,
  // Cache types
  CacheConfig,
  CachedEmbedding,
} from './types';
