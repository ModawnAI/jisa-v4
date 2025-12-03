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
  Pencil,
  Trash,
  Copy,
  FileXls,
  FileCsv,
  FilePdf,
  FileDoc,
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  FunnelSimple,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { FILE_TYPE_LABELS, PROCESSING_MODE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fileType: string;
  processingMode: string;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
  } | null;
}

interface TemplateTableProps {
  initialData: {
    data: Template[];
    meta: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
  categories: { value: string; label: string }[];
}

const fileTypeIcons: Record<string, React.ElementType> = {
  excel: FileXls,
  csv: FileCsv,
  pdf: FilePdf,
  word: FileDoc,
};

export function TemplateTable({ initialData, categories }: TemplateTableProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialData.data);
  const [meta, setMeta] = useState(initialData.meta);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchTemplates = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', meta.pageSize.toString());
      if (search) params.append('search', search);
      if (fileTypeFilter !== 'all') params.append('fileType', fileTypeFilter);
      if (categoryFilter !== 'all') params.append('categoryId', categoryFilter);

      const res = await fetch(`/api/templates?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        setTemplates(result.data);
        setMeta(result.meta);
      }
    } catch {
      toast.error('템플릿을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchTemplates(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 템플릿을 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '삭제에 실패했습니다.');
      }

      toast.success('템플릿이 삭제되었습니다.');
      fetchTemplates(meta.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다.');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '복제에 실패했습니다.');
      }

      toast.success('템플릿이 복제되었습니다.');
      fetchTemplates(meta.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '복제에 실패했습니다.');
    }
  };

  const FileIcon = (fileType: string) => {
    const Icon = fileTypeIcons[fileType] || FileXls;
    return <Icon className="h-5 w-5" weight="duotone" />;
  };

  if (loading && templates.length === 0) {
    return <TemplateTableSkeleton />;
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
                placeholder="템플릿 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                <SelectTrigger className="w-[130px]">
                  <FunnelSimple className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="파일 타입" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 타입</SelectItem>
                  {Object.entries(FILE_TYPE_LABELS).map(([value, label]) => (
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
                <TableHead>템플릿명</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>처리 모드</TableHead>
                <TableHead className="w-[80px]">버전</TableHead>
                <TableHead className="w-[100px]">상태</TableHead>
                <TableHead className="w-[120px]">수정일</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    등록된 템플릿이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id} className={!template.isActive ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center justify-center text-emerald-600">
                        {FileIcon(template.fileType)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.category?.name || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {PROCESSING_MODE_LABELS[template.processingMode] || template.processingMode}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">v{template.version}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? 'default' : 'destructive'}>
                        {template.isActive ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(template.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <DotsThree className="h-4 w-4" weight="bold" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/templates/${template.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(template.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            복제
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(template.id)}
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
              onClick={() => fetchTemplates(meta.page - 1)}
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
              onClick={() => fetchTemplates(meta.page + 1)}
            >
              <CaretRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">타입</TableHead>
              <TableHead>템플릿명</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>처리 모드</TableHead>
              <TableHead className="w-[80px]">버전</TableHead>
              <TableHead className="w-[100px]">상태</TableHead>
              <TableHead className="w-[120px]">수정일</TableHead>
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
                <TableCell><Skeleton className="h-5 w-[40px]" /></TableCell>
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
