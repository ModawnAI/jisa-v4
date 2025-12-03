import { db } from '@/lib/db';
import { dataLineage } from '@/lib/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';

import type { DataLineage, NewDataLineage } from '@/lib/db/schema';

export interface LineageFilters {
  documentId?: string;
  employeeId?: string;
  namespace?: string;
  pineconeIds?: string[];
  batchId?: string;
}

export interface LineageWithRelations extends DataLineage {
  sourceDocument?: {
    id: string;
    fileName: string;
    fileUrl: string;
    status: string;
  };
  processingBatch?: {
    id: string;
    batchNumber: number;
    status: string;
    period: string | null;
  };
}

export interface TraceResult {
  vector: {
    id: string;
    namespace: string;
    employeeId: string | null;
    createdAt: Date;
  };
  source: {
    documentId: string;
    fileUrl: string;
    fileHash: string;
    chunkIndex: number | null;
    rowRange: string | null;
  };
  transform: {
    templateId: string | null;
    templateVersion: number | null;
    log: unknown;
  };
  document: {
    id: string;
    fileName: string;
    fileUrl: string;
    period: string | null;
    status: string;
  } | null;
  batch: {
    id: string;
    batchNumber: number;
    status: string;
    period: string | null;
    completedAt: Date | null;
  } | null;
}

export class LineageService {
  /**
   * Create a new lineage record
   */
  async create(data: NewDataLineage): Promise<DataLineage> {
    const [record] = await db
      .insert(dataLineage)
      .values(data)
      .returning();

    return record;
  }

  /**
   * Create multiple lineage records in batch
   */
  async createBatch(records: NewDataLineage[]): Promise<DataLineage[]> {
    if (records.length === 0) return [];

    return db
      .insert(dataLineage)
      .values(records)
      .returning();
  }

  /**
   * Get lineage records with filters
   */
  async getLineage(
    filters: LineageFilters,
    page = 1,
    limit = 20
  ): Promise<{ data: LineageWithRelations[]; total: number }> {
    const conditions = [];

    if (filters.documentId) {
      conditions.push(eq(dataLineage.sourceDocumentId, filters.documentId));
    }

    if (filters.employeeId) {
      conditions.push(eq(dataLineage.targetEmployeeId, filters.employeeId));
    }

    if (filters.namespace) {
      conditions.push(eq(dataLineage.targetNamespace, filters.namespace));
    }

    if (filters.pineconeIds && filters.pineconeIds.length > 0) {
      conditions.push(inArray(dataLineage.targetPineconeId, filters.pineconeIds));
    }

    if (filters.batchId) {
      conditions.push(eq(dataLineage.processingBatchId, filters.batchId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [results, countResult] = await Promise.all([
      db.query.dataLineage.findMany({
        where: whereClause,
        with: {
          sourceDocument: {
            columns: {
              id: true,
              fileName: true,
              fileUrl: true,
              status: true,
            },
          },
          processingBatch: {
            columns: {
              id: true,
              batchNumber: true,
              status: true,
              period: true,
            },
          },
        },
        orderBy: [desc(dataLineage.createdAt)],
        limit,
        offset: (page - 1) * limit,
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(dataLineage)
        .where(whereClause),
    ]);

    return {
      data: results as LineageWithRelations[],
      total: Number(countResult[0]?.count ?? 0),
    };
  }

  /**
   * Get single lineage record by Pinecone ID
   */
  async getByPineconeId(pineconeId: string): Promise<LineageWithRelations | null> {
    const result = await db.query.dataLineage.findFirst({
      where: eq(dataLineage.targetPineconeId, pineconeId),
      with: {
        sourceDocument: true,
        processingBatch: true,
        template: true,
      },
    });

    return result as LineageWithRelations | null;
  }

  /**
   * Get all lineage records for a document
   */
  async getDocumentLineage(documentId: string): Promise<DataLineage[]> {
    return db.query.dataLineage.findMany({
      where: eq(dataLineage.sourceDocumentId, documentId),
      orderBy: [desc(dataLineage.chunkIndex)],
    });
  }

  /**
   * Get lineage records for a processing batch
   */
  async getBatchLineage(batchId: string): Promise<DataLineage[]> {
    return db.query.dataLineage.findMany({
      where: eq(dataLineage.processingBatchId, batchId),
      orderBy: [desc(dataLineage.chunkIndex)],
    });
  }

  /**
   * Get lineage statistics
   */
  async getStatistics(): Promise<{
    totalVectors: number;
    byNamespace: Record<string, number>;
    byDocument: Record<string, number>;
    recentActivity: { date: string; count: number }[];
  }> {
    const allLineage = await db.query.dataLineage.findMany();

    // Group by namespace
    const byNamespace: Record<string, number> = {};
    const byDocument: Record<string, number> = {};

    for (const record of allLineage) {
      byNamespace[record.targetNamespace] =
        (byNamespace[record.targetNamespace] || 0) + 1;
      byDocument[record.sourceDocumentId] =
        (byDocument[record.sourceDocumentId] || 0) + 1;
    }

    // Get recent activity (last 7 days)
    const recentActivity = await db
      .select({
        date: sql<string>`DATE(${dataLineage.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(dataLineage)
      .where(sql`${dataLineage.createdAt} > NOW() - INTERVAL '7 days'`)
      .groupBy(sql`DATE(${dataLineage.createdAt})`)
      .orderBy(sql`DATE(${dataLineage.createdAt})`);

    return {
      totalVectors: allLineage.length,
      byNamespace,
      byDocument,
      recentActivity: recentActivity.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
    };
  }

  /**
   * Trace lineage from vector to source
   */
  async traceToSource(pineconeId: string): Promise<TraceResult | null> {
    const lineage = await db.query.dataLineage.findFirst({
      where: eq(dataLineage.targetPineconeId, pineconeId),
      with: {
        sourceDocument: true,
        processingBatch: true,
      },
    });

    if (!lineage) {
      return null;
    }

    return {
      vector: {
        id: lineage.targetPineconeId,
        namespace: lineage.targetNamespace,
        employeeId: lineage.targetEmployeeId,
        createdAt: lineage.createdAt,
      },
      source: {
        documentId: lineage.sourceDocumentId,
        fileUrl: lineage.sourceFileUrl,
        fileHash: lineage.sourceFileHash,
        chunkIndex: lineage.chunkIndex,
        rowRange: lineage.originalRowRange,
      },
      transform: {
        templateId: lineage.templateId,
        templateVersion: lineage.templateVersion,
        log: lineage.transformationLog,
      },
      document: lineage.sourceDocument
        ? {
            id: lineage.sourceDocument.id,
            fileName: lineage.sourceDocument.fileName,
            fileUrl: lineage.sourceDocument.fileUrl,
            period: lineage.sourceDocument.period,
            status: lineage.sourceDocument.status,
          }
        : null,
      batch: lineage.processingBatch
        ? {
            id: lineage.processingBatch.id,
            batchNumber: lineage.processingBatch.batchNumber,
            status: lineage.processingBatch.status,
            period: lineage.processingBatch.period,
            completedAt: lineage.processingBatch.completedAt,
          }
        : null,
    };
  }

  /**
   * Delete lineage records for a batch (used during rollback)
   */
  async deleteBatchLineage(batchId: string): Promise<number> {
    const deleted = await db
      .delete(dataLineage)
      .where(eq(dataLineage.processingBatchId, batchId))
      .returning();

    return deleted.length;
  }

  /**
   * Get Pinecone IDs for a batch (for vector deletion)
   */
  async getBatchPineconeIds(batchId: string): Promise<string[]> {
    const records = await db.query.dataLineage.findMany({
      where: eq(dataLineage.processingBatchId, batchId),
      columns: {
        targetPineconeId: true,
      },
    });

    return records.map((r) => r.targetPineconeId);
  }

  /**
   * Check for duplicate content by file hash
   */
  async findDuplicatesByHash(
    fileHash: string,
    excludeDocumentId?: string
  ): Promise<DataLineage[]> {
    const conditions = [eq(dataLineage.sourceFileHash, fileHash)];

    if (excludeDocumentId) {
      conditions.push(sql`${dataLineage.sourceDocumentId} != ${excludeDocumentId}`);
    }

    return db.query.dataLineage.findMany({
      where: and(...conditions),
      with: {
        sourceDocument: {
          columns: {
            id: true,
            fileName: true,
            status: true,
          },
        },
      },
    });
  }
}

export const lineageService = new LineageService();
