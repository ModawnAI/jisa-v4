/**
 * Vector Sync API
 *
 * Identifies and fixes synchronization issues between
 * Supabase knowledgeChunks and Pinecone vectors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { db } from '@/lib/db';
import { knowledgeChunks } from '@/lib/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';

// Lazy Pinecone initialization
let pinecone: Pinecone | null = null;

function getPinecone(): Pinecone {
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pinecone;
}

function getIndexName(): string {
  const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX;
  if (!indexName) {
    throw new Error('PINECONE_INDEX_NAME 환경변수가 설정되지 않았습니다.');
  }
  return indexName;
}

interface OrphanedRecord {
  id: string;
  pineconeId: string;
  namespace: string;
  documentId: string | null;
}

interface SyncAnalysis {
  totalDbRecords: number;
  totalPineconeVectors: number;
  orphanedRecords: OrphanedRecord[];
  namespaceBreakdown: Array<{
    namespace: string;
    dbCount: number;
    pineconeCount: number;
    orphanedCount: number;
  }>;
}

/**
 * GET /api/vectors/sync
 *
 * Analyzes sync status and identifies orphaned records.
 */
export async function GET() {
  try {
    const analysis = await analyzeSyncStatus();

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Sync analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SYNC_ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : '동기화 상태 분석에 실패했습니다.',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vectors/sync
 *
 * Fixes sync issues by removing orphaned DB records.
 * Body: { action: 'fix', confirm: true }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, confirm } = body;

    if (action !== 'fix') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: "유효하지 않은 action입니다. 'fix'만 지원합니다.",
          },
        },
        { status: 400 }
      );
    }

    if (!confirm) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFIRMATION_REQUIRED',
            message: '삭제를 확인하려면 confirm: true를 전송하세요.',
          },
        },
        { status: 400 }
      );
    }

    // Analyze first to get orphaned records
    const analysis = await analyzeSyncStatus();

    if (analysis.orphanedRecords.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: '동기화가 이미 정상입니다. 삭제할 레코드가 없습니다.',
          deleted: 0,
        },
      });
    }

    // Delete orphaned records from database
    const orphanedIds = analysis.orphanedRecords.map((r) => r.id);

    // Delete in batches
    const batchSize = 100;
    let deletedCount = 0;

    for (let i = 0; i < orphanedIds.length; i += batchSize) {
      const batch = orphanedIds.slice(i, i + batchSize);
      await db.delete(knowledgeChunks).where(inArray(knowledgeChunks.id, batch));
      deletedCount += batch.length;
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `${deletedCount}개의 고아 레코드가 삭제되었습니다.`,
        deleted: deletedCount,
        details: {
          beforeDbCount: analysis.totalDbRecords,
          afterDbCount: analysis.totalDbRecords - deletedCount,
          pineconeCount: analysis.totalPineconeVectors,
        },
      },
    });
  } catch (error) {
    console.error('Sync fix error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SYNC_FIX_FAILED',
          message: error instanceof Error ? error.message : '동기화 수정에 실패했습니다.',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Analyze sync status between DB and Pinecone
 */
async function analyzeSyncStatus(): Promise<SyncAnalysis> {
  const pc = getPinecone();
  const indexName = getIndexName();
  const index = pc.index(indexName);

  // Get Pinecone stats
  const stats = await index.describeIndexStats();
  const pineconeNamespaces = stats.namespaces || {};
  const totalPineconeVectors = stats.totalRecordCount || 0;

  // Get all DB records grouped by namespace
  const dbRecords = await db
    .select({
      id: knowledgeChunks.id,
      pineconeId: knowledgeChunks.pineconeId,
      pineconeNamespace: knowledgeChunks.pineconeNamespace,
      documentId: knowledgeChunks.documentId,
    })
    .from(knowledgeChunks);

  const totalDbRecords = dbRecords.length;

  // Group DB records by namespace
  const recordsByNamespace = new Map<string, typeof dbRecords>();
  for (const record of dbRecords) {
    const ns = record.pineconeNamespace || 'default';
    if (!recordsByNamespace.has(ns)) {
      recordsByNamespace.set(ns, []);
    }
    recordsByNamespace.get(ns)!.push(record);
  }

  const orphanedRecords: OrphanedRecord[] = [];
  const namespaceBreakdown: SyncAnalysis['namespaceBreakdown'] = [];

  // Check each namespace
  for (const [namespace, records] of recordsByNamespace) {
    const pineconeCount = pineconeNamespaces[namespace]?.recordCount || 0;
    const dbCount = records.length;

    // Get pinecone IDs that need verification
    const pineconeIds = records
      .filter((r) => r.pineconeId)
      .map((r) => r.pineconeId!);

    if (pineconeIds.length === 0) {
      // All records in this namespace are orphaned (no pineconeId)
      for (const record of records) {
        orphanedRecords.push({
          id: record.id,
          pineconeId: record.pineconeId || '',
          namespace,
          documentId: record.documentId,
        });
      }
      namespaceBreakdown.push({
        namespace,
        dbCount,
        pineconeCount,
        orphanedCount: records.length,
      });
      continue;
    }

    // Verify vectors exist in Pinecone (in batches of 100)
    const existingIds = new Set<string>();
    const ns = index.namespace(namespace);

    for (let i = 0; i < pineconeIds.length; i += 100) {
      const batch = pineconeIds.slice(i, i + 100);
      try {
        const fetchResult = await ns.fetch(batch);
        if (fetchResult.records) {
          for (const id of Object.keys(fetchResult.records)) {
            existingIds.add(id);
          }
        }
      } catch (error) {
        // Namespace might not exist, all records are orphaned
        console.warn(`Failed to fetch from namespace ${namespace}:`, error);
      }
    }

    // Find orphaned records
    let orphanedCount = 0;
    for (const record of records) {
      if (!record.pineconeId || !existingIds.has(record.pineconeId)) {
        orphanedRecords.push({
          id: record.id,
          pineconeId: record.pineconeId || '',
          namespace,
          documentId: record.documentId,
        });
        orphanedCount++;
      }
    }

    namespaceBreakdown.push({
      namespace,
      dbCount,
      pineconeCount,
      orphanedCount,
    });
  }

  // Sort breakdown by orphaned count descending
  namespaceBreakdown.sort((a, b) => b.orphanedCount - a.orphanedCount);

  return {
    totalDbRecords,
    totalPineconeVectors,
    orphanedRecords,
    namespaceBreakdown,
  };
}

/**
 * DELETE /api/vectors/sync
 *
 * Delete specified namespaces entirely from Pinecone.
 * Body: { namespaces: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const namespacesToDelete: string[] = body.namespaces || [];

    if (namespacesToDelete.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '삭제할 네임스페이스를 지정해주세요.',
          },
        },
        { status: 400 }
      );
    }

    const pc = getPinecone();
    const indexName = getIndexName();
    const index = pc.index(indexName);

    const results: Array<{ namespace: string; status: 'deleted' | 'error'; error?: string }> = [];

    for (const namespace of namespacesToDelete) {
      try {
        // Try to delete namespace
        await index.namespace(namespace).deleteAll();
        results.push({ namespace, status: 'deleted' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.push({ namespace, status: 'error', error: message });
      }
    }

    const deletedCount = results.filter((r) => r.status === 'deleted').length;
    const errorCount = results.filter((r) => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        errorCount,
        results,
      },
    });
  } catch (error) {
    console.error('Namespace delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NAMESPACE_DELETE_FAILED',
          message: error instanceof Error ? error.message : '네임스페이스 삭제에 실패했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
