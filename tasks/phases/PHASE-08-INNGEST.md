# Phase 8: Inngest Processing Jobs

**Duration**: 4 days
**Dependencies**: Phase 7 complete
**Deliverables**: Background job processing for Excel files, batch management, rollback

---

## Task 8.1: Inngest Setup

### 8.1.1 Install Dependencies

```bash
npm install inngest
```

### 8.1.2 Inngest Client Configuration

**File**: `lib/inngest/client.ts`

```typescript
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'jisa-app',
  name: 'JISA App',
});
```

### 8.1.3 Inngest API Route

**File**: `app/api/inngest/route.ts`

```typescript
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { documentProcessFunction } from '@/lib/inngest/functions/document-process';
import { documentCleanupFunction } from '@/lib/inngest/functions/document-cleanup';
import { batchProcessFunction } from '@/lib/inngest/functions/batch-process';
import { vectorSyncFunction } from '@/lib/inngest/functions/vector-sync';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    documentProcessFunction,
    documentCleanupFunction,
    batchProcessFunction,
    vectorSyncFunction,
  ],
});
```

### Tests for 8.1
- [ ] Inngest client initialization
- [ ] API route responds

---

## Task 8.2: Document Processing Function

### 8.2.1 Main Processing Function

**File**: `lib/inngest/functions/document-process.ts`

```typescript
import { inngest } from '../client';
import { db } from '@/lib/db';
import { documents, processingBatches, employeeDocuments, dataLineage } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { documentService } from '@/lib/services/document.service';
import { templateService } from '@/lib/services/template.service';
import { employeeService } from '@/lib/services/employee.service';
import { storageService } from '@/lib/services/storage.service';
import { excelParser } from '@/lib/utils/excel-parser';
import { pineconeService } from '@/lib/services/pinecone.service';

const BATCH_SIZE = 100;

export const documentProcessFunction = inngest.createFunction(
  {
    id: 'document-process',
    name: 'Process Document',
    retries: 3,
    onFailure: async ({ event, error }) => {
      // Update document status to failed
      await documentService.updateStatus(
        event.data.documentId,
        'failed',
        null,
        error.message
      );
    },
  },
  { event: 'document/process' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Step 1: Get document and template
    const document = await step.run('get-document', async () => {
      const doc = await documentService.getById(documentId);
      await documentService.updateStatus(documentId, 'processing');
      return doc;
    });

    // Step 2: Download and parse Excel
    const parsedData = await step.run('parse-excel', async () => {
      const fileBlob = await storageService.download(document.storagePath);
      const template = document.templateId
        ? await templateService.getById(document.templateId)
        : null;

      return excelParser.parse(fileBlob, template?.columnMapping);
    });

    // Step 3: Create processing batches
    const batches = await step.run('create-batches', async () => {
      const totalRows = parsedData.rows.length;
      const totalBatches = Math.ceil(totalRows / BATCH_SIZE);
      const batchRecords = [];

      for (let i = 0; i < totalBatches; i++) {
        const startRow = i * BATCH_SIZE;
        const endRow = Math.min(startRow + BATCH_SIZE, totalRows);

        const [batch] = await db
          .insert(processingBatches)
          .values({
            documentId,
            batchNumber: i + 1,
            totalBatches,
            startRow,
            endRow,
            status: 'pending',
          })
          .returning();

        batchRecords.push(batch);
      }

      return batchRecords;
    });

    // Step 4: Process batches (fan-out)
    const batchResults = await step.run('process-batches', async () => {
      const results = [];

      for (const batch of batches) {
        // Send batch processing event
        await inngest.send({
          name: 'batch/process',
          data: {
            documentId,
            batchId: batch.id,
            processingMode: document.processingMode,
            rows: parsedData.rows.slice(batch.startRow, batch.endRow),
            template: document.template,
            organizationId: document.organizationId,
          },
        });

        results.push({ batchId: batch.id, status: 'queued' });
      }

      return results;
    });

    // Step 5: Wait for all batches to complete
    await step.waitForEvent('wait-for-batches', {
      event: 'batch/all-complete',
      match: 'data.documentId',
      timeout: '30m',
    });

    // Step 6: Finalize processing
    const result = await step.run('finalize', async () => {
      // Get all batch results
      const allBatches = await db.query.processingBatches.findMany({
        where: eq(processingBatches.documentId, documentId),
      });

      const totalProcessed = allBatches.reduce((sum, b) => sum + b.processedRows, 0);
      const totalVectors = allBatches.reduce((sum, b) => sum + b.vectorsCreated, 0);
      const allErrors = allBatches.flatMap((b) => b.errors || []);

      const processingResult = {
        totalRows: parsedData.rows.length,
        processedRows: totalProcessed,
        skippedRows: parsedData.rows.length - totalProcessed,
        errorRows: allErrors.length,
        vectorsCreated: totalVectors,
        namespacesUpdated: [], // Will be filled from batch results
        processingTimeMs: Date.now() - document.processingStartedAt!.getTime(),
        errors: allErrors.slice(0, 100), // Limit stored errors
      };

      await documentService.updateStatus(documentId, 'completed', processingResult);

      return processingResult;
    });

    return { success: true, result };
  }
);
```

### Tests for 8.2
- [ ] Document processing flow
- [ ] Batch creation
- [ ] Error handling
- [ ] Status updates

---

## Task 8.3: Batch Processing Function

### 8.3.1 Batch Processor

**File**: `lib/inngest/functions/batch-process.ts`

```typescript
import { inngest } from '../client';
import { db } from '@/lib/db';
import { processingBatches, employeeDocuments, dataLineage } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { employeeService } from '@/lib/services/employee.service';
import { pineconeService } from '@/lib/services/pinecone.service';
import { createEmbedding } from '@/lib/utils/embedding';
import { generateContentHash } from '@/lib/utils/hash';

interface BatchProcessEvent {
  documentId: string;
  batchId: string;
  processingMode: 'company_wide' | 'employee_split';
  rows: Record<string, any>[];
  template: any;
  organizationId: string;
}

export const batchProcessFunction = inngest.createFunction(
  {
    id: 'batch-process',
    name: 'Process Batch',
    retries: 2,
    concurrency: {
      limit: 5, // Max 5 concurrent batches
    },
  },
  { event: 'batch/process' },
  async ({ event, step }) => {
    const { documentId, batchId, processingMode, rows, template, organizationId } = event.data;

    // Update batch status
    await step.run('start-batch', async () => {
      await db
        .update(processingBatches)
        .set({ status: 'processing', startedAt: new Date() })
        .where(eq(processingBatches.id, batchId));
    });

    let processedRows = 0;
    let vectorsCreated = 0;
    const errors: any[] = [];
    const namespaces = new Set<string>();

    // Process rows based on mode
    if (processingMode === 'company_wide') {
      // All rows go to company namespace
      const result = await step.run('process-company-wide', async () => {
        const namespace = `org_${organizationId}`;
        namespaces.add(namespace);

        const vectors = [];
        const lineageRecords = [];

        for (let i = 0; i < rows.length; i++) {
          try {
            const row = rows[i];
            const content = formatRowContent(row, template?.ragConfig?.embeddingTemplate);
            const contentHash = generateContentHash(content);

            // Check for duplicates if enabled
            if (template?.ragConfig?.skipDuplicates) {
              const exists = await pineconeService.checkDuplicate(namespace, contentHash);
              if (exists) continue;
            }

            // Create embedding
            const embedding = await createEmbedding(content);
            const vectorId = `${documentId}_${i}`;

            vectors.push({
              id: vectorId,
              values: embedding,
              metadata: {
                documentId,
                rowNumber: i,
                contentHash,
                ...extractMetadata(row, template?.ragConfig?.metadataFields),
              },
            });

            lineageRecords.push({
              documentId,
              vectorId,
              namespace,
              sourceRow: row,
              sourceRowNumber: i,
              embeddedContent: content,
              embeddingMetadata: {
                embeddingModel: 'text-embedding-3-small',
                embeddingDimension: 3072,
                processingTimestamp: new Date().toISOString(),
                contentHash,
              },
            });

            processedRows++;
          } catch (error: any) {
            errors.push({
              row: i,
              message: error.message,
              severity: 'error',
            });
          }
        }

        // Upsert vectors in batches
        if (vectors.length > 0) {
          await pineconeService.upsertVectors(namespace, vectors);
          vectorsCreated = vectors.length;

          // Save lineage records
          await db.insert(dataLineage).values(lineageRecords);
        }

        return { processedRows, vectorsCreated };
      });
    } else {
      // Employee split mode
      await step.run('process-employee-split', async () => {
        const employeeIdentifierColumn = template?.columnMapping?.employeeIdentifierColumn || 'employee_id';

        // Group rows by employee
        const rowsByEmployee = new Map<string, any[]>();

        for (const row of rows) {
          const employeeId = row[employeeIdentifierColumn];
          if (!employeeId) {
            errors.push({
              row: rows.indexOf(row),
              field: employeeIdentifierColumn,
              message: '직원 식별자가 없습니다.',
              severity: 'warning',
            });
            continue;
          }

          if (!rowsByEmployee.has(employeeId)) {
            rowsByEmployee.set(employeeId, []);
          }
          rowsByEmployee.get(employeeId)!.push(row);
        }

        // Process each employee's data
        for (const [employeeIdentifier, employeeRows] of rowsByEmployee) {
          try {
            // Find employee by identifier
            const employee = await employeeService.getByEmployeeNumber(
              organizationId,
              employeeIdentifier
            );

            if (!employee) {
              errors.push({
                row: rows.indexOf(employeeRows[0]),
                message: `직원을 찾을 수 없습니다: ${employeeIdentifier}`,
                severity: 'error',
              });
              continue;
            }

            const namespace = employee.pineconeNamespace;
            namespaces.add(namespace);

            const vectors = [];
            const lineageRecords = [];

            for (const row of employeeRows) {
              const rowIndex = rows.indexOf(row);
              const content = formatRowContent(row, template?.ragConfig?.embeddingTemplate);
              const contentHash = generateContentHash(content);

              const embedding = await createEmbedding(content);
              const vectorId = `${documentId}_${employee.id}_${rowIndex}`;

              vectors.push({
                id: vectorId,
                values: embedding,
                metadata: {
                  documentId,
                  employeeId: employee.id,
                  rowNumber: rowIndex,
                  contentHash,
                  ...extractMetadata(row, template?.ragConfig?.metadataFields),
                },
              });

              lineageRecords.push({
                documentId,
                employeeId: employee.id,
                vectorId,
                namespace,
                sourceRow: row,
                sourceRowNumber: rowIndex,
                embeddedContent: content,
                embeddingMetadata: {
                  embeddingModel: 'text-embedding-3-small',
                  embeddingDimension: 3072,
                  processingTimestamp: new Date().toISOString(),
                  contentHash,
                },
              });

              processedRows++;
            }

            // Upsert to employee namespace
            if (vectors.length > 0) {
              await pineconeService.upsertVectors(namespace, vectors);
              vectorsCreated += vectors.length;

              // Save lineage records
              await db.insert(dataLineage).values(lineageRecords);

              // Update employee-document junction
              await db.insert(employeeDocuments).values({
                employeeId: employee.id,
                documentId,
                vectorIds: vectors.map((v) => v.id),
                vectorCount: vectors.length,
              });
            }
          } catch (error: any) {
            errors.push({
              message: `직원 ${employeeIdentifier} 처리 실패: ${error.message}`,
              severity: 'error',
            });
          }
        }
      });
    }

    // Update batch status
    await step.run('complete-batch', async () => {
      await db
        .update(processingBatches)
        .set({
          status: errors.length > 0 ? 'completed' : 'completed',
          processedRows,
          vectorsCreated,
          errors: errors.length > 0 ? errors : null,
          completedAt: new Date(),
        })
        .where(eq(processingBatches.id, batchId));

      // Check if all batches are complete
      const allBatches = await db.query.processingBatches.findMany({
        where: eq(processingBatches.documentId, documentId),
      });

      const allComplete = allBatches.every(
        (b) => b.status === 'completed' || b.status === 'failed'
      );

      if (allComplete) {
        await inngest.send({
          name: 'batch/all-complete',
          data: { documentId },
        });
      }
    });

    return {
      batchId,
      processedRows,
      vectorsCreated,
      errors: errors.length,
      namespaces: Array.from(namespaces),
    };
  }
);

function formatRowContent(row: Record<string, any>, template?: string): string {
  if (template) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(row[key] || ''));
  }

  return Object.entries(row)
    .filter(([_, value]) => value != null && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function extractMetadata(row: Record<string, any>, fields?: string[]): Record<string, any> {
  if (!fields || fields.length === 0) {
    return {};
  }

  const metadata: Record<string, any> = {};
  for (const field of fields) {
    if (field in row) {
      metadata[field] = row[field];
    }
  }
  return metadata;
}
```

### Tests for 8.3
- [ ] Company-wide processing
- [ ] Employee split processing
- [ ] Duplicate detection
- [ ] Error collection
- [ ] Batch completion signal

---

## Task 8.4: Cleanup & Rollback Functions

### 8.4.1 Document Cleanup Function

**File**: `lib/inngest/functions/document-cleanup.ts`

```typescript
import { inngest } from '../client';
import { db } from '@/lib/db';
import { documents, dataLineage, employeeDocuments, processingBatches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { pineconeService } from '@/lib/services/pinecone.service';

export const documentCleanupFunction = inngest.createFunction(
  {
    id: 'document-cleanup',
    name: 'Cleanup Document Vectors',
    retries: 2,
  },
  { event: 'document/cleanup' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Step 1: Get all lineage records for this document
    const lineageRecords = await step.run('get-lineage', async () => {
      return db.query.dataLineage.findMany({
        where: eq(dataLineage.documentId, documentId),
      });
    });

    // Step 2: Group vectors by namespace
    const vectorsByNamespace = await step.run('group-vectors', async () => {
      const grouped = new Map<string, string[]>();

      for (const record of lineageRecords) {
        if (!grouped.has(record.namespace)) {
          grouped.set(record.namespace, []);
        }
        grouped.get(record.namespace)!.push(record.vectorId);
      }

      return Object.fromEntries(grouped);
    });

    // Step 3: Delete vectors from each namespace
    await step.run('delete-vectors', async () => {
      for (const [namespace, vectorIds] of Object.entries(vectorsByNamespace)) {
        if (vectorIds.length > 0) {
          await pineconeService.deleteVectors(namespace, vectorIds);
        }
      }
    });

    // Step 4: Clean up database records
    await step.run('cleanup-database', async () => {
      // Delete lineage records
      await db
        .delete(dataLineage)
        .where(eq(dataLineage.documentId, documentId));

      // Delete employee document junctions
      await db
        .delete(employeeDocuments)
        .where(eq(employeeDocuments.documentId, documentId));

      // Delete processing batches
      await db
        .delete(processingBatches)
        .where(eq(processingBatches.documentId, documentId));
    });

    return {
      success: true,
      vectorsDeleted: lineageRecords.length,
      namespacesAffected: Object.keys(vectorsByNamespace).length,
    };
  }
);
```

### 8.4.2 Rollback Function

**File**: `lib/inngest/functions/document-rollback.ts`

```typescript
import { inngest } from '../client';
import { db } from '@/lib/db';
import { documents, dataLineage } from '@/lib/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { pineconeService } from '@/lib/services/pinecone.service';
import { documentService } from '@/lib/services/document.service';

export const documentRollbackFunction = inngest.createFunction(
  {
    id: 'document-rollback',
    name: 'Rollback to Previous Version',
    retries: 1,
  },
  { event: 'document/rollback' },
  async ({ event, step }) => {
    const { documentId, targetVersion } = event.data;

    // Step 1: Get current document and target version
    const { current, target } = await step.run('get-versions', async () => {
      const currentDoc = await documentService.getById(documentId);

      // Find the target version
      const targetDoc = await db.query.documents.findFirst({
        where: and(
          eq(documents.parentDocumentId, currentDoc.parentDocumentId || currentDoc.id),
          eq(documents.version, targetVersion)
        ),
      });

      if (!targetDoc) {
        throw new Error(`버전 ${targetVersion}을 찾을 수 없습니다.`);
      }

      return { current: currentDoc, target: targetDoc };
    });

    // Step 2: Delete vectors from versions newer than target
    await step.run('delete-newer-vectors', async () => {
      const newerLineage = await db.query.dataLineage.findMany({
        where: and(
          eq(dataLineage.documentId, documentId),
        ),
      });

      // Group by namespace
      const byNamespace = new Map<string, string[]>();
      for (const record of newerLineage) {
        if (!byNamespace.has(record.namespace)) {
          byNamespace.set(record.namespace, []);
        }
        byNamespace.get(record.namespace)!.push(record.vectorId);
      }

      // Delete from each namespace
      for (const [namespace, vectorIds] of byNamespace) {
        await pineconeService.deleteVectors(namespace, vectorIds);
      }
    });

    // Step 3: Update document statuses
    await step.run('update-statuses', async () => {
      // Mark current as rolled back
      await db
        .update(documents)
        .set({
          processingStatus: 'rolled_back',
          isLatest: false,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));

      // Mark target as latest
      await db
        .update(documents)
        .set({
          isLatest: true,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, target.id));
    });

    return {
      success: true,
      rolledBackFrom: current.version,
      rolledBackTo: target.version,
    };
  }
);
```

### Tests for 8.4
- [ ] Cleanup function
- [ ] Vector deletion
- [ ] Rollback to version
- [ ] Status updates

---

## Task 8.5: Processing Status UI

### 8.5.1 Document Status Component

**File**: `components/documents/processing-status.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  Clock,
  Spinner,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';

interface ProcessingStatusProps {
  documentId: string;
  initialStatus: string;
  onComplete?: () => void;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: '대기 중',
    color: 'bg-yellow-500',
    variant: 'outline' as const,
  },
  processing: {
    icon: Spinner,
    label: '처리 중',
    color: 'bg-blue-500',
    variant: 'default' as const,
  },
  completed: {
    icon: CheckCircle,
    label: '완료',
    color: 'bg-green-500',
    variant: 'default' as const,
  },
  failed: {
    icon: XCircle,
    label: '실패',
    color: 'bg-red-500',
    variant: 'destructive' as const,
  },
  rolled_back: {
    icon: ArrowCounterClockwise,
    label: '롤백됨',
    color: 'bg-gray-500',
    variant: 'secondary' as const,
  },
};

export function ProcessingStatus({
  documentId,
  initialStatus,
  onComplete,
}: ProcessingStatusProps) {
  const [status, setStatus] = useState(initialStatus);
  const [batches, setBatches] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Poll for status updates
    if (status === 'pending' || status === 'processing') {
      const interval = setInterval(async () => {
        const res = await fetch(`/api/documents/${documentId}/status`);
        const data = await res.json();

        setStatus(data.status);
        setBatches(data.batches || []);
        setResult(data.result);

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          onComplete?.();
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [documentId, status, onComplete]);

  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  const Icon = config?.icon || Clock;
  const totalBatches = batches.length;
  const completedBatches = batches.filter(
    (b) => b.status === 'completed' || b.status === 'failed'
  ).length;
  const progress = totalBatches > 0 ? (completedBatches / totalBatches) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon
              className={`h-5 w-5 ${status === 'processing' ? 'animate-spin' : ''}`}
              weight={status === 'completed' ? 'fill' : 'regular'}
            />
            처리 상태
          </CardTitle>
          <Badge variant={config?.variant || 'outline'}>{config?.label || status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'processing' && (
          <>
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">
              {completedBatches} / {totalBatches} 배치 완료
            </p>
          </>
        )}

        {result && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">처리된 행</span>
              <span className="font-medium">{result.processedRows}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">생성된 벡터</span>
              <span className="font-medium">{result.vectorsCreated}</span>
            </div>
            {result.errorRows > 0 && (
              <div className="flex justify-between text-destructive">
                <span>오류 행</span>
                <span className="font-medium">{result.errorRows}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">처리 시간</span>
              <span className="font-medium">
                {(result.processingTimeMs / 1000).toFixed(1)}초
              </span>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <Button className="w-full" variant="outline">
            재처리
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

### Tests for 8.5
- [ ] Status polling
- [ ] Progress display
- [ ] Result summary
- [ ] Retry action

---

## Phase Completion Checklist

- [ ] Inngest configured
- [ ] Document process function
- [ ] Batch process function
- [ ] Employee split mode working
- [ ] Company-wide mode working
- [ ] Cleanup function
- [ ] Rollback function
- [ ] Status UI component
- [ ] Real-time progress
- [ ] Error handling
- [ ] All tests passing

---

## Next Phase

→ [Phase 9: Pinecone Integration](./PHASE-09-PINECONE.md)
