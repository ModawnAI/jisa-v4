import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { ConflictTable } from './_components/conflict-table';
import { ConflictStats } from './_components/conflict-stats';
import { Skeleton } from '@/components/ui/skeleton';
import { conflictService } from '@/lib/services/conflict.service';

async function ConflictData() {
  const [conflictsResult, statistics] = await Promise.all([
    conflictService.getConflicts({}, 1, 20),
    conflictService.getStatistics(),
  ]);

  return (
    <>
      <ConflictStats statistics={statistics} />
      <ConflictTable
        initialData={{
          data: conflictsResult.data,
          meta: {
            page: 1,
            pageSize: 20,
            total: conflictsResult.total,
            totalPages: Math.ceil(conflictsResult.total / 20),
          },
        }}
      />
    </>
  );
}

export default function ConflictsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="충돌 관리"
        description="문서 간 충돌을 감지하고 해결합니다."
      />

      <Suspense fallback={<ConflictsPageSkeleton />}>
        <ConflictData />
      </Suspense>
    </div>
  );
}

function ConflictsPageSkeleton() {
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
