# Phase 11: Data Lineage & Conflict Resolution

**Duration**: 3 days
**Dependencies**: Phase 10 complete
**Deliverables**: Complete data lineage tracking, conflict detection, resolution UI

---

## Task 11.1: Lineage Service

### 11.1.1 Lineage Service

**File**: `lib/services/lineage.service.ts`

```typescript
import { db } from '@/lib/db';
import { dataLineage, documents, employees } from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

export interface LineageRecord {
  id: string;
  vectorId: string;
  namespace: string;
  documentId: string;
  employeeId?: string;
  sourceRow: Record<string, any>;
  sourceRowNumber: number;
  embeddedContent: string;
  embeddingMetadata: {
    embeddingModel: string;
    embeddingDimension: number;
    processingTimestamp: string;
    contentHash: string;
  };
  createdAt: Date;
  document?: any;
  employee?: any;
}

export interface LineageFilters {
  documentId?: string;
  employeeId?: string;
  namespace?: string;
  vectorIds?: string[];
}

export class LineageService {
  /**
   * Get lineage records with filters
   */
  async getLineage(filters: LineageFilters, page = 1, limit = 20) {
    const conditions = [];

    if (filters.documentId) {
      conditions.push(eq(dataLineage.documentId, filters.documentId));
    }

    if (filters.employeeId) {
      conditions.push(eq(dataLineage.employeeId, filters.employeeId));
    }

    if (filters.namespace) {
      conditions.push(eq(dataLineage.namespace, filters.namespace));
    }

    if (filters.vectorIds && filters.vectorIds.length > 0) {
      conditions.push(inArray(dataLineage.vectorId, filters.vectorIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.dataLineage.findMany({
      where: whereClause,
      with: {
        document: {
          columns: {
            id: true,
            originalFileName: true,
            version: true,
          },
        },
        employee: {
          columns: {
            id: true,
            name: true,
            employeeNumber: true,
          },
        },
      },
      orderBy: [desc(dataLineage.createdAt)],
      limit,
      offset: (page - 1) * limit,
    });

    return results;
  }

  /**
   * Get single lineage record by vector ID
   */
  async getByVectorId(vectorId: string) {
    return db.query.dataLineage.findFirst({
      where: eq(dataLineage.vectorId, vectorId),
      with: {
        document: true,
        employee: true,
      },
    });
  }

  /**
   * Get lineage for a document
   */
  async getDocumentLineage(documentId: string) {
    return db.query.dataLineage.findMany({
      where: eq(dataLineage.documentId, documentId),
      with: {
        employee: true,
      },
      orderBy: [desc(dataLineage.sourceRowNumber)],
    });
  }

  /**
   * Get lineage statistics for an organization
   */
  async getStatistics(organizationId: string) {
    // Get all documents for organization
    const orgDocuments = await db.query.documents.findMany({
      where: eq(documents.organizationId, organizationId),
      columns: { id: true },
    });

    const documentIds = orgDocuments.map((d) => d.id);

    if (documentIds.length === 0) {
      return {
        totalVectors: 0,
        byNamespace: {},
        byDocument: {},
      };
    }

    const allLineage = await db.query.dataLineage.findMany({
      where: inArray(dataLineage.documentId, documentIds),
    });

    // Group by namespace
    const byNamespace: Record<string, number> = {};
    const byDocument: Record<string, number> = {};

    for (const record of allLineage) {
      byNamespace[record.namespace] = (byNamespace[record.namespace] || 0) + 1;
      byDocument[record.documentId] = (byDocument[record.documentId] || 0) + 1;
    }

    return {
      totalVectors: allLineage.length,
      byNamespace,
      byDocument,
    };
  }

  /**
   * Trace lineage from vector to source
   */
  async traceToSource(vectorId: string) {
    const lineage = await this.getByVectorId(vectorId);

    if (!lineage) {
      return null;
    }

    // Get full document history
    const document = await db.query.documents.findFirst({
      where: eq(documents.id, lineage.documentId),
      with: {
        parentDocument: true,
        category: true,
        template: true,
      },
    });

    return {
      vector: {
        id: lineage.vectorId,
        namespace: lineage.namespace,
        createdAt: lineage.createdAt,
      },
      source: {
        row: lineage.sourceRow,
        rowNumber: lineage.sourceRowNumber,
        content: lineage.embeddedContent,
      },
      embedding: lineage.embeddingMetadata,
      document: document
        ? {
            id: document.id,
            fileName: document.originalFileName,
            version: document.version,
            category: document.category?.name,
            template: document.template?.name,
            uploadedAt: document.createdAt,
          }
        : null,
      employee: lineage.employee
        ? {
            id: lineage.employee.id,
            name: lineage.employee.name,
            employeeNumber: lineage.employee.employeeNumber,
          }
        : null,
    };
  }
}

export const lineageService = new LineageService();
```

### Tests for 11.1
- [ ] Get lineage with filters
- [ ] Get by vector ID
- [ ] Document lineage
- [ ] Trace to source

---

## Task 11.2: Conflict Detection Service

### 11.2.1 Conflict Service

**File**: `lib/services/conflict.service.ts`

```typescript
import { db } from '@/lib/db';
import { conflicts, documents, dataLineage } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { pineconeService } from './pinecone.service';
import { AppError, ERROR_CODES } from '@/lib/errors';

export interface ConflictDetails {
  similarityScore?: number;
  conflictingFields?: {
    field: string;
    existingValue: any;
    newValue: any;
  }[];
  affectedRows?: number[];
  affectedVectorIds?: string[];
  suggestedResolution?: 'keep_existing' | 'keep_new' | 'merge';
}

export interface CreateConflictInput {
  newDocumentId: string;
  existingDocumentId?: string;
  conflictType: 'duplicate_content' | 'version_mismatch' | 'category_mismatch' | 'metadata_conflict';
  conflictDetails: ConflictDetails;
}

export class ConflictService {
  /**
   * Detect potential conflicts for a new document
   */
  async detectConflicts(
    documentId: string,
    namespace: string,
    contentHashes: string[]
  ): Promise<CreateConflictInput[]> {
    const detectedConflicts: CreateConflictInput[] = [];

    // Check for duplicate content via content hashes
    for (const hash of contentHashes) {
      const existingLineage = await db.query.dataLineage.findFirst({
        where: and(
          eq(dataLineage.namespace, namespace),
          eq(dataLineage.contentHash, hash)
        ),
        with: {
          document: true,
        },
      });

      if (existingLineage && existingLineage.documentId !== documentId) {
        detectedConflicts.push({
          newDocumentId: documentId,
          existingDocumentId: existingLineage.documentId,
          conflictType: 'duplicate_content',
          conflictDetails: {
            similarityScore: 1.0, // Exact match
            suggestedResolution: 'keep_existing',
          },
        });
      }
    }

    return detectedConflicts;
  }

  /**
   * Create a conflict record
   */
  async createConflict(input: CreateConflictInput) {
    const [conflict] = await db
      .insert(conflicts)
      .values({
        newDocumentId: input.newDocumentId,
        existingDocumentId: input.existingDocumentId,
        conflictType: input.conflictType,
        conflictDetails: input.conflictDetails,
        status: 'detected',
      })
      .returning();

    return conflict;
  }

  /**
   * Get conflicts for organization
   */
  async getConflicts(
    organizationId: string,
    status?: string,
    page = 1,
    limit = 10
  ) {
    // Get document IDs for organization
    const orgDocs = await db.query.documents.findMany({
      where: eq(documents.organizationId, organizationId),
      columns: { id: true },
    });

    const docIds = orgDocs.map((d) => d.id);

    const conditions = [eq(conflicts.newDocumentId, docIds[0])]; // Simplified for now

    if (status) {
      conditions.push(eq(conflicts.status, status as any));
    }

    return db.query.conflicts.findMany({
      where: and(...conditions),
      with: {
        newDocument: true,
        existingDocument: true,
      },
      orderBy: [desc(conflicts.createdAt)],
      limit,
      offset: (page - 1) * limit,
    });
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: 'keep_existing' | 'keep_new' | 'merge',
    resolvedBy: string,
    notes?: string
  ) {
    const conflict = await db.query.conflicts.findFirst({
      where: eq(conflicts.id, conflictId),
    });

    if (!conflict) {
      throw new AppError(ERROR_CODES.NOT_FOUND, '충돌을 찾을 수 없습니다.');
    }

    const statusMap = {
      keep_existing: 'resolved_keep_existing',
      keep_new: 'resolved_keep_new',
      merge: 'resolved_merged',
    };

    const [updated] = await db
      .update(conflicts)
      .set({
        status: statusMap[resolution] as any,
        resolvedBy,
        resolvedAt: new Date(),
        resolutionNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(conflicts.id, conflictId))
      .returning();

    // Execute resolution action
    if (resolution === 'keep_existing') {
      // Mark new document as rolled back
      await db
        .update(documents)
        .set({ processingStatus: 'rolled_back' })
        .where(eq(documents.id, conflict.newDocumentId));
    } else if (resolution === 'keep_new' && conflict.existingDocumentId) {
      // Mark existing document as superseded
      await db
        .update(documents)
        .set({ isLatest: false })
        .where(eq(documents.id, conflict.existingDocumentId));
    }

    return updated;
  }
}

export const conflictService = new ConflictService();
```

### Tests for 11.2
- [ ] Conflict detection
- [ ] Create conflict
- [ ] Get conflicts
- [ ] Resolve conflict

---

## Task 11.3: Lineage UI

### 11.3.1 Lineage Page

**File**: `app/(admin)/lineage/page.tsx`

```typescript
import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { LineageExplorer } from './_components/lineage-explorer';
import { LineageStats } from './_components/lineage-stats';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  searchParams: Promise<{
    vectorId?: string;
    documentId?: string;
    employeeId?: string;
  }>;
}

export default async function LineagePage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div>
      <PageHeader
        title="데이터 계보"
        description="벡터 데이터의 원본 출처를 추적하고 탐색합니다."
      />

      <div className="space-y-6">
        <Suspense fallback={<Skeleton className="h-24 w-full" />}>
          <LineageStats />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <LineageExplorer initialFilters={params} />
        </Suspense>
      </div>
    </div>
  );
}
```

### 11.3.2 Lineage Explorer Component

**File**: `app/(admin)/lineage/_components/lineage-explorer.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MagnifyingGlass, ArrowRight, FileText, User } from '@phosphor-icons/react';
import { formatDate } from '@/lib/utils';

interface LineageRecord {
  id: string;
  vectorId: string;
  namespace: string;
  sourceRowNumber: number;
  embeddedContent: string;
  createdAt: string;
  document: {
    id: string;
    originalFileName: string;
    version: number;
  };
  employee?: {
    id: string;
    name: string;
    employeeNumber: string;
  };
}

interface LineageExplorerProps {
  initialFilters: {
    vectorId?: string;
    documentId?: string;
    employeeId?: string;
  };
}

export function LineageExplorer({ initialFilters }: LineageExplorerProps) {
  const [records, setRecords] = useState<LineageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialFilters.vectorId || '');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchLineage();
  }, [initialFilters, user]);

  const fetchLineage = async () => {
    if (!user?.organizationId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (initialFilters.documentId) {
        params.set('documentId', initialFilters.documentId);
      }
      if (initialFilters.employeeId) {
        params.set('employeeId', initialFilters.employeeId);
      }
      if (initialFilters.vectorId) {
        params.set('vectorIds', initialFilters.vectorId);
      }

      const res = await fetch(`/api/lineage?${params}`);
      const data = await res.json();
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      fetchLineage();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/lineage/trace?vectorId=${search}`);
      const data = await res.json();
      setSelectedRecord(data);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (vectorId: string) => {
    const res = await fetch(`/api/lineage/trace?vectorId=${vectorId}`);
    const data = await res.json();
    setSelectedRecord(data);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>계보 탐색</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="벡터 ID로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Button onClick={handleSearch}>
                <MagnifyingGlass className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>벡터 ID</TableHead>
                <TableHead>네임스페이스</TableHead>
                <TableHead>문서</TableHead>
                <TableHead>직원</TableHead>
                <TableHead>행 번호</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    계보 레코드가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-xs">
                      {record.vectorId.slice(0, 20)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.namespace}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {record.document.originalFileName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.employee ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {record.employee.name}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{record.sourceRowNumber}</TableCell>
                    <TableCell>{formatDate(record.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRowClick(record.vectorId)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Trace Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>데이터 계보 상세</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              {/* Vector Info */}
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">벡터 정보</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">ID</div>
                  <div className="font-mono">{selectedRecord.vector?.id}</div>
                  <div className="text-muted-foreground">네임스페이스</div>
                  <div>{selectedRecord.vector?.namespace}</div>
                  <div className="text-muted-foreground">생성일</div>
                  <div>{formatDate(selectedRecord.vector?.createdAt)}</div>
                </div>
              </div>

              {/* Source Info */}
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">원본 데이터</h4>
                <div className="text-sm">
                  <div className="mb-2">
                    <span className="text-muted-foreground">행 번호: </span>
                    {selectedRecord.source?.rowNumber}
                  </div>
                  <div className="bg-muted rounded p-3 text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedRecord.source?.row, null, 2)}
                  </div>
                </div>
              </div>

              {/* Document Info */}
              {selectedRecord.document && (
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-2">문서 정보</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">파일명</div>
                    <div>{selectedRecord.document.fileName}</div>
                    <div className="text-muted-foreground">버전</div>
                    <div>v{selectedRecord.document.version}</div>
                    <div className="text-muted-foreground">카테고리</div>
                    <div>{selectedRecord.document.category || '-'}</div>
                  </div>
                </div>
              )}

              {/* Employee Info */}
              {selectedRecord.employee && (
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-2">직원 정보</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">이름</div>
                    <div>{selectedRecord.employee.name}</div>
                    <div className="text-muted-foreground">사번</div>
                    <div>{selectedRecord.employee.employeeNumber}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Tests for 11.3
- [ ] Lineage page rendering
- [ ] Search functionality
- [ ] Detail dialog
- [ ] Trace visualization

---

## Task 11.4: Conflict Resolution UI

### 11.4.1 Conflicts Page

**File**: `app/(admin)/conflicts/page.tsx`

```typescript
import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { ConflictList } from './_components/conflict-list';
import { Skeleton } from '@/components/ui/skeleton';

export default function ConflictsPage() {
  return (
    <div>
      <PageHeader
        title="충돌 관리"
        description="문서 처리 중 감지된 충돌을 확인하고 해결합니다."
      />

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ConflictList />
      </Suspense>
    </div>
  );
}
```

### Tests for 11.4
- [ ] Conflict list page
- [ ] Resolution actions
- [ ] Status updates

---

## Phase Completion Checklist

- [ ] Lineage service
- [ ] Conflict service
- [ ] Lineage API routes
- [ ] Conflict API routes
- [ ] Lineage explorer UI
- [ ] Trace visualization
- [ ] Conflict list UI
- [ ] Resolution actions
- [ ] All tests passing

---

## Next Phase

→ [Phase 12: Analytics & Dashboard](./PHASE-12-ANALYTICS.md)
