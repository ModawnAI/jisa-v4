# Phase 12: Analytics & Dashboard

**Duration**: 3 days
**Dependencies**: Phase 11 complete
**Deliverables**: Complete dashboard with analytics, charts, activity feed

---

## Task 12.1: Analytics Service

### 12.1.1 Analytics Service

**File**: `lib/services/analytics.service.ts`

```typescript
import { db } from '@/lib/db';
import { documents, employees, dataLineage, auditLogs } from '@/lib/db/schema';
import { eq, and, gte, lte, count, desc, sql } from 'drizzle-orm';

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalDocuments: number;
  processedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
  totalVectors: number;
  storageUsedMB: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  resourceType: string;
  resourceName: string;
  userEmail: string;
  createdAt: Date;
}

export class AnalyticsService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(organizationId: string): Promise<DashboardStats> {
    // Employee stats
    const [employeeStats] = await db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where status = 'active')`,
      })
      .from(employees)
      .where(eq(employees.organizationId, organizationId));

    // Document stats
    const [documentStats] = await db
      .select({
        total: count(),
        processed: sql<number>`count(*) filter (where processing_status = 'completed')`,
        pending: sql<number>`count(*) filter (where processing_status = 'pending')`,
        failed: sql<number>`count(*) filter (where processing_status = 'failed')`,
        totalSize: sql<number>`coalesce(sum(file_size), 0)`,
      })
      .from(documents)
      .where(eq(documents.organizationId, organizationId));

    // Vector count from lineage
    const orgDocs = await db.query.documents.findMany({
      where: eq(documents.organizationId, organizationId),
      columns: { id: true },
    });

    const docIds = orgDocs.map((d) => d.id);

    let vectorCount = 0;
    if (docIds.length > 0) {
      const [lineageStats] = await db
        .select({ count: count() })
        .from(dataLineage)
        .where(sql`${dataLineage.documentId} = ANY(${docIds})`);
      vectorCount = lineageStats?.count || 0;
    }

    return {
      totalEmployees: employeeStats?.total || 0,
      activeEmployees: employeeStats?.active || 0,
      totalDocuments: documentStats?.total || 0,
      processedDocuments: documentStats?.processed || 0,
      pendingDocuments: documentStats?.pending || 0,
      failedDocuments: documentStats?.failed || 0,
      totalVectors: vectorCount,
      storageUsedMB: Math.round((documentStats?.totalSize || 0) / 1024 / 1024),
    };
  }

  /**
   * Get document processing trend
   */
  async getDocumentTrend(
    organizationId: string,
    days = 30
  ): Promise<TimeSeriesData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`date(created_at)`,
        count: count(),
      })
      .from(documents)
      .where(
        and(
          eq(documents.organizationId, organizationId),
          gte(documents.createdAt, startDate)
        )
      )
      .groupBy(sql`date(created_at)`)
      .orderBy(sql`date(created_at)`);

    return results.map((r) => ({
      date: r.date,
      value: r.count,
    }));
  }

  /**
   * Get processing status breakdown
   */
  async getStatusBreakdown(organizationId: string) {
    const results = await db
      .select({
        status: documents.processingStatus,
        count: count(),
      })
      .from(documents)
      .where(eq(documents.organizationId, organizationId))
      .groupBy(documents.processingStatus);

    return results.reduce(
      (acc, r) => {
        acc[r.status] = r.count;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(
    organizationId: string,
    limit = 10
  ): Promise<ActivityItem[]> {
    const results = await db.query.auditLogs.findMany({
      where: eq(auditLogs.organizationId, organizationId),
      orderBy: [desc(auditLogs.createdAt)],
      limit,
    });

    return results.map((r) => ({
      id: r.id,
      action: r.action,
      resourceType: r.resourceType,
      resourceName: r.resourceName || '',
      userEmail: r.userEmail || '',
      createdAt: r.createdAt,
    }));
  }

  /**
   * Get employee distribution by department
   */
  async getDepartmentDistribution(organizationId: string) {
    const results = await db
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

    return results.map((r) => ({
      name: r.department || '미지정',
      value: r.count,
    }));
  }

  /**
   * Get vector count by namespace type
   */
  async getVectorDistribution(organizationId: string) {
    // Get org namespace
    const orgDocs = await db.query.documents.findMany({
      where: and(
        eq(documents.organizationId, organizationId),
        eq(documents.processingMode, 'company_wide')
      ),
      columns: { id: true },
    });

    const empDocs = await db.query.documents.findMany({
      where: and(
        eq(documents.organizationId, organizationId),
        eq(documents.processingMode, 'employee_split')
      ),
      columns: { id: true },
    });

    // This would need to be calculated from actual vector counts
    return {
      organization: orgDocs.length * 100, // Simplified
      employees: empDocs.length * 50,
    };
  }
}

export const analyticsService = new AnalyticsService();
```

### Tests for 12.1
- [ ] Dashboard stats
- [ ] Document trend
- [ ] Status breakdown
- [ ] Recent activity
- [ ] Department distribution

---

## Task 12.2: Dashboard Page

### 12.2.1 Dashboard Page

**File**: `app/(admin)/dashboard/page.tsx`

```typescript
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { analyticsService } from '@/lib/services/analytics.service';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { RecentActivity } from './_components/recent-activity';
import { ProcessingChart } from './_components/processing-chart';
import { StatusBreakdown } from './_components/status-breakdown';
import { QuickActions } from './_components/quick-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, FileText, Database, HardDrive } from '@phosphor-icons/react/dist/ssr';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user profile for organization ID
  // In a real app, this would come from the auth context
  const organizationId = 'demo-org-id'; // Placeholder

  return (
    <div className="space-y-6">
      <PageHeader
        title="대시보드"
        description="시스템 현황을 한눈에 확인하세요."
      />

      {/* Stats Grid */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection organizationId={organizationId} />
      </Suspense>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-80" />}>
          <ProcessingChart organizationId={organizationId} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-80" />}>
          <StatusBreakdown organizationId={organizationId} />
        </Suspense>
      </div>

      {/* Activity and Actions Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <RecentActivity organizationId={organizationId} />
          </Suspense>
        </div>
        <QuickActions />
      </div>
    </div>
  );
}

async function StatsSection({ organizationId }: { organizationId: string }) {
  const stats = await analyticsService.getDashboardStats(organizationId);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}
```

### 12.2.2 Processing Chart Component

**File**: `app/(admin)/dashboard/_components/processing-chart.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ProcessingChartProps {
  organizationId: string;
}

export function ProcessingChart({ organizationId }: ProcessingChartProps) {
  const [data, setData] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/analytics/document-trend?organizationId=${organizationId}`
        );
        const result = await res.json();
        setData(result);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>문서 처리 추이</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            로딩 중...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).getDate().toString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) =>
                  new Date(value).toLocaleDateString('ko-KR')
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

### 12.2.3 Recent Activity Component

**File**: `app/(admin)/dashboard/_components/recent-activity.tsx`

```typescript
import { analyticsService } from '@/lib/services/analytics.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate } from '@/lib/utils';
import {
  Plus,
  Pencil,
  Trash,
  Eye,
  ArrowCounterClockwise,
} from '@phosphor-icons/react/dist/ssr';

interface RecentActivityProps {
  organizationId: string;
}

const actionIcons: Record<string, any> = {
  create: Plus,
  update: Pencil,
  delete: Trash,
  access: Eye,
  rollback: ArrowCounterClockwise,
};

const actionLabels: Record<string, string> = {
  create: '생성',
  update: '수정',
  delete: '삭제',
  access: '조회',
  rollback: '롤백',
};

export async function RecentActivity({ organizationId }: RecentActivityProps) {
  const activities = await analyticsService.getRecentActivity(organizationId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 활동</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                최근 활동이 없습니다.
              </p>
            ) : (
              activities.map((activity) => {
                const Icon = actionIcons[activity.action] || Eye;

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 pb-4 border-b last:border-0"
                  >
                    <div className="rounded-full bg-muted p-2">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {actionLabels[activity.action] || activity.action}
                        </Badge>
                        <span className="text-sm font-medium">
                          {activity.resourceType}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activity.resourceName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.userEmail} · {formatDate(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

### 12.2.4 Quick Actions Component

**File**: `app/(admin)/dashboard/_components/quick-actions.tsx`

```typescript
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  UserPlus,
  Upload,
  Robot,
  Tag,
  FileXls,
} from '@phosphor-icons/react/dist/ssr';

const actions = [
  {
    title: '직원 추가',
    href: '/employees/new',
    icon: UserPlus,
    description: '새 직원을 등록합니다',
  },
  {
    title: '문서 업로드',
    href: '/documents/upload',
    icon: Upload,
    description: 'Excel 파일을 업로드합니다',
  },
  {
    title: 'AI 채팅',
    href: '/chat',
    icon: Robot,
    description: 'RAG 시스템과 대화합니다',
  },
  {
    title: '카테고리 관리',
    href: '/categories',
    icon: Tag,
    description: '카테고리를 관리합니다',
  },
  {
    title: '템플릿 관리',
    href: '/templates',
    icon: FileXls,
    description: 'Excel 템플릿을 관리합니다',
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>빠른 작업</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <Button
            key={action.href}
            variant="outline"
            className="w-full justify-start"
            asChild
          >
            <Link href={action.href}>
              <action.icon className="mr-3 h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">{action.title}</div>
                <div className="text-xs text-muted-foreground">
                  {action.description}
                </div>
              </div>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
```

### Tests for 12.2
- [ ] Dashboard page rendering
- [ ] Stats display
- [ ] Chart rendering
- [ ] Activity feed
- [ ] Quick actions

---

## Task 12.3: Analytics API Routes

### 12.3.1 Analytics API

**File**: `app/api/analytics/[...slug]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyticsService } from '@/lib/services/analytics.service';
import { withErrorHandler } from '@/lib/errors/handler';

interface RouteParams {
  params: Promise<{ slug: string[] }>;
}

export const GET = withErrorHandler(async (
  request: NextRequest,
  context: RouteParams
) => {
  const { slug } = await context.params;
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

  const endpoint = slug.join('/');

  switch (endpoint) {
    case 'stats':
      const stats = await analyticsService.getDashboardStats(organizationId);
      return NextResponse.json(stats);

    case 'document-trend':
      const days = parseInt(searchParams.get('days') || '30');
      const trend = await analyticsService.getDocumentTrend(organizationId, days);
      return NextResponse.json(trend);

    case 'status-breakdown':
      const breakdown = await analyticsService.getStatusBreakdown(organizationId);
      return NextResponse.json(breakdown);

    case 'activity':
      const limit = parseInt(searchParams.get('limit') || '10');
      const activity = await analyticsService.getRecentActivity(organizationId, limit);
      return NextResponse.json(activity);

    case 'departments':
      const departments = await analyticsService.getDepartmentDistribution(organizationId);
      return NextResponse.json(departments);

    default:
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
});
```

### Tests for 12.3
- [ ] Stats endpoint
- [ ] Trend endpoint
- [ ] Activity endpoint
- [ ] Department endpoint

---

## Phase Completion Checklist

- [ ] Analytics service
- [ ] Dashboard stats cards
- [ ] Processing trend chart
- [ ] Status breakdown pie chart
- [ ] Recent activity feed
- [ ] Quick actions
- [ ] Department distribution
- [ ] API routes
- [ ] All charts responsive
- [ ] All tests passing

---

## Next Phase

→ [Phase 13: Testing & Deployment](./PHASE-13-TESTING.md)
