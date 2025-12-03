import { inngest } from '../client';
import { db } from '@/lib/db';
import { documents, processingBatches, knowledgeChunks, dataLineage, templateVersions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { pineconeService } from '@/lib/services/pinecone.service';

/**
 * Document rollback function
 * Rolls back a document to a previous processing state/version
 */
export const documentRollback = inngest.createFunction(
  {
    id: 'document-rollback',
    retries: 2,
  },
  { event: 'document/rollback' },
  async ({ event, step }) => {
    const { documentId, targetVersion } = event.data;

    // Step 1: Get document and validate
    const document = await step.run('fetch-document', async () => {
      const doc = await db.query.documents.findFirst({
        where: eq(documents.id, documentId),
        with: {
          template: true,
        },
      });

      if (!doc) {
        throw new Error(`문서를 찾을 수 없습니다: ${documentId}`);
      }

      return doc;
    });

    // Step 2: Get template version if rollback is template-based
    const templateSnapshot = await step.run('get-template-version', async () => {
      if (!document.templateId || targetVersion <= 0) {
        return null;
      }

      const version = await db.query.templateVersions.findFirst({
        where: and(
          eq(templateVersions.templateId, document.templateId),
          eq(templateVersions.version, targetVersion)
        ),
      });

      return version;
    });

    // Step 3: Get current knowledge chunks
    const currentChunks = await step.run('get-current-chunks', async () => {
      return db.query.knowledgeChunks.findMany({
        where: eq(knowledgeChunks.documentId, documentId),
        columns: {
          id: true,
          pineconeId: true,
          pineconeNamespace: true,
          createdAt: true,
        },
      });
    });

    // Step 4: Delete vectors created after the target version
    if (currentChunks.length > 0) {
      await step.run('delete-new-vectors', async () => {
        // Group chunks by namespace for deletion
        const byNamespace = currentChunks.reduce((acc, chunk) => {
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

        return { deletedVectors: currentChunks.length };
      });
    }

    // Step 5: Delete knowledge chunks from database
    await step.run('delete-chunks', async () => {
      await db
        .delete(knowledgeChunks)
        .where(eq(knowledgeChunks.documentId, documentId));

      return { deleted: true };
    });

    // Step 6: Delete processing batches
    await step.run('delete-batches', async () => {
      await db
        .delete(processingBatches)
        .where(eq(processingBatches.documentId, documentId));

      return { deleted: true };
    });

    // Step 7: Delete data lineage records
    await step.run('delete-lineage', async () => {
      await db
        .delete(dataLineage)
        .where(eq(dataLineage.sourceDocumentId, documentId));

      return { deleted: true };
    });

    // Step 8: Update document status
    await step.run('update-document', async () => {
      await db
        .update(documents)
        .set({
          status: 'pending',
          processedAt: null,
          errorMessage: null,
          metadata: {
            ...((document.metadata as Record<string, unknown>) || {}),
            rolledBackAt: new Date().toISOString(),
            rolledBackToVersion: targetVersion,
            previousChunkCount: currentChunks.length,
          },
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
    });

    // Step 9: Optionally trigger reprocessing
    if (targetVersion > 0 && templateSnapshot) {
      await step.run('trigger-reprocessing', async () => {
        // Send event to reprocess the document
        await inngest.send({
          name: 'document/process',
          data: { documentId },
        });

        return { reprocessingTriggered: true };
      });
    }

    return {
      documentId,
      status: 'rolled_back',
      targetVersion,
      chunksRemoved: currentChunks.length,
    };
  }
);

/**
 * Vector sync function
 * Syncs vectors between Pinecone and the database
 */
export const vectorSync = inngest.createFunction(
  {
    id: 'vector-sync',
    retries: 2,
  },
  { event: 'vector/sync' },
  async ({ event, step }) => {
    const { documentId, namespace, operation } = event.data;

    if (operation === 'delete') {
      // Step 1: Get chunks to delete
      const chunks = await step.run('get-chunks-to-delete', async () => {
        return db.query.knowledgeChunks.findMany({
          where: eq(knowledgeChunks.documentId, documentId),
          columns: {
            id: true,
            pineconeId: true,
            pineconeNamespace: true,
          },
        });
      });

      // Step 2: Delete from Pinecone
      if (chunks.length > 0) {
        await step.run('delete-from-pinecone', async () => {
          const ids = chunks
            .filter((c) => c.pineconeNamespace === namespace && c.pineconeId)
            .map((c) => c.pineconeId!);

          if (ids.length > 0) {
            await pineconeService.deleteByIds(namespace, ids);
          }

          return { deleted: ids.length };
        });
      }

      // Step 3: Update chunks in database (mark as deleted or remove)
      await step.run('update-database', async () => {
        await db
          .delete(knowledgeChunks)
          .where(
            and(
              eq(knowledgeChunks.documentId, documentId),
              eq(knowledgeChunks.pineconeNamespace, namespace)
            )
          );

        return { removed: true };
      });

      return {
        documentId,
        namespace,
        operation: 'delete',
        chunksAffected: chunks.length,
      };
    }

    // For 'upsert' operation - verify vectors exist in both places
    if (operation === 'upsert') {
      // Step 1: Get chunks from database
      const chunks = await step.run('get-db-chunks', async () => {
        return db.query.knowledgeChunks.findMany({
          where: and(
            eq(knowledgeChunks.documentId, documentId),
            eq(knowledgeChunks.pineconeNamespace, namespace)
          ),
          columns: {
            id: true,
            pineconeId: true,
          },
        });
      });

      // Step 2: Verify vectors exist in Pinecone
      const verificationResult = await step.run('verify-pinecone', async () => {
        const ids = chunks.filter((c) => c.pineconeId).map((c) => c.pineconeId!);

        if (ids.length === 0) {
          return { verified: 0, missing: 0 };
        }

        const existing = await pineconeService.fetchByIds(namespace, ids);
        const missingIds = ids.filter((id) => !existing.has(id));

        return {
          verified: existing.size,
          missing: missingIds.length,
          missingIds,
        };
      });

      return {
        documentId,
        namespace,
        operation: 'upsert',
        totalChunks: chunks.length,
        verifiedInPinecone: verificationResult.verified,
        missingInPinecone: verificationResult.missing,
      };
    }

    return {
      documentId,
      namespace,
      operation,
      status: 'unknown_operation',
    };
  }
);
