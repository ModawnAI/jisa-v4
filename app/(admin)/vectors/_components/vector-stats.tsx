'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Users, Folders, CheckCircle, WarningCircle } from '@phosphor-icons/react';

interface IndexStats {
  index: {
    name: string;
    dimension: number;
    totalVectorCount: number;
    namespaceCount: number;
  };
  database: {
    totalChunks: number;
    uniqueNamespaces: number;
    uniqueDocuments: number;
    uniqueEmployees: number;
  };
  syncStatus: {
    inSync: boolean;
    pineconeCount: number;
    databaseCount: number;
    difference: number;
  };
}

interface VectorStatsProps {
  stats: IndexStats | null;
  isLoading: boolean;
}

export function VectorStats({ stats, isLoading }: VectorStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          통계 데이터를 불러올 수 없습니다.
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      title: '전체 벡터',
      value: stats.index.totalVectorCount.toLocaleString(),
      subtitle: `${stats.index.dimension}차원`,
      icon: Database,
      color: 'text-primary',
    },
    {
      title: '네임스페이스',
      value: stats.index.namespaceCount,
      subtitle: `${stats.database.uniqueDocuments}개 문서`,
      icon: Folders,
      color: 'text-primary',
    },
    {
      title: '직원 데이터',
      value: stats.database.uniqueEmployees,
      subtitle: '개인 네임스페이스',
      icon: Users,
      color: 'text-primary',
    },
    {
      title: '동기화 상태',
      value: stats.syncStatus.inSync ? '정상' : `차이: ${stats.syncStatus.difference}`,
      subtitle: stats.syncStatus.inSync
        ? 'DB ↔ Pinecone 동기화됨'
        : `DB: ${stats.syncStatus.databaseCount} / PC: ${stats.syncStatus.pineconeCount}`,
      icon: stats.syncStatus.inSync ? CheckCircle : WarningCircle,
      color: stats.syncStatus.inSync ? 'text-primary' : 'text-destructive',
      badge: stats.syncStatus.inSync ? null : '확인 필요',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon size={20} className={card.color} weight="duotone" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{card.value}</div>
              {card.badge && (
                <Badge variant="destructive" className="text-xs">
                  {card.badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
