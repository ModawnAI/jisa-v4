'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Warning, CheckCircle, Clock, GitMerge } from '@phosphor-icons/react';
import { CONFLICT_TYPE_LABELS } from '@/lib/constants';

interface ConflictStatsProps {
  statistics: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    pendingCount: number;
  };
}

export function ConflictStats({ statistics }: ConflictStatsProps) {
  const resolvedCount =
    (statistics.byStatus['resolved_keep_existing'] || 0) +
    (statistics.byStatus['resolved_keep_new'] || 0) +
    (statistics.byStatus['resolved_merged'] || 0);

  const dismissedCount = statistics.byStatus['dismissed'] || 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">대기 중인 충돌</CardTitle>
          <Warning className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.pendingCount}</div>
          <p className="text-xs text-muted-foreground">
            검토가 필요한 충돌
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">해결됨</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{resolvedCount}</div>
          <p className="text-xs text-muted-foreground">
            성공적으로 해결된 충돌
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">무시됨</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dismissedCount}</div>
          <p className="text-xs text-muted-foreground">
            무시된 충돌
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">전체</CardTitle>
          <GitMerge className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.total}</div>
          <p className="text-xs text-muted-foreground">
            총 감지된 충돌
          </p>
        </CardContent>
      </Card>

      {/* Type breakdown */}
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">충돌 유형별 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {Object.entries(statistics.byType).map(([type, count]) => (
              <div
                key={type}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {CONFLICT_TYPE_LABELS[type] || type}
                  </p>
                </div>
                <div className="text-lg font-bold">{count}</div>
              </div>
            ))}
            {Object.keys(statistics.byType).length === 0 && (
              <p className="text-sm text-muted-foreground md:col-span-5">
                충돌 데이터가 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
