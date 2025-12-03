'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartBar } from '@phosphor-icons/react';

interface DocumentStatusChartProps {
  data: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    partial: number;
  };
}

const STATUS_CONFIG = [
  { key: 'pending', label: '대기', color: 'hsl(var(--muted-foreground))' },
  { key: 'processing', label: '처리중', color: 'hsl(var(--primary))' },
  { key: 'completed', label: '완료', color: 'hsl(142 76% 36%)' },
  { key: 'failed', label: '실패', color: 'hsl(0 84% 60%)' },
  { key: 'partial', label: '부분완료', color: 'hsl(38 92% 50%)' },
];

export function DocumentStatusChart({ data }: DocumentStatusChartProps) {
  const chartData = STATUS_CONFIG.map((config) => ({
    name: config.label,
    value: data[config.key as keyof typeof data],
    color: config.color,
  })).filter((item) => item.value > 0);

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBar className="h-5 w-5" />
          문서 처리 현황
        </CardTitle>
        <CardDescription>
          총 {total}개 문서의 처리 상태입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value}개`, '문서 수']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            <p>문서가 없습니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
