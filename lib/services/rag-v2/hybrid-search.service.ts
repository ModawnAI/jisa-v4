/**
 * Hybrid Search Service
 *
 * Combines dense (semantic) and sparse (keyword) search with:
 * - Reciprocal Rank Fusion (RRF) for result merging
 * - Maximal Marginal Relevance (MMR) for diversity
 * - Multi-namespace search support
 */

import { Pinecone, Index } from '@pinecone-database/pinecone';
import { embeddingService } from './embedding.service';
import { rerankService } from './rerank.service';
import type {
  SearchQuery,
  SearchMatch,
  SearchResults,
  RetrievalConfig,
  TieredMetadata,
  PineconeMetadata,
} from './types';

// Lazy Pinecone client
let pineconeClient: Pinecone | null = null;
let pineconeIndex: Index | null = null;

function getPineconeIndex(): Index {
  if (!pineconeIndex) {
    if (!pineconeClient) {
      pineconeClient = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
      });
    }
    const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX;
    if (!indexName) {
      throw new Error('Pinecone index name not configured');
    }
    pineconeIndex = pineconeClient.index(indexName.trim());
  }
  return pineconeIndex;
}

// Default retrieval configuration
const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  broadTopK: 50,
  rerankTopN: 10,
  rerankModel: 'cohere',
  useMmr: true,
  mmrLambda: 0.7,
  denseWeight: 0.7,
  sparseWeight: 0.3,
  rrfK: 60,
};

class HybridSearchService {
  private config: RetrievalConfig;

  constructor(config: Partial<RetrievalConfig> = {}) {
    this.config = { ...DEFAULT_RETRIEVAL_CONFIG, ...config };
  }

  /**
   * Perform hybrid search combining dense and sparse retrieval
   */
  async search(query: SearchQuery): Promise<SearchResults> {
    const startTime = Date.now();
    const { text, namespaces, topK, filters, includeMetadata = true } = query;

    // Generate embeddings if not provided
    let denseEmbedding = query.embedding;
    if (!denseEmbedding) {
      denseEmbedding = await embeddingService.generateDenseEmbedding(text);
    }

    // Search across namespaces
    const index = getPineconeIndex();
    const allDenseResults: Array<SearchMatch & { namespace: string }> = [];

    // Perform dense search in all namespaces
    await Promise.all(
      namespaces.map(async (namespace) => {
        try {
          const ns = index.namespace(namespace);
          const response = await ns.query({
            vector: denseEmbedding!.values,
            topK: this.config.broadTopK,
            filter: filters,
            includeMetadata,
          });

          for (const match of response.matches || []) {
            allDenseResults.push({
              id: match.id,
              score: match.score ?? 0,
              namespace,
              metadata: (match.metadata as unknown as TieredMetadata) || ({} as TieredMetadata),
              source: 'dense',
            });
          }
        } catch (error) {
          console.error(`[HybridSearch] Error searching namespace ${namespace}:`, error);
        }
      })
    );

    // For now, we use dense search results
    // Sparse search would require a separate sparse vector index or hybrid index
    const fusedResults = this.applyRRF(
      [allDenseResults],
      this.config.rrfK
    );

    // Apply MMR for diversity if enabled
    let finalResults = fusedResults;
    if (this.config.useMmr && denseEmbedding) {
      finalResults = await this.applyMMR(
        fusedResults,
        denseEmbedding.values,
        this.config.mmrLambda,
        topK
      );
    } else {
      finalResults = fusedResults.slice(0, topK);
    }

    return {
      matches: finalResults,
      totalFound: fusedResults.length,
      searchTimeMs: Date.now() - startTime,
      strategy: 'dense', // Will be 'hybrid' when sparse is fully integrated
    };
  }

  /**
   * Search with automatic reranking
   */
  async searchAndRerank(
    query: SearchQuery,
    rerankTopN: number = this.config.rerankTopN
  ): Promise<SearchResults> {
    // First, do broad retrieval
    const broadQuery: SearchQuery = {
      ...query,
      topK: this.config.broadTopK,
    };
    const initialResults = await this.search(broadQuery);

    if (initialResults.matches.length === 0) {
      return initialResults;
    }

    // Then rerank with Cohere
    const startRerank = Date.now();
    const reranked = await rerankService.rerankPineconeResults(
      query.text,
      initialResults.matches.map((m) => ({
        id: m.id,
        score: m.score,
        metadata: m.metadata as { searchable_text?: string; preview?: string },
      })),
      rerankTopN
    );

    // Map back to SearchMatch format
    const rerankedMatches: SearchMatch[] = reranked.map((r) => {
      const original = initialResults.matches.find((m) => m.id === r.id)!;
      return {
        ...original,
        score: r.rerankScore, // Use rerank score
        source: 'fused' as const,
      };
    });

    return {
      matches: rerankedMatches,
      totalFound: initialResults.totalFound,
      searchTimeMs: initialResults.searchTimeMs + (Date.now() - startRerank),
      strategy: 'hybrid',
    };
  }

  /**
   * Apply Reciprocal Rank Fusion to merge result lists
   */
  private applyRRF(
    resultLists: Array<Array<SearchMatch & { namespace: string }>>,
    k: number = 60
  ): SearchMatch[] {
    const scores = new Map<string, { score: number; match: SearchMatch }>();

    for (const results of resultLists) {
      for (let rank = 0; rank < results.length; rank++) {
        const result = results[rank];
        const rrfScore = 1 / (k + rank + 1);
        const existing = scores.get(result.id);

        if (existing) {
          existing.score += rrfScore;
        } else {
          scores.set(result.id, {
            score: rrfScore,
            match: {
              id: result.id,
              score: result.score,
              namespace: result.namespace,
              metadata: result.metadata,
              source: 'fused',
            },
          });
        }
      }
    }

    // Sort by RRF score descending
    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .map(({ score, match }) => ({
        ...match,
        score, // Use RRF score instead of original
      }));
  }

  /**
   * Apply Maximal Marginal Relevance for diversity
   */
  private async applyMMR(
    results: SearchMatch[],
    queryVector: number[],
    lambda: number = 0.7,
    topK: number = 10
  ): Promise<SearchMatch[]> {
    if (results.length <= topK) {
      return results;
    }

    // For MMR, we need document vectors
    // Since we may not have them, use score as proxy for relevance
    // and apply diversity based on metadata similarity

    const selected: SearchMatch[] = [];
    const remaining = [...results];

    // Select first by highest score
    selected.push(remaining.shift()!);

    while (selected.length < topK && remaining.length > 0) {
      let bestIdx = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];

        // Relevance score (normalized)
        const relevance = candidate.score;

        // Diversity score (inverse of max similarity to selected)
        let maxSimilarity = 0;
        for (const sel of selected) {
          const similarity = this.metadataSimilarity(candidate.metadata, sel.metadata);
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
        const diversity = 1 - maxSimilarity;

        // MMR score
        const mmrScore = lambda * relevance + (1 - lambda) * diversity;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIdx = i;
        }
      }

      selected.push(remaining.splice(bestIdx, 1)[0]);
    }

    return selected;
  }

  /**
   * Calculate similarity between metadata for MMR diversity
   */
  private metadataSimilarity(a: TieredMetadata, b: TieredMetadata): number {
    let score = 0;
    let factors = 0;

    // Same document
    if (a.documentId === b.documentId) {
      score += 0.8;
      factors++;
    }

    // Same metadata type
    if (a.metadataType === b.metadataType) {
      score += 0.3;
      factors++;
    }

    // Same period
    if (a.period && b.period && a.period === b.period) {
      score += 0.2;
      factors++;
    }

    // Same employee (for employee-specific data)
    if (a.employeeId && b.employeeId && a.employeeId === b.employeeId) {
      score += 0.5;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Search with filters for specific metadata types
   */
  async searchByMetadataType(
    query: SearchQuery,
    metadataType: PineconeMetadata['metadataType']
  ): Promise<SearchResults> {
    const filteredQuery: SearchQuery = {
      ...query,
      filters: {
        ...query.filters,
        metadataType,
      },
    };
    return this.search(filteredQuery);
  }

  /**
   * Search for employee-specific data
   */
  async searchEmployeeData(
    query: SearchQuery,
    employeeId: string,
    period?: string
  ): Promise<SearchResults> {
    const filters: Record<string, unknown> = {
      ...query.filters,
      employeeId,
    };

    if (period) {
      filters.period = period;
    }

    return this.search({
      ...query,
      filters,
    });
  }

  /**
   * Multi-stage search: broad → rerank → assemble context
   */
  async multiStageSearch(
    text: string,
    namespaces: string[],
    options: {
      broadTopK?: number;
      rerankTopN?: number;
      filters?: Record<string, unknown>;
    } = {}
  ): Promise<{
    results: SearchMatch[];
    stages: {
      retrieval: { count: number; timeMs: number };
      reranking: { count: number; timeMs: number };
    };
  }> {
    const startRetrieval = Date.now();

    // Stage 1: Broad retrieval
    const broadResults = await this.search({
      text,
      namespaces,
      topK: options.broadTopK || this.config.broadTopK,
      filters: options.filters,
    });

    const retrievalTime = Date.now() - startRetrieval;

    if (broadResults.matches.length === 0) {
      return {
        results: [],
        stages: {
          retrieval: { count: 0, timeMs: retrievalTime },
          reranking: { count: 0, timeMs: 0 },
        },
      };
    }

    // Stage 2: Reranking
    const startRerank = Date.now();
    const reranked = await rerankService.rerankPineconeResults(
      text,
      broadResults.matches.map((m) => ({
        id: m.id,
        score: m.score,
        metadata: m.metadata as { searchable_text?: string; preview?: string },
      })),
      options.rerankTopN || this.config.rerankTopN
    );

    const rerankTime = Date.now() - startRerank;

    // Map back to SearchMatch
    const finalResults: SearchMatch[] = reranked.map((r) => {
      const original = broadResults.matches.find((m) => m.id === r.id)!;
      return {
        ...original,
        score: r.rerankScore,
        source: 'fused' as const,
      };
    });

    return {
      results: finalResults,
      stages: {
        retrieval: { count: broadResults.matches.length, timeMs: retrievalTime },
        reranking: { count: finalResults.length, timeMs: rerankTime },
      },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RetrievalConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RetrievalConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const hybridSearchService = new HybridSearchService();
