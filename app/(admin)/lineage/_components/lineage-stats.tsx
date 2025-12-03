'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TreeStructure, Database, ChartLine, Folder } from '@phosphor-icons/react';
import { NAMESPACE_LABELS } from '@/lib/constants';

interface LineageStatsProps {
  statistics: {
    totalVectors: number;
    byNamespace: Record<string, number>;
    byDocument: Record<string, number>;
    recentActivity: { date: string; count: number }[];
  };
}

export function LineageStats({ statistics }: LineageStatsProps) {
  const documentCount = Object.keys(statistics.byDocument).length;
  const namespaceCount = Object.keys(statistics.byNamespace).length;
  const todayActivity = statistics.recentActivity.length > 0
    ? statistics.recentActivity[statistics.recentActivity.length - 1]?.count || 0
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">총 벡터 수</CardTitle>
          <TreeStructure className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.totalVectors.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Pinecone에 저장된 벡터
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">연결된 문서</CardTitle>
          <Folder className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{documentCount}</div>
          <p className="text-xs text-muted-foreground">
            벡터가 생성된 원본 문서
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">네임스페이스</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{namespaceCount}</div>
          <p className="text-xs text-muted-foreground">
            활성 네임스페이스 수
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">오늘 추가</CardTitle>
          <ChartLine className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayActivity}</div>
          <p className="text-xs text-muted-foreground">
            오늘 생성된 벡터
          </p>
        </CardContent>
      </Card>

      {/* Namespace breakdown */}
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">네임스페이스별 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(statistics.byNamespace).map(([namespace, count]) => (
              <div
                key={namespace}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {NAMESPACE_LABELS[namespace] || namespace}
                  </p>
                  <p className="text-xs text-muted-foreground">{namespace}</p>
                </div>
                <div className="text-lg font-bold">{count.toLocaleString()}</div>
              </div>
            ))}
            {Object.keys(statistics.byNamespace).length === 0 && (
              <p className="text-sm text-muted-foreground md:col-span-3">
                네임스페이스 데이터가 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
