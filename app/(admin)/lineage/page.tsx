import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { LineageTable } from './_components/lineage-table';
import { LineageStats } from './_components/lineage-stats';
import { Skeleton } from '@/components/ui/skeleton';
import { lineageService } from '@/lib/services/lineage.service';

async function LineageData() {
  const [lineageResult, statistics] = await Promise.all([
    lineageService.getLineage({}, 1, 20),
    lineageService.getStatistics(),
  ]);

  return (
    <>
      <LineageStats statistics={statistics} />
      <LineageTable
        initialData={{
          data: lineageResult.data,
          meta: {
            page: 1,
            pageSize: 20,
            total: lineageResult.total,
            totalPages: Math.ceil(lineageResult.total / 20),
          },
        }}
      />
    </>
  );
}

export default function LineagePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="데이터 계보"
        description="벡터 데이터의 원본 추적 및 계보 정보를 관리합니다."
      />

      <Suspense fallback={<LineagePageSkeleton />}>
        <LineageData />
      </Suspense>
    </div>
  );
}

function LineagePageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full" />
        ))}
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
