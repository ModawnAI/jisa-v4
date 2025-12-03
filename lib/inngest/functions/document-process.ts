import { inngest } from '../client';
import { db } from '@/lib/db';
import { documents, processingBatches, knowledgeChunks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { storageService } from '@/lib/services/storage.service';
import { templateService } from '@/lib/services/template.service';
import { generateContentHash } from '@/lib/utils/hash';
import { v4 as uuidv4 } from 'uuid';
import {
  selectProcessor,
  type ProcessedChunk,
  type DocumentForProcessing,
  type ProcessorOptions,
} from '@/lib/services/document-processors';

// Configuration
const BATCH_SIZE = 50; // Rows per batch
const DEFAULT_ORGANIZATION_ID = process.env.DEFAULT_ORGANIZATION_ID || 'default';

/**
 * Map file type enum to MIME type
 */
function fileTypeToMimeType(fileType: string): string {
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
  };
  return mimeMap[fileType.toLowerCase()] || 'application/octet-stream';
}

/**
 * Document processing function
 * Triggered when a document is uploaded and ready for processing
 */
export const documentProcess = inngest.createFunction(
  {
    id: 'document-process',
    retries: 3,
    onFailure: async ({ event, error }) => {
      // Update document status to failed on final failure
      const documentId = (event.data as unknown as { documentId: string }).documentId;
      await db
        .update(documents)
        .set({
          status: 'failed',
          errorMessage: error.message || '처리 중 오류가 발생했습니다.',
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId as string));
    },
  },
  { event: 'document/process' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Step 1: Fetch document and validate
    const document = await step.run('fetch-document', async () => {
      const doc = await db.query.documents.findFirst({
        where: eq(documents.id, documentId),
        with: {
          template: {
            with: {
              columnMappings: true,
            },
          },
          category: true,
        },
      });

      if (!doc) {
        throw new Error(`문서를 찾을 수 없습니다: ${documentId}`);
      }

      if (doc.status === 'processing') {
        throw new Error('문서가 이미 처리 중입니다.');
      }

      return doc;
    });

    // Step 2: Update status to processing
    await step.run('update-status-processing', async () => {
      await db
        .update(documents)
        .set({
          status: 'processing',
          errorMessage: null,
          processedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
    });

    // Step 3: Download file and process with appropriate processor
    const processorResult = await step.run('process-file', async () => {
      // Download file from storage
      const fileBlob = await storageService.download(document.filePath);
      const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());

      // Get clearance level from category or default to basic
      const clearanceLevel = (document.category?.minClearanceLevel as 'basic' | 'standard' | 'advanced') || 'basic';
      const organizationId = DEFAULT_ORGANIZATION_ID;

      // Prepare document for processor selection
      const docForProcessing: DocumentForProcessing = {
        id: document.id,
        fileName: document.fileName,
        originalFileName: document.fileName, // Use fileName as original
        mimeType: fileTypeToMimeType(document.fileType),
        fileType: document.fileType,
        organizationId,
        categoryId: document.categoryId || undefined,
        templateId: document.templateId || undefined,
        clearanceLevel,
      };

      // Prepare processor options
      const processorOptions: ProcessorOptions = {
        chunkSize: document.template?.chunkSize || 1000,
        chunkOverlap: document.template?.chunkOverlap || 200,
        clearanceLevel,
        organizationId,
        templateConfig: document.template ? {
          processingMode: document.template.processingMode,
          columnMappings: document.template.columnMappings?.map((m) => ({
            sourceColumn: m.sourceColumn,
            targetField: m.targetField,
            fieldRole: m.fieldRole,
          })),
        } : undefined,
      };

      // Select the best processor for this document
      const processor = selectProcessor(docForProcessing);

      // Process the document
      const result = await processor.process(fileBuffer, docForProcessing, processorOptions);

      return {
        processorType: processor.type,
        ...result,
      };
    });

    // Step 4: Create processing batches from processor chunks
    const batches = await step.run('create-batches', async () => {
      const { chunks, namespaceStrategy } = processorResult;

      if (!chunks || chunks.length === 0) {
        // Create a placeholder batch for documents with no chunks
        return [{
          id: uuidv4(),
          chunks: [] as ProcessedChunk[],
          startIndex: 0,
          endIndex: 0,
          namespaceStrategy,
        }];
      }

      const batchList: Array<{
        id: string;
        chunks: ProcessedChunk[];
        startIndex: number;
        endIndex: number;
        namespaceStrategy: string;
      }> = [];

      // Split chunks into batches
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchChunks = chunks.slice(i, i + BATCH_SIZE);
        batchList.push({
          id: uuidv4(),
          chunks: batchChunks,
          startIndex: i,
          endIndex: Math.min(i + BATCH_SIZE, chunks.length),
          namespaceStrategy,
        });
      }

      // Create batch records in database
      if (batchList.length > 0) {
        await db.insert(processingBatches).values(
          batchList.map((batch, index) => ({
            id: batch.id,
            documentId,
            batchNumber: index + 1,
            totalBatches: batchList.length,
            status: 'pending' as const,
            recordCount: batch.chunks.length,
            startRowIndex: batch.startIndex,
            endRowIndex: batch.endIndex,
          }))
        );
      }

      return batchList;
    });

    // Step 5: Get template configuration for batch processing
    const _templateConfig = await step.run('get-template-config', async () => {
      if (!document.templateId) {
        return null;
      }

      const template = await templateService.getById(document.templateId);
      return {
        processingMode: template.processingMode,
        chunkingStrategy: template.chunkingStrategy,
        chunkSize: template.chunkSize,
        chunkOverlap: template.chunkOverlap,
        columnMappings: template.columnMappings.map((m) => ({
          sourceColumn: m.sourceColumn,
          targetField: m.targetField,
          fieldRole: m.fieldRole,
          targetFieldType: m.targetFieldType,
        })),
      };
    });

    // Step 6: Send batch processing events
    await step.run('dispatch-batch-events', async () => {
      // Send events for each batch with processed chunks
      const events = batches.map((batch) => ({
        name: 'batch/process-v2' as const,
        data: {
          documentId,
          batchId: batch.id,
          processorType: processorResult.processorType,
          namespaceStrategy: processorResult.namespaceStrategy,
          chunks: batch.chunks,
          organizationId: DEFAULT_ORGANIZATION_ID,
        },
      }));

      await inngest.send(events);

      return { batchCount: batches.length };
    });

    // Step 7: Update document metadata
    await step.run('update-document-metadata', async () => {
      const { chunks, processorType } = processorResult;
      const totalChunks = chunks?.length || 0;

      // Generate content hash from all chunk contents
      const allContent = chunks?.map((c) => c.embeddingText).join('\n') || '';

      const metadata: Record<string, unknown> = {
        ...((document.metadata as Record<string, unknown>) || {}),
        batchCount: batches.length,
        totalChunks,
        processorType,
        namespaceStrategy: processorResult.namespaceStrategy,
        contentHash: generateContentHash(allContent),
        processedAt: new Date().toISOString(),
      };

      await db
        .update(documents)
        .set({
          metadata,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));

      return metadata;
    });

    return {
      documentId,
      status: 'batches_dispatched',
      batchCount: batches.length,
      chunkCount: processorResult.chunks?.length || 0,
      processorType: processorResult.processorType,
    };
  }
);

/**
 * Cleanup function for document processing
 * Deletes vectors and chunks associated with a document
 */
export const documentCleanup = inngest.createFunction(
  {
    id: 'document-cleanup',
    retries: 2,
  },
  { event: 'document/cleanup' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Step 1: Get document and associated data
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

    // Step 2: Get all knowledge chunks for this document
    const chunks = await step.run('get-chunks', async () => {
      return db.query.knowledgeChunks.findMany({
        where: eq(knowledgeChunks.documentId, documentId),
        columns: {
          id: true,
          pineconeId: true,
          pineconeNamespace: true,
        },
      });
    });

    // Step 3: Delete vectors from Pinecone
    if (chunks.length > 0) {
      await step.run('delete-vectors', async () => {
        const { pineconeService } = await import('@/lib/services/pinecone.service');

        // Group chunks by namespace
        const byNamespace = chunks.reduce((acc, chunk) => {
          const ns = chunk.pineconeNamespace || 'default';
          if (!acc[ns]) acc[ns] = [];
          if (chunk.pineconeId) acc[ns].push(chunk.pineconeId);
          return acc;
        }, {} as Record<string, string[]>);

        // Delete from each namespace
        for (const [namespace, ids] of Object.entries(byNamespace)) {
          if (ids.length > 0) {
            await pineconeService.deleteByIds(namespace, ids);
          }
        }

        return { deletedCount: chunks.length };
      });
    }

    // Step 4: Delete knowledge chunks from database
    await step.run('delete-chunks', async () => {
      await db
        .delete(knowledgeChunks)
        .where(eq(knowledgeChunks.documentId, documentId));

      return { deleted: true };
    });

    // Step 5: Delete processing batches
    await step.run('delete-batches', async () => {
      await db
        .delete(processingBatches)
        .where(eq(processingBatches.documentId, documentId));

      return { deleted: true };
    });

    // Step 6: Update document status
    await step.run('update-document-status', async () => {
      await db
        .update(documents)
        .set({
          status: 'pending',
          processedAt: null,
          errorMessage: null,
          metadata: {
            ...((document.metadata as Record<string, unknown>) || {}),
            cleanedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
    });

    return {
      documentId,
      chunksDeleted: chunks.length,
      status: 'cleaned',
    };
  }
);
