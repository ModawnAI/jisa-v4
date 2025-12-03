'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DotsThree,
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  FunnelSimple,
  TreeStructure,
  File,
  Copy,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { NAMESPACE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils/date';

interface LineageRecord {
  id: string;
  targetPineconeId: string;
  targetNamespace: string;
  targetEmployeeId: string | null;
  sourceDocumentId: string;
  sourceFileUrl: string;
  sourceFileHash: string;
  chunkIndex: number | null;
  originalRowRange: string | null;
  createdAt: Date;
  sourceDocument?: {
    id: string;
    fileName: string;
    fileUrl: string;
    status: string;
  };
  processingBatch?: {
    id: string;
    batchNumber: number;
    status: string;
    period: string | null;
  };
}

interface LineageTableProps {
  initialData: {
    data: LineageRecord[];
    meta: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

export function LineageTable({ initialData }: LineageTableProps) {
  const [records, setRecords] = useState(initialData.data);
  const [meta, setMeta] = useState(initialData.meta);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState<string>('all');

  const fetchRecords = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', meta.pageSize.toString());
      if (search) params.append('pineconeIds', search);
      if (namespaceFilter !== 'all') params.append('namespace', namespaceFilter);

      const res = await fetch(`/api/lineage?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        setRecords(result.data);
        setMeta(result.meta);
      }
    } catch {
      toast.error('계보 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchRecords(1);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID가 복사되었습니다.');
  };

  const handleTraceToSource = async (pineconeId: string) => {
    try {
      const res = await fetch(`/api/lineage/trace?pineconeId=${encodeURIComponent(pineconeId)}`);
      const result = await res.json();

      if (result.success) {
        toast.success('추적 결과를 확인하세요.');
        // TODO: Open modal or navigate to detail view with result.data
      } else {
        throw new Error(result.error?.message || '추적에 실패했습니다.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '추적에 실패했습니다.');
    }
  };

  const getNamespaceLabel = (namespace: string) => {
    return NAMESPACE_LABELS[namespace] || namespace;
  };

  if (loading && records.length === 0) {
    return <LineageTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="벡터 ID 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={namespaceFilter} onValueChange={setNamespaceFilter}>
                <SelectTrigger className="w-[150px]">
                  <FunnelSimple className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="네임스페이스" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {Object.entries(NAMESPACE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} variant="secondary">
                검색
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>벡터 ID</TableHead>
                <TableHead>네임스페이스</TableHead>
                <TableHead>원본 문서</TableHead>
                <TableHead className="w-[80px]">청크</TableHead>
                <TableHead>배치 정보</TableHead>
                <TableHead className="w-[120px]">생성일</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    계보 정보가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                          {record.targetPineconeId}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyId(record.targetPineconeId)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getNamespaceLabel(record.targetNamespace)}
                      </Badge>
                      {record.targetEmployeeId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          직원: {record.targetEmployeeId.slice(0, 8)}...
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {record.sourceDocument?.fileName || '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          해시: {record.sourceFileHash.slice(0, 12)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.chunkIndex !== null ? `#${record.chunkIndex}` : '-'}
                      {record.originalRowRange && (
                        <p className="text-xs">행: {record.originalRowRange}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.processingBatch ? (
                        <div className="space-y-1">
                          <Badge variant="secondary">
                            배치 #{record.processingBatch.batchNumber}
                          </Badge>
                          {record.processingBatch.period && (
                            <p className="text-xs text-muted-foreground">
                              {record.processingBatch.period}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(record.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <DotsThree className="h-4 w-4" weight="bold" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleTraceToSource(record.targetPineconeId)}
                          >
                            <TreeStructure className="mr-2 h-4 w-4" />
                            원본 추적
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(`/documents/${record.sourceDocumentId}`, '_blank')}
                          >
                            <File className="mr-2 h-4 w-4" />
                            문서 보기
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCopyId(record.targetPineconeId)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            ID 복사
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            총 {meta.total}개 중 {(meta.page - 1) * meta.pageSize + 1} -{' '}
            {Math.min(meta.page * meta.pageSize, meta.total)}개
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={meta.page <= 1 || loading}
              onClick={() => fetchRecords(meta.page - 1)}
            >
              <CaretLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {meta.page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={meta.page >= meta.totalPages || loading}
              onClick={() => fetchRecords(meta.page + 1)}
            >
              <CaretRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LineageTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>벡터 ID</TableHead>
              <TableHead>네임스페이스</TableHead>
              <TableHead>원본 문서</TableHead>
              <TableHead className="w-[80px]">청크</TableHead>
              <TableHead>배치 정보</TableHead>
              <TableHead className="w-[120px]">생성일</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-6 w-[200px]" /></TableCell>
                <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
