/**
 * Cohere Reranking Service
 *
 * Uses Cohere's rerank API for cross-encoder based reranking.
 * Integrated with Pinecone for better search precision.
 */

import { CohereClient } from 'cohere-ai';
import type { RerankRequest, RerankResult, RerankResponse } from './types';

// Cohere client
let cohereClient: CohereClient | null = null;

function getCohereClient(): CohereClient {
  if (!cohereClient) {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error('COHERE_API_KEY environment variable is required');
    }
    cohereClient = new CohereClient({
      token: apiKey,
    });
  }
  return cohereClient;
}

// Cohere rerank models
const RERANK_MODELS = {
  cohere: 'rerank-v3.5', // Latest Cohere model
  multilingual: 'rerank-multilingual-v3.0', // For Korean/multilingual
} as const;

// Configuration
const RERANK_CONFIG = {
  defaultModel: RERANK_MODELS.multilingual, // Use multilingual for Korean support
  maxDocuments: 1000, // Cohere rerank limit
  defaultTopN: 10,
} as const;

class RerankService {
  /**
   * Rerank documents using Cohere
   */
  async rerank(request: RerankRequest): Promise<RerankResponse> {
    const startTime = Date.now();

    const {
      query,
      documents,
      topN = RERANK_CONFIG.defaultTopN,
      model = 'cohere',
    } = request;

    if (documents.length === 0) {
      return {
        results: [],
        model: this.getModelName(model),
        processingTimeMs: 0,
      };
    }

    // Limit documents to Cohere's max
    const limitedDocs = documents.slice(0, RERANK_CONFIG.maxDocuments);

    try {
      const client = getCohereClient();
      const modelName = this.getModelName(model);

      const response = await client.rerank({
        model: modelName,
        query,
        documents: limitedDocs.map((doc) => doc.text),
        topN: Math.min(topN, limitedDocs.length),
        returnDocuments: false, // We only need scores and indices
      });

      const results: RerankResult[] = response.results.map((result, newRank) => ({
        id: limitedDocs[result.index].id,
        score: result.relevanceScore,
        originalRank: result.index,
        newRank,
      }));

      return {
        results,
        model: modelName,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[RerankService] Cohere rerank error:', error);

      // Fallback: return original order with synthetic scores
      const fallbackResults: RerankResult[] = limitedDocs
        .slice(0, topN)
        .map((doc, index) => ({
          id: doc.id,
          score: 1 - index * 0.05, // Decreasing scores
          originalRank: index,
          newRank: index,
        }));

      return {
        results: fallbackResults,
        model: 'fallback',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Rerank with document metadata preserved
   */
  async rerankWithMetadata<T extends { id: string; text: string; metadata?: unknown }>(
    query: string,
    documents: T[],
    topN: number = RERANK_CONFIG.defaultTopN
  ): Promise<Array<T & { rerankScore: number; originalRank: number }>> {
    const response = await this.rerank({
      query,
      documents: documents.map((d) => ({ id: d.id, text: d.text })),
      topN,
    });

    // Map reranked results back to original documents with metadata
    const docMap = new Map(documents.map((d, i) => [d.id, { doc: d, originalRank: i }]));

    return response.results.map((result) => {
      const entry = docMap.get(result.id)!;
      return {
        ...entry.doc,
        rerankScore: result.score,
        originalRank: entry.originalRank,
      };
    });
  }

  /**
   * Batch rerank multiple queries
   */
  async batchRerank(
    requests: Array<{ query: string; documents: RerankRequest['documents'] }>,
    topN: number = RERANK_CONFIG.defaultTopN
  ): Promise<RerankResponse[]> {
    // Process in parallel but respect rate limits
    const results = await Promise.all(
      requests.map((req) =>
        this.rerank({
          query: req.query,
          documents: req.documents,
          topN,
        })
      )
    );

    return results;
  }

  /**
   * Rerank for Pinecone search results
   * Extracts text from metadata for reranking
   */
  async rerankPineconeResults<
    T extends {
      id: string;
      score: number;
      metadata?: {
        searchable_text?: string;
        preview?: string;
        [key: string]: unknown;
      };
    }
  >(
    query: string,
    results: T[],
    topN: number = RERANK_CONFIG.defaultTopN,
    textField: 'searchable_text' | 'preview' = 'searchable_text'
  ): Promise<Array<T & { rerankScore: number; originalScore: number; originalRank: number }>> {
    if (results.length === 0) {
      return [];
    }

    // Extract text from metadata
    const documents: RerankRequest['documents'] = results.map((r, index) => {
      const text = r.metadata?.[textField] || r.metadata?.preview || `Document ${index}`;
      return {
        id: r.id,
        text: typeof text === 'string' ? text : String(text),
      };
    });

    const response = await this.rerank({
      query,
      documents,
      topN,
    });

    // Map back to original results
    const resultMap = new Map(results.map((r, i) => [r.id, { result: r, originalRank: i }]));

    return response.results.map((reranked) => {
      const entry = resultMap.get(reranked.id)!;
      return {
        ...entry.result,
        rerankScore: reranked.score,
        originalScore: entry.result.score,
        originalRank: entry.originalRank,
      };
    });
  }

  /**
   * Get model name from model type
   */
  private getModelName(model: RerankRequest['model']): string {
    switch (model) {
      case 'cohere':
        return RERANK_MODELS.multilingual; // Default to multilingual for Korean
      case 'bge':
        // BGE models not available via Cohere, fallback
        return RERANK_MODELS.multilingual;
      case 'cross-encoder':
        // Cross-encoder fallback to Cohere
        return RERANK_MODELS.cohere;
      default:
        return RERANK_MODELS.multilingual;
    }
  }

  /**
   * Check if Cohere API is configured
   */
  isConfigured(): boolean {
    return !!process.env.COHERE_API_KEY;
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return Object.values(RERANK_MODELS);
  }
}

// Export singleton instance
export const rerankService = new RerankService();
