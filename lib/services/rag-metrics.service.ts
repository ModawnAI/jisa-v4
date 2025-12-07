/**
 * RAG Metrics Service
 *
 * Records and analyzes RAG pipeline metrics for
 * performance monitoring and optimization.
 */

import { db } from '@/lib/db';
import {
  ragMetrics,
  schemaDiscoveryLogs,
  clarificationSessions,
  type NewRagMetric,
  type NewSchemaDiscoveryLog,
  type NewClarificationSession,
  type RouteType,
} from '@/lib/db/schema/rag-metrics';
import { desc, sql, and, gte, lte, eq } from 'drizzle-orm';
import type { QueryIntent, QueryIntentType, TemplateType } from '@/lib/ai/query-intent';
import type { RouterDecision } from './query-router.service';

/**
 * Metric recording context
 */
export interface MetricContext {
  sessionId?: string;
  employeeId?: string;
  query: string;
}

/**
 * Timing breakdown
 */
export interface TimingBreakdown {
  routerTimeMs?: number;
  intentTimeMs?: number;
  embeddingTimeMs?: number;
  searchTimeMs?: number;
  calculationTimeMs?: number;
  generationTimeMs?: number;
}

/**
 * Search metrics
 */
export interface SearchMetrics {
  namespaces: string[];
  resultsCount: number;
  topScore?: number;
  avgScore?: number;
}

/**
 * Complete metric data
 */
export interface CompleteMetricData {
  context: MetricContext;
  routerDecision: RouterDecision;
  intent?: QueryIntent;
  timing: TimingBreakdown;
  search?: SearchMetrics;
  clarification?: {
    asked: boolean;
    type?: string;
    resolved?: boolean;
  };
  response?: {
    length: number;
    tokensUsed?: number;
  };
  error?: {
    code: string;
    message: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated metrics for dashboard
 */
export interface AggregatedMetrics {
  totalQueries: number;
  avgResponseTimeMs: number;
  routeDistribution: Record<RouteType, number>;
  intentDistribution: Record<string, number>;
  successRate: number;
  clarificationRate: number;
  avgConfidence: number;
  avgResultScore: number;
}

/**
 * Time range for queries
 */
export interface TimeRange {
  from: Date;
  to: Date;
}

class RagMetricsService {
  /**
   * Record complete RAG pipeline metrics
   */
  async recordMetric(data: CompleteMetricData): Promise<string> {
    const totalTimeMs =
      (data.timing.routerTimeMs || 0) +
      (data.timing.intentTimeMs || 0) +
      (data.timing.embeddingTimeMs || 0) +
      (data.timing.searchTimeMs || 0) +
      (data.timing.calculationTimeMs || 0) +
      (data.timing.generationTimeMs || 0);

    const metric: NewRagMetric = {
      sessionId: data.context.sessionId,
      employeeId: data.context.employeeId,
      query: data.context.query,

      route: data.routerDecision.route,
      routeConfidence: data.routerDecision.confidence,
      routeReason: data.routerDecision.category,

      intentType: data.intent?.intent,
      intentConfidence: data.intent?.confidence,
      templateType: data.intent?.template,
      calculationType: data.intent?.calculation?.type,

      routerTimeMs: data.timing.routerTimeMs,
      intentTimeMs: data.timing.intentTimeMs,
      embeddingTimeMs: data.timing.embeddingTimeMs,
      searchTimeMs: data.timing.searchTimeMs,
      calculationTimeMs: data.timing.calculationTimeMs,
      generationTimeMs: data.timing.generationTimeMs,
      totalTimeMs,

      namespacesSearched: data.search?.namespaces,
      resultsCount: data.search?.resultsCount,
      topResultScore: data.search?.topScore,
      avgResultScore: data.search?.avgScore,

      clarificationAsked: data.clarification?.asked || false,
      clarificationType: data.clarification?.type,
      clarificationResolved: data.clarification?.resolved,

      successful: !data.error,
      errorCode: data.error?.code,
      errorMessage: data.error?.message,

      responseLength: data.response?.length,
      tokensUsed: data.response?.tokensUsed,

      metadata: data.metadata,
    };

    const [result] = await db.insert(ragMetrics).values(metric).returning({ id: ragMetrics.id });

    return result.id;
  }

  /**
   * Record simple metrics (for quick/instant responses)
   */
  async recordSimpleMetric(data: {
    query?: string;
    route: string;
    routerTimeMs: number;
    queryUnderstandingTimeMs?: number;
    embeddingTimeMs?: number;
    searchTimeMs?: number;
    calculationTimeMs?: number;
    generationTimeMs?: number;
    totalTimeMs: number;
    resultCount: number;
    intentType?: string;
    confidence?: number;
    wasInstantResponse?: boolean;
  }): Promise<string> {
    const metric: NewRagMetric = {
      query: data.query || '',
      route: data.route as RouteType,
      routerTimeMs: data.routerTimeMs,
      intentTimeMs: data.queryUnderstandingTimeMs,
      embeddingTimeMs: data.embeddingTimeMs,
      searchTimeMs: data.searchTimeMs,
      calculationTimeMs: data.calculationTimeMs,
      generationTimeMs: data.generationTimeMs,
      totalTimeMs: data.totalTimeMs,
      resultsCount: data.resultCount,
      intentType: data.intentType,
      intentConfidence: data.confidence,
      successful: true,
      metadata: data.wasInstantResponse ? { matchedPattern: 'instant_response' } : undefined,
    };

    const [result] = await db.insert(ragMetrics).values(metric).returning({ id: ragMetrics.id });
    return result.id;
  }

  /**
   * Record schema discovery event
   */
  async recordSchemaDiscovery(data: {
    namespaces: string[];
    triggeredBy: 'cache_miss' | 'document_upload' | 'document_delete' | 'manual';
    schemas: Array<{
      templateType: string;
      namespace: string;
      fieldCount: number;
      vectorCount: number;
    }>;
    discoveryTimeMs: number;
    error?: string;
  }): Promise<string> {
    const log: NewSchemaDiscoveryLog = {
      namespaces: data.namespaces,
      triggeredBy: data.triggeredBy,
      schemasDiscovered: data.schemas.length,
      totalVectors: data.schemas.reduce((sum, s) => sum + s.vectorCount, 0),
      discoveryTimeMs: data.discoveryTimeMs,
      schemaDetails: data.schemas,
      successful: !data.error,
      errorMessage: data.error,
    };

    const [result] = await db
      .insert(schemaDiscoveryLogs)
      .values(log)
      .returning({ id: schemaDiscoveryLogs.id });

    return result.id;
  }

  /**
   * Record clarification session
   */
  async recordClarificationSession(data: {
    sessionId: string;
    employeeId?: string;
    originalQuery: string;
    originalConfidence: number;
    clarificationType: string;
    questionAsked: string;
    partialIntent?: Record<string, unknown>;
    expiresAt: Date;
  }): Promise<string> {
    const session: NewClarificationSession = {
      sessionId: data.sessionId,
      employeeId: data.employeeId,
      originalQuery: data.originalQuery,
      originalConfidence: data.originalConfidence,
      clarificationType: data.clarificationType,
      questionAsked: data.questionAsked,
      partialIntent: data.partialIntent,
      expiresAt: data.expiresAt,
    };

    const [result] = await db
      .insert(clarificationSessions)
      .values(session)
      .returning({ id: clarificationSessions.id });

    return result.id;
  }

  /**
   * Update clarification session as resolved
   */
  async resolveClarificationSession(
    sessionId: string,
    userResponse: string,
    mergedIntent: Record<string, unknown>,
    finalConfidence: number
  ): Promise<void> {
    await db
      .update(clarificationSessions)
      .set({
        userResponse,
        mergedIntent,
        finalConfidence,
        resolved: true,
        resolvedAt: new Date(),
      })
      .where(
        and(
          eq(clarificationSessions.sessionId, sessionId),
          eq(clarificationSessions.resolved, false)
        )
      );
  }

  /**
   * Get aggregated metrics for a time range
   */
  async getAggregatedMetrics(range: TimeRange): Promise<AggregatedMetrics> {
    const metrics = await db
      .select()
      .from(ragMetrics)
      .where(
        and(
          gte(ragMetrics.createdAt, range.from),
          lte(ragMetrics.createdAt, range.to)
        )
      );

    if (metrics.length === 0) {
      return {
        totalQueries: 0,
        avgResponseTimeMs: 0,
        routeDistribution: { instant: 0, rag: 0, clarify: 0, fallback: 0 },
        intentDistribution: {},
        successRate: 0,
        clarificationRate: 0,
        avgConfidence: 0,
        avgResultScore: 0,
      };
    }

    // Calculate distributions
    const routeDistribution: Record<RouteType, number> = {
      instant: 0,
      rag: 0,
      clarify: 0,
      fallback: 0,
    };

    const intentDistribution: Record<string, number> = {};
    let totalResponseTime = 0;
    let totalConfidence = 0;
    let totalResultScore = 0;
    let successCount = 0;
    let clarificationCount = 0;
    let resultScoreCount = 0;

    for (const m of metrics) {
      // Route distribution
      if (m.route && m.route in routeDistribution) {
        routeDistribution[m.route as RouteType]++;
      }

      // Intent distribution
      if (m.intentType) {
        intentDistribution[m.intentType] = (intentDistribution[m.intentType] || 0) + 1;
      }

      // Totals
      totalResponseTime += m.totalTimeMs || 0;
      totalConfidence += m.intentConfidence || 0;

      if (m.avgResultScore) {
        totalResultScore += m.avgResultScore;
        resultScoreCount++;
      }

      if (m.successful) successCount++;
      if (m.clarificationAsked) clarificationCount++;
    }

    return {
      totalQueries: metrics.length,
      avgResponseTimeMs: totalResponseTime / metrics.length,
      routeDistribution,
      intentDistribution,
      successRate: successCount / metrics.length,
      clarificationRate: clarificationCount / metrics.length,
      avgConfidence: totalConfidence / metrics.length,
      avgResultScore: resultScoreCount > 0 ? totalResultScore / resultScoreCount : 0,
    };
  }

  /**
   * Get recent metrics for monitoring
   */
  async getRecentMetrics(limit: number = 100) {
    return db
      .select()
      .from(ragMetrics)
      .orderBy(desc(ragMetrics.createdAt))
      .limit(limit);
  }

  /**
   * Get performance trend (hourly averages)
   */
  async getPerformanceTrend(range: TimeRange) {
    const result = await db.execute(sql`
      SELECT
        date_trunc('hour', created_at) as hour,
        COUNT(*) as query_count,
        AVG(total_time_ms) as avg_response_time,
        AVG(intent_confidence) as avg_confidence,
        SUM(CASE WHEN successful THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
      FROM rag_metrics
      WHERE created_at >= ${range.from} AND created_at <= ${range.to}
      GROUP BY date_trunc('hour', created_at)
      ORDER BY hour
    `);

    return result;
  }

  /**
   * Get route distribution for a time range
   */
  async getRouteDistribution(range: TimeRange) {
    const result = await db.execute(sql`
      SELECT
        route,
        COUNT(*) as count,
        AVG(total_time_ms) as avg_time_ms
      FROM rag_metrics
      WHERE created_at >= ${range.from} AND created_at <= ${range.to}
      GROUP BY route
    `);

    return result;
  }

  /**
   * Get slow queries for optimization
   */
  async getSlowQueries(thresholdMs: number = 2000, limit: number = 50) {
    return db
      .select()
      .from(ragMetrics)
      .where(gte(ragMetrics.totalTimeMs, thresholdMs))
      .orderBy(desc(ragMetrics.totalTimeMs))
      .limit(limit);
  }

  /**
   * Get failed queries for debugging
   */
  async getFailedQueries(limit: number = 50) {
    return db
      .select()
      .from(ragMetrics)
      .where(eq(ragMetrics.successful, false))
      .orderBy(desc(ragMetrics.createdAt))
      .limit(limit);
  }

  /**
   * Get clarification effectiveness metrics
   */
  async getClarificationMetrics(range: TimeRange) {
    const sessions = await db
      .select()
      .from(clarificationSessions)
      .where(
        and(
          gte(clarificationSessions.createdAt, range.from),
          lte(clarificationSessions.createdAt, range.to)
        )
      );

    const total = sessions.length;
    const resolved = sessions.filter((s) => s.resolved).length;
    const avgConfidenceIncrease =
      sessions
        .filter((s) => s.resolved && s.finalConfidence && s.originalConfidence)
        .reduce(
          (sum, s) => sum + ((s.finalConfidence || 0) - (s.originalConfidence || 0)),
          0
        ) / (resolved || 1);

    const byType: Record<string, { total: number; resolved: number }> = {};
    for (const s of sessions) {
      if (!byType[s.clarificationType]) {
        byType[s.clarificationType] = { total: 0, resolved: 0 };
      }
      byType[s.clarificationType].total++;
      if (s.resolved) byType[s.clarificationType].resolved++;
    }

    return {
      totalSessions: total,
      resolvedSessions: resolved,
      resolutionRate: total > 0 ? resolved / total : 0,
      avgConfidenceIncrease,
      byType,
    };
  }

  /**
   * Get schema discovery statistics
   */
  async getSchemaDiscoveryStats(range: TimeRange) {
    const logs = await db
      .select()
      .from(schemaDiscoveryLogs)
      .where(
        and(
          gte(schemaDiscoveryLogs.createdAt, range.from),
          lte(schemaDiscoveryLogs.createdAt, range.to)
        )
      );

    const byTrigger: Record<string, number> = {};
    let totalDiscoveryTime = 0;
    let successCount = 0;

    for (const log of logs) {
      byTrigger[log.triggeredBy] = (byTrigger[log.triggeredBy] || 0) + 1;
      totalDiscoveryTime += log.discoveryTimeMs || 0;
      if (log.successful) successCount++;
    }

    return {
      totalDiscoveries: logs.length,
      avgDiscoveryTimeMs: logs.length > 0 ? totalDiscoveryTime / logs.length : 0,
      successRate: logs.length > 0 ? successCount / logs.length : 0,
      byTrigger,
    };
  }
}

// Export singleton instance
export const ragMetricsService = new RagMetricsService();

// Export types
export type { RagMetricsService };
