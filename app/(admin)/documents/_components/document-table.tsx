'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  DropdownMenuSeparator,
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
  Eye,
  Trash,
  DownloadSimple,
  FileXls,
  FileCsv,
  FilePdf,
  FileDoc,
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  FunnelSimple,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { PROCESSING_STATUS_LABELS } from '@/lib/constants';
import { formatDate, formatFileSize } from '@/lib/utils';

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  period: string | null;
  processedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
  } | null;
  template: {
    id: string;
    name: string;
  } | null;
  uploader: {
    id: string;
    name: string | null;
  } | null;
}

interface DocumentTableProps {
  initialData: {
    data: Document[];
    meta: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
  categories: { value: string; label: string }[];
  templates: { value: string; label: string }[];
}

const fileTypeIcons: Record<string, React.ElementType> = {
  excel: FileXls,
  csv: FileCsv,
  pdf: FilePdf,
  word: FileDoc,
};

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  processing: 'outline',
  completed: 'default',
  failed: 'destructive',
  partial: 'outline',
};

export function DocumentTable({ initialData, categories, templates }: DocumentTableProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialData.data);
  const [meta, setMeta] = useState(initialData.meta);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');

  const fetchDocuments = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', meta.pageSize.toString());
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('categoryId', categoryFilter);
      if (templateFilter !== 'all') params.append('templateId', templateFilter);

      const res = await fetch(`/api/documents?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        setDocuments(result.data);
        setMeta(result.meta);
      }
    } catch {
      toast.error('문서를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchDocuments(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 문서를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '삭제에 실패했습니다.');
      }

      toast.success('문서가 삭제되었습니다.');
      fetchDocuments(meta.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다.');
    }
  };

  const handleDownload = (id: string) => {
    window.open(`/api/documents/${id}/download?redirect=true`, '_blank');
  };

  const handleReprocess = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '재처리 요청에 실패했습니다.');
      }

      toast.success('재처리 요청이 완료되었습니다.');
      fetchDocuments(meta.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '재처리 요청에 실패했습니다.');
    }
  };

  const FileIcon = (fileType: string) => {
    const Icon = fileTypeIcons[fileType] || FileXls;
    return <Icon className="h-5 w-5" weight="duotone" />;
  };

  if (loading && documents.length === 0) {
    return <DocumentTableSkeleton />;
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
                placeholder="문서 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <FunnelSimple className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  {Object.entries(PROCESSING_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 카테고리</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="템플릿" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 템플릿</SelectItem>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.value} value={tpl.value}>
                      {tpl.label}
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
                <TableHead className="w-[50px]">타입</TableHead>
                <TableHead>파일명</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>템플릿</TableHead>
                <TableHead className="w-[100px]">크기</TableHead>
                <TableHead className="w-[100px]">상태</TableHead>
                <TableHead className="w-[120px]">업로드일</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    등록된 문서가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className="flex items-center justify-center text-emerald-600">
                        {FileIcon(document.fileType)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{document.fileName}</p>
                        {document.period && (
                          <p className="text-xs text-muted-foreground">
                            기간: {document.period}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{document.category?.name || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {document.template?.name || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatFileSize(document.fileSize)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[document.status] || 'secondary'}>
                        {PROCESSING_STATUS_LABELS[document.status] || document.status}
                      </Badge>
                      {document.status === 'failed' && document.errorMessage && (
                        <p className="mt-1 text-xs text-destructive line-clamp-1">
                          {document.errorMessage}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(document.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <DotsThree className="h-4 w-4" weight="bold" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/documents/${document.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            상세 보기
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(document.id)}>
                            <DownloadSimple className="mr-2 h-4 w-4" />
                            다운로드
                          </DropdownMenuItem>
                          {(document.status === 'failed' || document.status === 'partial') && (
                            <DropdownMenuItem onClick={() => handleReprocess(document.id)}>
                              <ArrowClockwise className="mr-2 h-4 w-4" />
                              재처리
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(document.id)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            삭제
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
              onClick={() => fetchDocuments(meta.page - 1)}
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
              onClick={() => fetchDocuments(meta.page + 1)}
            >
              <CaretRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">타입</TableHead>
              <TableHead>파일명</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>템플릿</TableHead>
              <TableHead className="w-[100px]">크기</TableHead>
              <TableHead className="w-[100px]">상태</TableHead>
              <TableHead className="w-[120px]">업로드일</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
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
