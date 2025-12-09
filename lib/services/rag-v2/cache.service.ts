/**
 * Redis Cache Service
 *
 * Provides caching layer for embeddings, queries, and chunks.
 * Falls back gracefully when Redis is unavailable.
 */

import Redis from 'ioredis';
import type { CacheConfig, CachedEmbedding, SparseEmbedding } from './types';

// Default configuration
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  embeddings: {
    enabled: true,
    ttlSeconds: 30 * 24 * 60 * 60, // 30 days
  },
  queries: {
    enabled: true,
    ttlSeconds: 60 * 60, // 1 hour
  },
  chunks: {
    enabled: true,
    ttlSeconds: 24 * 60 * 60, // 24 hours
  },
};

// Cache key prefixes
const CACHE_KEYS = {
  embedding: 'rag:emb:',
  query: 'rag:query:',
  chunk: 'rag:chunk:',
  metrics: 'rag:metrics:',
} as const;

class CacheService {
  private client: Redis | null = null;
  private config: CacheConfig;
  private connectionAttempted = false;
  private isConnected = false;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * Initialize Redis connection
   */
  private async ensureConnection(): Promise<Redis | null> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    if (this.connectionAttempted && !this.isConnected) {
      // Already tried and failed, return null
      return null;
    }

    this.connectionAttempted = true;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('[CacheService] REDIS_URL not configured, caching disabled');
      return null;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null; // Stop retrying after 3 attempts
          return Math.min(times * 200, 1000);
        },
        lazyConnect: true,
      });

      this.client.on('error', (error) => {
        console.error('[CacheService] Redis error:', error.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('[CacheService] Redis connected');
        this.isConnected = true;
      });

      await this.client.connect();
      this.isConnected = true;
      return this.client;
    } catch (error) {
      console.warn('[CacheService] Failed to connect to Redis:', error);
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Generate cache key for embedding
   */
  private getEmbeddingKey(contentHash: string, model: string): string {
    return `${CACHE_KEYS.embedding}${model}:${contentHash}`;
  }

  /**
   * Generate cache key for query results
   */
  private getQueryKey(queryHash: string, namespace: string): string {
    return `${CACHE_KEYS.query}${namespace}:${queryHash}`;
  }

  /**
   * Generate cache key for chunk content
   */
  private getChunkKey(chunkRef: string): string {
    return `${CACHE_KEYS.chunk}${chunkRef}`;
  }

  // =============================================================================
  // Embedding Cache
  // =============================================================================

  /**
   * Get cached embedding
   */
  async getEmbedding(contentHash: string, model: string): Promise<CachedEmbedding | null> {
    if (!this.config.embeddings.enabled) return null;

    const redis = await this.ensureConnection();
    if (!redis) return null;

    try {
      const key = this.getEmbeddingKey(contentHash, model);
      const data = await redis.get(key);

      if (!data) return null;

      const cached = JSON.parse(data) as CachedEmbedding;
      return cached;
    } catch (error) {
      console.error('[CacheService] Error getting embedding:', error);
      return null;
    }
  }

  /**
   * Set cached embedding
   */
  async setEmbedding(
    contentHash: string,
    model: string,
    dense: number[],
    sparse?: SparseEmbedding
  ): Promise<void> {
    if (!this.config.embeddings.enabled) return;

    const redis = await this.ensureConnection();
    if (!redis) return;

    try {
      const key = this.getEmbeddingKey(contentHash, model);
      const cached: CachedEmbedding = {
        hash: contentHash,
        dense,
        sparse,
        model,
        createdAt: Date.now(),
      };

      await redis.setex(
        key,
        this.config.embeddings.ttlSeconds,
        JSON.stringify(cached)
      );
    } catch (error) {
      console.error('[CacheService] Error setting embedding:', error);
    }
  }

  /**
   * Get multiple embeddings at once
   */
  async getEmbeddingsBatch(
    contentHashes: string[],
    model: string
  ): Promise<Map<string, CachedEmbedding>> {
    const result = new Map<string, CachedEmbedding>();
    if (!this.config.embeddings.enabled || contentHashes.length === 0) {
      return result;
    }

    const redis = await this.ensureConnection();
    if (!redis) return result;

    try {
      const keys = contentHashes.map((hash) => this.getEmbeddingKey(hash, model));
      const values = await redis.mget(keys);

      for (let i = 0; i < contentHashes.length; i++) {
        const value = values[i];
        if (value) {
          const cached = JSON.parse(value) as CachedEmbedding;
          result.set(contentHashes[i], cached);
        }
      }
    } catch (error) {
      console.error('[CacheService] Error getting embeddings batch:', error);
    }

    return result;
  }

  // =============================================================================
  // Query Results Cache
  // =============================================================================

  /**
   * Get cached query results
   */
  async getQueryResults<T>(queryHash: string, namespace: string): Promise<T | null> {
    if (!this.config.queries.enabled) return null;

    const redis = await this.ensureConnection();
    if (!redis) return null;

    try {
      const key = this.getQueryKey(queryHash, namespace);
      const data = await redis.get(key);
      return data ? (JSON.parse(data) as T) : null;
    } catch (error) {
      console.error('[CacheService] Error getting query results:', error);
      return null;
    }
  }

  /**
   * Set cached query results
   */
  async setQueryResults<T>(
    queryHash: string,
    namespace: string,
    results: T
  ): Promise<void> {
    if (!this.config.queries.enabled) return;

    const redis = await this.ensureConnection();
    if (!redis) return;

    try {
      const key = this.getQueryKey(queryHash, namespace);
      await redis.setex(
        key,
        this.config.queries.ttlSeconds,
        JSON.stringify(results)
      );
    } catch (error) {
      console.error('[CacheService] Error setting query results:', error);
    }
  }

  // =============================================================================
  // Chunk Content Cache
  // =============================================================================

  /**
   * Get cached chunk content
   */
  async getChunkContent(chunkRef: string): Promise<string | null> {
    if (!this.config.chunks.enabled) return null;

    const redis = await this.ensureConnection();
    if (!redis) return null;

    try {
      const key = this.getChunkKey(chunkRef);
      return await redis.get(key);
    } catch (error) {
      console.error('[CacheService] Error getting chunk content:', error);
      return null;
    }
  }

  /**
   * Set cached chunk content
   */
  async setChunkContent(chunkRef: string, content: string): Promise<void> {
    if (!this.config.chunks.enabled) return;

    const redis = await this.ensureConnection();
    if (!redis) return;

    try {
      const key = this.getChunkKey(chunkRef);
      await redis.setex(key, this.config.chunks.ttlSeconds, content);
    } catch (error) {
      console.error('[CacheService] Error setting chunk content:', error);
    }
  }

  /**
   * Get multiple chunks at once
   */
  async getChunksBatch(chunkRefs: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (!this.config.chunks.enabled || chunkRefs.length === 0) {
      return result;
    }

    const redis = await this.ensureConnection();
    if (!redis) return result;

    try {
      const keys = chunkRefs.map((ref) => this.getChunkKey(ref));
      const values = await redis.mget(keys);

      for (let i = 0; i < chunkRefs.length; i++) {
        const value = values[i];
        if (value) {
          result.set(chunkRefs[i], value);
        }
      }
    } catch (error) {
      console.error('[CacheService] Error getting chunks batch:', error);
    }

    return result;
  }

  // =============================================================================
  // Cache Management
  // =============================================================================

  /**
   * Invalidate embedding cache for a content hash
   */
  async invalidateEmbedding(contentHash: string, model: string): Promise<void> {
    const redis = await this.ensureConnection();
    if (!redis) return;

    try {
      const key = this.getEmbeddingKey(contentHash, model);
      await redis.del(key);
    } catch (error) {
      console.error('[CacheService] Error invalidating embedding:', error);
    }
  }

  /**
   * Invalidate query cache for a namespace
   */
  async invalidateQueriesForNamespace(namespace: string): Promise<void> {
    const redis = await this.ensureConnection();
    if (!redis) return;

    try {
      const pattern = `${CACHE_KEYS.query}${namespace}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('[CacheService] Error invalidating namespace queries:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    embeddings: { count: number; memoryBytes: number };
    queries: { count: number; memoryBytes: number };
    chunks: { count: number; memoryBytes: number };
  } | null> {
    const redis = await this.ensureConnection();
    if (!redis) {
      return null;
    }

    try {
      const embeddingKeys = await redis.keys(`${CACHE_KEYS.embedding}*`);
      const queryKeys = await redis.keys(`${CACHE_KEYS.query}*`);
      const chunkKeys = await redis.keys(`${CACHE_KEYS.chunk}*`);

      // Get memory info (approximate)
      const info = await redis.info('memory');
      const usedMemoryMatch = info.match(/used_memory:(\d+)/);
      const usedMemory = usedMemoryMatch ? parseInt(usedMemoryMatch[1]) : 0;

      return {
        connected: this.isConnected,
        embeddings: {
          count: embeddingKeys.length,
          memoryBytes: 0, // Would need per-key analysis
        },
        queries: {
          count: queryKeys.length,
          memoryBytes: 0,
        },
        chunks: {
          count: chunkKeys.length,
          memoryBytes: 0,
        },
      };
    } catch (error) {
      console.error('[CacheService] Error getting stats:', error);
      return null;
    }
  }

  /**
   * Clear all RAG-related cache
   */
  async clearAll(): Promise<void> {
    const redis = await this.ensureConnection();
    if (!redis) return;

    try {
      const patterns = [
        `${CACHE_KEYS.embedding}*`,
        `${CACHE_KEYS.query}*`,
        `${CACHE_KEYS.chunk}*`,
      ];

      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    } catch (error) {
      console.error('[CacheService] Error clearing cache:', error);
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
