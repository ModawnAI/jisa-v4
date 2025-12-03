import { Suspense } from 'react';
import { Users, FileText, ChatCircle, Lightning } from '@phosphor-icons/react/dist/ssr';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { analyticsService } from '@/lib/services/analytics.service';
import { QueryTrendChart } from '@/components/analytics/query-trend-chart';
import { QueryTypeChart } from '@/components/analytics/query-type-chart';
import { DocumentStatusChart } from '@/components/analytics/document-status-chart';
import { AuditLogList } from '@/components/analytics/audit-log-list';

async function AnalyticsStats() {
  const [stats, processingRate, queryStats] = await Promise.all([
    analyticsService.getDashboardStats(),
    analyticsService.getProcessingRate(),
    analyticsService.getQueryStats(),
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="일일 활성 사용자"
        value={stats.activeEmployees}
        description="오늘 활동한 사용자"
        icon={<Users className="h-4 w-4" />}
      />
      <StatCard
        title="오늘 질문"
        value={queryStats.todayQueries}
        description={`총 ${queryStats.totalQueries}건`}
        icon={<ChatCircle className="h-4 w-4" />}
      />
      <StatCard
        title="문서 처리"
        value={stats.processedDocuments}
        description={`성공률 ${processingRate}%`}
        icon={<FileText className="h-4 w-4" />}
      />
      <StatCard
        title="평균 응답 시간"
        value={queryStats.avgResponseTime > 0 ? `${(queryStats.avgResponseTime / 1000).toFixed(1)}초` : '-'}
        description="질문 처리 시간"
        icon={<Lightning className="h-4 w-4" />}
      />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

async function QueryTrendSection() {
  const trendData = await analyticsService.getQueryTrend(7);
  return <QueryTrendChart data={trendData} />;
}

async function QueryTypeSection() {
  const typeData = await analyticsService.getQueryTypeDistribution();
  return <QueryTypeChart data={typeData} />;
}

async function DocumentStatusSection() {
  const statusData = await analyticsService.getStatusBreakdown();
  return <DocumentStatusChart data={statusData} />;
}

async function AuditLogSection() {
  const auditEntries = await analyticsService.getAuditLog(8);
  return <AuditLogList entries={auditEntries} />;
}

function ChartSkeleton() {
  return <Skeleton className="h-[300px]" />;
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="분석"
        description="시스템 사용량과 활동 내역을 확인합니다."
      />

      <Suspense fallback={<StatsSkeleton />}>
        <AnalyticsStats />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <QueryTrendSection />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <QueryTypeSection />
        </Suspense>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <DocumentStatusSection />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <AuditLogSection />
        </Suspense>
      </div>
    </div>
  );
}
