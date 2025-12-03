'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ChartPie } from '@phosphor-icons/react';
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS } from '@/lib/constants';

interface StatusBreakdown {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  partial: number;
}

export function StatusBreakdown() {
  const [data, setData] = useState<StatusBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics/status-breakdown');
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartPie className="h-5 w-5" />
            문서 상태 분포
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data
    ? Object.values(data).reduce((sum, val) => sum + val, 0)
    : 0;

  const statuses: (keyof StatusBreakdown)[] = [
    'completed',
    'processing',
    'pending',
    'partial',
    'failed',
  ];

  const colorMap: Record<string, string> = {
    completed: 'bg-green-500',
    processing: 'bg-blue-500',
    pending: 'bg-yellow-500',
    partial: 'bg-orange-500',
    failed: 'bg-red-500',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartPie className="h-5 w-5" />
          문서 상태 분포
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            문서가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {statuses.map((status) => {
              const count = data?.[status] ?? 0;
              const percentage = total > 0 ? (count / total) * 100 : 0;

              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={DOCUMENT_STATUS_COLORS[status] || 'secondary'}
                      className="text-xs"
                    >
                      {DOCUMENT_STATUS_LABELS[status] || status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {count}개 ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className={colorMap[status]} />
                </div>
              );
            })}

            <div className="pt-2 border-t mt-4">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>전체</span>
                <span>{total}개</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
