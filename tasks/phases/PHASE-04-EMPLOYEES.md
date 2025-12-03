# Phase 4: Employee Management

**Duration**: 3-4 days
**Dependencies**: Phase 3 complete
**Deliverables**: Complete CRUD for employees with search, filter, and namespace management

---

## Task 4.1: Employee Service Layer

### 4.1.1 Employee Service

**File**: `lib/services/employee.service.ts`

```typescript
import { db } from '@/lib/db';
import { employees, employeeDocuments } from '@/lib/db/schema';
import { eq, and, like, or, desc, asc, sql, count } from 'drizzle-orm';
import type { ClearanceLevel, EmployeeStatus, EmploymentType } from '@/lib/constants';
import { generateEmployeeNamespace } from '@/lib/utils/namespace';
import { AppError, ERROR_CODES } from '@/lib/errors';

export interface CreateEmployeeInput {
  organizationId: string;
  employeeNumber: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  employmentType?: EmploymentType;
  hireDate?: Date;
  clearanceLevel?: ClearanceLevel;
}

export interface UpdateEmployeeInput {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  employmentType?: EmploymentType;
  hireDate?: Date;
  terminationDate?: Date;
  clearanceLevel?: ClearanceLevel;
  status?: EmployeeStatus;
}

export interface EmployeeFilters {
  organizationId: string;
  search?: string;
  status?: EmployeeStatus;
  department?: string;
  clearanceLevel?: ClearanceLevel;
  employmentType?: EmploymentType;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class EmployeeService {
  /**
   * Create a new employee
   */
  async create(input: CreateEmployeeInput) {
    // Check for duplicate employee number
    const existing = await db.query.employees.findFirst({
      where: and(
        eq(employees.organizationId, input.organizationId),
        eq(employees.employeeNumber, input.employeeNumber)
      ),
    });

    if (existing) {
      throw new AppError(
        ERROR_CODES.EMPLOYEE_DUPLICATE,
        `직원 번호 ${input.employeeNumber}가 이미 존재합니다.`
      );
    }

    // Generate unique namespace for employee
    const pineconeNamespace = generateEmployeeNamespace(
      input.organizationId,
      input.employeeNumber
    );

    const [employee] = await db
      .insert(employees)
      .values({
        ...input,
        pineconeNamespace,
        clearanceLevel: input.clearanceLevel || 'basic',
        employmentType: input.employmentType || 'full_time',
      })
      .returning();

    return employee;
  }

  /**
   * Get employee by ID
   */
  async getById(id: string) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, id),
      with: {
        organization: true,
        documents: {
          with: {
            document: true,
          },
        },
      },
    });

    if (!employee) {
      throw new AppError(ERROR_CODES.EMPLOYEE_NOT_FOUND, '직원을 찾을 수 없습니다.');
    }

    return employee;
  }

  /**
   * Get employee by employee number
   */
  async getByEmployeeNumber(organizationId: string, employeeNumber: string) {
    return db.query.employees.findFirst({
      where: and(
        eq(employees.organizationId, organizationId),
        eq(employees.employeeNumber, employeeNumber)
      ),
    });
  }

  /**
   * List employees with filters and pagination
   */
  async list(filters: EmployeeFilters, pagination: PaginationParams) {
    const { organizationId, search, status, department, clearanceLevel, employmentType } = filters;
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

    // Build where conditions
    const conditions = [eq(employees.organizationId, organizationId)];

    if (search) {
      conditions.push(
        or(
          like(employees.name, `%${search}%`),
          like(employees.employeeNumber, `%${search}%`),
          like(employees.email, `%${search}%`),
          like(employees.department, `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(employees.status, status));
    }

    if (department) {
      conditions.push(eq(employees.department, department));
    }

    if (clearanceLevel) {
      conditions.push(eq(employees.clearanceLevel, clearanceLevel));
    }

    if (employmentType) {
      conditions.push(eq(employees.employmentType, employmentType));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(employees)
      .where(whereClause);

    // Get paginated results
    const sortColumn = employees[sortBy as keyof typeof employees] || employees.createdAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const results = await db.query.employees.findMany({
      where: whereClause,
      orderBy: orderFn(sortColumn),
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
   * Update employee
   */
  async update(id: string, input: UpdateEmployeeInput) {
    const [employee] = await db
      .update(employees)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();

    if (!employee) {
      throw new AppError(ERROR_CODES.EMPLOYEE_NOT_FOUND, '직원을 찾을 수 없습니다.');
    }

    return employee;
  }

  /**
   * Delete employee (soft delete by setting status to terminated)
   */
  async delete(id: string) {
    const [employee] = await db
      .update(employees)
      .set({
        status: 'terminated',
        terminationDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();

    if (!employee) {
      throw new AppError(ERROR_CODES.EMPLOYEE_NOT_FOUND, '직원을 찾을 수 없습니다.');
    }

    return employee;
  }

  /**
   * Get departments list for filters
   */
  async getDepartments(organizationId: string) {
    const result = await db
      .selectDistinct({ department: employees.department })
      .from(employees)
      .where(
        and(
          eq(employees.organizationId, organizationId),
          sql`${employees.department} IS NOT NULL`
        )
      )
      .orderBy(employees.department);

    return result.map((r) => r.department).filter(Boolean) as string[];
  }

  /**
   * Get employee statistics
   */
  async getStatistics(organizationId: string) {
    const stats = await db
      .select({
        status: employees.status,
        count: count(),
      })
      .from(employees)
      .where(eq(employees.organizationId, organizationId))
      .groupBy(employees.status);

    const byDepartment = await db
      .select({
        department: employees.department,
        count: count(),
      })
      .from(employees)
      .where(
        and(
          eq(employees.organizationId, organizationId),
          eq(employees.status, 'active')
        )
      )
      .groupBy(employees.department);

    return {
      byStatus: Object.fromEntries(stats.map((s) => [s.status, s.count])),
      byDepartment: Object.fromEntries(
        byDepartment.map((d) => [d.department || '미지정', d.count])
      ),
    };
  }
}

export const employeeService = new EmployeeService();
```

### Tests for 4.1
- [ ] Create employee with duplicate check
- [ ] Get by ID with relations
- [ ] List with all filter combinations
- [ ] Pagination and sorting
- [ ] Update employee
- [ ] Soft delete

---

## Task 4.2: Employee API Routes

### 4.2.1 List/Create Employees

**File**: `app/api/employees/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/lib/services/employee.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1, '직원 번호는 필수입니다'),
  name: z.string().min(1, '이름은 필수입니다'),
  email: z.string().email('유효한 이메일을 입력하세요').optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']).optional(),
  hireDate: z.string().datetime().optional(),
  clearanceLevel: z.enum(['basic', 'standard', 'advanced']).optional(),
});

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
    status: searchParams.get('status') as any,
    department: searchParams.get('department') || undefined,
    clearanceLevel: searchParams.get('clearanceLevel') as any,
    employmentType: searchParams.get('employmentType') as any,
  };

  const pagination = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
  };

  const result = await employeeService.list(filters, pagination);
  return NextResponse.json(result);
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

  const validated = createEmployeeSchema.parse(data);

  const employee = await employeeService.create({
    organizationId,
    ...validated,
    hireDate: validated.hireDate ? new Date(validated.hireDate) : undefined,
  });

  return NextResponse.json(employee, { status: 201 });
});
```

### 4.2.2 Single Employee Routes

**File**: `app/api/employees/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/lib/services/employee.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']).optional(),
  hireDate: z.string().datetime().optional(),
  terminationDate: z.string().datetime().optional(),
  clearanceLevel: z.enum(['basic', 'standard', 'advanced']).optional(),
  status: z.enum(['active', 'inactive', 'on_leave', 'terminated']).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = withErrorHandler(async (
  request: NextRequest,
  context: RouteParams
) => {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const employee = await employeeService.getById(id);
  return NextResponse.json(employee);
});

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context: RouteParams
) => {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validated = updateEmployeeSchema.parse(body);

  const employee = await employeeService.update(id, {
    ...validated,
    hireDate: validated.hireDate ? new Date(validated.hireDate) : undefined,
    terminationDate: validated.terminationDate ? new Date(validated.terminationDate) : undefined,
  });

  return NextResponse.json(employee);
});

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context: RouteParams
) => {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await employeeService.delete(id);
  return NextResponse.json({ success: true });
});
```

### Tests for 4.2
- [ ] GET employees list with filters
- [ ] POST create employee
- [ ] GET single employee
- [ ] PATCH update employee
- [ ] DELETE employee

---

## Task 4.3: Employee List Page

### 4.3.1 Employee List Page

**File**: `app/(admin)/employees/page.tsx`

```typescript
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/page-header';
import { EmployeeTable } from './_components/employee-table';
import { EmployeeFilters } from './_components/employee-filters';
import { Button } from '@/components/ui/button';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    department?: string;
  }>;
}

export default async function EmployeesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div>
      <PageHeader
        title="직원 관리"
        description="조직의 직원을 관리하고 RAG 시스템 접근 권한을 설정합니다."
      >
        <Button asChild>
          <Link href="/employees/new">
            <Plus className="mr-2 h-4 w-4" />
            직원 추가
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-4">
        <EmployeeFilters />

        <Suspense fallback={<TableSkeleton />}>
          <EmployeeTableWrapper params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function EmployeeTableWrapper({ params }: { params: Record<string, string | undefined> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user profile to get organization ID
  const profileRes = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/profile?userId=${user?.id}`,
    { cache: 'no-store' }
  );
  const profile = await profileRes.json();

  // Fetch employees
  const searchParams = new URLSearchParams({
    organizationId: profile.organizationId,
    page: params.page || '1',
    limit: '10',
    ...(params.search && { search: params.search }),
    ...(params.status && { status: params.status }),
    ...(params.department && { department: params.department }),
  });

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/employees?${searchParams}`,
    { cache: 'no-store' }
  );
  const { data, pagination } = await res.json();

  return <EmployeeTable employees={data} pagination={pagination} />;
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
```

### 4.3.2 Employee Filters

**File**: `app/(admin)/employees/_components/employee-filters.tsx`

```typescript
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { EMPLOYEE_STATUS_LABELS } from '@/lib/constants';

export function EmployeeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset to first page
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    updateFilter('search', term || null);
  }, 300);

  const clearFilters = () => {
    router.push(pathname);
  };

  const hasFilters = searchParams.has('search') || searchParams.has('status') || searchParams.has('department');

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="이름, 사번, 이메일 검색..."
          defaultValue={searchParams.get('search') || ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select
        value={searchParams.get('status') || ''}
        onValueChange={(value) => updateFilter('status', value || null)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">전체</SelectItem>
          {Object.entries(EMPLOYEE_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          필터 초기화
        </Button>
      )}
    </div>
  );
}
```

### 4.3.3 Employee Table

**File**: `app/(admin)/employees/_components/employee-table.tsx`

```typescript
'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DotsThree, Eye, Pencil, Trash, Robot } from '@phosphor-icons/react';
import { Pagination } from '@/components/ui/pagination';
import { formatDate } from '@/lib/utils';
import { EMPLOYEE_STATUS_LABELS, CLEARANCE_LABELS } from '@/lib/constants';

interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  email?: string;
  department?: string;
  position?: string;
  status: string;
  clearanceLevel: string;
  createdAt: string;
}

interface EmployeeTableProps {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  inactive: 'secondary',
  on_leave: 'outline',
  terminated: 'destructive',
};

const clearanceVariants: Record<string, string> = {
  basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  standard: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  advanced: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

export function EmployeeTable({ employees, pagination }: EmployeeTableProps) {
  const router = useRouter();

  const handleRowClick = (id: string) => {
    router.push(`/employees/${id}`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>직원</TableHead>
              <TableHead>부서/직급</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>권한 레벨</TableHead>
              <TableHead>등록일</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  직원이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(employee.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>
                          {employee.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {employee.employeeNumber}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{employee.department || '-'}</div>
                    <div className="text-sm text-muted-foreground">
                      {employee.position || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[employee.status]}>
                      {EMPLOYEE_STATUS_LABELS[employee.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${clearanceVariants[employee.clearanceLevel]}`}>
                      {CLEARANCE_LABELS[employee.clearanceLevel]}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(employee.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <DotsThree className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/employees/${employee.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          상세 보기
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/employees/${employee.id}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/chat?employeeId=${employee.id}`)}>
                          <Robot className="mr-2 h-4 w-4" />
                          AI 채팅
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash className="mr-2 h-4 w-4" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
      />
    </div>
  );
}
```

### Tests for 4.3
- [ ] Employee list page rendering
- [ ] Filter functionality
- [ ] Search debouncing
- [ ] Pagination
- [ ] Row click navigation

---

## Task 4.4: Employee Detail & Form Pages

### 4.4.1 Employee Detail Page

**File**: `app/(admin)/employees/[id]/page.tsx`

```typescript
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { employeeService } from '@/lib/services/employee.service';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Robot, FileText, ClockCounterClockwise } from '@phosphor-icons/react/dist/ssr';
import { formatDate } from '@/lib/utils';
import { EMPLOYEE_STATUS_LABELS, CLEARANCE_LABELS } from '@/lib/constants';
import { EmployeeDocuments } from './_components/employee-documents';
import { EmployeeActivity } from './_components/employee-activity';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { id } = await params;

  let employee;
  try {
    employee = await employeeService.getById(id);
  } catch {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title={employee.name}
        description={`사번: ${employee.employeeNumber} | ${employee.department || '부서 미지정'}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/chat?employeeId=${employee.id}`}>
              <Robot className="mr-2 h-4 w-4" />
              AI 채팅
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/employees/${employee.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              수정
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Info Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow label="이름" value={employee.name} />
            <InfoRow label="사번" value={employee.employeeNumber} />
            <InfoRow label="이메일" value={employee.email || '-'} />
            <InfoRow label="연락처" value={employee.phone || '-'} />
            <InfoRow label="부서" value={employee.department || '-'} />
            <InfoRow label="직급" value={employee.position || '-'} />
            <InfoRow
              label="상태"
              value={
                <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                  {EMPLOYEE_STATUS_LABELS[employee.status]}
                </Badge>
              }
            />
            <InfoRow
              label="권한 레벨"
              value={CLEARANCE_LABELS[employee.clearanceLevel]}
            />
            <InfoRow label="입사일" value={employee.hireDate ? formatDate(employee.hireDate) : '-'} />
            <InfoRow label="등록일" value={formatDate(employee.createdAt)} />
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="documents">
            <TabsList>
              <TabsTrigger value="documents">
                <FileText className="mr-2 h-4 w-4" />
                문서
              </TabsTrigger>
              <TabsTrigger value="activity">
                <ClockCounterClockwise className="mr-2 h-4 w-4" />
                활동 내역
              </TabsTrigger>
            </TabsList>
            <TabsContent value="documents" className="mt-4">
              <EmployeeDocuments employeeId={employee.id} />
            </TabsContent>
            <TabsContent value="activity" className="mt-4">
              <EmployeeActivity employeeId={employee.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
```

### 4.4.2 Employee Form

**File**: `app/(admin)/employees/new/page.tsx`

```typescript
import { PageHeader } from '@/components/admin/page-header';
import { EmployeeForm } from '../_components/employee-form';

export default function NewEmployeePage() {
  return (
    <div>
      <PageHeader
        title="직원 추가"
        description="새로운 직원을 시스템에 등록합니다."
      />
      <EmployeeForm />
    </div>
  );
}
```

**File**: `app/(admin)/employees/_components/employee-form.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { EMPLOYEE_STATUS_LABELS, CLEARANCE_LABELS, EMPLOYMENT_TYPE_LABELS } from '@/lib/constants';
import { Spinner } from '@phosphor-icons/react';

const employeeSchema = z.object({
  employeeNumber: z.string().min(1, '사번은 필수입니다'),
  name: z.string().min(1, '이름은 필수입니다'),
  email: z.string().email('유효한 이메일을 입력하세요').optional().or(z.literal('')),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']).optional(),
  hireDate: z.date().optional(),
  clearanceLevel: z.enum(['basic', 'standard', 'advanced']).optional(),
  status: z.enum(['active', 'inactive', 'on_leave', 'terminated']).optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  employee?: EmployeeFormData & { id: string };
}

export function EmployeeForm({ employee }: EmployeeFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeNumber: employee?.employeeNumber || '',
      name: employee?.name || '',
      email: employee?.email || '',
      phone: employee?.phone || '',
      department: employee?.department || '',
      position: employee?.position || '',
      employmentType: employee?.employmentType || 'full_time',
      hireDate: employee?.hireDate,
      clearanceLevel: employee?.clearanceLevel || 'basic',
      status: employee?.status || 'active',
    },
  });

  const onSubmit = async (data: EmployeeFormData) => {
    setLoading(true);

    try {
      const url = employee ? `/api/employees/${employee.id}` : '/api/employees';
      const method = employee ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          organizationId: 'TODO_GET_FROM_CONTEXT', // Will be filled from auth context
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || '저장에 실패했습니다.');
      }

      toast({
        title: employee ? '직원 정보가 수정되었습니다.' : '직원이 추가되었습니다.',
      });

      router.push('/employees');
      router.refresh();
    } catch (error: any) {
      toast({
        title: '오류가 발생했습니다.',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>직원 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="employeeNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사번 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="EMP001" disabled={!!employee} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="홍길동" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@company.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연락처</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="010-1234-5678" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>부서</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="영업부" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>직급</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="과장" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>고용 형태</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="고용 형태 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>입사일</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        onSelect={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clearanceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>권한 레벨</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="권한 레벨 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CLEARANCE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      RAG 시스템에서 접근할 수 있는 문서의 범위를 결정합니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {employee && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상태</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="상태 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(EMPLOYEE_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
              {employee ? '수정' : '추가'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
```

### Tests for 4.4
- [ ] Employee detail page
- [ ] Employee form validation
- [ ] Create employee flow
- [ ] Edit employee flow

---

## Phase Completion Checklist

- [ ] Employee service with CRUD
- [ ] API routes working
- [ ] Employee list with filters
- [ ] Employee detail page
- [ ] Create/Edit forms
- [ ] Namespace generation
- [ ] Status badges
- [ ] Clearance level badges
- [ ] Pagination
- [ ] All tests passing

---

## Next Phase

→ [Phase 5: Category Management](./PHASE-05-CATEGORIES.md)
