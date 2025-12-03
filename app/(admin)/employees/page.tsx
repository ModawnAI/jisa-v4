import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { EmployeeTable } from './_components/employee-table';
import { EmployeeFilters } from './_components/employee-filters';
import { Button } from '@/components/ui/button';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { employeeService } from '@/lib/services/employee.service';
import type { ClearanceLevel } from '@/lib/constants';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    isActive?: string;
    department?: string;
    clearanceLevel?: string;
  }>;
}

export default async function EmployeesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
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
        <Suspense fallback={<FiltersSkeleton />}>
          <EmployeeFilters />
        </Suspense>

        <Suspense fallback={<TableSkeleton />}>
          <EmployeeTableWrapper params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function EmployeeTableWrapper({ params }: { params: Record<string, string | undefined> }) {
  // Call service directly instead of HTTP fetch
  const filters = {
    search: params.search,
    isActive: params.isActive ? params.isActive === 'true' : undefined,
    department: params.department,
    clearanceLevel: params.clearanceLevel as ClearanceLevel | undefined,
  };

  const pagination = {
    page: parseInt(params.page || '1'),
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
  };

  let result;
  try {
    result = await employeeService.list(filters, pagination);
  } catch (error) {
    console.error('Failed to load employees:', error);
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
        직원 정보를 불러오는데 실패했습니다.
      </div>
    );
  }

  // Serialize dates for client component
  const serializedEmployees = (result.data || []).map((emp) => ({
    ...emp,
    createdAt: emp.createdAt.toISOString(),
    updatedAt: emp.updatedAt.toISOString(),
    hireDate: emp.hireDate?.toISOString() ?? null,
    terminationDate: emp.terminationDate?.toISOString() ?? null,
  }));

  return <EmployeeTable employees={serializedEmployees} pagination={result.pagination} />;
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Skeleton className="h-10 w-[200px]" />
      <Skeleton className="h-10 w-[150px]" />
      <Skeleton className="h-10 w-[150px]" />
    </div>
  );
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
