# 코딩 컨벤션 및 표준

> ContractorHub 프로젝트의 일관된 코드 작성을 위한 표준

---

## 1. 파일 및 폴더 구조

### 1.1 최상위 구조

```
/contractor-hub/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 라우트 그룹
│   │   ├── login/
│   │   └── logout/
│   ├── admin/                    # 관리자 페이지
│   │   ├── layout.tsx
│   │   ├── page.tsx              # 대시보드 홈
│   │   ├── employees/
│   │   ├── categories/
│   │   ├── templates/
│   │   ├── documents/
│   │   └── analytics/
│   ├── api/                      # API 라우트
│   │   ├── kakao/
│   │   ├── inngest/
│   │   ├── employees/
│   │   ├── categories/
│   │   ├── templates/
│   │   ├── documents/
│   │   └── rag/
│   ├── globals.css
│   └── layout.tsx
│
├── components/                    # 컴포넌트
│   ├── ui/                       # shadcn/ui 컴포넌트
│   ├── layout/                   # 레이아웃 컴포넌트
│   │   ├── admin-sidebar.tsx
│   │   ├── admin-header.tsx
│   │   └── admin-layout.tsx
│   ├── employees/                # 직원 관련
│   ├── categories/               # 카테고리 관련
│   ├── templates/                # 템플릿 관련
│   ├── documents/                # 문서 관련
│   └── shared/                   # 공통 컴포넌트
│       ├── data-table.tsx
│       ├── loading-skeleton.tsx
│       ├── error-boundary.tsx
│       └── confirm-dialog.tsx
│
├── lib/                          # 라이브러리/유틸리티
│   ├── db/                       # 데이터베이스
│   │   ├── index.ts              # Drizzle 클라이언트
│   │   ├── schema/               # 스키마 정의
│   │   │   ├── index.ts
│   │   │   ├── employees.ts
│   │   │   ├── categories.ts
│   │   │   ├── templates.ts
│   │   │   ├── documents.ts
│   │   │   └── enums.ts
│   │   ├── migrations/
│   │   └── seeds/
│   ├── services/                 # 비즈니스 로직
│   │   ├── employee.service.ts
│   │   ├── category.service.ts
│   │   ├── template.service.ts
│   │   ├── document.service.ts
│   │   ├── pinecone.service.ts
│   │   └── rag.service.ts
│   ├── pinecone/                 # Pinecone 관련
│   │   ├── client.ts
│   │   ├── namespaces.ts
│   │   └── metadata.ts
│   ├── inngest/                  # Inngest 함수
│   │   ├── client.ts
│   │   └── functions/
│   ├── kakao/                    # KakaoTalk 관련
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   └── messages.ts
│   ├── utils/                    # 유틸리티
│   │   ├── cn.ts                 # className 유틸
│   │   ├── date.ts
│   │   ├── currency.ts
│   │   └── validation.ts
│   ├── constants/                # 상수
│   │   ├── index.ts
│   │   ├── routes.ts
│   │   └── messages.ts
│   └── types/                    # 타입 정의
│       ├── index.ts
│       ├── api.ts
│       ├── employee.ts
│       ├── category.ts
│       └── document.ts
│
├── hooks/                        # React 훅
│   ├── use-employees.ts
│   ├── use-categories.ts
│   ├── use-documents.ts
│   └── use-toast.ts
│
├── inngest/                      # Inngest 함수 정의
│   ├── client.ts
│   └── functions/
│       ├── process-document.ts
│       ├── expire-vectors.ts
│       └── sync-pinecone.ts
│
├── tests/                        # 테스트
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── public/                       # 정적 파일
```

### 1.2 파일 네이밍 규칙

| 타입 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | kebab-case.tsx | `employee-table.tsx` |
| 페이지 | page.tsx | `app/admin/employees/page.tsx` |
| API 라우트 | route.ts | `app/api/employees/route.ts` |
| 서비스 | kebab-case.service.ts | `employee.service.ts` |
| 훅 | use-feature.ts | `use-employees.ts` |
| 타입 | kebab-case.ts | `employee.ts` |
| 스키마 | feature.ts | `employees.ts` |
| 상수 | SCREAMING_SNAKE | `MAX_FILE_SIZE` |

---

## 2. TypeScript 규칙

### 2.1 타입 정의

```typescript
// lib/types/employee.ts

/**
 * 직원 권한 레벨
 * basic: 기본 (개인 데이터만)
 * standard: 표준 (+ 상품 정보)
 * advanced: 고급 (+ 전략 문서)
 */
export type ClearanceLevel = 'basic' | 'standard' | 'advanced';

/**
 * 직원 상태
 */
export type EmployeeStatus = 'active' | 'inactive' | 'pending';

/**
 * 직원 엔티티
 */
export interface Employee {
  id: string;
  employeeId: string;          // 사번
  name: string;
  email: string | null;
  phone: string;
  clearanceLevel: ClearanceLevel;
  status: EmployeeStatus;
  ragEnabled: boolean;
  pineconeNamespace: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 직원 생성 입력
 */
export interface CreateEmployeeInput {
  employeeId: string;
  name: string;
  email?: string;
  phone: string;
  clearanceLevel?: ClearanceLevel;
}

/**
 * 직원 수정 입력
 */
export interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {
  status?: EmployeeStatus;
  ragEnabled?: boolean;
}
```

### 2.2 Enum 대신 const 객체 사용

```typescript
// lib/constants/index.ts

/**
 * 권한 레벨 상수
 */
export const CLEARANCE_LEVELS = {
  BASIC: 'basic',
  STANDARD: 'standard',
  ADVANCED: 'advanced',
} as const;

export type ClearanceLevel = typeof CLEARANCE_LEVELS[keyof typeof CLEARANCE_LEVELS];

/**
 * 권한 레벨 메타데이터
 */
export const CLEARANCE_LEVEL_CONFIG = {
  basic: {
    label: '기본',
    numeric: 1,
    namespaces: ['company_shared'],
    color: 'gray',
  },
  standard: {
    label: '표준',
    numeric: 2,
    namespaces: ['company_shared', 'company_standard'],
    color: 'blue',
  },
  advanced: {
    label: '고급',
    numeric: 3,
    namespaces: ['company_shared', 'company_standard', 'company_advanced'],
    color: 'purple',
  },
} as const;

/**
 * 문서 처리 모드
 */
export const PROCESSING_MODES = {
  COMPANY: 'company',
  EMPLOYEE_SPLIT: 'employee_split',
  EMPLOYEE_AGGREGATE: 'employee_aggregate',
} as const;

export type ProcessingMode = typeof PROCESSING_MODES[keyof typeof PROCESSING_MODES];

/**
 * 처리 상태
 */
export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back',
} as const;

export type ProcessingStatus = typeof PROCESSING_STATUS[keyof typeof PROCESSING_STATUS];

/**
 * 파일 타입
 */
export const FILE_TYPES = {
  EXCEL: 'excel',
  CSV: 'csv',
  PDF: 'pdf',
  WORD: 'word',
} as const;

export type FileType = typeof FILE_TYPES[keyof typeof FILE_TYPES];

/**
 * 네임스페이스 타입
 */
export const NAMESPACE_TYPES = {
  COMPANY: 'company',
  EMPLOYEE: 'employee',
} as const;

export type NamespaceType = typeof NAMESPACE_TYPES[keyof typeof NAMESPACE_TYPES];
```

### 2.3 API 응답 타입

```typescript
// lib/types/api.ts

/**
 * 성공 응답
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
}

/**
 * 에러 응답
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

/**
 * API 응답 유니온
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 페이지네이션 파라미터
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 검색 파라미터
 */
export interface SearchParams extends PaginationParams {
  q?: string;
  filters?: Record<string, string | string[]>;
}
```

---

## 3. 컴포넌트 규칙

### 3.1 컴포넌트 구조

```typescript
// components/employees/employee-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// UI 컴포넌트
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// 아이콘 (Phosphor Icons)
import { User, Phone, Envelope } from '@phosphor-icons/react';

// 타입
import type { CreateEmployeeInput } from '@/lib/types/employee';

// 상수
import { CLEARANCE_LEVELS } from '@/lib/constants';

// 유효성 스키마
const employeeFormSchema = z.object({
  employeeId: z.string().min(1, '사번을 입력하세요'),
  name: z.string().min(1, '이름을 입력하세요'),
  email: z.string().email('유효한 이메일을 입력하세요').optional().or(z.literal('')),
  phone: z.string().regex(/^01[0-9]-?[0-9]{4}-?[0-9]{4}$/, '유효한 전화번호를 입력하세요'),
  clearanceLevel: z.enum(['basic', 'standard', 'advanced']).default('basic'),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

// Props 인터페이스
interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormValues>;
  onSubmit: (data: CreateEmployeeInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * 직원 정보 입력 폼
 */
export function EmployeeForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: EmployeeFormProps) {
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeId: '',
      name: '',
      email: '',
      phone: '',
      clearanceLevel: 'basic',
      ...initialData,
    },
  });

  const handleSubmit = async (values: EmployeeFormValues) => {
    await onSubmit({
      ...values,
      email: values.email || undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* 사번 */}
        <FormField
          control={form.control}
          name="employeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>사번</FormLabel>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input {...field} placeholder="E001" className="pl-9" />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 이름 */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름</FormLabel>
              <Input {...field} placeholder="홍길동" />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 이메일 */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일 (선택)</FormLabel>
              <div className="relative">
                <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input {...field} type="email" placeholder="hong@example.com" className="pl-9" />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 전화번호 */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>전화번호</FormLabel>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input {...field} placeholder="010-1234-5678" className="pl-9" />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            취소
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### 3.2 서버 컴포넌트 vs 클라이언트 컴포넌트

```typescript
// 서버 컴포넌트 (기본)
// app/admin/employees/page.tsx
import { getEmployees } from '@/lib/services/employee.service';
import { EmployeeTable } from '@/components/employees/employee-table';

export default async function EmployeesPage() {
  const employees = await getEmployees();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">직원 관리</h1>
      <EmployeeTable initialData={employees} />
    </div>
  );
}

// 클라이언트 컴포넌트 (상호작용 필요 시)
// components/employees/employee-table.tsx
'use client';

import { useState } from 'react';
import type { Employee } from '@/lib/types/employee';

interface EmployeeTableProps {
  initialData: Employee[];
}

export function EmployeeTable({ initialData }: EmployeeTableProps) {
  const [employees, setEmployees] = useState(initialData);
  // ...
}
```

---

## 4. API 라우트 규칙

### 4.1 표준 API 핸들러 구조

```typescript
// app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getEmployees, createEmployee } from '@/lib/services/employee.service';
import { createApiResponse, createApiError, parseSearchParams } from '@/lib/utils/api';
import { ERROR_CODES } from '@/lib/constants/errors';

// 입력 스키마
const createEmployeeSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(1),
  clearanceLevel: z.enum(['basic', 'standard', 'advanced']).optional(),
});

/**
 * GET /api/employees
 * 직원 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = parseSearchParams(request.nextUrl.searchParams);
    const result = await getEmployees(searchParams);

    return NextResponse.json(createApiResponse(result.data, result.meta));
  } catch (error) {
    console.error('[GET /api/employees]', error);
    return NextResponse.json(
      createApiError(ERROR_CODES.INTERNAL_ERROR, '직원 목록 조회 실패'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/employees
 * 직원 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 유효성 검사
    const parsed = createEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        createApiError(ERROR_CODES.VALIDATION_ERROR, '입력값이 올바르지 않습니다', {
          details: parsed.error.flatten().fieldErrors,
        }),
        { status: 400 }
      );
    }

    const employee = await createEmployee(parsed.data);

    return NextResponse.json(createApiResponse(employee), { status: 201 });
  } catch (error) {
    console.error('[POST /api/employees]', error);

    // 중복 에러 처리
    if (error instanceof Error && error.message.includes('duplicate')) {
      return NextResponse.json(
        createApiError(ERROR_CODES.DUPLICATE_ENTRY, '이미 존재하는 사번입니다'),
        { status: 409 }
      );
    }

    return NextResponse.json(
      createApiError(ERROR_CODES.INTERNAL_ERROR, '직원 생성 실패'),
      { status: 500 }
    );
  }
}
```

### 4.2 동적 라우트

```typescript
// app/api/employees/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getEmployeeById, updateEmployee, deleteEmployee } from '@/lib/services/employee.service';
import { createApiResponse, createApiError } from '@/lib/utils/api';
import { ERROR_CODES } from '@/lib/constants/errors';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/employees/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getEmployeeById(params.id);

    if (!employee) {
      return NextResponse.json(
        createApiError(ERROR_CODES.NOT_FOUND, '직원을 찾을 수 없습니다'),
        { status: 404 }
      );
    }

    return NextResponse.json(createApiResponse(employee));
  } catch (error) {
    console.error(`[GET /api/employees/${params.id}]`, error);
    return NextResponse.json(
      createApiError(ERROR_CODES.INTERNAL_ERROR, '직원 조회 실패'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/employees/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const employee = await updateEmployee(params.id, body);

    if (!employee) {
      return NextResponse.json(
        createApiError(ERROR_CODES.NOT_FOUND, '직원을 찾을 수 없습니다'),
        { status: 404 }
      );
    }

    return NextResponse.json(createApiResponse(employee));
  } catch (error) {
    console.error(`[PATCH /api/employees/${params.id}]`, error);
    return NextResponse.json(
      createApiError(ERROR_CODES.INTERNAL_ERROR, '직원 수정 실패'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/employees/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await deleteEmployee(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`[DELETE /api/employees/${params.id}]`, error);
    return NextResponse.json(
      createApiError(ERROR_CODES.INTERNAL_ERROR, '직원 삭제 실패'),
      { status: 500 }
    );
  }
}
```

---

## 5. 서비스 레이어 규칙

### 5.1 서비스 구조

```typescript
// lib/services/employee.service.ts
import { eq, and, ilike, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { employees } from '@/lib/db/schema';
import type { Employee, CreateEmployeeInput, UpdateEmployeeInput } from '@/lib/types/employee';
import type { SearchParams } from '@/lib/types/api';
import { generatePineconeNamespace } from '@/lib/pinecone/namespaces';

/**
 * 직원 목록 조회
 */
export async function getEmployees(params: SearchParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    q,
    filters = {},
  } = params;

  const offset = (page - 1) * pageSize;

  // 필터 조건 빌드
  const conditions = [];

  if (q) {
    conditions.push(
      sql`(${employees.name} ILIKE ${'%' + q + '%'} OR ${employees.employeeId} ILIKE ${'%' + q + '%'})`
    );
  }

  if (filters.status) {
    conditions.push(eq(employees.status, filters.status as string));
  }

  if (filters.clearanceLevel) {
    conditions.push(eq(employees.clearanceLevel, filters.clearanceLevel as string));
  }

  // 쿼리 실행
  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(employees)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${sql.identifier(sortBy)} ${sql.raw(sortOrder)}`)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  const total = Number(countResult[0].count);

  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      hasMore: offset + data.length < total,
    },
  };
}

/**
 * 직원 ID로 조회
 */
export async function getEmployeeById(id: string): Promise<Employee | null> {
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, id))
    .limit(1);

  return employee || null;
}

/**
 * 직원 생성
 */
export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  const namespace = generatePineconeNamespace(input.employeeId);

  const [employee] = await db
    .insert(employees)
    .values({
      ...input,
      pineconeNamespace: namespace,
      ragEnabled: true,
    })
    .returning();

  return employee;
}

/**
 * 직원 수정
 */
export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput
): Promise<Employee | null> {
  const [employee] = await db
    .update(employees)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, id))
    .returning();

  return employee || null;
}

/**
 * 직원 삭제
 */
export async function deleteEmployee(id: string): Promise<void> {
  await db.delete(employees).where(eq(employees.id, id));
}
```

---

## 6. 에러 코드 표준

```typescript
// lib/constants/errors.ts

/**
 * API 에러 코드
 */
export const ERROR_CODES = {
  // 일반
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // 인증
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_KAKAO_NOT_LINKED: 'AUTH_KAKAO_NOT_LINKED',

  // 직원
  EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',
  EMPLOYEE_DUPLICATE_ID: 'EMPLOYEE_DUPLICATE_ID',
  EMPLOYEE_RAG_DISABLED: 'EMPLOYEE_RAG_DISABLED',

  // 문서
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  DOCUMENT_PROCESSING_FAILED: 'DOCUMENT_PROCESSING_FAILED',
  DOCUMENT_INVALID_FORMAT: 'DOCUMENT_INVALID_FORMAT',
  DOCUMENT_TOO_LARGE: 'DOCUMENT_TOO_LARGE',

  // 템플릿
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  TEMPLATE_MAPPING_INVALID: 'TEMPLATE_MAPPING_INVALID',

  // Pinecone
  PINECONE_UPSERT_FAILED: 'PINECONE_UPSERT_FAILED',
  PINECONE_QUERY_FAILED: 'PINECONE_QUERY_FAILED',
  PINECONE_NAMESPACE_NOT_FOUND: 'PINECONE_NAMESPACE_NOT_FOUND',

  // 충돌
  CONFLICT_DUPLICATE_PERIOD: 'CONFLICT_DUPLICATE_PERIOD',
  CONFLICT_RESOLUTION_REQUIRED: 'CONFLICT_RESOLUTION_REQUIRED',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * 에러 메시지 (한국어)
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INTERNAL_ERROR: '서버 오류가 발생했습니다',
  VALIDATION_ERROR: '입력값이 올바르지 않습니다',
  NOT_FOUND: '요청한 리소스를 찾을 수 없습니다',
  UNAUTHORIZED: '인증이 필요합니다',
  FORBIDDEN: '접근 권한이 없습니다',

  AUTH_INVALID_CREDENTIALS: '잘못된 인증 정보입니다',
  AUTH_SESSION_EXPIRED: '세션이 만료되었습니다',
  AUTH_KAKAO_NOT_LINKED: '카카오톡 계정이 연동되지 않았습니다',

  EMPLOYEE_NOT_FOUND: '직원을 찾을 수 없습니다',
  EMPLOYEE_DUPLICATE_ID: '이미 존재하는 사번입니다',
  EMPLOYEE_RAG_DISABLED: 'RAG 기능이 비활성화된 직원입니다',

  DOCUMENT_NOT_FOUND: '문서를 찾을 수 없습니다',
  DOCUMENT_PROCESSING_FAILED: '문서 처리에 실패했습니다',
  DOCUMENT_INVALID_FORMAT: '지원하지 않는 파일 형식입니다',
  DOCUMENT_TOO_LARGE: '파일 크기가 너무 큽니다',

  TEMPLATE_NOT_FOUND: '템플릿을 찾을 수 없습니다',
  TEMPLATE_MAPPING_INVALID: '컬럼 매핑이 올바르지 않습니다',

  PINECONE_UPSERT_FAILED: '벡터 저장에 실패했습니다',
  PINECONE_QUERY_FAILED: '벡터 검색에 실패했습니다',
  PINECONE_NAMESPACE_NOT_FOUND: '네임스페이스를 찾을 수 없습니다',

  CONFLICT_DUPLICATE_PERIOD: '해당 기간에 이미 데이터가 존재합니다',
  CONFLICT_RESOLUTION_REQUIRED: '충돌 해결이 필요합니다',
};
```

---

## 7. 임포트 순서

```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { NextRequest } from 'next/server';

// 2. 외부 라이브러리
import { z } from 'zod';
import { useForm } from 'react-hook-form';

// 3. 내부 컴포넌트 (UI)
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// 4. 내부 컴포넌트 (도메인)
import { EmployeeTable } from '@/components/employees/employee-table';

// 5. 아이콘 (Phosphor)
import { User, Phone, Envelope } from '@phosphor-icons/react';

// 6. 서비스/라이브러리
import { getEmployees } from '@/lib/services/employee.service';

// 7. 유틸리티
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';

// 8. 상수
import { CLEARANCE_LEVELS, ERROR_CODES } from '@/lib/constants';

// 9. 타입 (마지막)
import type { Employee } from '@/lib/types/employee';
```

---

## 8. 주석 규칙

```typescript
/**
 * 함수/클래스 설명
 * @param input - 파라미터 설명
 * @returns 반환값 설명
 * @throws 에러 조건
 * @example
 * ```typescript
 * const result = myFunction({ name: 'test' });
 * ```
 */
export function myFunction(input: Input): Output {
  // 단일 라인 주석

  /*
   * 멀티 라인 주석
   * 복잡한 로직 설명
   */

  // TODO: 추후 구현 필요
  // FIXME: 버그 수정 필요
  // HACK: 임시 해결책

  return output;
}
```
