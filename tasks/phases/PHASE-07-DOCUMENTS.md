# Phase 7: Document Upload & Processing

**Duration**: 4-5 days
**Dependencies**: Phase 6 complete
**Deliverables**: Complete document upload, Excel processing, batch management

---

## Task 7.1: Supabase Storage Setup

### 7.1.1 Storage Bucket Configuration

Create bucket via Supabase dashboard or migration:

```sql
-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/pdf',
    'text/csv'
  ]::text[]
);

-- RLS policies for documents bucket
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Organization members can view"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');
```

### 7.1.2 Storage Service

**File**: `lib/services/storage.service.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  path: string;
  url: string;
  size: number;
}

export class StorageService {
  private bucket = 'documents';

  /**
   * Upload a file to storage
   */
  async upload(
    file: File,
    organizationId: string,
    folder?: string
  ): Promise<UploadResult> {
    const supabase = await createClient();

    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const path = folder
      ? `${organizationId}/${folder}/${fileName}`
      : `${organizationId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(this.bucket)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      url: urlData.publicUrl,
      size: file.size,
    };
  }

  /**
   * Download a file from storage
   */
  async download(path: string): Promise<Blob> {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .download(path);

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a file from storage
   */
  async delete(path: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase.storage
      .from(this.bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get signed URL for private file access
   */
  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }
}

export const storageService = new StorageService();
```

### Tests for 7.1
- [ ] File upload
- [ ] File download
- [ ] Signed URL generation
- [ ] Delete file

---

## Task 7.2: Document Service Layer

### 7.2.1 Document Service

**File**: `lib/services/document.service.ts`

```typescript
import { db } from '@/lib/db';
import { documents, employeeDocuments, processingBatches } from '@/lib/db/schema';
import { eq, and, desc, count, like, or } from 'drizzle-orm';
import { storageService } from './storage.service';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { inngest } from '@/lib/inngest/client';

export interface CreateDocumentInput {
  organizationId: string;
  categoryId?: string;
  templateId?: string;
  file: File;
  documentType: 'general' | 'employee_specific';
  processingMode: 'company_wide' | 'employee_split';
  metadata?: Record<string, any>;
  uploadedBy: string;
}

export interface DocumentFilters {
  organizationId: string;
  search?: string;
  categoryId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class DocumentService {
  /**
   * Create and upload a new document
   */
  async create(input: CreateDocumentInput) {
    // Upload file to storage
    const uploadResult = await storageService.upload(
      input.file,
      input.organizationId,
      'uploads'
    );

    // Create document record
    const [document] = await db
      .insert(documents)
      .values({
        organizationId: input.organizationId,
        categoryId: input.categoryId,
        templateId: input.templateId,
        fileName: uploadResult.path.split('/').pop()!,
        originalFileName: input.file.name,
        mimeType: input.file.type,
        fileSize: input.file.size,
        storagePath: uploadResult.path,
        storageUrl: uploadResult.url,
        documentType: input.documentType,
        processingMode: input.processingMode,
        processingStatus: 'pending',
        metadata: input.metadata,
        uploadedBy: input.uploadedBy,
      })
      .returning();

    // Trigger processing job via Inngest
    await inngest.send({
      name: 'document/process',
      data: {
        documentId: document.id,
      },
    });

    return document;
  }

  /**
   * Get document by ID
   */
  async getById(id: string) {
    const document = await db.query.documents.findFirst({
      where: eq(documents.id, id),
      with: {
        category: true,
        template: true,
        employeeDocuments: {
          with: {
            employee: true,
          },
        },
        processingBatches: {
          orderBy: [desc(processingBatches.batchNumber)],
        },
      },
    });

    if (!document) {
      throw new AppError(ERROR_CODES.DOCUMENT_NOT_FOUND, '문서를 찾을 수 없습니다.');
    }

    return document;
  }

  /**
   * List documents with filters
   */
  async list(filters: DocumentFilters, page = 1, limit = 10) {
    const conditions = [eq(documents.organizationId, filters.organizationId)];

    if (filters.search) {
      conditions.push(
        or(
          like(documents.originalFileName, `%${filters.search}%`),
          like(documents.fileName, `%${filters.search}%`)
        )!
      );
    }

    if (filters.categoryId) {
      conditions.push(eq(documents.categoryId, filters.categoryId));
    }

    if (filters.status) {
      conditions.push(eq(documents.processingStatus, filters.status as any));
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(documents)
      .where(whereClause);

    const results = await db.query.documents.findMany({
      where: whereClause,
      with: {
        category: true,
      },
      orderBy: [desc(documents.createdAt)],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update document processing status
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'rolled_back',
    result?: any,
    error?: string
  ) {
    const updates: any = {
      processingStatus: status,
      updatedAt: new Date(),
    };

    if (status === 'processing') {
      updates.processingStartedAt = new Date();
    }

    if (status === 'completed' || status === 'failed') {
      updates.processingCompletedAt = new Date();
    }

    if (result) {
      updates.processingResult = result;
    }

    if (error) {
      updates.processingError = error;
    }

    const [document] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();

    return document;
  }

  /**
   * Create new version of document
   */
  async createVersion(parentId: string, newFile: File, uploadedBy: string) {
    const parent = await this.getById(parentId);

    // Mark parent as not latest
    await db
      .update(documents)
      .set({ isLatest: false, updatedAt: new Date() })
      .where(eq(documents.id, parentId));

    // Upload new file
    const uploadResult = await storageService.upload(
      newFile,
      parent.organizationId,
      'uploads'
    );

    // Create new version
    const [document] = await db
      .insert(documents)
      .values({
        organizationId: parent.organizationId,
        categoryId: parent.categoryId,
        templateId: parent.templateId,
        fileName: uploadResult.path.split('/').pop()!,
        originalFileName: newFile.name,
        mimeType: newFile.type,
        fileSize: newFile.size,
        storagePath: uploadResult.path,
        storageUrl: uploadResult.url,
        documentType: parent.documentType,
        processingMode: parent.processingMode,
        processingStatus: 'pending',
        version: parent.version + 1,
        parentDocumentId: parentId,
        isLatest: true,
        metadata: parent.metadata,
        uploadedBy,
      })
      .returning();

    // Trigger processing
    await inngest.send({
      name: 'document/process',
      data: { documentId: document.id },
    });

    return document;
  }

  /**
   * Delete document and associated data
   */
  async delete(id: string) {
    const document = await this.getById(id);

    // Delete from storage
    await storageService.delete(document.storagePath);

    // Soft delete in database
    await db
      .update(documents)
      .set({
        processingStatus: 'rolled_back',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id));

    // Trigger cleanup job
    await inngest.send({
      name: 'document/cleanup',
      data: { documentId: id },
    });

    return true;
  }
}

export const documentService = new DocumentService();
```

### Tests for 7.2
- [ ] Create document
- [ ] Get by ID with relations
- [ ] List with filters
- [ ] Update status
- [ ] Create version
- [ ] Delete document

---

## Task 7.3: Document Upload UI

### 7.3.1 Upload Page

**File**: `app/(admin)/documents/upload/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { DocumentUploadForm } from './_components/upload-form';
import { useToast } from '@/hooks/use-toast';

export default function DocumentUploadPage() {
  return (
    <div>
      <PageHeader
        title="문서 업로드"
        description="Excel 파일을 업로드하여 RAG 시스템에 등록합니다."
      />
      <DocumentUploadForm />
    </div>
  );
}
```

### 7.3.2 Upload Form Component

**File**: `app/(admin)/documents/upload/_components/upload-form.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/provider';
import {
  Upload,
  FileXls,
  X,
  CheckCircle,
  Warning,
  Spinner,
} from '@phosphor-icons/react';

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  documentId?: string;
}

export function DocumentUploadForm() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [processingMode, setProcessingMode] = useState<'company_wide' | 'employee_split'>('company_wide');
  const [categories, setCategories] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0 || !categoryId) {
      toast({
        title: '입력 오류',
        description: '파일과 카테고리를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      try {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'uploading' } : f
          )
        );

        const formData = new FormData();
        formData.append('file', files[i].file);
        formData.append('organizationId', user!.organizationId!);
        formData.append('categoryId', categoryId);
        formData.append('templateId', templateId);
        formData.append('processingMode', processingMode);
        formData.append('documentType', processingMode === 'employee_split' ? 'employee_specific' : 'general');

        const response = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || '업로드 실패');
        }

        const document = await response.json();

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'success', progress: 100, documentId: document.id }
              : f
          )
        );
      } catch (error: any) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'error', error: error.message }
              : f
          )
        );
      }
    }

    setUploading(false);

    const successCount = files.filter((f) => f.status === 'success').length;
    if (successCount > 0) {
      toast({
        title: '업로드 완료',
        description: `${successCount}개 파일이 업로드되었습니다.`,
      });

      // Redirect to documents list after delay
      setTimeout(() => {
        router.push('/documents');
      }, 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>파일 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-1 font-medium">
              {isDragActive ? '파일을 놓아주세요' : 'Excel 파일을 드래그하거나 클릭'}
            </p>
            <p className="text-sm text-muted-foreground">
              .xlsx, .xls 파일만 지원 | 최대 50MB
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <FileXls className="h-8 w-8 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">{file.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {file.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {file.status === 'uploading' && (
                    <Spinner className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {file.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
                  )}
                  {file.status === 'error' && (
                    <Warning className="h-5 w-5 text-destructive" weight="fill" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>처리 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>카테고리 *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>템플릿</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="템플릿 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>처리 모드 *</Label>
            <RadioGroup
              value={processingMode}
              onValueChange={(v) => setProcessingMode(v as any)}
            >
              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="company_wide" id="company_wide" />
                <div className="flex-1">
                  <Label htmlFor="company_wide" className="font-medium">
                    전사 공통
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    문서 전체를 회사 공통 네임스페이스에 저장합니다.
                    모든 직원이 검색할 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="employee_split" id="employee_split" />
                <div className="flex-1">
                  <Label htmlFor="employee_split" className="font-medium">
                    직원별 분할
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    직원 식별 컬럼을 기준으로 데이터를 분할하여
                    각 직원의 개인 네임스페이스에 저장합니다.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button
            onClick={uploadFiles}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? (
              <>
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                업로드 시작
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

### Tests for 7.3
- [ ] Dropzone interaction
- [ ] File list management
- [ ] Form validation
- [ ] Upload flow

---

## Task 7.4: Document API Routes

### 7.4.1 Documents API

**File**: `app/api/documents/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/lib/services/document.service';
import { withErrorHandler } from '@/lib/errors/handler';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
  }

  const filters = {
    organizationId,
    search: searchParams.get('search') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    status: searchParams.get('status') || undefined,
  };

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  const result = await documentService.list(filters, page, limit);
  return NextResponse.json(result);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const organizationId = formData.get('organizationId') as string;
  const categoryId = formData.get('categoryId') as string;
  const templateId = formData.get('templateId') as string;
  const processingMode = formData.get('processingMode') as 'company_wide' | 'employee_split';
  const documentType = formData.get('documentType') as 'general' | 'employee_specific';

  if (!file || !organizationId || !processingMode) {
    return NextResponse.json(
      { error: 'File, organization ID, and processing mode are required' },
      { status: 400 }
    );
  }

  const document = await documentService.create({
    organizationId,
    categoryId: categoryId || undefined,
    templateId: templateId || undefined,
    file,
    documentType,
    processingMode,
    uploadedBy: user.id,
  });

  return NextResponse.json(document, { status: 201 });
});
```

### Tests for 7.4
- [ ] GET documents list
- [ ] POST upload document
- [ ] FormData handling
- [ ] Processing job trigger

---

## Phase Completion Checklist

- [ ] Storage bucket configured
- [ ] Storage service working
- [ ] Document service CRUD
- [ ] Upload UI with dropzone
- [ ] Processing mode selection
- [ ] Template selection
- [ ] Category selection
- [ ] File validation
- [ ] Progress tracking
- [ ] API routes working
- [ ] Inngest job triggers
- [ ] All tests passing

---

## Next Phase

→ [Phase 8: Inngest Processing Jobs](./PHASE-08-INNGEST.md)
