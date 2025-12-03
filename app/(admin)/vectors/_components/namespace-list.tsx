'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Buildings, User, Folder, File, Question, MagnifyingGlass, Eye, Hash, X } from '@phosphor-icons/react';

interface NamespaceInfo {
  namespace: string;
  type: 'organization' | 'employee' | 'department' | 'document' | 'unknown';
  entityId: string;
  entityName: string | null;
  vectorCount: number;
}

interface NamespaceListProps {
  namespaces: NamespaceInfo[];
  isLoading: boolean;
  onViewVectors: (namespace: string) => void;
}

const typeConfig: Record<
  NamespaceInfo['type'],
  { label: string; icon: typeof Buildings }
> = {
  organization: { label: '조직', icon: Buildings },
  employee: { label: '직원', icon: User },
  department: { label: '부서', icon: Folder },
  document: { label: '문서', icon: File },
  unknown: { label: '기타', icon: Question },
};

export function NamespaceList({ namespaces, isLoading, onViewVectors }: NamespaceListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<NamespaceInfo['type'] | 'all'>('all');

  const filteredNamespaces = namespaces.filter((ns) => {
    const matchesSearch =
      ns.namespace.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ns.entityName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ns.entityId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || ns.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const typeCounts = namespaces.reduce((acc, ns) => {
    acc[ns.type] = (acc[ns.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg">네임스페이스 목록</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Pinecone에 저장된 {namespaces.length}개의 네임스페이스
            </CardDescription>
          </div>
          {/* Type Filter Badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setTypeFilter('all')}
            >
              전체: {namespaces.length}
            </Badge>
            {Object.entries(typeConfig).map(([type, config]) => {
              const count = typeCounts[type] || 0;
              if (count === 0) return null;
              const Icon = config.icon;
              return (
                <Badge
                  key={type}
                  variant={typeFilter === type ? 'default' : 'outline'}
                  className="cursor-pointer text-xs gap-1"
                  onClick={() => setTypeFilter(typeFilter === type ? 'all' : (type as NamespaceInfo['type']))}
                >
                  <Icon size={12} weight="duotone" />
                  {config.label}: {count}
                </Badge>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Bar */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="네임스페이스, 엔티티 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          {(searchQuery || typeFilter !== 'all') && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
              }}
              className="shrink-0"
            >
              <X size={16} />
            </Button>
          )}
        </div>

        {/* Namespace Cards */}
        {filteredNamespaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Folder size={32} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {searchQuery || typeFilter !== 'all'
                ? '검색 결과가 없습니다.'
                : '네임스페이스가 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNamespaces.map((ns) => {
              const config = typeConfig[ns.type];
              const Icon = config.icon;
              return (
                <div
                  key={ns.namespace}
                  onClick={() => onViewVectors(ns.namespace)}
                  className="group relative rounded-lg border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="rounded-md p-1.5 bg-muted shrink-0">
                        <Icon size={16} weight="duotone" className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <code className="text-xs sm:text-sm font-mono font-medium truncate block">
                          {ns.namespace}
                        </code>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {config.label}
                    </Badge>
                  </div>

                  {/* Entity Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                    {ns.entityName && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-muted-foreground">이름:</span>
                        <span className="font-medium truncate">{ns.entityName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="text-muted-foreground">ID:</span>
                      <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {ns.entityId}
                      </code>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Hash size={14} />
                      <span className="font-mono">{ns.vectorCount.toLocaleString()}</span>
                      <span>벡터</span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewVectors(ns.namespace);
                      }}
                    >
                      <Eye size={14} className="mr-1" />
                      상세 보기
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
