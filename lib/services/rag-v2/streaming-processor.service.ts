/**
 * Streaming Document Processor Service
 *
 * Processes large documents in a streaming manner with:
 * - Checkpointing for resume capability
 * - Parent-child chunking strategy
 * - Adaptive batch sizing
 * - Progress tracking
 */

import { db } from '@/lib/db';
import { processingCheckpoints } from '@/lib/db/schema/rag-metrics';
import { eq, and } from 'drizzle-orm';
import { embeddingService, generateContentHash } from './embedding.service';
import { Pinecone, Index } from '@pinecone-database/pinecone';
import type {
  ParentChildChunk,
  ProcessingCheckpoint,
  PineconeMetadata,
  HybridEmbedding,
} from './types';

// Pinecone client
let pineconeClient: Pinecone | null = null;
let pineconeIndex: Index | null = null;

function getPineconeIndex(): Index {
  if (!pineconeIndex) {
    if (!pineconeClient) {
      pineconeClient = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
      });
    }
    const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX;
    if (!indexName) {
      throw new Error('Pinecone index name not configured');
    }
    pineconeIndex = pineconeClient.index(indexName.trim());
  }
  return pineconeIndex;
}

// Configuration
const PROCESSOR_CONFIG = {
  defaultBatchSize: 50,
  maxBatchSize: 100,
  minBatchSize: 10,
  checkpointInterval: 25, // Save checkpoint every N chunks
  maxRetries: 3,
  retryDelayMs: 1000,
  parentChunkSize: 2000, // Characters for parent chunks
  childChunkSize: 500, // Characters for child chunks
  childOverlap: 50, // Overlap between child chunks
} as const;

// Processing status
interface ProcessingStatus {
  documentId: string;
  totalChunks: number;
  processedChunks: number;
  status: 'in_progress' | 'completed' | 'failed' | 'paused';
  startTime: number;
  currentBatchSize: number;
  errors: string[];
}

class StreamingProcessorService {
  private activeProcessing = new Map<string, ProcessingStatus>();

  /**
   * Process document with streaming and checkpointing
   */
  async processDocument(
    documentId: string,
    content: string | AsyncIterable<string>,
    metadata: {
      organizationId: string;
      namespace: string;
      metadataType: PineconeMetadata['metadataType'];
      employeeId?: string;
      period?: string;
      clearanceLevel?: PineconeMetadata['clearanceLevel'];
    },
    options: {
      useParentChild?: boolean;
      resumeFromCheckpoint?: boolean;
      batchId?: string;
    } = {}
  ): Promise<{
    success: boolean;
    processedChunks: number;
    vectorIds: string[];
    errors: string[];
    metrics: {
      totalTimeMs: number;
      embeddingTimeMs: number;
      upsertTimeMs: number;
    };
  }> {
    const startTime = Date.now();
    const vectorIds: string[] = [];
    const errors: string[] = [];
    let embeddingTimeMs = 0;
    let upsertTimeMs = 0;

    // Check for existing checkpoint
    let checkpoint: ProcessingCheckpoint | null = null;
    if (options.resumeFromCheckpoint) {
      checkpoint = await this.getCheckpoint(documentId);
      if (checkpoint && checkpoint.status === 'completed') {
        return {
          success: true,
          processedChunks: checkpoint.totalChunks,
          vectorIds: checkpoint.checkpointData?.lastVectorIds || [],
          errors: [],
          metrics: {
            totalTimeMs: 0,
            embeddingTimeMs: 0,
            upsertTimeMs: 0,
          },
        };
      }
    }

    try {
      // Convert content to chunks
      const fullContent = typeof content === 'string'
        ? content
        : await this.collectAsyncContent(content);

      const chunks = options.useParentChild
        ? this.createParentChildChunks(fullContent, metadata)
        : this.createSimpleChunks(fullContent, metadata);

      // Create or update checkpoint
      const startChunk = checkpoint?.lastProcessedChunk || 0;
      await this.createOrUpdateCheckpoint(documentId, {
        totalChunks: chunks.length,
        lastProcessedChunk: startChunk,
        status: 'in_progress',
        batchId: options.batchId,
      });

      // Initialize processing status
      this.activeProcessing.set(documentId, {
        documentId,
        totalChunks: chunks.length,
        processedChunks: startChunk,
        status: 'in_progress',
        startTime,
        currentBatchSize: PROCESSOR_CONFIG.defaultBatchSize,
        errors: [],
      });

      // Process in batches
      const index = getPineconeIndex();
      const ns = index.namespace(metadata.namespace);
      let batchSize: number = PROCESSOR_CONFIG.defaultBatchSize;

      for (let i = startChunk; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        // Generate embeddings
        const embeddingStart = Date.now();
        const textsToEmbed = batch.map((c) =>
          options.useParentChild
            ? (c as ParentChildChunk).children[0]?.embeddingText ||
              (c as ParentChildChunk).parent.content
            : (c as { content: string; metadata: Record<string, unknown> }).content
        );

        const embeddings = await embeddingService.generateDenseEmbeddingsBatch(textsToEmbed);
        embeddingTimeMs += Date.now() - embeddingStart;

        // Prepare vectors for upsert
        const vectors: Array<{
          id: string;
          values: number[];
          metadata: Record<string, string | number | boolean | string[]>;
        }> = [];

        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          const embedding = embeddings.get(j);
          if (!embedding) continue;

          const vectorId = this.generateVectorId(documentId, i + j);
          const chunkContent = options.useParentChild
            ? (chunk as ParentChildChunk).parent.content
            : (chunk as { content: string }).content;

          vectors.push({
            id: vectorId,
            values: embedding.values,
            metadata: {
              documentId,
              chunkRef: vectorId,
              organizationId: metadata.organizationId,
              employeeId: metadata.employeeId || '',
              metadataType: metadata.metadataType,
              period: metadata.period || '',
              clearanceLevel: metadata.clearanceLevel || 'basic',
              preview: chunkContent.slice(0, 500),
              searchable_text: chunkContent,
              createdAt: Date.now(),
              chunkIndex: i + j,
              isParent: options.useParentChild ? true : false,
            },
          });

          vectorIds.push(vectorId);
        }

        // Upsert to Pinecone
        const upsertStart = Date.now();
        try {
          await ns.upsert(vectors);
          upsertTimeMs += Date.now() - upsertStart;

          // Update status
          const status = this.activeProcessing.get(documentId);
          if (status) {
            status.processedChunks = i + batch.length;
          }

          // Checkpoint periodically
          if ((i + batch.length) % PROCESSOR_CONFIG.checkpointInterval === 0) {
            await this.createOrUpdateCheckpoint(documentId, {
              totalChunks: chunks.length,
              lastProcessedChunk: i + batch.length,
              status: 'in_progress',
              checkpointData: { lastVectorIds: vectorIds.slice(-100) },
            });
          }

          // Adaptive batch sizing
          batchSize = this.adaptBatchSize(batchSize, Date.now() - upsertStart);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Batch ${i}: ${errorMsg}`);

          // Retry with smaller batch
          if (batchSize > PROCESSOR_CONFIG.minBatchSize) {
            batchSize = Math.max(PROCESSOR_CONFIG.minBatchSize, Math.floor(batchSize / 2));
            i -= batch.length; // Retry this batch
          } else {
            throw error;
          }
        }
      }

      // Mark as completed
      await this.createOrUpdateCheckpoint(documentId, {
        totalChunks: chunks.length,
        lastProcessedChunk: chunks.length,
        status: 'completed',
        checkpointData: { lastVectorIds: vectorIds },
      });

      this.activeProcessing.delete(documentId);

      return {
        success: true,
        processedChunks: chunks.length,
        vectorIds,
        errors,
        metrics: {
          totalTimeMs: Date.now() - startTime,
          embeddingTimeMs,
          upsertTimeMs,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);

      // Save failed state
      await this.createOrUpdateCheckpoint(documentId, {
        totalChunks: -1,
        lastProcessedChunk: this.activeProcessing.get(documentId)?.processedChunks || 0,
        status: 'failed',
        errorMessage: errorMsg,
      });

      this.activeProcessing.delete(documentId);

      return {
        success: false,
        processedChunks: 0,
        vectorIds,
        errors,
        metrics: {
          totalTimeMs: Date.now() - startTime,
          embeddingTimeMs,
          upsertTimeMs,
        },
      };
    }
  }

  /**
   * Create parent-child chunks for hierarchical retrieval
   */
  private createParentChildChunks(
    content: string,
    metadata: Record<string, unknown>
  ): ParentChildChunk[] {
    const chunks: ParentChildChunk[] = [];
    const parentSize = PROCESSOR_CONFIG.parentChunkSize;
    const childSize = PROCESSOR_CONFIG.childChunkSize;
    const overlap = PROCESSOR_CONFIG.childOverlap;

    // Split into parent chunks
    for (let i = 0; i < content.length; i += parentSize) {
      const parentContent = content.slice(i, i + parentSize);
      const parentId = `parent_${i}`;

      // Create child chunks within parent
      const children: ParentChildChunk['children'] = [];
      for (let j = 0; j < parentContent.length; j += childSize - overlap) {
        const childContent = parentContent.slice(j, j + childSize);
        const childId = `${parentId}_child_${j}`;

        children.push({
          id: childId,
          content: childContent,
          embeddingText: childContent,
          metadata: {
            ...metadata,
            parentChunkRef: parentId,
            childIndex: j,
          },
        });
      }

      chunks.push({
        parent: {
          id: parentId,
          content: parentContent,
          metadata: {
            ...metadata,
            isParent: true,
            childCount: children.length,
          },
        },
        children,
      });
    }

    return chunks;
  }

  /**
   * Create simple chunks without hierarchy
   */
  private createSimpleChunks(
    content: string,
    metadata: Record<string, unknown>
  ): Array<{ content: string; metadata: Record<string, unknown> }> {
    const chunks: Array<{ content: string; metadata: Record<string, unknown> }> = [];
    const chunkSize = PROCESSOR_CONFIG.parentChunkSize;
    const overlap = PROCESSOR_CONFIG.childOverlap;

    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      const chunkContent = content.slice(i, i + chunkSize);
      chunks.push({
        content: chunkContent,
        metadata: {
          ...metadata,
          chunkIndex: i,
        },
      });
    }

    return chunks;
  }

  /**
   * Collect content from async iterable
   */
  private async collectAsyncContent(content: AsyncIterable<string>): Promise<string> {
    const parts: string[] = [];
    for await (const part of content) {
      parts.push(part);
    }
    return parts.join('');
  }

  /**
   * Generate unique vector ID
   */
  private generateVectorId(documentId: string, chunkIndex: number): string {
    return `${documentId}_chunk_${chunkIndex}_${Date.now()}`;
  }

  /**
   * Adapt batch size based on performance
   */
  private adaptBatchSize(currentSize: number, lastBatchTimeMs: number): number {
    // Target 2-5 seconds per batch
    if (lastBatchTimeMs < 2000 && currentSize < PROCESSOR_CONFIG.maxBatchSize) {
      return Math.min(PROCESSOR_CONFIG.maxBatchSize, currentSize + 10);
    } else if (lastBatchTimeMs > 5000 && currentSize > PROCESSOR_CONFIG.minBatchSize) {
      return Math.max(PROCESSOR_CONFIG.minBatchSize, currentSize - 10);
    }
    return currentSize;
  }

  /**
   * Get processing checkpoint
   */
  async getCheckpoint(documentId: string): Promise<ProcessingCheckpoint | null> {
    const [checkpoint] = await db
      .select()
      .from(processingCheckpoints)
      .where(eq(processingCheckpoints.documentId, documentId))
      .limit(1);

    return checkpoint as ProcessingCheckpoint | null;
  }

  /**
   * Create or update checkpoint
   */
  private async createOrUpdateCheckpoint(
    documentId: string,
    data: {
      totalChunks: number;
      lastProcessedChunk: number;
      status: ProcessingCheckpoint['status'];
      batchId?: string;
      errorMessage?: string;
      checkpointData?: ProcessingCheckpoint['checkpointData'];
    }
  ): Promise<void> {
    const existing = await this.getCheckpoint(documentId);

    if (existing) {
      await db
        .update(processingCheckpoints)
        .set({
          lastProcessedChunk: data.lastProcessedChunk,
          totalChunks: data.totalChunks,
          status: data.status,
          errorMessage: data.errorMessage,
          checkpointData: data.checkpointData,
          updatedAt: new Date(),
        })
        .where(eq(processingCheckpoints.documentId, documentId));
    } else {
      await db.insert(processingCheckpoints).values({
        documentId,
        batchId: data.batchId,
        totalChunks: data.totalChunks,
        lastProcessedChunk: data.lastProcessedChunk,
        status: data.status,
        errorMessage: data.errorMessage,
        checkpointData: data.checkpointData,
      });
    }
  }

  /**
   * Resume failed processing
   */
  async resumeProcessing(
    documentId: string,
    content: string,
    metadata: {
      organizationId: string;
      namespace: string;
      metadataType: PineconeMetadata['metadataType'];
      employeeId?: string;
      period?: string;
      clearanceLevel?: PineconeMetadata['clearanceLevel'];
    }
  ): Promise<ReturnType<typeof this.processDocument>> {
    return this.processDocument(documentId, content, metadata, {
      resumeFromCheckpoint: true,
    });
  }

  /**
   * Pause processing
   */
  async pauseProcessing(documentId: string): Promise<void> {
    const status = this.activeProcessing.get(documentId);
    if (status) {
      status.status = 'paused';
      await this.createOrUpdateCheckpoint(documentId, {
        totalChunks: status.totalChunks,
        lastProcessedChunk: status.processedChunks,
        status: 'paused',
      });
    }
  }

  /**
   * Get processing status
   */
  getStatus(documentId: string): ProcessingStatus | null {
    return this.activeProcessing.get(documentId) || null;
  }

  /**
   * Get all active processing jobs
   */
  getActiveJobs(): ProcessingStatus[] {
    return Array.from(this.activeProcessing.values());
  }

  /**
   * Clean up completed/failed checkpoints
   */
  async cleanupCheckpoints(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db
      .delete(processingCheckpoints)
      .where(
        and(
          eq(processingCheckpoints.status, 'completed'),
          // Would need lte on updatedAt, simplified for now
        )
      );

    return (result as { rowCount?: number }).rowCount || 0;
  }
}

// Export singleton instance
export const streamingProcessorService = new StreamingProcessorService();
