import { db } from '@/lib/db';
import { documents, employees, dataLineage, documentConflicts, queryLogs } from '@/lib/db/schema';
import { eq, and, gte, desc, sql, count } from 'drizzle-orm';

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalDocuments: number;
  processedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
  totalVectors: number;
  pendingConflicts: number;
  storageUsedMB: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface ActivityItem {
  id: string;
  action: 'upload' | 'process' | 'complete' | 'fail';
  resourceType: 'document' | 'employee';
  resourceName: string;
  timestamp: Date;
}

export interface StatusBreakdown {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  partial: number;
}

export interface DepartmentData {
  name: string;
  value: number;
}

export class AnalyticsService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    // Employee stats
    const [employeeStats] = await db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${employees.isActive} = true)`,
      })
      .from(employees)
      .where(sql`${employees.deletedAt} is null`);

    // Document stats
    const [documentStats] = await db
      .select({
        total: count(),
        processed: sql<number>`count(*) filter (where ${documents.status} = 'completed')`,
        pending: sql<number>`count(*) filter (where ${documents.status} = 'pending')`,
        failed: sql<number>`count(*) filter (where ${documents.status} = 'failed')`,
        totalSize: sql<number>`coalesce(sum(${documents.fileSize}), 0)`,
      })
      .from(documents)
      .where(eq(documents.isDeleted, false));

    // Vector count from lineage
    const [vectorStats] = await db
      .select({ count: count() })
      .from(dataLineage);

    // Pending conflicts
    const [conflictStats] = await db
      .select({ count: count() })
      .from(documentConflicts)
      .where(
        sql`${documentConflicts.status} in ('detected', 'reviewing')`
      );

    return {
      totalEmployees: Number(employeeStats?.total ?? 0),
      activeEmployees: Number(employeeStats?.active ?? 0),
      totalDocuments: Number(documentStats?.total ?? 0),
      processedDocuments: Number(documentStats?.processed ?? 0),
      pendingDocuments: Number(documentStats?.pending ?? 0),
      failedDocuments: Number(documentStats?.failed ?? 0),
      totalVectors: Number(vectorStats?.count ?? 0),
      pendingConflicts: Number(conflictStats?.count ?? 0),
      storageUsedMB: Math.round((Number(documentStats?.totalSize) || 0) / 1024 / 1024),
    };
  }

  /**
   * Get document processing trend
   */
  async getDocumentTrend(days = 30): Promise<TimeSeriesData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`date(${documents.createdAt})::text`,
        count: count(),
      })
      .from(documents)
      .where(
        and(
          eq(documents.isDeleted, false),
          gte(documents.createdAt, startDate)
        )
      )
      .groupBy(sql`date(${documents.createdAt})`)
      .orderBy(sql`date(${documents.createdAt})`);

    return results.map((r) => ({
      date: r.date,
      value: Number(r.count),
    }));
  }

  /**
   * Get processing status breakdown
   */
  async getStatusBreakdown(): Promise<StatusBreakdown> {
    const results = await db
      .select({
        status: documents.status,
        count: count(),
      })
      .from(documents)
      .where(eq(documents.isDeleted, false))
      .groupBy(documents.status);

    const breakdown: StatusBreakdown = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      partial: 0,
    };

    for (const r of results) {
      if (r.status in breakdown) {
        breakdown[r.status as keyof StatusBreakdown] = Number(r.count);
      }
    }

    return breakdown;
  }

  /**
   * Get recent activity from documents
   */
  async getRecentActivity(limit = 10): Promise<ActivityItem[]> {
    // Get recent documents as activity
    const recentDocs = await db.query.documents.findMany({
      where: eq(documents.isDeleted, false),
      orderBy: [desc(documents.updatedAt)],
      limit,
      columns: {
        id: true,
        fileName: true,
        status: true,
        createdAt: true,
        processedAt: true,
        updatedAt: true,
      },
    });

    return recentDocs.map((doc) => {
      let action: ActivityItem['action'] = 'upload';
      let timestamp = doc.createdAt;

      if (doc.status === 'completed' && doc.processedAt) {
        action = 'complete';
        timestamp = doc.processedAt;
      } else if (doc.status === 'failed') {
        action = 'fail';
        timestamp = doc.updatedAt;
      } else if (doc.status === 'processing') {
        action = 'process';
        timestamp = doc.updatedAt;
      }

      return {
        id: doc.id,
        action,
        resourceType: 'document' as const,
        resourceName: doc.fileName,
        timestamp,
      };
    });
  }

  /**
   * Get employee distribution by department
   */
  async getDepartmentDistribution(): Promise<DepartmentData[]> {
    const results = await db
      .select({
        department: employees.department,
        count: count(),
      })
      .from(employees)
      .where(
        and(
          eq(employees.isActive, true),
          sql`${employees.deletedAt} is null`
        )
      )
      .groupBy(employees.department);

    return results.map((r) => ({
      name: r.department || '미지정',
      value: Number(r.count),
    }));
  }

  /**
   * Get vector count by namespace type
   */
  async getVectorDistribution(): Promise<{ organization: number; employees: number }> {
    const results = await db
      .select({
        namespace: dataLineage.targetNamespace,
        count: count(),
      })
      .from(dataLineage)
      .groupBy(dataLineage.targetNamespace);

    let organization = 0;
    let employeeVectors = 0;

    for (const r of results) {
      if (r.namespace.startsWith('org_')) {
        organization += Number(r.count);
      } else if (r.namespace.startsWith('emp_')) {
        employeeVectors += Number(r.count);
      }
    }

    return {
      organization,
      employees: employeeVectors,
    };
  }

  /**
   * Get processing success rate
   */
  async getProcessingRate(): Promise<number> {
    const [stats] = await db
      .select({
        total: count(),
        completed: sql<number>`count(*) filter (where ${documents.status} = 'completed')`,
      })
      .from(documents)
      .where(eq(documents.isDeleted, false));

    const total = Number(stats?.total ?? 0);
    const completed = Number(stats?.completed ?? 0);

    if (total === 0) return 100;
    return Math.round((completed / total) * 1000) / 10;
  }

  /**
   * Get query volume trend over time
   */
  async getQueryTrend(days = 7): Promise<TimeSeriesData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`date(${queryLogs.createdAt})::text`,
        count: count(),
      })
      .from(queryLogs)
      .where(gte(queryLogs.createdAt, startDate))
      .groupBy(sql`date(${queryLogs.createdAt})`)
      .orderBy(sql`date(${queryLogs.createdAt})`);

    // Fill in missing dates with zero values
    const dataMap = new Map(results.map((r) => [r.date, Number(r.count)]));
    const filledData: TimeSeriesData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      filledData.push({
        date: dateStr,
        value: dataMap.get(dateStr) || 0,
      });
    }

    return filledData;
  }

  /**
   * Get query statistics
   */
  async getQueryStats(): Promise<{
    totalQueries: number;
    todayQueries: number;
    avgResponseTime: number;
    successRate: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const [stats] = await db
      .select({
        total: count(),
        today: sql<number>`count(*) filter (where ${queryLogs.createdAt} >= ${todayStr}::timestamp)`,
        avgTime: sql<number>`coalesce(avg(${queryLogs.responseTimeMs}), 0)`,
        successful: sql<number>`count(*) filter (where ${queryLogs.successful} = true)`,
      })
      .from(queryLogs);

    const total = Number(stats?.total ?? 0);
    const successful = Number(stats?.successful ?? 0);

    return {
      totalQueries: total,
      todayQueries: Number(stats?.today ?? 0),
      avgResponseTime: Math.round(Number(stats?.avgTime ?? 0)),
      successRate: total > 0 ? Math.round((successful / total) * 100) : 100,
    };
  }

  /**
   * Get query type distribution
   */
  async getQueryTypeDistribution(): Promise<{ name: string; value: number }[]> {
    const results = await db
      .select({
        type: queryLogs.queryType,
        count: count(),
      })
      .from(queryLogs)
      .groupBy(queryLogs.queryType);

    const typeLabels: Record<string, string> = {
      rag: '일반 RAG',
      employee_rag: '직원 RAG',
      commission: '수수료 조회',
      general: '일반 질문',
    };

    return results.map((r) => ({
      name: typeLabels[r.type] || r.type,
      value: Number(r.count),
    }));
  }

  /**
   * Get recent audit log entries
   */
  async getAuditLog(limit = 10): Promise<{
    id: string;
    action: string;
    details: string;
    timestamp: Date;
    type: 'query' | 'document' | 'user';
  }[]> {
    // Get recent queries as audit entries
    const recentQueries = await db.query.queryLogs.findMany({
      orderBy: [desc(queryLogs.createdAt)],
      limit: Math.ceil(limit / 2),
      columns: {
        id: true,
        query: true,
        queryType: true,
        successful: true,
        createdAt: true,
      },
    });

    // Get recent documents as audit entries
    const recentDocs = await db.query.documents.findMany({
      where: eq(documents.isDeleted, false),
      orderBy: [desc(documents.updatedAt)],
      limit: Math.ceil(limit / 2),
      columns: {
        id: true,
        fileName: true,
        status: true,
        updatedAt: true,
      },
    });

    const entries: {
      id: string;
      action: string;
      details: string;
      timestamp: Date;
      type: 'query' | 'document' | 'user';
    }[] = [];

    // Add query entries
    for (const q of recentQueries) {
      entries.push({
        id: q.id,
        action: q.successful ? '질문 응답' : '질문 실패',
        details: q.query.substring(0, 50) + (q.query.length > 50 ? '...' : ''),
        timestamp: q.createdAt,
        type: 'query',
      });
    }

    // Add document entries
    for (const d of recentDocs) {
      const actionMap: Record<string, string> = {
        pending: '문서 업로드',
        processing: '문서 처리 중',
        completed: '문서 처리 완료',
        failed: '문서 처리 실패',
        partial: '문서 부분 처리',
      };
      entries.push({
        id: d.id,
        action: actionMap[d.status] || '문서 활동',
        details: d.fileName,
        timestamp: d.updatedAt,
        type: 'document',
      });
    }

    // Sort by timestamp and return top entries
    return entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

export const analyticsService = new AnalyticsService();
