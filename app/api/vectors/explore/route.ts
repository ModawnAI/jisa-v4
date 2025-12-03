/**
 * Pinecone Vector Explorer API
 *
 * Provides endpoints to explore and inspect vectors stored in Pinecone,
 * including namespace statistics, vector listing, and metadata inspection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { db } from '@/lib/db';
import { knowledgeChunks, documents, documentCategories } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

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

// Metadata type definitions for response
interface NamespaceInfo {
  namespace: string;
  type: 'organization' | 'employee' | 'department' | 'document' | 'unknown';
  entityId: string;
  entityName: string | null;
  vectorCount: number;
}

interface VectorSample {
  id: string;
  namespace: string;
  metadata: Record<string, unknown>;
  chunkContent?: string;
  documentName?: string;
}

interface MetadataSchema {
  field: string;
  type: string;
  description: string;
  example?: unknown;
  frequency: number;
}

/**
 * GET /api/vectors/explore
 *
 * Query params:
 * - action: 'stats' | 'namespaces' | 'vectors' | 'sample' | 'schema'
 * - namespace: specific namespace to query (for 'vectors' and 'sample')
 * - limit: number of records (default 10, max 100)
 * - prefix: vector ID prefix filter (for 'vectors')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';
    const namespace = searchParams.get('namespace');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const prefix = searchParams.get('prefix') || undefined;

    switch (action) {
      case 'stats':
        return await getIndexStats();
      case 'namespaces':
        return await getNamespacesWithDetails();
      case 'vectors':
        if (!namespace) {
          return NextResponse.json(
            { success: false, error: { code: 'MISSING_NAMESPACE', message: 'namespace 파라미터가 필요합니다.' } },
            { status: 400 }
          );
        }
        return await getVectorsInNamespace(namespace, limit, prefix);
      case 'sample':
        return await getSampleVectors(namespace, limit);
      case 'schema':
        return await getMetadataSchema();
      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_ACTION', message: '유효하지 않은 action입니다.' } },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Vector exploration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EXPLORATION_FAILED',
          message: error instanceof Error ? error.message : '벡터 탐색 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Get overall index statistics
 */
async function getIndexStats() {
  const pc = getPinecone();
  const indexName = getIndexName();
  const index = pc.index(indexName);

  const stats = await index.describeIndexStats();

  // Get counts from database for comparison
  const [dbStats] = await db
    .select({
      totalChunks: sql<number>`count(*)::int`,
      uniqueNamespaces: sql<number>`count(distinct ${knowledgeChunks.pineconeNamespace})::int`,
      uniqueDocuments: sql<number>`count(distinct ${knowledgeChunks.documentId})::int`,
      uniqueEmployees: sql<number>`count(distinct ${knowledgeChunks.employeeId}) filter (where ${knowledgeChunks.employeeId} is not null)::int`,
    })
    .from(knowledgeChunks);

  // Parse namespace stats
  const namespaceStats = Object.entries(stats.namespaces || {}).map(([ns, data]) => ({
    namespace: ns,
    vectorCount: data.recordCount || 0,
  }));

  return NextResponse.json({
    success: true,
    data: {
      index: {
        name: indexName,
        dimension: stats.dimension,
        totalVectorCount: stats.totalRecordCount || 0,
        namespaceCount: Object.keys(stats.namespaces || {}).length,
      },
      namespaces: namespaceStats,
      database: {
        totalChunks: dbStats.totalChunks || 0,
        uniqueNamespaces: dbStats.uniqueNamespaces || 0,
        uniqueDocuments: dbStats.uniqueDocuments || 0,
        uniqueEmployees: dbStats.uniqueEmployees || 0,
      },
      syncStatus: {
        inSync: (stats.totalRecordCount || 0) === (dbStats.totalChunks || 0),
        pineconeCount: stats.totalRecordCount || 0,
        databaseCount: dbStats.totalChunks || 0,
        difference: Math.abs((stats.totalRecordCount || 0) - (dbStats.totalChunks || 0)),
      },
    },
  });
}

/**
 * Get namespaces with entity details
 */
async function getNamespacesWithDetails(): Promise<NextResponse> {
  const pc = getPinecone();
  const indexName = getIndexName();
  const index = pc.index(indexName);

  const stats = await index.describeIndexStats();
  const namespaces: NamespaceInfo[] = [];

  // Get all categories for org_ namespaces
  const categories = await db.query.documentCategories.findMany();
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // Get all employees for emp_ namespaces
  const allEmployees = await db.query.employees.findMany({
    columns: { id: true, name: true },
  });
  const employeeMap = new Map(allEmployees.map((e) => [e.id, e.name]));

  for (const [ns, data] of Object.entries(stats.namespaces || {})) {
    const parsed = parseNamespace(ns);
    let entityName: string | null = null;

    if (parsed.type === 'organization') {
      entityName = categoryMap.get(parsed.entityId) || null;
    } else if (parsed.type === 'employee') {
      entityName = employeeMap.get(parsed.entityId) || null;
    }

    namespaces.push({
      namespace: ns,
      type: parsed.type,
      entityId: parsed.entityId,
      entityName,
      vectorCount: data.recordCount || 0,
    });
  }

  // Sort by vector count descending
  namespaces.sort((a, b) => b.vectorCount - a.vectorCount);

  return NextResponse.json({
    success: true,
    data: {
      namespaces,
      summary: {
        total: namespaces.length,
        byType: {
          organization: namespaces.filter((n) => n.type === 'organization').length,
          employee: namespaces.filter((n) => n.type === 'employee').length,
          department: namespaces.filter((n) => n.type === 'department').length,
          document: namespaces.filter((n) => n.type === 'document').length,
          unknown: namespaces.filter((n) => n.type === 'unknown').length,
        },
      },
    },
  });
}

/**
 * Get vectors in a specific namespace with their metadata
 */
async function getVectorsInNamespace(
  namespace: string,
  limit: number,
  prefix?: string
): Promise<NextResponse> {
  const pc = getPinecone();
  const indexName = getIndexName();
  const index = pc.index(indexName);
  const ns = index.namespace(namespace);

  // List vector IDs in the namespace
  const listResult = await ns.listPaginated({
    limit,
    prefix,
  });

  const vectorIds = (listResult.vectors || []).map((v) => v.id).filter((id): id is string => id !== undefined);

  if (vectorIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        vectors: [],
        namespace,
        count: 0,
        pagination: listResult.pagination,
      },
    });
  }

  // Fetch full vector data with metadata
  const fetchResult = await ns.fetch(vectorIds);

  const vectors: VectorSample[] = [];

  for (const [id, record] of Object.entries(fetchResult.records || {})) {
    if (record) {
      // Get corresponding chunk from database for content
      const chunk = await db.query.knowledgeChunks.findFirst({
        where: eq(knowledgeChunks.pineconeId, id),
        columns: {
          content: true,
        },
        with: {
          document: {
            columns: {
              fileName: true,
            },
          },
        },
      });

      vectors.push({
        id,
        namespace,
        metadata: record.metadata as Record<string, unknown> || {},
        chunkContent: chunk?.content?.slice(0, 500) + (chunk?.content && chunk.content.length > 500 ? '...' : ''),
        documentName: chunk?.document?.fileName,
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      vectors,
      namespace,
      count: vectors.length,
      pagination: listResult.pagination,
    },
  });
}

/**
 * Get sample vectors across namespaces or from specific namespace
 */
async function getSampleVectors(namespace: string | null, limit: number): Promise<NextResponse> {
  // Get samples from database with full metadata
  let query = db
    .select({
      id: knowledgeChunks.id,
      pineconeId: knowledgeChunks.pineconeId,
      pineconeNamespace: knowledgeChunks.pineconeNamespace,
      content: knowledgeChunks.content,
      contentHash: knowledgeChunks.contentHash,
      chunkIndex: knowledgeChunks.chunkIndex,
      employeeId: knowledgeChunks.employeeId,
      metadata: knowledgeChunks.metadata,
      documentId: knowledgeChunks.documentId,
      documentName: documents.fileName,
      categoryName: documentCategories.name,
    })
    .from(knowledgeChunks)
    .leftJoin(documents, eq(knowledgeChunks.documentId, documents.id))
    .leftJoin(documentCategories, eq(documents.categoryId, documentCategories.id))
    .orderBy(desc(knowledgeChunks.createdAt))
    .limit(limit);

  if (namespace) {
    query = query.where(eq(knowledgeChunks.pineconeNamespace, namespace)) as typeof query;
  }

  const samples = await query;

  const formattedSamples = samples.map((s) => ({
    id: s.pineconeId,
    dbId: s.id,
    namespace: s.pineconeNamespace,
    content: s.content?.slice(0, 300) + (s.content && s.content.length > 300 ? '...' : ''),
    contentHash: s.contentHash,
    chunkIndex: s.chunkIndex,
    employeeId: s.employeeId,
    documentId: s.documentId,
    documentName: s.documentName,
    categoryName: s.categoryName,
    metadata: s.metadata,
  }));

  return NextResponse.json({
    success: true,
    data: {
      samples: formattedSamples,
      count: formattedSamples.length,
    },
  });
}

/**
 * Get metadata schema analysis
 */
async function getMetadataSchema(): Promise<NextResponse> {
  // Define expected metadata schemas based on types
  const schemas: Record<string, MetadataSchema[]> = {
    base: [
      { field: 'documentId', type: 'string', description: '원본 문서 ID', frequency: 100 },
      { field: 'organizationId', type: 'string', description: '조직 ID', frequency: 100 },
      { field: 'chunkIndex', type: 'number', description: '청크 인덱스', frequency: 100 },
      { field: 'clearanceLevel', type: 'enum', description: '접근 권한 레벨 (basic|standard|advanced)', frequency: 100 },
      { field: 'source', type: 'string', description: '원본 파일명', frequency: 95 },
      { field: 'sourceType', type: 'enum', description: '소스 타입 (pdf|excel|csv|text)', frequency: 95 },
      { field: 'contentHash', type: 'string', description: '콘텐츠 해시 (중복 방지)', frequency: 100 },
      { field: 'createdAt', type: 'string', description: '생성 일시 (ISO8601)', frequency: 100 },
      { field: 'processingBatchId', type: 'string', description: '처리 배치 ID', frequency: 90 },
    ],
    employee: [
      { field: 'employeeId', type: 'string', description: '사번', frequency: 100 },
      { field: 'employeeName', type: 'string', description: '사원명', frequency: 90 },
      { field: 'jobType', type: 'string', description: '직종', frequency: 80 },
      { field: 'department', type: 'string', description: '소속', frequency: 70 },
      { field: 'appointmentDate', type: 'string', description: '위촉일', frequency: 60 },
      { field: 'finalPayment', type: 'number', description: '최종지급액', frequency: 85 },
      { field: 'totalCommission', type: 'number', description: '총 커미션', frequency: 85 },
      { field: 'totalOverride', type: 'number', description: '총 오버라이드', frequency: 80 },
      { field: 'contractCount', type: 'number', description: '계약건수', frequency: 75 },
      { field: 'metadataType', type: 'literal', description: "'employee'", frequency: 100 },
    ],
    mdrt: [
      { field: 'employeeId', type: 'string', description: '사번 (J#####)', frequency: 100 },
      { field: 'employeeName', type: 'string', description: '사원이름', frequency: 95 },
      { field: 'branch', type: 'string', description: '지사', frequency: 85 },
      { field: 'team', type: 'string', description: '지점', frequency: 80 },
      { field: 'fiscalYear', type: 'string', description: '회계연도', frequency: 100 },
      { field: 'quarter', type: 'string', description: '분기 (Q1-Q4)', frequency: 90 },
      { field: 'totalCommission', type: 'number', description: 'A.커미션 합계', frequency: 95 },
      { field: 'totalIncome', type: 'number', description: 'B.총수입 합계', frequency: 95 },
      { field: 'mdrtStatus', type: 'enum', description: 'MDRT 상태 (none|on-pace|mdrt|cot|tot)', frequency: 85 },
      { field: 'mdrtProgress', type: 'number', description: 'MDRT 진행률 (%)', frequency: 80 },
      { field: 'metadataType', type: 'literal', description: "'mdrt'", frequency: 100 },
    ],
    contract: [
      { field: 'contractNumber', type: 'string', description: '증권번호', frequency: 95 },
      { field: 'employeeId', type: 'string', description: '담당 사번', frequency: 90 },
      { field: 'insuranceCompany', type: 'string', description: '보험사', frequency: 85 },
      { field: 'productName', type: 'string', description: '상품명', frequency: 90 },
      { field: 'contractDate', type: 'string', description: '계약일', frequency: 85 },
      { field: 'premium', type: 'number', description: '보험료', frequency: 80 },
      { field: 'commission', type: 'number', description: '수수료', frequency: 85 },
      { field: 'metadataType', type: 'literal', description: "'contract'", frequency: 100 },
    ],
    generic: [
      { field: 'pageNumber', type: 'number', description: '페이지 번호', frequency: 90 },
      { field: 'totalPages', type: 'number', description: '총 페이지 수', frequency: 85 },
      { field: 'sectionTitle', type: 'string', description: '섹션 제목', frequency: 60 },
      { field: 'chapterTitle', type: 'string', description: '챕터 제목', frequency: 50 },
      { field: 'metadataType', type: 'literal', description: "'generic'", frequency: 100 },
    ],
  };

  // Analyze actual metadata from database
  const sampleChunks = await db
    .select({ metadata: knowledgeChunks.metadata })
    .from(knowledgeChunks)
    .limit(100);

  const fieldFrequency: Record<string, number> = {};
  const fieldExamples: Record<string, unknown> = {};

  for (const chunk of sampleChunks) {
    if (chunk.metadata && typeof chunk.metadata === 'object') {
      for (const [key, value] of Object.entries(chunk.metadata as Record<string, unknown>)) {
        fieldFrequency[key] = (fieldFrequency[key] || 0) + 1;
        if (!fieldExamples[key] && value !== null && value !== undefined) {
          fieldExamples[key] = value;
        }
      }
    }
  }

  const actualFields = Object.entries(fieldFrequency)
    .map(([field, count]) => ({
      field,
      frequency: Math.round((count / sampleChunks.length) * 100),
      example: fieldExamples[field],
    }))
    .sort((a, b) => b.frequency - a.frequency);

  return NextResponse.json({
    success: true,
    data: {
      expectedSchemas: schemas,
      actualFields,
      sampleSize: sampleChunks.length,
    },
  });
}

/**
 * Parse namespace string to extract type and entity ID
 */
function parseNamespace(namespace: string): { type: NamespaceInfo['type']; entityId: string } {
  if (namespace.startsWith('org_')) {
    return { type: 'organization', entityId: namespace.slice(4) };
  }
  if (namespace.startsWith('emp_')) {
    return { type: 'employee', entityId: namespace.slice(4) };
  }
  if (namespace.startsWith('dept_')) {
    return { type: 'department', entityId: namespace.slice(5) };
  }
  if (namespace.startsWith('doc_')) {
    return { type: 'document', entityId: namespace.slice(4) };
  }
  return { type: 'unknown', entityId: namespace };
}
