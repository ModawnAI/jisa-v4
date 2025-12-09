/**
 * Enhanced Embedding Service
 *
 * Provides dense and sparse embeddings with caching support.
 * Uses OpenAI for dense embeddings and keyword extraction for sparse.
 */

import OpenAI from 'openai';
import crypto from 'crypto';
import { cacheService } from './cache.service';
import type { DenseEmbedding, SparseEmbedding, HybridEmbedding } from './types';

// OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openaiClient;
}

// Configuration
const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-large',
  dimensions: 3072,
  maxBatchSize: 100,
  maxInputLength: 8191, // Max tokens for text-embedding-3-large
} as const;

// Rate limiting state
interface RateLimitState {
  requestCount: number;
  windowStart: number;
  tokensUsed: number;
}

const rateLimitState: RateLimitState = {
  requestCount: 0,
  windowStart: Date.now(),
  tokensUsed: 0,
};

const RATE_LIMITS = {
  requestsPerMinute: 500,
  tokensPerMinute: 1000000,
  windowMs: 60000,
};

/**
 * Generate content hash for caching
 */
export function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English/mixed text
  return Math.ceil(text.length / 4);
}

/**
 * Wait for rate limit to reset if needed
 */
async function waitForRateLimit(tokenEstimate: number): Promise<void> {
  const now = Date.now();
  const windowAge = now - rateLimitState.windowStart;

  // Reset window if expired
  if (windowAge >= RATE_LIMITS.windowMs) {
    rateLimitState.requestCount = 0;
    rateLimitState.tokensUsed = 0;
    rateLimitState.windowStart = now;
    return;
  }

  // Check if we need to wait
  const wouldExceedRequests = rateLimitState.requestCount >= RATE_LIMITS.requestsPerMinute;
  const wouldExceedTokens = rateLimitState.tokensUsed + tokenEstimate > RATE_LIMITS.tokensPerMinute;

  if (wouldExceedRequests || wouldExceedTokens) {
    const waitTime = RATE_LIMITS.windowMs - windowAge + 100; // Add buffer
    console.log(`[EmbeddingService] Rate limit hit, waiting ${waitTime}ms`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    // Reset after wait
    rateLimitState.requestCount = 0;
    rateLimitState.tokensUsed = 0;
    rateLimitState.windowStart = Date.now();
  }
}

/**
 * Update rate limit counters
 */
function updateRateLimitCounters(tokenCount: number): void {
  rateLimitState.requestCount++;
  rateLimitState.tokensUsed += tokenCount;
}

class EmbeddingService {
  /**
   * Generate dense embedding for a single text
   */
  async generateDenseEmbedding(text: string): Promise<DenseEmbedding> {
    const contentHash = generateContentHash(text);

    // Check cache first
    const cached = await cacheService.getEmbedding(contentHash, EMBEDDING_CONFIG.model);
    if (cached) {
      return {
        values: cached.dense,
        dimensions: EMBEDDING_CONFIG.dimensions,
        model: EMBEDDING_CONFIG.model,
      };
    }

    // Generate new embedding
    const tokenEstimate = estimateTokens(text);
    await waitForRateLimit(tokenEstimate);

    try {
      const client = getOpenAIClient();
      const response = await client.embeddings.create({
        model: EMBEDDING_CONFIG.model,
        input: text,
        dimensions: EMBEDDING_CONFIG.dimensions,
      });

      updateRateLimitCounters(response.usage?.total_tokens || tokenEstimate);

      const values = response.data[0].embedding;

      // Cache the result
      await cacheService.setEmbedding(contentHash, EMBEDDING_CONFIG.model, values);

      return {
        values,
        dimensions: EMBEDDING_CONFIG.dimensions,
        model: EMBEDDING_CONFIG.model,
      };
    } catch (error) {
      console.error('[EmbeddingService] Error generating dense embedding:', error);
      throw error;
    }
  }

  /**
   * Generate dense embeddings for multiple texts in batch
   */
  async generateDenseEmbeddingsBatch(
    texts: string[]
  ): Promise<Map<number, DenseEmbedding>> {
    const results = new Map<number, DenseEmbedding>();
    if (texts.length === 0) return results;

    // Check cache for all texts
    const contentHashes = texts.map(generateContentHash);
    const cachedEmbeddings = await cacheService.getEmbeddingsBatch(
      contentHashes,
      EMBEDDING_CONFIG.model
    );

    // Identify which need generation
    const toGenerate: Array<{ index: number; text: string; hash: string }> = [];

    for (let i = 0; i < texts.length; i++) {
      const hash = contentHashes[i];
      const cached = cachedEmbeddings.get(hash);

      if (cached) {
        results.set(i, {
          values: cached.dense,
          dimensions: EMBEDDING_CONFIG.dimensions,
          model: EMBEDDING_CONFIG.model,
        });
      } else {
        toGenerate.push({ index: i, text: texts[i], hash });
      }
    }

    if (toGenerate.length === 0) {
      console.log(`[EmbeddingService] All ${texts.length} embeddings from cache`);
      return results;
    }

    console.log(
      `[EmbeddingService] ${cachedEmbeddings.size} from cache, ${toGenerate.length} to generate`
    );

    // Generate in batches
    const client = getOpenAIClient();
    const batchSize = EMBEDDING_CONFIG.maxBatchSize;

    for (let i = 0; i < toGenerate.length; i += batchSize) {
      const batch = toGenerate.slice(i, i + batchSize);
      const batchTexts = batch.map((b) => b.text);
      const tokenEstimate = batchTexts.reduce((sum, t) => sum + estimateTokens(t), 0);

      await waitForRateLimit(tokenEstimate);

      try {
        const response = await client.embeddings.create({
          model: EMBEDDING_CONFIG.model,
          input: batchTexts,
          dimensions: EMBEDDING_CONFIG.dimensions,
        });

        updateRateLimitCounters(response.usage?.total_tokens || tokenEstimate);

        for (let j = 0; j < batch.length; j++) {
          const { index, hash } = batch[j];
          const values = response.data[j].embedding;

          results.set(index, {
            values,
            dimensions: EMBEDDING_CONFIG.dimensions,
            model: EMBEDDING_CONFIG.model,
          });

          // Cache the result
          await cacheService.setEmbedding(hash, EMBEDDING_CONFIG.model, values);
        }
      } catch (error) {
        console.error('[EmbeddingService] Batch embedding error:', error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Generate sparse embedding using keyword extraction (BM25-style)
   */
  generateSparseEmbedding(text: string): SparseEmbedding {
    // Tokenize and clean
    const tokens = this.tokenize(text);
    const tokenFreq = new Map<string, number>();

    for (const token of tokens) {
      tokenFreq.set(token, (tokenFreq.get(token) || 0) + 1);
    }

    // Convert to sparse representation
    const sortedTokens = Array.from(tokenFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100); // Keep top 100 tokens

    // Use simple hash for indices (consistent across runs)
    const indices: number[] = [];
    const values: number[] = [];
    const tokenList: string[] = [];

    for (const [token, freq] of sortedTokens) {
      const index = this.tokenToIndex(token);
      indices.push(index);
      // TF component (log-normalized)
      values.push(1 + Math.log(freq));
      tokenList.push(token);
    }

    return {
      indices,
      values,
      tokens: tokenList,
    };
  }

  /**
   * Generate hybrid embedding (dense + sparse)
   */
  async generateHybridEmbedding(text: string): Promise<HybridEmbedding> {
    const contentHash = generateContentHash(text);

    // Check if dense embedding is cached
    const cachedDense = await cacheService.getEmbedding(contentHash, EMBEDDING_CONFIG.model);
    const wasFromCache = !!cachedDense;

    const [dense, sparse] = await Promise.all([
      this.generateDenseEmbedding(text),
      Promise.resolve(this.generateSparseEmbedding(text)),
    ]);

    return {
      dense,
      sparse,
      contentHash,
      cached: wasFromCache,
    };
  }

  /**
   * Generate hybrid embeddings for batch
   */
  async generateHybridEmbeddingsBatch(
    texts: string[]
  ): Promise<Map<number, HybridEmbedding>> {
    const denseResults = await this.generateDenseEmbeddingsBatch(texts);
    const results = new Map<number, HybridEmbedding>();

    for (let i = 0; i < texts.length; i++) {
      const dense = denseResults.get(i);
      if (!dense) continue;

      results.set(i, {
        dense,
        sparse: this.generateSparseEmbedding(texts[i]),
        contentHash: generateContentHash(texts[i]),
      });
    }

    return results;
  }

  /**
   * Tokenize text for sparse embedding
   */
  private tokenize(text: string): string[] {
    // Convert to lowercase
    const normalized = text.toLowerCase();

    // Split on whitespace and punctuation, keep Korean characters
    const tokens = normalized
      .split(/[\s\.,;:!?\-\(\)\[\]{}'"<>\/\\]+/)
      .filter((token) => token.length > 1)
      // Filter out pure numbers and single characters
      .filter((token) => !/^\d+$/.test(token));

    return tokens;
  }

  /**
   * Convert token to consistent index using hash
   */
  private tokenToIndex(token: string): number {
    // Use simple hash to get consistent index
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Return positive index in range [0, 100000]
    return Math.abs(hash) % 100000;
  }

  /**
   * Calculate cosine similarity between two dense embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculate sparse similarity (dot product with matching indices)
   */
  sparseSimilarity(a: SparseEmbedding, b: SparseEmbedding): number {
    const bMap = new Map<number, number>();
    for (let i = 0; i < b.indices.length; i++) {
      bMap.set(b.indices[i], b.values[i]);
    }

    let score = 0;
    for (let i = 0; i < a.indices.length; i++) {
      const bVal = bMap.get(a.indices[i]);
      if (bVal !== undefined) {
        score += a.values[i] * bVal;
      }
    }

    return score;
  }

  /**
   * Get embedding statistics
   */
  getStats(): {
    rateLimitState: RateLimitState;
    config: typeof EMBEDDING_CONFIG;
  } {
    return {
      rateLimitState: { ...rateLimitState },
      config: EMBEDDING_CONFIG,
    };
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
