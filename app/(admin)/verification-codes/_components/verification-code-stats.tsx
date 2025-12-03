'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, CheckCircle, XCircle, Clock } from '@phosphor-icons/react';

interface Stats {
  total: number;
  active: number;
  used: number;
  expired: number;
  revoked: number;
}

interface VerificationCodeStatsProps {
  stats: Stats | null;
}

export function VerificationCodeStats({ stats }: VerificationCodeStatsProps) {
  if (!stats) return null;

  const items = [
    {
      title: '활성 코드',
      value: stats.active,
      icon: Key,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: '사용됨',
      value: stats.used,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: '만료됨',
      value: stats.expired,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      title: '취소됨',
      value: stats.revoked,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <div className={`rounded-full p-2 ${item.bgColor}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} weight="bold" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              전체 {stats.total}개 중
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
