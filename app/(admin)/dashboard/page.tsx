import { Suspense } from 'react';
import { Users, FileText, Database, Warning, HardDrive, Percent } from '@phosphor-icons/react/dist/ssr';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { analyticsService } from '@/lib/services/analytics.service';
import { ProcessingChart } from './_components/processing-chart';
import { StatusBreakdown } from './_components/status-breakdown';
import { RecentActivity } from './_components/recent-activity';
import { QuickActions } from './_components/quick-actions';

async function StatsSection() {
  const stats = await analyticsService.getDashboardStats();
  const processingRate = await analyticsService.getProcessingRate();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        title="전체 직원"
        value={stats.totalEmployees}
        description={`활성 ${stats.activeEmployees}명`}
        icon={<Users className="h-4 w-4" />}
      />
      <StatCard
        title="전체 문서"
        value={stats.totalDocuments}
        description={`처리완료 ${stats.processedDocuments}개`}
        icon={<FileText className="h-4 w-4" />}
        trend={
          stats.pendingDocuments > 0
            ? { value: stats.pendingDocuments, isPositive: false }
            : undefined
        }
      />
      <StatCard
        title="벡터 수"
        value={stats.totalVectors.toLocaleString()}
        description="Pinecone 저장"
        icon={<Database className="h-4 w-4" />}
      />
      <StatCard
        title="처리율"
        value={`${processingRate}%`}
        description="문서 처리 성공률"
        icon={<Percent className="h-4 w-4" />}
        trend={
          processingRate < 90
            ? { value: Math.round(100 - processingRate), isPositive: false }
            : undefined
        }
      />
      <StatCard
        title="대기 충돌"
        value={stats.pendingConflicts}
        description="해결 필요"
        icon={<Warning className="h-4 w-4" />}
        trend={
          stats.pendingConflicts > 0
            ? { value: stats.pendingConflicts, isPositive: false }
            : undefined
        }
      />
      <StatCard
        title="스토리지"
        value={`${stats.storageUsedMB} MB`}
        description="사용 중"
        icon={<HardDrive className="h-4 w-4" />}
      />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="대시보드"
        description="시스템 현황을 한눈에 확인하세요."
      />

      {/* Stats Grid */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <ProcessingChart />
        <StatusBreakdown />
      </div>

      {/* Activity and Actions Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <RecentActivity />
        </div>
        <QuickActions />
      </div>
    </div>
  );
}
