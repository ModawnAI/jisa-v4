import { inngest } from '../client';
import { db } from '@/lib/db';
import { documents, processingBatches, knowledgeChunks, dataLineage } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { pineconeService, VectorMetadata } from '@/lib/services/pinecone.service';
import { createEmbeddingsBatch, formatRowForEmbedding, EMBEDDING_CONFIG } from '@/lib/utils/embedding';
import { generateVectorId, generateContentHash } from '@/lib/utils/hash';
import type { ProcessedChunk, NamespaceStrategy } from '@/lib/services/document-processors';

interface TemplateConfig {
  processingMode: string;
  chunkingStrategy?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  columnMappings?: Array<{
    sourceColumn: string;
    targetField: string;
    fieldRole: string;
    targetFieldType: string;
  }>;
}

/**
 * Batch processing function
 * Processes a batch of rows from a document, creates embeddings and stores in Pinecone
 */
export const batchProcess = inngest.createFunction(
  {
    id: 'batch-process',
    retries: 3,
    concurrency: {
      limit: 5, // Process max 5 batches concurrently
    },
    onFailure: async ({ event }) => {
      const batchId = (event.data as unknown as { batchId: string }).batchId;
      await db
        .update(processingBatches)
        .set({
          status: 'failed',
          errorCount: 1,
          completedAt: new Date(),
        })
        .where(eq(processingBatches.id, batchId));
    },
  },
  { event: 'batch/process' },
  async ({ event, step }) => {
    const { documentId, batchId, processingMode, rows, chunks, batchType, templateConfig } = event.data;

    // Step 1: Update batch status to processing
    await step.run('update-batch-status', async () => {
      await db
        .update(processingBatches)
        .set({
          status: 'processing',
          startedAt: new Date(),
        })
        .where(eq(processingBatches.id, batchId));
    });

    // Step 2: Get document info
    const document = await step.run('fetch-document', async () => {
      const doc = await db.query.documents.findFirst({
        where: eq(documents.id, documentId),
        with: {
          category: true,
        },
      });

      if (!doc) {
        throw new Error(`문서를 찾을 수 없습니다: ${documentId}`);
      }

      return doc;
    });

    // Step 3: Prepare content for embedding based on processing mode
    const preparedData = await step.run('prepare-content', async () => {
      const config = templateConfig as TemplateConfig | null;
      const mode = config?.processingMode || processingMode;

      // Prepare items for embedding
      const prepared: Array<{
        content: string;
        rowIndex: number;
        employeeId?: string;
        metadata: Record<string, unknown>;
      }> = [];

      // Handle PDF chunks
      if (batchType === 'pdf' && chunks && chunks.length > 0) {
        for (const chunk of chunks) {
          prepared.push({
            content: chunk.content,
            rowIndex: chunk.metadata?.chunkIndex ?? 0,
            employeeId: undefined, // PDFs don't have employee association by default
            metadata: {
              pageNumber: chunk.metadata?.pageNumber,
              startChar: chunk.metadata?.startChar,
              endChar: chunk.metadata?.endChar,
              source: chunk.metadata?.source,
              chunkId: chunk.id,
            },
          });
        }

        return {
          items: prepared,
          mode,
          batchType: 'pdf',
        };
      }

      // Handle tabular data (Excel/CSV)
      // Find employee identifier field from column mappings
      const employeeIdentifierField = config?.columnMappings?.find(
        (m) => m.fieldRole === 'employee_identifier'
      )?.targetField;

      for (let i = 0; i < (rows || []).length; i++) {
        const row = rows[i] as Record<string, unknown>;

        // Create embedding content from row
        const content = formatRowForEmbedding(row);

        // Extract employee ID if applicable
        let employeeId: string | undefined;
        if (employeeIdentifierField && row[employeeIdentifierField]) {
          employeeId = String(row[employeeIdentifierField]);
        }

        // Extract metadata fields
        const metadata: Record<string, unknown> = {};
        if (config?.columnMappings) {
          for (const mapping of config.columnMappings) {
            if (mapping.fieldRole === 'metadata' && row[mapping.targetField] !== undefined) {
              metadata[mapping.targetField] = row[mapping.targetField];
            }
          }
        }

        prepared.push({
          content,
          rowIndex: i,
          employeeId,
          metadata,
        });
      }

      return {
        items: prepared,
        mode,
        employeeIdentifierField,
        batchType: 'tabular',
      };
    });

    // Step 4: Create embeddings
    const embeddings = await step.run('create-embeddings', async () => {
      const contents = preparedData.items.map((item) => item.content);

      if (contents.length === 0) {
        return [];
      }

      return createEmbeddingsBatch(contents);
    });

    // Step 5: Prepare vectors for Pinecone
    const vectors = await step.run('prepare-vectors', async () => {
      const vectorList: Array<{
        id: string;
        embedding: number[];
        metadata: VectorMetadata;
        namespace: string;
        chunkData: {
          content: string;
          rowIndex: number;
          employeeId?: string;
        };
      }> = [];

      // Determine organization ID (use category ID as proxy for now)
      const organizationId = document.category?.id || 'default';

      for (let i = 0; i < preparedData.items.length; i++) {
        const item = preparedData.items[i];
        const embedding = embeddings[i];

        if (!embedding) continue;

        // Generate vector ID
        const vectorId = generateVectorId(documentId, item.rowIndex, item.employeeId);

        // Determine namespace based on processing mode
        let namespace: string;
        if (preparedData.mode === 'employee_split' && item.employeeId) {
          namespace = pineconeService.getEmployeeNamespace(item.employeeId);
        } else {
          namespace = pineconeService.getOrganizationNamespace(organizationId);
        }

        // Create metadata
        const metadata: VectorMetadata = {
          documentId,
          organizationId,
          employeeId: item.employeeId,
          categoryId: document.categoryId || undefined,
          chunkIndex: item.rowIndex,
          contentHash: generateContentHash(item.content),
          clearanceLevel: 'basic', // Default clearance level
          processingBatchId: batchId,
          originalRowIndex: item.rowIndex,
          createdAt: new Date().toISOString(),
          // CRITICAL: Store the content as searchable text for RAG retrieval
          searchable_text: item.content,
          ...item.metadata,
        };

        vectorList.push({
          id: vectorId,
          embedding,
          metadata,
          namespace,
          chunkData: {
            content: item.content,
            rowIndex: item.rowIndex,
            employeeId: item.employeeId,
          },
        });
      }

      return vectorList;
    });

    // Step 6: Upsert vectors to Pinecone by namespace
    const upsertResults = await step.run('upsert-vectors', async () => {
      // Group vectors by namespace
      const byNamespace = vectors.reduce((acc, v) => {
        if (!acc[v.namespace]) acc[v.namespace] = [];
        acc[v.namespace].push({
          id: v.id,
          embedding: v.embedding,
          metadata: v.metadata,
        });
        return acc;
      }, {} as Record<string, Array<{ id: string; embedding: number[]; metadata: VectorMetadata }>>);

      const results: { namespace: string; count: number }[] = [];

      for (const [namespace, nsVectors] of Object.entries(byNamespace)) {
        const result = await pineconeService.upsertVectors(namespace, nsVectors);
        results.push({ namespace, count: result.upsertedCount });
      }

      return results;
    });

    // Step 7: Create knowledge chunks in database
    const totalChunks = vectors.length;
    await step.run('create-knowledge-chunks', async () => {
      const chunkRecords = vectors.map((v) => ({
        documentId,
        content: v.chunkData.content,
        contentHash: v.metadata.contentHash,
        chunkIndex: v.chunkData.rowIndex,
        totalChunks,
        pineconeId: v.id,
        pineconeNamespace: v.namespace,
        embeddingModel: EMBEDDING_CONFIG.model,
        employeeId: v.chunkData.employeeId,
        categorySlug: document.category?.slug,
        metadata: v.metadata,
      }));

      if (chunkRecords.length > 0) {
        await db.insert(knowledgeChunks).values(chunkRecords);
      }

      return { created: chunkRecords.length };
    });

    // Step 8: Create data lineage records
    await step.run('create-lineage', async () => {
      const lineageRecords = vectors.map((v) => ({
        sourceDocumentId: documentId,
        sourceFileUrl: document.fileUrl,
        sourceFileHash: document.fileHash || '',
        processingBatchId: batchId,
        templateId: document.templateId,
        targetPineconeId: v.id,
        targetNamespace: v.namespace,
        targetEmployeeId: v.chunkData.employeeId,
        chunkIndex: v.chunkData.rowIndex,
        transformationLog: {
          embeddingModel: EMBEDDING_CONFIG.model,
          dimensions: EMBEDDING_CONFIG.dimensions,
          processingMode: preparedData.mode,
        },
      }));

      if (lineageRecords.length > 0) {
        await db.insert(dataLineage).values(lineageRecords);
      }

      return { created: lineageRecords.length };
    });

    // Step 9: Update batch status to completed
    const vectorIds = vectors.map((v) => v.id);
    await step.run('complete-batch', async () => {
      // Use chunks length for PDF, rows length for tabular
      const totalRecords = batchType === 'pdf'
        ? (chunks?.length || 0)
        : (rows?.length || 0);

      await db
        .update(processingBatches)
        .set({
          status: 'completed',
          vectorIds,
          successCount: vectors.length,
          totalRecords,
          errorCount: 0,
          completedAt: new Date(),
        })
        .where(eq(processingBatches.id, batchId));
    });

    // Step 10: Check if all batches are complete
    await step.run('check-all-batches', async () => {
      const batch = await db.query.processingBatches.findFirst({
        where: eq(processingBatches.id, batchId),
      });

      if (!batch) return;

      // Count completed batches for this document
      const [{ completed, total }] = await db
        .select({
          completed: sql<number>`count(*) filter (where ${processingBatches.status} = 'completed')::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(processingBatches)
        .where(eq(processingBatches.documentId, documentId));

      // If all batches are complete, send completion event
      if (completed === total) {
        await inngest.send({
          name: 'batch/all-complete',
          data: { documentId },
        });
      }

      return { completed, total };
    });

    return {
      batchId,
      documentId,
      vectorsCreated: vectors.length,
      upsertResults,
    };
  }
);

/**
 * Batch processing function V2 (using processor registry)
 * Processes pre-chunked data from document processors with rich metadata
 */
export const batchProcessV2 = inngest.createFunction(
  {
    id: 'batch-process-v2',
    retries: 3,
    concurrency: {
      limit: 5,
    },
    onFailure: async ({ event }) => {
      const batchId = (event.data as unknown as { batchId: string }).batchId;
      await db
        .update(processingBatches)
        .set({
          status: 'failed',
          errorCount: 1,
          completedAt: new Date(),
        })
        .where(eq(processingBatches.id, batchId));
    },
  },
  { event: 'batch/process-v2' },
  async ({ event, step }) => {
    const {
      documentId,
      batchId,
      processorType,
      namespaceStrategy,
      chunks,
      organizationId,
    } = event.data as {
      documentId: string;
      batchId: string;
      processorType: string;
      namespaceStrategy: NamespaceStrategy;
      chunks: ProcessedChunk[];
      organizationId: string;
    };

    // Step 1: Update batch status to processing
    await step.run('update-batch-status', async () => {
      await db
        .update(processingBatches)
        .set({
          status: 'processing',
          startedAt: new Date(),
        })
        .where(eq(processingBatches.id, batchId));
    });

    // Step 2: Get document info
    const document = await step.run('fetch-document', async () => {
      const doc = await db.query.documents.findFirst({
        where: eq(documents.id, documentId),
        with: {
          category: true,
        },
      });

      if (!doc) {
        throw new Error(`문서를 찾을 수 없습니다: ${documentId}`);
      }

      return doc;
    });

    // Step 3: Create embeddings from chunk embedding texts
    const embeddings = await step.run('create-embeddings', async () => {
      const contents = chunks.map((chunk) => chunk.embeddingText);

      if (contents.length === 0) {
        return [];
      }

      return createEmbeddingsBatch(contents);
    });

    // Step 4: Prepare vectors with processor-generated metadata
    const vectors = await step.run('prepare-vectors', async () => {
      const vectorList: Array<{
        id: string;
        embedding: number[];
        metadata: VectorMetadata;
        namespace: string;
        chunkData: {
          content: string;
          chunkIndex: number;
          employeeId?: string;
        };
      }> = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        if (!embedding) continue;

        // Use the namespace from the chunk (processor already determined it)
        const namespace = chunk.namespace;

        // Extract employee ID from metadata if present
        const employeeId = (chunk.metadata as Record<string, unknown>).employeeId as string | undefined;

        // Create Pinecone metadata from processor metadata
        const vectorMetadata: VectorMetadata = {
          documentId,
          organizationId,
          employeeId,
          categoryId: document.categoryId || undefined,
          chunkIndex: chunk.chunkIndex,
          contentHash: chunk.contentHash,
          clearanceLevel: (chunk.metadata.clearanceLevel as 'basic' | 'standard' | 'advanced') || 'basic',
          processingBatchId: batchId,
          originalRowIndex: chunk.chunkIndex,
          createdAt: new Date().toISOString(),
          // CRITICAL: Store the embedding text for RAG retrieval
          // This text is what semantic search will match against
          searchable_text: chunk.embeddingText,
          // Spread processor-specific metadata
          processorType,
          namespaceStrategy,
          metadataType: (chunk.metadata as Record<string, unknown>).metadataType as string,
          // Include additional processor metadata (flatten for Pinecone)
          ...(flattenMetadata(chunk.metadata)),
        };

        vectorList.push({
          id: chunk.vectorId,
          embedding,
          metadata: vectorMetadata,
          namespace,
          chunkData: {
            content: chunk.embeddingText,
            chunkIndex: chunk.chunkIndex,
            employeeId,
          },
        });
      }

      return vectorList;
    });

    // Step 5: Upsert vectors to Pinecone by namespace
    const upsertResults = await step.run('upsert-vectors', async () => {
      // Group vectors by namespace
      const byNamespace = vectors.reduce((acc, v) => {
        if (!acc[v.namespace]) acc[v.namespace] = [];
        acc[v.namespace].push({
          id: v.id,
          embedding: v.embedding,
          metadata: v.metadata,
        });
        return acc;
      }, {} as Record<string, Array<{ id: string; embedding: number[]; metadata: VectorMetadata }>>);

      const results: { namespace: string; count: number }[] = [];

      for (const [namespace, nsVectors] of Object.entries(byNamespace)) {
        const result = await pineconeService.upsertVectors(namespace, nsVectors);
        results.push({ namespace, count: result.upsertedCount });
      }

      return results;
    });

    // Step 6: Create knowledge chunks in database
    const totalChunks = vectors.length;
    await step.run('create-knowledge-chunks', async () => {
      const chunkRecords = vectors.map((v) => ({
        documentId,
        content: v.chunkData.content,
        contentHash: v.metadata.contentHash,
        chunkIndex: v.chunkData.chunkIndex,
        totalChunks,
        pineconeId: v.id,
        pineconeNamespace: v.namespace,
        embeddingModel: EMBEDDING_CONFIG.model,
        employeeId: v.chunkData.employeeId,
        categorySlug: document.category?.slug,
        metadata: v.metadata,
      }));

      if (chunkRecords.length > 0) {
        await db.insert(knowledgeChunks).values(chunkRecords);
      }

      return { created: chunkRecords.length };
    });

    // Step 7: Create data lineage records
    await step.run('create-lineage', async () => {
      const lineageRecords = vectors.map((v) => ({
        sourceDocumentId: documentId,
        sourceFileUrl: document.fileUrl,
        sourceFileHash: document.fileHash || '',
        processingBatchId: batchId,
        templateId: document.templateId,
        targetPineconeId: v.id,
        targetNamespace: v.namespace,
        targetEmployeeId: v.chunkData.employeeId,
        chunkIndex: v.chunkData.chunkIndex,
        transformationLog: {
          embeddingModel: EMBEDDING_CONFIG.model,
          dimensions: EMBEDDING_CONFIG.dimensions,
          processorType,
          namespaceStrategy,
        },
      }));

      if (lineageRecords.length > 0) {
        await db.insert(dataLineage).values(lineageRecords);
      }

      return { created: lineageRecords.length };
    });

    // Step 8: Update batch status to completed
    const vectorIds = vectors.map((v) => v.id);
    await step.run('complete-batch', async () => {
      await db
        .update(processingBatches)
        .set({
          status: 'completed',
          vectorIds,
          successCount: vectors.length,
          totalRecords: chunks.length,
          errorCount: 0,
          completedAt: new Date(),
        })
        .where(eq(processingBatches.id, batchId));
    });

    // Step 9: Check if all batches are complete
    await step.run('check-all-batches', async () => {
      const batch = await db.query.processingBatches.findFirst({
        where: eq(processingBatches.id, batchId),
      });

      if (!batch) return;

      // Count completed batches for this document
      const [{ completed, total }] = await db
        .select({
          completed: sql<number>`count(*) filter (where ${processingBatches.status} = 'completed')::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(processingBatches)
        .where(eq(processingBatches.documentId, documentId));

      // If all batches are complete, send completion event
      if (completed === total) {
        await inngest.send({
          name: 'batch/all-complete',
          data: { documentId },
        });
      }

      return { completed, total };
    });

    return {
      batchId,
      documentId,
      vectorsCreated: vectors.length,
      upsertResults,
      processorType,
    };
  }
);

/**
 * Flatten nested metadata for Pinecone storage
 * Pinecone only supports flat key-value pairs
 */
function flattenMetadata(
  metadata: Record<string, unknown>,
  prefix: string = ''
): Record<string, string | number | boolean | string[]> {
  const result: Record<string, string | number | boolean | string[]> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Skip certain keys that are already handled
    if (['documentId', 'organizationId', 'chunkIndex', 'contentHash', 'clearanceLevel', 'createdAt'].includes(key)) {
      continue;
    }

    const fullKey = prefix ? `${prefix}_${key}` : key;

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[fullKey] = value;
    } else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      result[fullKey] = value as string[];
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Recursively flatten nested objects (one level deep only for Pinecone)
      const nested = flattenMetadata(value as Record<string, unknown>, fullKey);
      Object.assign(result, nested);
    }
  }

  return result;
}

/**
 * All batches complete handler
 * Updates document status when all batches have been processed
 */
/**
 * Batch processing function V3 (RAG V2 architecture)
 * Uses enhanced embedding service with caching and checkpointing
 */
export const batchProcessV3 = inngest.createFunction(
  {
    id: 'batch-process-v3',
    retries: 3,
    concurrency: {
      limit: 5,
    },
    onFailure: async ({ event }) => {
      const batchId = (event.data as unknown as { batchId: string }).batchId;
      await db
        .update(processingBatches)
        .set({
          status: 'failed',
          errorCount: 1,
          completedAt: new Date(),
        })
        .where(eq(processingBatches.id, batchId));
    },
  },
  { event: 'batch/process-v3' },
  async ({ event, step }) => {
    const {
      documentId,
      batchId,
      processorType,
      namespaceStrategy,
      chunks,
      organizationId,
      useV2Embeddings = true,
      enableCheckpointing = true,
    } = event.data as {
      documentId: string;
      batchId: string;
      processorType: string;
      namespaceStrategy: NamespaceStrategy;
      chunks: ProcessedChunk[];
      organizationId: string;
      useV2Embeddings?: boolean;
      enableCheckpointing?: boolean;
    };

    // Import RAG V2 services dynamically to avoid circular dependencies
    const { embeddingService, cacheService } = await import('@/lib/services/rag-v2');

    // Step 1: Update batch status to processing
    await step.run('update-batch-status', async () => {
      await db
        .update(processingBatches)
        .set({
          status: 'processing',
          startedAt: new Date(),
        })
        .where(eq(processingBatches.id, batchId));
    });

    // Step 2: Get document info
    const document = await step.run('fetch-document', async () => {
      const doc = await db.query.documents.findFirst({
        where: eq(documents.id, documentId),
        with: {
          category: true,
        },
      });

      if (!doc) {
        throw new Error(`문서를 찾을 수 없습니다: ${documentId}`);
      }

      return doc;
    });

    // Step 3: Create embeddings using RAG V2 service with caching
    type EmbeddingMap = Map<number, { values: number[] }>;
    const embeddings = await step.run('create-embeddings-v2', async (): Promise<EmbeddingMap> => {
      const contents = chunks.map((chunk) => chunk.embeddingText);

      if (contents.length === 0) {
        return new Map<number, { values: number[] }>();
      }

      if (useV2Embeddings) {
        // Use RAG V2 embedding service with caching
        const result = await embeddingService.generateDenseEmbeddingsBatch(contents);
        // Convert DenseEmbedding to simple { values } format
        const mapped = new Map<number, { values: number[] }>();
        result.forEach((emb, idx) => {
          mapped.set(idx, { values: emb.values });
        });
        return mapped;
      } else {
        // Fallback to legacy embedding
        const embedResults = await createEmbeddingsBatch(contents);
        const mapped = new Map<number, { values: number[] }>();
        embedResults.forEach((emb, idx) => {
          mapped.set(idx, { values: emb });
        });
        return mapped;
      }
    }) as EmbeddingMap;

    // Step 4: Prepare vectors with enhanced metadata
    const vectors = await step.run('prepare-vectors-v2', async () => {
      const vectorList: Array<{
        id: string;
        embedding: number[];
        metadata: VectorMetadata;
        namespace: string;
        chunkData: {
          content: string;
          chunkIndex: number;
          employeeId?: string;
        };
      }> = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings.get(i);

        if (!embedding) continue;

        const namespace = chunk.namespace;
        const employeeId = (chunk.metadata as Record<string, unknown>).employeeId as string | undefined;

        // Enhanced metadata for RAG V2
        const vectorMetadata: VectorMetadata = {
          documentId,
          organizationId,
          employeeId,
          categoryId: document.categoryId || undefined,
          chunkIndex: chunk.chunkIndex,
          contentHash: chunk.contentHash,
          clearanceLevel: (chunk.metadata.clearanceLevel as 'basic' | 'standard' | 'advanced') || 'basic',
          processingBatchId: batchId,
          originalRowIndex: chunk.chunkIndex,
          createdAt: new Date().toISOString(),
          // CRITICAL: Store full searchable text for RAG retrieval
          searchable_text: chunk.embeddingText,
          // Preview for quick display (compact)
          preview: chunk.embeddingText.slice(0, 500),
          // Chunk reference for tiered metadata lookup
          chunkRef: chunk.vectorId,
          // Processor info
          processorType,
          namespaceStrategy,
          metadataType: (chunk.metadata as Record<string, unknown>).metadataType as string,
          // V2 flag for query routing
          ragVersion: 'v2',
          // Flatten processor metadata
          ...(flattenMetadata(chunk.metadata)),
        };

        vectorList.push({
          id: chunk.vectorId,
          embedding: embedding.values,
          metadata: vectorMetadata,
          namespace,
          chunkData: {
            content: chunk.embeddingText,
            chunkIndex: chunk.chunkIndex,
            employeeId,
          },
        });
      }

      return vectorList;
    });

    // Step 5: Upsert vectors with batching
    const upsertResults = await step.run('upsert-vectors-v2', async () => {
      const byNamespace = vectors.reduce((acc, v) => {
        if (!acc[v.namespace]) acc[v.namespace] = [];
        acc[v.namespace].push({
          id: v.id,
          embedding: v.embedding,
          metadata: v.metadata,
        });
        return acc;
      }, {} as Record<string, Array<{ id: string; embedding: number[]; metadata: VectorMetadata }>>);

      const results: { namespace: string; count: number }[] = [];

      for (const [namespace, nsVectors] of Object.entries(byNamespace)) {
        const result = await pineconeService.upsertVectors(namespace, nsVectors);
        results.push({ namespace, count: result.upsertedCount });

        // Invalidate query cache for this namespace
        await cacheService.invalidateQueriesForNamespace(namespace);
      }

      return results;
    });

    // Step 6: Create knowledge chunks in database
    const totalChunks = vectors.length;
    await step.run('create-knowledge-chunks-v2', async () => {
      const chunkRecords = vectors.map((v) => ({
        documentId,
        content: v.chunkData.content,
        contentHash: v.metadata.contentHash,
        chunkIndex: v.chunkData.chunkIndex,
        totalChunks,
        pineconeId: v.id,
        pineconeNamespace: v.namespace,
        embeddingModel: EMBEDDING_CONFIG.model,
        employeeId: v.chunkData.employeeId,
        categorySlug: document.category?.slug,
        metadata: {
          ...v.metadata,
          ragVersion: 'v2',
        },
      }));

      if (chunkRecords.length > 0) {
        await db.insert(knowledgeChunks).values(chunkRecords);
      }

      return { created: chunkRecords.length };
    });

    // Step 7: Create data lineage records
    await step.run('create-lineage-v2', async () => {
      const lineageRecords = vectors.map((v) => ({
        sourceDocumentId: documentId,
        sourceFileUrl: document.fileUrl,
        sourceFileHash: document.fileHash || '',
        processingBatchId: batchId,
        templateId: document.templateId,
        targetPineconeId: v.id,
        targetNamespace: v.namespace,
        targetEmployeeId: v.chunkData.employeeId,
        chunkIndex: v.chunkData.chunkIndex,
        transformationLog: {
          embeddingModel: EMBEDDING_CONFIG.model,
          dimensions: EMBEDDING_CONFIG.dimensions,
          processorType,
          namespaceStrategy,
          ragVersion: 'v2',
          usedCaching: useV2Embeddings,
        },
      }));

      if (lineageRecords.length > 0) {
        await db.insert(dataLineage).values(lineageRecords);
      }

      return { created: lineageRecords.length };
    });

    // Step 8: Update batch status to completed
    const vectorIds = vectors.map((v) => v.id);
    await step.run('complete-batch-v2', async () => {
      await db
        .update(processingBatches)
        .set({
          status: 'completed',
          vectorIds,
          successCount: vectors.length,
          totalRecords: chunks.length,
          errorCount: 0,
          completedAt: new Date(),
        })
        .where(eq(processingBatches.id, batchId));
    });

    // Step 9: Check if all batches are complete
    await step.run('check-all-batches-v2', async () => {
      const batch = await db.query.processingBatches.findFirst({
        where: eq(processingBatches.id, batchId),
      });

      if (!batch) return;

      const [{ completed, total }] = await db
        .select({
          completed: sql<number>`count(*) filter (where ${processingBatches.status} = 'completed')::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(processingBatches)
        .where(eq(processingBatches.documentId, documentId));

      if (completed === total) {
        await inngest.send({
          name: 'batch/all-complete',
          data: { documentId, ragVersion: 'v2' },
        });
      }

      return { completed, total };
    });

    return {
      batchId,
      documentId,
      vectorsCreated: vectors.length,
      upsertResults,
      processorType,
      ragVersion: 'v2',
      usedCaching: useV2Embeddings,
    };
  }
);

/**
 * All batches complete handler
 * Updates document status when all batches have been processed
 */
export const batchAllComplete = inngest.createFunction(
  {
    id: 'batch-all-complete',
  },
  { event: 'batch/all-complete' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Step 1: Check batch statuses
    const batchStatuses = await step.run('check-batch-statuses', async () => {
      return db.query.processingBatches.findMany({
        where: eq(processingBatches.documentId, documentId),
        columns: {
          status: true,
          successCount: true,
          errorCount: true,
        },
      });
    });

    // Step 2: Determine final document status
    const finalStatus = await step.run('determine-status', async () => {
      const failed = batchStatuses.filter((b) => b.status === 'failed').length;
      const completed = batchStatuses.filter((b) => b.status === 'completed').length;
      const total = batchStatuses.length;

      if (failed === 0 && completed === total) {
        return 'completed';
      } else if (failed === total) {
        return 'failed';
      } else if (failed > 0) {
        return 'partial';
      }

      return 'completed';
    });

    // Step 3: Update document status
    await step.run('update-document-status', async () => {
      const totalProcessed = batchStatuses.reduce(
        (sum, b) => sum + (b.successCount || 0),
        0
      );

      const failedBatches = batchStatuses.filter((b) => b.status === 'failed');
      const errorMessage = failedBatches.length > 0
        ? `${failedBatches.length}개 배치 처리 실패`
        : null;

      await db
        .update(documents)
        .set({
          status: finalStatus,
          processedAt: new Date(),
          errorMessage,
          metadata: sql`jsonb_set(
            COALESCE(${documents.metadata}, '{}'),
            '{processingSummary}',
            ${JSON.stringify({
              totalBatches: batchStatuses.length,
              completedBatches: batchStatuses.filter((b) => b.status === 'completed').length,
              failedBatches: failedBatches.length,
              totalVectors: totalProcessed,
              completedAt: new Date().toISOString(),
            })}
          )`,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
    });

    return {
      documentId,
      status: finalStatus,
      batchCount: batchStatuses.length,
    };
  }
);
