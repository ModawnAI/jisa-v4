'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartLine } from '@phosphor-icons/react';

interface TimeSeriesData {
  date: string;
  value: number;
}

export function ProcessingChart() {
  const [data, setData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics/document-trend');
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

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartLine className="h-5 w-5" />
          문서 처리 추이
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            데이터가 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {data.slice(-14).map((item) => {
              const percentage = (item.value / maxValue) * 100;
              const date = new Date(item.date);
              const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

              return (
                <div key={item.date} className="flex items-center gap-2">
                  <span className="w-10 text-xs text-muted-foreground">{dateStr}</span>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs text-right">{item.value}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
