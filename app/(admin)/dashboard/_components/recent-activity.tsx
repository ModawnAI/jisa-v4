'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils/date';
import {
  Upload,
  Spinner,
  CheckCircle,
  XCircle,
  ClockCounterClockwise,
} from '@phosphor-icons/react';

interface ActivityItem {
  id: string;
  action: 'upload' | 'process' | 'complete' | 'fail';
  resourceType: 'document' | 'employee';
  resourceName: string;
  timestamp: Date;
}

const actionConfig: Record<string, {
  icon: React.ElementType;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  upload: {
    icon: Upload,
    label: '업로드',
    variant: 'outline',
  },
  process: {
    icon: Spinner,
    label: '처리중',
    variant: 'secondary',
  },
  complete: {
    icon: CheckCircle,
    label: '완료',
    variant: 'default',
  },
  fail: {
    icon: XCircle,
    label: '실패',
    variant: 'destructive',
  },
};

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics/activity');
        const result = await res.json();
        if (result.success) {
          setActivities(result.data);
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
            <ClockCounterClockwise className="h-5 w-5" />
            최근 활동
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockCounterClockwise className="h-5 w-5" />
          최근 활동
        </CardTitle>
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
                const config = actionConfig[activity.action] || actionConfig.upload;
                const Icon = config.icon;

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
                        <Badge variant={config.variant}>
                          {config.label}
                        </Badge>
                        <span className="text-sm font-medium">
                          {activity.resourceType === 'document' ? '문서' : '직원'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {activity.resourceName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(new Date(activity.timestamp))}
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
