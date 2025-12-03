# Phase 6: Template Management

**Duration**: 3 days
**Dependencies**: Phase 5 complete
**Deliverables**: Excel template system with column mapping and processing modes

---

## Task 6.1: Template Service Layer

### 6.1.1 Template Service

**File**: `lib/services/template.service.ts`

```typescript
import { db } from '@/lib/db';
import { templates, categories } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { AppError, ERROR_CODES } from '@/lib/errors';
import type { ColumnMapping, ValidationRule, TemplateRAGConfig } from '@/lib/db/schema/templates';

export interface CreateTemplateInput {
  organizationId: string;
  categoryId?: string;
  name: string;
  description?: string;
  processingMode: 'company_wide' | 'employee_split';
  columnMapping: ColumnMapping;
  validationRules?: ValidationRule[];
  ragConfig?: TemplateRAGConfig;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  categoryId?: string;
  processingMode?: 'company_wide' | 'employee_split';
  columnMapping?: ColumnMapping;
  validationRules?: ValidationRule[];
  ragConfig?: TemplateRAGConfig;
  isActive?: boolean;
  isDefault?: boolean;
}

export class TemplateService {
  /**
   * Create a new template
   */
  async create(input: CreateTemplateInput) {
    const [template] = await db
      .insert(templates)
      .values({
        ...input,
        version: '1.0',
      })
      .returning();

    return template;
  }

  /**
   * Get template by ID
   */
  async getById(id: string) {
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, id),
      with: {
        category: true,
      },
    });

    if (!template) {
      throw new AppError(ERROR_CODES.TEMPLATE_NOT_FOUND, '템플릿을 찾을 수 없습니다.');
    }

    return template;
  }

  /**
   * List templates for organization
   */
  async list(organizationId: string, categoryId?: string) {
    const conditions = [eq(templates.organizationId, organizationId)];

    if (categoryId) {
      conditions.push(eq(templates.categoryId, categoryId));
    }

    return db.query.templates.findMany({
      where: and(...conditions),
      with: {
        category: true,
      },
      orderBy: [desc(templates.isDefault), desc(templates.createdAt)],
    });
  }

  /**
   * Update template
   */
  async update(id: string, input: UpdateTemplateInput) {
    // If setting as default, unset other defaults
    if (input.isDefault) {
      const existing = await this.getById(id);
      await db
        .update(templates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(templates.organizationId, existing.organizationId),
            eq(templates.isDefault, true)
          )
        );
    }

    const [template] = await db
      .update(templates)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, id))
      .returning();

    if (!template) {
      throw new AppError(ERROR_CODES.TEMPLATE_NOT_FOUND, '템플릿을 찾을 수 없습니다.');
    }

    return template;
  }

  /**
   * Delete template
   */
  async delete(id: string) {
    const [template] = await db
      .update(templates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();

    if (!template) {
      throw new AppError(ERROR_CODES.TEMPLATE_NOT_FOUND, '템플릿을 찾을 수 없습니다.');
    }

    return template;
  }

  /**
   * Duplicate template
   */
  async duplicate(id: string, newName: string) {
    const original = await this.getById(id);

    const [template] = await db
      .insert(templates)
      .values({
        organizationId: original.organizationId,
        categoryId: original.categoryId,
        name: newName,
        description: original.description,
        processingMode: original.processingMode,
        columnMapping: original.columnMapping,
        validationRules: original.validationRules,
        ragConfig: original.ragConfig,
        version: '1.0',
        isDefault: false,
      })
      .returning();

    return template;
  }

  /**
   * Get default template for category
   */
  async getDefaultForCategory(categoryId: string) {
    return db.query.templates.findFirst({
      where: and(
        eq(templates.categoryId, categoryId),
        eq(templates.isDefault, true),
        eq(templates.isActive, true)
      ),
    });
  }

  /**
   * Validate column mapping against sample data
   */
  validateColumnMapping(mapping: ColumnMapping, sampleRow: Record<string, any>) {
    const errors: string[] = [];

    for (const [column, config] of Object.entries(mapping.columns)) {
      if (config.isRequired && !(column in sampleRow)) {
        errors.push(`필수 컬럼 '${column}'이(가) 없습니다.`);
      }
    }

    if (mapping.employeeIdentifierColumn && !(mapping.employeeIdentifierColumn in sampleRow)) {
      errors.push(`직원 식별 컬럼 '${mapping.employeeIdentifierColumn}'이(가) 없습니다.`);
    }

    return { valid: errors.length === 0, errors };
  }
}

export const templateService = new TemplateService();
```

### Tests for 6.1
- [ ] Create template
- [ ] Update template
- [ ] Set default template
- [ ] Duplicate template
- [ ] Column mapping validation

---

## Task 6.2: Template API Routes

**File**: `app/api/templates/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { templateService } from '@/lib/services/template.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const columnMappingSchema = z.object({
  employeeIdentifierColumn: z.string().optional(),
  columns: z.record(z.object({
    fieldName: z.string(),
    dataType: z.enum(['string', 'number', 'date', 'boolean']),
    isRequired: z.boolean(),
    defaultValue: z.any().optional(),
    transform: z.enum(['uppercase', 'lowercase', 'trim', 'date_parse']).optional(),
  })),
  headerRow: z.number().min(1),
  dataStartRow: z.number().min(1),
  sheetName: z.string().optional(),
  sheetIndex: z.number().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1, '템플릿 이름은 필수입니다'),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  processingMode: z.enum(['company_wide', 'employee_split']),
  columnMapping: columnMappingSchema,
  validationRules: z.array(z.object({
    field: z.string(),
    type: z.enum(['required', 'regex', 'range', 'enum', 'unique', 'date_format']),
    value: z.any().optional(),
    message: z.string(),
  })).optional(),
  ragConfig: z.object({
    embeddingTemplate: z.string(),
    metadataFields: z.array(z.string()),
    chunkStrategy: z.enum(['row', 'group', 'document']),
    groupByColumn: z.string().optional(),
    batchSize: z.number().default(100),
    skipDuplicates: z.boolean().default(true),
  }).optional(),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const categoryId = searchParams.get('categoryId') || undefined;

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
  }

  const templates = await templateService.list(organizationId, categoryId);
  return NextResponse.json(templates);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { organizationId, ...data } = body;

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
  }

  const validated = createTemplateSchema.parse(data);

  const template = await templateService.create({
    organizationId,
    ...validated,
  });

  return NextResponse.json(template, { status: 201 });
});
```

### Tests for 6.2
- [ ] GET templates list
- [ ] POST create template
- [ ] Validation rules

---

## Task 6.3: Template Builder UI

### 6.3.1 Template List Page

**File**: `app/(admin)/templates/page.tsx`

```typescript
import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { TemplateGrid } from './_components/template-grid';
import { Button } from '@/components/ui/button';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function TemplatesPage() {
  return (
    <div>
      <PageHeader
        title="템플릿 관리"
        description="Excel 파일 처리를 위한 템플릿을 관리합니다."
      >
        <Button asChild>
          <Link href="/templates/new">
            <Plus className="mr-2 h-4 w-4" />
            템플릿 생성
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={<TemplateSkeleton />}>
        <TemplateGrid />
      </Suspense>
    </div>
  );
}

function TemplateSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-48" />
      ))}
    </div>
  );
}
```

### 6.3.2 Column Mapping Builder

**File**: `app/(admin)/templates/_components/column-mapping-builder.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash, Plus } from '@phosphor-icons/react';
import type { ColumnMapping } from '@/lib/db/schema/templates';

interface ColumnMappingBuilderProps {
  value: ColumnMapping;
  onChange: (value: ColumnMapping) => void;
  sampleColumns?: string[];
}

const DATA_TYPES = [
  { value: 'string', label: '문자열' },
  { value: 'number', label: '숫자' },
  { value: 'date', label: '날짜' },
  { value: 'boolean', label: '참/거짓' },
];

const TRANSFORMS = [
  { value: 'none', label: '없음' },
  { value: 'uppercase', label: '대문자' },
  { value: 'lowercase', label: '소문자' },
  { value: 'trim', label: '공백 제거' },
  { value: 'date_parse', label: '날짜 변환' },
];

export function ColumnMappingBuilder({
  value,
  onChange,
  sampleColumns = [],
}: ColumnMappingBuilderProps) {
  const [newColumn, setNewColumn] = useState('');

  const addColumn = () => {
    if (!newColumn) return;

    onChange({
      ...value,
      columns: {
        ...value.columns,
        [newColumn]: {
          fieldName: newColumn.toLowerCase().replace(/\s+/g, '_'),
          dataType: 'string',
          isRequired: false,
        },
      },
    });
    setNewColumn('');
  };

  const removeColumn = (column: string) => {
    const { [column]: _, ...rest } = value.columns;
    onChange({ ...value, columns: rest });
  };

  const updateColumn = (column: string, updates: any) => {
    onChange({
      ...value,
      columns: {
        ...value.columns,
        [column]: { ...value.columns[column], ...updates },
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>컬럼 매핑 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Settings */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>헤더 행 번호</Label>
            <Input
              type="number"
              min={1}
              value={value.headerRow}
              onChange={(e) =>
                onChange({ ...value, headerRow: parseInt(e.target.value) || 1 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>데이터 시작 행</Label>
            <Input
              type="number"
              min={1}
              value={value.dataStartRow}
              onChange={(e) =>
                onChange({ ...value, dataStartRow: parseInt(e.target.value) || 2 })
              }
            />
          </div>
        </div>

        {/* Employee Identifier Column */}
        <div className="space-y-2">
          <Label>직원 식별 컬럼 (employee_split 모드용)</Label>
          <Select
            value={value.employeeIdentifierColumn || ''}
            onValueChange={(v) =>
              onChange({ ...value, employeeIdentifierColumn: v || undefined })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="선택하세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">없음</SelectItem>
              {Object.keys(value.columns).map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Column Mappings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="새 컬럼명 입력"
              value={newColumn}
              onChange={(e) => setNewColumn(e.target.value)}
            />
            <Button onClick={addColumn} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              추가
            </Button>
          </div>

          {sampleColumns.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">샘플에서 가져오기:</span>
              {sampleColumns
                .filter((col) => !(col in value.columns))
                .map((col) => (
                  <Button
                    key={col}
                    variant="outline"
                    size="sm"
                    onClick={() => setNewColumn(col)}
                  >
                    {col}
                  </Button>
                ))}
            </div>
          )}

          {/* Column List */}
          <div className="space-y-3">
            {Object.entries(value.columns).map(([column, config]) => (
              <div
                key={column}
                className="flex items-center gap-4 rounded-lg border p-4"
              >
                <div className="flex-1">
                  <div className="font-medium">{column}</div>
                  <div className="text-sm text-muted-foreground">
                    → {config.fieldName}
                  </div>
                </div>

                <Select
                  value={config.dataType}
                  onValueChange={(v) =>
                    updateColumn(column, { dataType: v })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.isRequired}
                    onCheckedChange={(checked) =>
                      updateColumn(column, { isRequired: checked })
                    }
                  />
                  <Label className="text-sm">필수</Label>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeColumn(column)}
                >
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 6.3.3 Template Form Page

**File**: `app/(admin)/templates/new/page.tsx`

```typescript
import { PageHeader } from '@/components/admin/page-header';
import { TemplateForm } from '../_components/template-form';

export default function NewTemplatePage() {
  return (
    <div>
      <PageHeader
        title="템플릿 생성"
        description="Excel 파일 처리를 위한 새 템플릿을 만듭니다."
      />
      <TemplateForm />
    </div>
  );
}
```

### Tests for 6.3
- [ ] Template list grid
- [ ] Column mapping builder
- [ ] Template creation form
- [ ] Processing mode selection
- [ ] Validation rules builder

---

## Task 6.4: Excel Preview & Auto-Detection

### 6.4.1 Excel Upload Preview

**File**: `components/templates/excel-preview.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileXls, Upload, X } from '@phosphor-icons/react';
import * as XLSX from 'xlsx';

interface ExcelPreviewProps {
  onColumnsDetected: (columns: string[], sampleData: Record<string, any>[]) => void;
}

export function ExcelPreview({ onColumnsDetected }: ExcelPreviewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setFile(file);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
        header: 1,
        defval: '',
      });

      if (jsonData.length > 0) {
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1, 6).map((row: any) => {
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });

        setHeaders(headers);
        setPreviewData(dataRows);
        onColumnsDetected(headers, dataRows);
      }
    } catch (error) {
      console.error('Error parsing Excel file:', error);
    } finally {
      setLoading(false);
    }
  }, [onColumnsDetected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const clearFile = () => {
    setFile(null);
    setHeaders([]);
    setPreviewData([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileXls className="h-5 w-5" />
          Excel 파일 미리보기
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!file ? (
          <div
            {...getRootProps()}
            className={`
              flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              {isDragActive
                ? '파일을 놓아주세요'
                : 'Excel 파일을 드래그하거나 클릭하여 업로드'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              .xlsx, .xls 파일 지원
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileXls className="h-5 w-5 text-green-600" />
                <span className="font-medium">{file.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                파일을 분석 중...
              </div>
            ) : (
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((header, index) => (
                        <TableHead key={index}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {headers.map((header, cellIndex) => (
                          <TableCell key={cellIndex}>
                            {String(row[header] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              * 처음 5행의 데이터를 미리보기로 표시합니다
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Tests for 6.4
- [ ] Excel file upload
- [ ] Column auto-detection
- [ ] Preview table rendering
- [ ] File type validation

---

## Phase Completion Checklist

- [ ] Template service with CRUD
- [ ] API routes working
- [ ] Template list page
- [ ] Column mapping builder
- [ ] Processing mode selection
- [ ] Excel preview component
- [ ] Auto-detection working
- [ ] Validation rules builder
- [ ] RAG config editor
- [ ] All tests passing

---

## Next Phase

→ [Phase 7: Document Upload & Processing](./PHASE-07-DOCUMENTS.md)
