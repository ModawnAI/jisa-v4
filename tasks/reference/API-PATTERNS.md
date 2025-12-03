# API Patterns Reference

> Next.js 16 App Router API conventions for JISA App

---

## 1. Route Structure

### 1.1 API Directory Structure

```
app/
├── api/
│   ├── auth/
│   │   └── [...supabase]/
│   │       └── route.ts          # Supabase Auth callback
│   │
│   ├── employees/
│   │   ├── route.ts              # GET (list), POST (create)
│   │   ├── [id]/
│   │   │   └── route.ts          # GET, PATCH, DELETE
│   │   └── bulk/
│   │       └── route.ts          # POST (bulk operations)
│   │
│   ├── documents/
│   │   ├── route.ts              # GET, POST
│   │   ├── [id]/
│   │   │   └── route.ts          # GET, PATCH, DELETE
│   │   ├── upload/
│   │   │   └── route.ts          # POST (file upload)
│   │   └── preview/
│   │       └── route.ts          # POST (preview before processing)
│   │
│   ├── categories/
│   │   ├── route.ts              # GET, POST
│   │   ├── [id]/
│   │   │   └── route.ts          # GET, PATCH, DELETE
│   │   └── tree/
│   │       └── route.ts          # GET (hierarchical)
│   │
│   ├── templates/
│   │   ├── route.ts              # GET, POST
│   │   └── [id]/
│   │       └── route.ts          # GET, PATCH, DELETE
│   │
│   ├── chat/
│   │   └── route.ts              # POST (streaming chat)
│   │
│   ├── inngest/
│   │   └── route.ts              # Inngest webhook
│   │
│   └── health/
│       └── route.ts              # GET (health check)
```

---

## 2. Request/Response Patterns

### 2.1 Standard Response Format

```typescript
// lib/api/response.ts

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

export function successResponse<T>(
  data: T,
  meta?: ApiResponse['meta']
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    meta,
  });
}

export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
    },
    { status }
  );
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
```

### 2.2 Error Codes

```typescript
// lib/api/errors.ts

export const ErrorCodes = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Resource
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Processing
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  EMBEDDING_FAILED: 'EMBEDDING_FAILED',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export const ErrorMessages: Record<string, string> = {
  UNAUTHORIZED: '인증이 필요합니다',
  FORBIDDEN: '접근 권한이 없습니다',
  TOKEN_EXPIRED: '세션이 만료되었습니다',
  VALIDATION_ERROR: '입력값이 올바르지 않습니다',
  INVALID_INPUT: '잘못된 입력입니다',
  MISSING_FIELD: '필수 항목이 누락되었습니다',
  NOT_FOUND: '리소스를 찾을 수 없습니다',
  ALREADY_EXISTS: '이미 존재하는 리소스입니다',
  CONFLICT: '충돌이 발생했습니다',
  PROCESSING_FAILED: '처리에 실패했습니다',
  UPLOAD_FAILED: '업로드에 실패했습니다',
  EMBEDDING_FAILED: '임베딩 생성에 실패했습니다',
  INTERNAL_ERROR: '서버 오류가 발생했습니다',
  DATABASE_ERROR: '데이터베이스 오류가 발생했습니다',
  EXTERNAL_SERVICE_ERROR: '외부 서비스 오류가 발생했습니다',
};
```

---

## 3. Route Handler Patterns

### 3.1 List Endpoint (GET)

```typescript
// app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { employees } from '@/lib/db/schema';
import { eq, like, and, desc, asc, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { paginatedResponse, errorResponse } from '@/lib/api/response';
import { ErrorCodes } from '@/lib/api/errors';

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  sortBy: z.enum(['name', 'employeeId', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '인증이 필요합니다', 401);
    }

    // 2. Parse and validate query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = querySchema.safeParse(searchParams);

    if (!query.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        '잘못된 요청 파라미터입니다',
        400,
        query.error.flatten()
      );
    }

    const { page, pageSize, search, status, sortBy, sortOrder } = query.data;

    // 3. Build query conditions
    const conditions = [];

    if (search) {
      conditions.push(
        sql`(${employees.name} ILIKE ${`%${search}%`} OR ${employees.employeeId} ILIKE ${`%${search}%`})`
      );
    }

    if (status !== 'all') {
      conditions.push(eq(employees.isActive, status === 'active'));
    }

    // 4. Execute queries
    const [data, countResult] = await Promise.all([
      db.query.employees.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: sortOrder === 'desc'
          ? desc(employees[sortBy])
          : asc(employees[sortBy]),
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(employees)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    const total = Number(countResult[0].count);

    // 5. Return response
    return paginatedResponse(data, page, pageSize, total);

  } catch (error) {
    console.error('Failed to list employees:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      '직원 목록 조회에 실패했습니다',
      500
    );
  }
}
```

### 3.2 Create Endpoint (POST)

```typescript
// app/api/employees/route.ts (continued)
import { createEmployeeSchema } from '@/lib/validations/employee';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '인증이 필요합니다', 401);
    }

    // 2. Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return errorResponse(ErrorCodes.FORBIDDEN, '관리자 권한이 필요합니다', 403);
    }

    // 3. Parse and validate body
    const body = await request.json();
    const validation = createEmployeeSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        '입력값이 올바르지 않습니다',
        400,
        validation.error.flatten()
      );
    }

    // 4. Check for duplicates
    const existing = await db.query.employees.findFirst({
      where: eq(employees.employeeId, validation.data.employeeId),
    });

    if (existing) {
      return errorResponse(
        ErrorCodes.ALREADY_EXISTS,
        '이미 존재하는 사번입니다',
        409
      );
    }

    // 5. Create employee
    const [newEmployee] = await db
      .insert(employees)
      .values({
        ...validation.data,
        createdBy: user.id,
      })
      .returning();

    // 6. Return response
    return successResponse(newEmployee, { status: 201 });

  } catch (error) {
    console.error('Failed to create employee:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      '직원 생성에 실패했습니다',
      500
    );
  }
}
```

### 3.3 Single Resource Endpoint (GET/PATCH/DELETE)

```typescript
// app/api/employees/[id]/route.ts
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { employees } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorCodes } from '@/lib/api/errors';
import { updateEmployeeSchema } from '@/lib/validations/employee';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET single employee
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '인증이 필요합니다', 401);
    }

    // Fetch employee
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, id),
      with: {
        documents: true,
      },
    });

    if (!employee) {
      return errorResponse(ErrorCodes.NOT_FOUND, '직원을 찾을 수 없습니다', 404);
    }

    return successResponse(employee);

  } catch (error) {
    console.error('Failed to get employee:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, '직원 조회에 실패했습니다', 500);
  }
}

// PATCH update employee
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Auth check with admin role
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '인증이 필요합니다', 401);
    }

    // Validate body
    const body = await request.json();
    const validation = updateEmployeeSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        '입력값이 올바르지 않습니다',
        400,
        validation.error.flatten()
      );
    }

    // Check if exists
    const existing = await db.query.employees.findFirst({
      where: eq(employees.id, id),
    });

    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '직원을 찾을 수 없습니다', 404);
    }

    // Update
    const [updated] = await db
      .update(employees)
      .set({
        ...validation.data,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();

    return successResponse(updated);

  } catch (error) {
    console.error('Failed to update employee:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, '직원 수정에 실패했습니다', 500);
  }
}

// DELETE employee
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Auth check with admin role
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '인증이 필요합니다', 401);
    }

    // Check if exists
    const existing = await db.query.employees.findFirst({
      where: eq(employees.id, id),
    });

    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '직원을 찾을 수 없습니다', 404);
    }

    // Soft delete
    await db
      .update(employees)
      .set({
        isActive: false,
        deletedAt: new Date(),
      })
      .where(eq(employees.id, id));

    return successResponse({ id, deleted: true });

  } catch (error) {
    console.error('Failed to delete employee:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, '직원 삭제에 실패했습니다', 500);
  }
}
```

---

## 4. File Upload Pattern

```typescript
// app/api/documents/upload/route.ts
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorCodes } from '@/lib/api/errors';
import { inngest } from '@/lib/inngest/client';

const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/csv',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '인증이 필요합니다', 401);
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const templateId = formData.get('templateId') as string | null;
    const period = formData.get('period') as string | null;

    if (!file) {
      return errorResponse(ErrorCodes.MISSING_FIELD, '파일이 필요합니다', 400);
    }

    // 3. Validate file
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        '지원하지 않는 파일 형식입니다',
        400
      );
    }

    if (file.size > MAX_SIZE) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        '파일 크기가 10MB를 초과합니다',
        400
      );
    }

    // 4. Upload to Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `documents/${user.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return errorResponse(ErrorCodes.UPLOAD_FAILED, '파일 업로드에 실패했습니다', 500);
    }

    // 5. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // 6. Create document record
    const [document] = await db
      .insert(documents)
      .values({
        fileName: file.name,
        fileUrl: publicUrl,
        filePath,
        fileType: file.type,
        fileSize: file.size,
        templateId,
        period,
        status: 'pending',
        uploadedBy: user.id,
      })
      .returning();

    // 7. Trigger processing via Inngest
    await inngest.send({
      name: 'document/uploaded',
      data: {
        documentId: document.id,
        templateId,
        period,
      },
    });

    return successResponse({
      id: document.id,
      fileName: file.name,
      fileUrl: publicUrl,
      status: 'pending',
    });

  } catch (error) {
    console.error('Upload failed:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, '업로드에 실패했습니다', 500);
  }
}
```

---

## 5. Streaming Response Pattern (Chat)

```typescript
// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { queryPinecone } from '@/lib/pinecone/query';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Parse request
    const { message, employeeId, conversationId } = await request.json();

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // 3. Get employee context
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, employeeId),
    });

    if (!employee) {
      return new Response('Employee not found', { status: 404 });
    }

    // 4. Query RAG context
    const ragResults = await queryPinecone({
      queryText: message,
      employeeId: employee.employeeId,
      clearanceLevel: employee.clearanceLevel,
      topK: 5,
    });

    // 5. Build context
    const context = ragResults
      .map(r => r.metadata.text)
      .join('\n\n---\n\n');

    // 6. Stream response
    const result = streamText({
      model: openai('gpt-4o'),
      system: `당신은 ContractorHub의 AI 어시스턴트입니다.
직원 ${employee.name}님의 질문에 답변합니다.
아래 컨텍스트를 참고하여 정확하고 도움이 되는 답변을 제공하세요.

컨텍스트:
${context}`,
      messages: [
        { role: 'user', content: message },
      ],
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('Chat error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

---

## 6. Validation Schemas

### 6.1 Employee Schemas

```typescript
// lib/validations/employee.ts
import { z } from 'zod';

export const createEmployeeSchema = z.object({
  employeeId: z
    .string()
    .min(1, '사번을 입력하세요')
    .max(20, '사번은 20자 이내여야 합니다')
    .regex(/^[A-Z0-9]+$/, '사번은 영문 대문자와 숫자만 가능합니다'),

  name: z
    .string()
    .min(2, '이름은 2자 이상이어야 합니다')
    .max(50, '이름은 50자 이내여야 합니다'),

  email: z
    .string()
    .email('올바른 이메일을 입력하세요')
    .optional()
    .nullable(),

  phone: z
    .string()
    .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, '올바른 전화번호를 입력하세요')
    .optional()
    .nullable(),

  department: z
    .string()
    .max(100, '부서명은 100자 이내여야 합니다')
    .optional()
    .nullable(),

  position: z
    .string()
    .max(100, '직책은 100자 이내여야 합니다')
    .optional()
    .nullable(),

  clearanceLevel: z
    .enum(['basic', 'standard', 'advanced'])
    .default('basic'),

  hireDate: z
    .string()
    .datetime()
    .optional()
    .nullable(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
```

### 6.2 Document Schemas

```typescript
// lib/validations/document.ts
import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  templateId: z.string().uuid('올바른 템플릿 ID가 아닙니다'),
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, '기간 형식이 올바르지 않습니다 (YYYY-MM)')
    .optional(),
  categoryId: z.string().uuid().optional(),
});

export const documentPreviewSchema = z.object({
  templateId: z.string().uuid(),
  period: z.string().optional(),
});
```

---

## 7. Middleware Pattern

### 7.1 Auth Middleware

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Protect API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip auth routes
    if (request.nextUrl.pathname.startsWith('/api/auth')) {
      return supabaseResponse;
    }

    // Skip health check
    if (request.nextUrl.pathname === '/api/health') {
      return supabaseResponse;
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다' } },
        { status: 401 }
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
  ],
};
```

---

## 8. Client-Side Fetching

### 8.1 API Client

```typescript
// lib/api/client.ts

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || '오류가 발생했습니다',
      response.status,
      data.error?.details
    );
  }

  return data.data;
}

export const api = {
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(endpoint, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      credentials: 'include',
    });

    return handleResponse<T>(response);
  },

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    return handleResponse<T>(response);
  },

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return handleResponse<T>(response);
  },

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      credentials: 'include',
    });

    return handleResponse<T>(response);
  },

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    return handleResponse<T>(response);
  },
};
```

### 8.2 React Query Hooks

```typescript
// hooks/use-employees.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api/client';
import { toast } from 'sonner';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  // ...
}

interface EmployeeListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export function useEmployees(params: EmployeeListParams = {}) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => api.get<Employee[]>('/api/employees', {
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 20),
      ...(params.search && { search: params.search }),
      ...(params.status && { status: params.status }),
    }),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => api.get<Employee>(`/api/employees/${id}`),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeInput) =>
      api.post<Employee>('/api/employees', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('직원이 추가되었습니다');
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeInput }) =>
      api.patch<Employee>(`/api/employees/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', variables.id] });
      toast.success('직원 정보가 수정되었습니다');
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('직원이 삭제되었습니다');
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}
```

---

## 9. Health Check Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: false,
      supabase: false,
      pinecone: false,
    },
  };

  try {
    // Check database
    await db.execute(sql`SELECT 1`);
    checks.services.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  try {
    // Check Supabase
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();
    checks.services.supabase = !error;
  } catch (error) {
    console.error('Supabase health check failed:', error);
  }

  try {
    // Check Pinecone
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
    await index.describeIndexStats();
    checks.services.pinecone = true;
  } catch (error) {
    console.error('Pinecone health check failed:', error);
  }

  const allHealthy = Object.values(checks.services).every(Boolean);
  checks.status = allHealthy ? 'healthy' : 'degraded';

  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 503,
  });
}
```
