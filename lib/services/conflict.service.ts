import { db } from '@/lib/db';
import { documentConflicts, documents } from '@/lib/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { lineageService } from './lineage.service';

import type { DocumentConflict, NewDocumentConflict } from '@/lib/db/schema';

export interface ConflictDetails {
  similarityScore?: number;
  conflictingFields?: {
    field: string;
    existingValue: unknown;
    newValue: unknown;
  }[];
  affectedRows?: number[];
  affectedVectorIds?: string[];
  suggestedResolution?: 'keep_existing' | 'keep_new' | 'merge';
}

export interface ConflictWithRelations extends DocumentConflict {
  newDocument?: {
    id: string;
    fileName: string;
    status: string;
    createdAt: Date;
  };
  existingDocument?: {
    id: string;
    fileName: string;
    status: string;
    createdAt: Date;
  } | null;
  resolver?: {
    id: string;
    name: string;
    employeeId: string;
  } | null;
}

export type ConflictType =
  | 'duplicate_content'
  | 'version_mismatch'
  | 'category_mismatch'
  | 'metadata_conflict'
  | 'employee_mismatch';

export type ConflictStatus =
  | 'detected'
  | 'reviewing'
  | 'resolved_keep_existing'
  | 'resolved_keep_new'
  | 'resolved_merged'
  | 'dismissed';

export type ResolutionType = 'keep_existing' | 'keep_new' | 'merge' | 'dismiss';

export class ConflictService {
  /**
   * Detect potential conflicts for a new document
   */
  async detectConflicts(
    documentId: string,
    namespace: string,
    contentHashes: string[]
  ): Promise<NewDocumentConflict[]> {
    const detectedConflicts: NewDocumentConflict[] = [];

    // Check for duplicate content via content hashes
    for (const hash of contentHashes) {
      const duplicates = await lineageService.findDuplicatesByHash(hash, documentId);

      if (duplicates.length > 0) {
        // Group by document
        const documentIds = [...new Set(duplicates.map((d) => d.sourceDocumentId))];

        for (const existingDocId of documentIds) {
          const existingDuplicates = duplicates.filter(
            (d) => d.sourceDocumentId === existingDocId
          );

          detectedConflicts.push({
            newDocumentId: documentId,
            existingDocumentId: existingDocId,
            conflictType: 'duplicate_content',
            conflictDetails: {
              similarityScore: 1.0, // Exact hash match
              affectedVectorIds: existingDuplicates.map((d) => d.targetPineconeId),
              suggestedResolution: 'keep_existing',
            } as ConflictDetails,
          });
        }
      }
    }

    return detectedConflicts;
  }

  /**
   * Create a conflict record
   */
  async createConflict(input: NewDocumentConflict): Promise<DocumentConflict> {
    const [conflict] = await db
      .insert(documentConflicts)
      .values(input)
      .returning();

    return conflict;
  }

  /**
   * Create multiple conflict records
   */
  async createConflicts(inputs: NewDocumentConflict[]): Promise<DocumentConflict[]> {
    if (inputs.length === 0) return [];

    return db.insert(documentConflicts).values(inputs).returning();
  }

  /**
   * Get a conflict by ID
   */
  async getById(conflictId: string): Promise<ConflictWithRelations | null> {
    const result = await db.query.documentConflicts.findFirst({
      where: eq(documentConflicts.id, conflictId),
      with: {
        newDocument: {
          columns: {
            id: true,
            fileName: true,
            status: true,
            createdAt: true,
          },
        },
        existingDocument: {
          columns: {
            id: true,
            fileName: true,
            status: true,
            createdAt: true,
          },
        },
        resolver: {
          columns: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
      },
    });

    return result as ConflictWithRelations | null;
  }

  /**
   * Get conflicts with filtering and pagination
   */
  async getConflicts(
    filters: {
      status?: ConflictStatus;
      conflictType?: ConflictType;
      documentId?: string;
    },
    page = 1,
    limit = 10
  ): Promise<{ data: ConflictWithRelations[]; total: number }> {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(documentConflicts.status, filters.status));
    }

    if (filters.conflictType) {
      conditions.push(eq(documentConflicts.conflictType, filters.conflictType));
    }

    if (filters.documentId) {
      conditions.push(
        sql`(${documentConflicts.newDocumentId} = ${filters.documentId} OR ${documentConflicts.existingDocumentId} = ${filters.documentId})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [results, countResult] = await Promise.all([
      db.query.documentConflicts.findMany({
        where: whereClause,
        with: {
          newDocument: {
            columns: {
              id: true,
              fileName: true,
              status: true,
              createdAt: true,
            },
          },
          existingDocument: {
            columns: {
              id: true,
              fileName: true,
              status: true,
              createdAt: true,
            },
          },
          resolver: {
            columns: {
              id: true,
              name: true,
              employeeId: true,
            },
          },
        },
        orderBy: [desc(documentConflicts.createdAt)],
        limit,
        offset: (page - 1) * limit,
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(documentConflicts)
        .where(whereClause),
    ]);

    return {
      data: results as ConflictWithRelations[],
      total: Number(countResult[0]?.count ?? 0),
    };
  }

  /**
   * Get pending conflicts count
   */
  async getPendingCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(documentConflicts)
      .where(
        inArray(documentConflicts.status, ['detected', 'reviewing'])
      );

    return Number(result[0]?.count ?? 0);
  }

  /**
   * Update conflict status to reviewing
   */
  async markAsReviewing(conflictId: string): Promise<DocumentConflict> {
    const [updated] = await db
      .update(documentConflicts)
      .set({
        status: 'reviewing',
        updatedAt: new Date(),
      })
      .where(eq(documentConflicts.id, conflictId))
      .returning();

    return updated;
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: ResolutionType,
    resolvedBy: string,
    notes?: string
  ): Promise<DocumentConflict> {
    const conflict = await this.getById(conflictId);

    if (!conflict) {
      throw new Error('충돌을 찾을 수 없습니다.');
    }

    const statusMap: Record<ResolutionType, ConflictStatus> = {
      keep_existing: 'resolved_keep_existing',
      keep_new: 'resolved_keep_new',
      merge: 'resolved_merged',
      dismiss: 'dismissed',
    };

    const [updated] = await db
      .update(documentConflicts)
      .set({
        status: statusMap[resolution],
        resolvedBy,
        resolvedAt: new Date(),
        resolutionNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(documentConflicts.id, conflictId))
      .returning();

    // Execute resolution action based on type
    await this.executeResolution(conflict, resolution);

    return updated;
  }

  /**
   * Execute resolution action
   */
  private async executeResolution(
    conflict: ConflictWithRelations,
    resolution: ResolutionType
  ): Promise<void> {
    switch (resolution) {
      case 'keep_existing':
        // Mark new document as failed/rejected
        await db
          .update(documents)
          .set({ status: 'failed' })
          .where(eq(documents.id, conflict.newDocumentId));
        break;

      case 'keep_new':
        // Mark existing document vectors for deletion if needed
        if (conflict.existingDocumentId) {
          // The actual vector deletion should be handled by a separate process
          // Here we just update the document status
          await db
            .update(documents)
            .set({ isDeleted: true, deletedAt: new Date() })
            .where(eq(documents.id, conflict.existingDocumentId));
        }
        break;

      case 'merge':
        // Merge logic would be specific to the use case
        // For now, we just mark the conflict as merged
        break;

      case 'dismiss':
        // No action needed
        break;
    }
  }

  /**
   * Get conflicts for a specific document
   */
  async getDocumentConflicts(documentId: string): Promise<ConflictWithRelations[]> {
    const results = await db.query.documentConflicts.findMany({
      where: sql`(${documentConflicts.newDocumentId} = ${documentId} OR ${documentConflicts.existingDocumentId} = ${documentId})`,
      with: {
        newDocument: {
          columns: {
            id: true,
            fileName: true,
            status: true,
            createdAt: true,
          },
        },
        existingDocument: {
          columns: {
            id: true,
            fileName: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: [desc(documentConflicts.createdAt)],
    });

    return results as ConflictWithRelations[];
  }

  /**
   * Get conflict statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<ConflictStatus, number>;
    byType: Record<ConflictType, number>;
    pendingCount: number;
  }> {
    const allConflicts = await db.query.documentConflicts.findMany();

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const conflict of allConflicts) {
      byStatus[conflict.status] = (byStatus[conflict.status] || 0) + 1;
      byType[conflict.conflictType] = (byType[conflict.conflictType] || 0) + 1;
    }

    const pendingCount = (byStatus['detected'] || 0) + (byStatus['reviewing'] || 0);

    return {
      total: allConflicts.length,
      byStatus: byStatus as Record<ConflictStatus, number>,
      byType: byType as Record<ConflictType, number>,
      pendingCount,
    };
  }
}

export const conflictService = new ConflictService();
