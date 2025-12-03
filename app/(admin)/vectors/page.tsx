'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowClockwise, Database, FolderSimple, Code, Info } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { VectorStats } from './_components/vector-stats';
import { NamespaceList } from './_components/namespace-list';
import { VectorTable } from './_components/vector-table';
import { MetadataSchema } from './_components/metadata-schema';

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

interface NamespaceInfo {
  namespace: string;
  type: 'organization' | 'employee' | 'department' | 'document' | 'unknown';
  entityId: string;
  entityName: string | null;
  vectorCount: number;
}

interface VectorSample {
  id: string;
  dbId?: string;
  namespace: string;
  content?: string;
  chunkContent?: string;
  contentHash?: string;
  chunkIndex?: number;
  employeeId?: string | null;
  documentId?: string;
  documentName?: string;
  categoryName?: string;
  metadata: Record<string, unknown>;
}

interface MetadataField {
  field: string;
  type: string;
  description: string;
  example?: unknown;
  frequency: number;
}

interface ActualField {
  field: string;
  frequency: number;
  example?: unknown;
}

export default function VectorsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [namespaces, setNamespaces] = useState<NamespaceInfo[]>([]);
  const [vectors, setVectors] = useState<VectorSample[]>([]);
  const [schemas, setSchemas] = useState<Record<string, MetadataField[]> | null>(null);
  const [actualFields, setActualFields] = useState<ActualField[]>([]);

  // Loading states
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingNamespaces, setIsLoadingNamespaces] = useState(true);
  const [isLoadingVectors, setIsLoadingVectors] = useState(false);
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/vectors/explore?action=stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      } else {
        toast.error('통계 데이터를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast.error('통계 데이터를 불러올 수 없습니다.');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchNamespaces = useCallback(async () => {
    setIsLoadingNamespaces(true);
    try {
      const response = await fetch('/api/vectors/explore?action=namespaces');
      const result = await response.json();
      if (result.success) {
        setNamespaces(result.data.namespaces || []);
      } else {
        toast.error('네임스페이스 목록을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
      toast.error('네임스페이스 목록을 불러올 수 없습니다.');
    } finally {
      setIsLoadingNamespaces(false);
    }
  }, []);

  const fetchVectors = useCallback(async (namespace: string) => {
    setIsLoadingVectors(true);
    try {
      const response = await fetch(`/api/vectors/explore?action=vectors&namespace=${encodeURIComponent(namespace)}`);
      const result = await response.json();
      if (result.success) {
        setVectors(result.data.vectors || []);
      } else {
        toast.error('벡터 데이터를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch vectors:', error);
      toast.error('벡터 데이터를 불러올 수 없습니다.');
    } finally {
      setIsLoadingVectors(false);
    }
  }, []);

  const fetchSchema = useCallback(async () => {
    setIsLoadingSchema(true);
    try {
      const response = await fetch('/api/vectors/explore?action=schema');
      const result = await response.json();
      if (result.success) {
        setSchemas(result.data.schemas);
        setActualFields(result.data.actualFields);
      } else {
        toast.error('스키마 정보를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch schema:', error);
      toast.error('스키마 정보를 불러올 수 없습니다.');
    } finally {
      setIsLoadingSchema(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchNamespaces();
    fetchSchema();
  }, [fetchStats, fetchNamespaces, fetchSchema]);

  const handleViewVectors = (namespace: string) => {
    setSelectedNamespace(namespace);
    setActiveTab('vectors');
    fetchVectors(namespace);
  };

  const handleBackToNamespaces = () => {
    setSelectedNamespace(null);
    setActiveTab('namespaces');
    setVectors([]);
  };

  const handleRefresh = () => {
    fetchStats();
    fetchNamespaces();
    if (selectedNamespace) {
      fetchVectors(selectedNamespace);
    }
    toast.success('데이터를 새로고침했습니다.');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Pinecone 벡터 탐색기</h1>
          <p className="text-sm text-muted-foreground">
            벡터 데이터베이스에 저장된 임베딩과 메타데이터를 탐색합니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="w-full sm:w-auto">
          <ArrowClockwise size={16} className="mr-2" />
          새로고침
        </Button>
      </div>

      {/* Stats */}
      <VectorStats stats={stats} isLoading={isLoadingStats} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Info size={16} weight="duotone" />
            개요
          </TabsTrigger>
          <TabsTrigger value="namespaces">
            <FolderSimple size={16} weight="duotone" />
            네임스페이스
          </TabsTrigger>
          <TabsTrigger value="vectors">
            <Database size={16} weight="duotone" />
            벡터
          </TabsTrigger>
          <TabsTrigger value="schema">
            <Code size={16} weight="duotone" />
            스키마
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FolderSimple size={20} weight="duotone" className="text-primary" />
                  네임스페이스 구조
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  벡터 데이터의 논리적 분류 체계
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                  <div className="rounded-md bg-primary p-2 text-primary-foreground shrink-0">
                    <FolderSimple size={18} weight="fill" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm">org_&#123;categoryId&#125;</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      조직 전체에서 공유되는 문서. 카테고리별로 분류되어 검색 범위를 최적화합니다.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                  <div className="rounded-md bg-secondary p-2 text-secondary-foreground shrink-0">
                    <FolderSimple size={18} weight="fill" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm">emp_&#123;employeeId&#125;</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      특정 직원에게만 해당되는 개인화된 데이터. 급여, 실적 등 민감 정보 포함.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Code size={20} weight="duotone" className="text-primary" />
                  메타데이터 유형
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  벡터에 첨부되는 메타데이터 스키마
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {[
                    { name: 'base', desc: '기본 문서 메타데이터' },
                    { name: 'employee', desc: '직원 정보 (급여, 직급)' },
                    { name: 'mdrt', desc: 'MDRT 실적 데이터' },
                    { name: 'contract', desc: '계약 관련 정보' },
                    { name: 'generic', desc: '일반 PDF 페이지' },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="font-mono text-sm font-medium">{item.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="namespaces">
          <NamespaceList
            namespaces={namespaces}
            isLoading={isLoadingNamespaces}
            onViewVectors={handleViewVectors}
          />
        </TabsContent>

        <TabsContent value="vectors">
          {selectedNamespace ? (
            <VectorTable
              vectors={vectors}
              namespace={selectedNamespace}
              isLoading={isLoadingVectors}
              onBack={handleBackToNamespaces}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="rounded-full bg-muted p-4 w-fit mx-auto mb-4">
                  <FolderSimple size={32} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  벡터를 보려면 먼저 네임스페이스를 선택하세요.
                </p>
                <Button variant="outline" onClick={() => setActiveTab('namespaces')}>
                  네임스페이스 목록으로 이동
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schema">
          <MetadataSchema
            schemas={schemas}
            actualFields={actualFields}
            isLoading={isLoadingSchema}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
