/**
 * RAG Observability Service
 *
 * Provides metrics collection, logging, and monitoring for the RAG pipeline.
 * Tracks query performance, cache hit rates, and error rates.
 */

import { db } from '@/lib/db';
import { ragQueryLogs, ragDailyMetrics } from '@/lib/db/schema/rag-metrics';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import type { RAGStageMetrics, RAGResult, RAGContext } from './types';

// In-memory metrics buffer for batch writes
interface MetricsBuffer {
  queries: Array<{
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
  }>;
  lastFlush: number;
}

const BUFFER_FLUSH_INTERVAL = 10000; // 10 seconds
const BUFFER_MAX_SIZE = 50;

class ObservabilityService {
  private buffer: MetricsBuffer = {
    queries: [],
    lastFlush: Date.now(),
  };

  private flushTimer: NodeJS.Timeout | null = null;

  /**
   * Log a RAG query and its result
   */
  async logQuery(
    query: string,
    result: RAGResult,
    context: RAGContext
  ): Promise<void> {
    const logEntry = {
      sessionId: context.sessionId,
      userId: context.employeeId,
      query,
      answer: result.answer,
      metrics: result.metrics,
      resultCount: result.sources.length,
      topScore: result.sources[0]?.score ?? 0,
      confidence: result.confidence,
      wasSuccessful: result.confidence > 0.3,
      errorMessage: result.confidence === 0 ? 'No results found' : undefined,
      createdAt: new Date(),
    };

    this.buffer.queries.push(logEntry);

    // Flush if buffer is full or interval elapsed
    if (
      this.buffer.queries.length >= BUFFER_MAX_SIZE ||
      Date.now() - this.buffer.lastFlush > BUFFER_FLUSH_INTERVAL
    ) {
      await this.flushBuffer();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flushBuffer(), BUFFER_FLUSH_INTERVAL);
    }
  }

  /**
   * Flush metrics buffer to database
   */
  private async flushBuffer(): Promise<void> {
    if (this.buffer.queries.length === 0) return;

    const toFlush = [...this.buffer.queries];
    this.buffer.queries = [];
    this.buffer.lastFlush = Date.now();

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      await db.insert(ragQueryLogs).values(
        toFlush.map((entry) => ({
          sessionId: entry.sessionId,
          userId: entry.userId,
          query: entry.query,
          answer: entry.answer,
          metrics: entry.metrics,
          resultCount: entry.resultCount,
          topScore: entry.topScore.toString(),
          confidence: entry.confidence.toString(),
          wasSuccessful: entry.wasSuccessful,
          errorMessage: entry.errorMessage,
          createdAt: entry.createdAt,
        }))
      );
    } catch (error) {
      console.error('[Observability] Failed to flush metrics:', error);
      // Re-add to buffer on failure (with limit)
      if (this.buffer.queries.length < BUFFER_MAX_SIZE * 2) {
        this.buffer.queries.unshift(...toFlush);
      }
    }
  }

  /**
   * Log an error
   */
  async logError(
    query: string,
    error: Error,
    context: RAGContext,
    partialMetrics?: Partial<RAGStageMetrics>
  ): Promise<void> {
    const metrics: RAGStageMetrics = {
      queryUnderstanding: { timeMs: 0, expandedQueries: 0 },
      broadRetrieval: { timeMs: 0, denseResults: 0, sparseResults: 0, fusedResults: 0 },
      reranking: { timeMs: 0, model: '', inputCount: 0, outputCount: 0 },
      contextAssembly: { timeMs: 0, chunksExpanded: 0, tokensUsed: 0 },
      generation: { timeMs: 0, model: '', tokensIn: 0, tokensOut: 0 },
      total: { timeMs: 0 },
      ...partialMetrics,
    };

    this.buffer.queries.push({
      sessionId: context.sessionId,
      userId: context.employeeId,
      query,
      answer: '',
      metrics,
      resultCount: 0,
      topScore: 0,
      confidence: 0,
      wasSuccessful: false,
      errorMessage: error.message,
      createdAt: new Date(),
    });

    await this.flushBuffer();
  }

  /**
   * Get query logs for a session
   */
  async getSessionLogs(sessionId: string, limit: number = 20): Promise<unknown[]> {
    const logs = await db
      .select()
      .from(ragQueryLogs)
      .where(eq(ragQueryLogs.sessionId, sessionId))
      .orderBy(desc(ragQueryLogs.createdAt))
      .limit(limit);

    return logs;
  }

  /**
   * Get daily metrics summary
   */
  async getDailyMetrics(
    date: Date = new Date()
  ): Promise<{
    totalQueries: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    avgResultCount: number;
    avgConfidence: number;
    errorRate: number;
    byStage: {
      queryUnderstanding: { avgMs: number };
      retrieval: { avgMs: number };
      reranking: { avgMs: number };
      generation: { avgMs: number };
    };
  } | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await db
      .select()
      .from(ragQueryLogs)
      .where(
        and(
          gte(ragQueryLogs.createdAt, startOfDay),
          lte(ragQueryLogs.createdAt, endOfDay)
        )
      );

    if (logs.length === 0) return null;

    // Calculate metrics
    const latencies = logs
      .map((l) => (l.metrics as RAGStageMetrics)?.total?.timeMs ?? 0)
      .filter((t) => t > 0)
      .sort((a, b) => a - b);

    const totalQueries = logs.length;
    const errorCount = logs.filter((l) => !l.wasSuccessful).length;

    const avgLatencyMs =
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

    const p50LatencyMs =
      latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;

    const p95LatencyMs =
      latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;

    const avgResultCount =
      logs.reduce((sum, l) => sum + (l.resultCount ?? 0), 0) / totalQueries;

    const avgConfidence =
      logs.reduce((sum, l) => sum + parseFloat(l.confidence || '0'), 0) / totalQueries;

    // Stage breakdowns
    const stageMetrics = {
      queryUnderstanding: { total: 0, count: 0 },
      retrieval: { total: 0, count: 0 },
      reranking: { total: 0, count: 0 },
      generation: { total: 0, count: 0 },
    };

    for (const log of logs) {
      const metrics = log.metrics as RAGStageMetrics;
      if (!metrics) continue;

      if (metrics.queryUnderstanding?.timeMs) {
        stageMetrics.queryUnderstanding.total += metrics.queryUnderstanding.timeMs;
        stageMetrics.queryUnderstanding.count++;
      }
      if (metrics.broadRetrieval?.timeMs) {
        stageMetrics.retrieval.total += metrics.broadRetrieval.timeMs;
        stageMetrics.retrieval.count++;
      }
      if (metrics.reranking?.timeMs) {
        stageMetrics.reranking.total += metrics.reranking.timeMs;
        stageMetrics.reranking.count++;
      }
      if (metrics.generation?.timeMs) {
        stageMetrics.generation.total += metrics.generation.timeMs;
        stageMetrics.generation.count++;
      }
    }

    return {
      totalQueries,
      avgLatencyMs,
      p50LatencyMs,
      p95LatencyMs,
      avgResultCount,
      avgConfidence,
      errorRate: errorCount / totalQueries,
      byStage: {
        queryUnderstanding: {
          avgMs:
            stageMetrics.queryUnderstanding.count > 0
              ? stageMetrics.queryUnderstanding.total / stageMetrics.queryUnderstanding.count
              : 0,
        },
        retrieval: {
          avgMs:
            stageMetrics.retrieval.count > 0
              ? stageMetrics.retrieval.total / stageMetrics.retrieval.count
              : 0,
        },
        reranking: {
          avgMs:
            stageMetrics.reranking.count > 0
              ? stageMetrics.reranking.total / stageMetrics.reranking.count
              : 0,
        },
        generation: {
          avgMs:
            stageMetrics.generation.count > 0
              ? stageMetrics.generation.total / stageMetrics.generation.count
              : 0,
        },
      },
    };
  }

  /**
   * Get metrics trend over multiple days
   */
  async getMetricsTrend(
    days: number = 7
  ): Promise<Array<{ date: string; metrics: Awaited<ReturnType<ObservabilityService['getDailyMetrics']>> }>> {
    const results: Array<{ date: string; metrics: Awaited<ReturnType<ObservabilityService['getDailyMetrics']>> }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const dateStr = date.toISOString().split('T')[0];
      const metrics = await this.getDailyMetrics(date);

      results.push({ date: dateStr, metrics });
    }

    return results.reverse();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    connected: boolean;
    embeddings: { count: number };
    queries: { count: number };
    chunks: { count: number };
  } | null> {
    try {
      const { cacheService } = await import('./cache.service');
      const stats = await cacheService.getStats();
      if (!stats) return null;

      return {
        connected: stats.connected,
        embeddings: { count: stats.embeddings.count },
        queries: { count: stats.queries.count },
        chunks: { count: stats.chunks.count },
      };
    } catch {
      return null;
    }
  }

  /**
   * Force flush any pending metrics
   */
  async flush(): Promise<void> {
    await this.flushBuffer();
  }

  /**
   * Clean up old logs
   */
  async cleanupOldLogs(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await db
      .delete(ragQueryLogs)
      .where(lte(ragQueryLogs.createdAt, cutoffDate));

    return (result as { rowCount?: number }).rowCount || 0;
  }
}

// Export singleton instance
export const observabilityService = new ObservabilityService();
