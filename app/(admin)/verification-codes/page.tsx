import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { VerificationCodeTable } from './_components/verification-code-table';
import { VerificationCodeFilters } from './_components/verification-code-filters';
import { VerificationCodeStats } from './_components/verification-code-stats';
import { CreateCodeDialog } from './_components/create-code-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { verificationCodeService } from '@/lib/services/verification-code.service';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function VerificationCodesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="인증 코드 관리"
        description="직원 카카오톡 인증 코드를 생성하고 관리합니다."
      >
        <CreateCodeDialog />
      </PageHeader>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsWrapper />
      </Suspense>

      <div className="space-y-4">
        <Suspense fallback={<FiltersSkeleton />}>
          <VerificationCodeFilters />
        </Suspense>

        <Suspense fallback={<TableSkeleton />}>
          <TableWrapper params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function StatsWrapper() {
  let stats;
  try {
    stats = await verificationCodeService.getStats();
  } catch (error) {
    console.error('Failed to load stats:', error);
    return null;
  }
  return <VerificationCodeStats stats={stats} />;
}

async function TableWrapper({ params }: { params: Record<string, string | undefined> }) {
  const filters = {
    search: params.search,
    status: params.status as 'active' | 'used' | 'expired' | 'revoked' | undefined,
  };

  const pagination = {
    page: parseInt(params.page || '1'),
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
  };

  let result;
  try {
    result = await verificationCodeService.list(filters, pagination);
  } catch (error) {
    console.error('Failed to load verification codes:', error);
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
        인증 코드를 불러오는데 실패했습니다.
      </div>
    );
  }

  // Serialize dates for client component
  const serializedCodes = (result.data || []).map((code) => ({
    ...code,
    expiresAt: code.expiresAt?.toISOString() ?? null,
    usedAt: code.usedAt?.toISOString() ?? null,
    createdAt: code.createdAt?.toISOString() ?? null,
  }));

  return <VerificationCodeTable codes={serializedCodes} pagination={result.meta} />;
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Skeleton className="h-10 w-[200px]" />
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
