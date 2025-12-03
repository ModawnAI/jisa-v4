import { Pinecone, Index } from '@pinecone-database/pinecone';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { EMBEDDING_CONFIG } from '@/lib/utils/embedding';

// Lazy initialization of Pinecone client
let pineconeClient: Pinecone | null = null;
let pineconeIndex: Index | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

function getPineconeIndex(): Index {
  if (!pineconeIndex) {
    const client = getPineconeClient();
    const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX;
    if (!indexName) {
      throw new Error('Pinecone index name not configured. Set PINECONE_INDEX or PINECONE_INDEX_NAME environment variable.');
    }
    pineconeIndex = client.index(indexName);
  }
  return pineconeIndex;
}

// Namespace prefixes
const NAMESPACE_PREFIXES = {
  organization: 'org_',
  employee: 'emp_',
} as const;

// Vector metadata structure
export interface VectorMetadata {
  documentId: string;
  organizationId: string;
  employeeId?: string;
  categoryId?: string;
  chunkIndex: number;
  contentHash: string;
  clearanceLevel: 'basic' | 'standard' | 'advanced';
  processingBatchId?: string;
  originalRowIndex?: number;
  createdAt: string;
  [key: string]: string | number | boolean | string[] | null | undefined;
}

export interface UpsertVectorInput {
  id: string;
  embedding: number[];
  metadata: VectorMetadata;
}

export interface SearchOptions {
  topK?: number;
  filter?: Record<string, unknown>;
  includeMetadata?: boolean;
  includeValues?: boolean;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata?: VectorMetadata;
  values?: number[];
}

export class PineconeService {
  /**
   * Get namespace for organization documents
   */
  getOrganizationNamespace(organizationId: string): string {
    return `${NAMESPACE_PREFIXES.organization}${organizationId}`;
  }

  /**
   * Get namespace for employee-specific documents
   */
  getEmployeeNamespace(employeeId: string): string {
    return `${NAMESPACE_PREFIXES.employee}${employeeId}`;
  }

  /**
   * Upsert vectors to a namespace
   */
  async upsertVectors(
    namespace: string,
    vectors: UpsertVectorInput[]
  ): Promise<{ upsertedCount: number }> {
    if (vectors.length === 0) {
      return { upsertedCount: 0 };
    }

    try {
      const index = getPineconeIndex();
      const ns = index.namespace(namespace);

      // Process in batches of 100
      const batchSize = 100;
      let upsertedCount = 0;

      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);

        await ns.upsert(
          batch.map((v) => ({
            id: v.id,
            values: v.embedding,
            metadata: v.metadata as Record<string, string | number | boolean | string[]>,
          }))
        );

        upsertedCount += batch.length;
      }

      return { upsertedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      throw new AppError(
        ERROR_CODES.EMBEDDING_FAILED,
        `벡터 업서트에 실패했습니다: ${message}`,
        500
      );
    }
  }

  /**
   * Query vectors by embedding
   */
  async query(
    namespace: string,
    embedding: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      topK = 10,
      filter,
      includeMetadata = true,
      includeValues = false,
    } = options;

    try {
      const index = getPineconeIndex();
      const ns = index.namespace(namespace);

      const response = await ns.query({
        vector: embedding,
        topK,
        filter,
        includeMetadata,
        includeValues,
      });

      return (response.matches || []).map((match) => ({
        id: match.id,
        score: match.score ?? 0,
        metadata: match.metadata as VectorMetadata | undefined,
        values: match.values,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      throw new AppError(
        ERROR_CODES.PROCESSING_FAILED,
        `벡터 검색에 실패했습니다: ${message}`,
        500
      );
    }
  }

  /**
   * Delete vectors by IDs
   */
  async deleteByIds(namespace: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    try {
      const index = getPineconeIndex();
      const ns = index.namespace(namespace);

      // Process in batches of 1000
      const batchSize = 1000;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        await ns.deleteMany(batch);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      throw new AppError(
        ERROR_CODES.PROCESSING_FAILED,
        `벡터 삭제에 실패했습니다: ${message}`,
        500
      );
    }
  }

  /**
   * Delete vectors by filter
   */
  async deleteByFilter(
    namespace: string,
    filter: Record<string, unknown>
  ): Promise<void> {
    try {
      const index = getPineconeIndex();
      const ns = index.namespace(namespace);

      await ns.deleteMany(filter);
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      throw new AppError(
        ERROR_CODES.PROCESSING_FAILED,
        `벡터 삭제에 실패했습니다: ${message}`,
        500
      );
    }
  }

  /**
   * Delete all vectors for a document
   */
  async deleteByDocumentId(
    namespace: string,
    documentId: string
  ): Promise<void> {
    await this.deleteByFilter(namespace, { documentId });
  }

  /**
   * Fetch vectors by IDs
   */
  async fetchByIds(
    namespace: string,
    ids: string[]
  ): Promise<Map<string, { embedding: number[]; metadata?: VectorMetadata }>> {
    if (ids.length === 0) {
      return new Map();
    }

    try {
      const index = getPineconeIndex();
      const ns = index.namespace(namespace);

      const response = await ns.fetch(ids);
      const result = new Map<string, { embedding: number[]; metadata?: VectorMetadata }>();

      if (response.records) {
        for (const [id, record] of Object.entries(response.records)) {
          if (record && record.values) {
            result.set(id, {
              embedding: record.values,
              metadata: record.metadata as VectorMetadata | undefined,
            });
          }
        }
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      throw new AppError(
        ERROR_CODES.PROCESSING_FAILED,
        `벡터 조회에 실패했습니다: ${message}`,
        500
      );
    }
  }

  /**
   * Get namespace statistics
   */
  async getNamespaceStats(namespace: string): Promise<{
    vectorCount: number;
    dimension: number;
  }> {
    try {
      const index = getPineconeIndex();
      const stats = await index.describeIndexStats();

      const nsStats = stats.namespaces?.[namespace];

      return {
        vectorCount: nsStats?.recordCount ?? 0,
        dimension: stats.dimension ?? EMBEDDING_CONFIG.dimensions,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      throw new AppError(
        ERROR_CODES.PROCESSING_FAILED,
        `네임스페이스 통계 조회에 실패했습니다: ${message}`,
        500
      );
    }
  }

  /**
   * Search across multiple namespaces
   */
  async searchMultipleNamespaces(
    namespaces: string[],
    embedding: number[],
    options: SearchOptions = {}
  ): Promise<Map<string, SearchResult[]>> {
    const results = new Map<string, SearchResult[]>();

    // Search all namespaces in parallel
    await Promise.all(
      namespaces.map(async (namespace) => {
        const nsResults = await this.query(namespace, embedding, options);
        results.set(namespace, nsResults);
      })
    );

    return results;
  }

  /**
   * Merge and rank results from multiple namespaces
   */
  mergeAndRankResults(
    resultsMap: Map<string, SearchResult[]>,
    topK: number = 10
  ): SearchResult[] {
    const allResults: SearchResult[] = [];

    for (const results of resultsMap.values()) {
      allResults.push(...results);
    }

    // Sort by score descending and take top K
    return allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Build filter for clearance-based access
   */
  buildClearanceFilter(
    userClearance: 'basic' | 'standard' | 'advanced',
    additionalFilter?: Record<string, unknown>
  ): Record<string, unknown> {
    // User can access documents at or below their clearance level
    const allowedLevels: string[] = [];

    switch (userClearance) {
      case 'advanced':
        allowedLevels.push('advanced');
        // fallthrough
      case 'standard':
        allowedLevels.push('standard');
        // fallthrough
      case 'basic':
        allowedLevels.push('basic');
        break;
    }

    const filter: Record<string, unknown> = {
      clearanceLevel: { $in: allowedLevels },
    };

    if (additionalFilter) {
      return { $and: [filter, additionalFilter] };
    }

    return filter;
  }
}

export const pineconeService = new PineconeService();
