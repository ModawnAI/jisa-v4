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
  Star,
  Robot,
  MagnifyingGlass,
  ChatText,
  Lightning,
  Question,
  Warning,
  HandWaving,
  ClockCounterClockwise,
  FunnelSimple,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import type { PromptTemplate } from '@/lib/db/schema/prompt-templates';

// Label mappings for Korean display
const PROMPT_TYPE_LABELS: Record<string, string> = {
  system: '시스템',
  query_enhancement: '쿼리 향상',
  answer_generation: '답변 생성',
  commission_detection: '수수료 감지',
  employee_rag: '직원 RAG',
  error_response: '오류 응답',
  greeting: '인사말',
  no_results: '결과 없음',
};

const PROMPT_CATEGORY_LABELS: Record<string, string> = {
  kakao_chat: '카카오 챗봇',
  admin_chat: '관리자 챗',
  document_processing: '문서 처리',
  analytics: '분석',
};

const typeIcons: Record<string, React.ElementType> = {
  system: Robot,
  query_enhancement: MagnifyingGlass,
  answer_generation: ChatText,
  commission_detection: Lightning,
  employee_rag: Question,
  error_response: Warning,
  greeting: HandWaving,
  no_results: Question,
};

interface PromptTableProps {
  initialData: PromptTemplate[];
}

export function PromptTable({ initialData }: PromptTableProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const res = await fetch(`/api/prompts?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        setTemplates(result.data);
      }
    } catch {
      toast.error('프롬프트를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 프롬프트를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '삭제에 실패했습니다.');
      }

      toast.success('프롬프트가 삭제되었습니다.');
      fetchTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다.');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '기본값 설정에 실패했습니다.');
      }

      toast.success('기본 프롬프트로 설정되었습니다.');
      fetchTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '기본값 설정에 실패했습니다.');
    }
  };

  const TypeIcon = (type: string) => {
    const Icon = typeIcons[type] || Robot;
    return <Icon className="h-5 w-5" weight="duotone" />;
  };

  // Filter templates by search term
  const filteredTemplates = templates.filter((t) =>
    search === '' ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && templates.length === 0) {
    return <PromptTableSkeleton />;
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
                placeholder="프롬프트 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <FunnelSimple className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="타입" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 타입</SelectItem>
                  {Object.entries(PROMPT_TYPE_LABELS).map(([value, label]) => (
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
                  {Object.entries(PROMPT_CATEGORY_LABELS).map(([value, label]) => (
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
                <TableHead className="w-[50px]">타입</TableHead>
                <TableHead>프롬프트명</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead className="w-[80px]">모델</TableHead>
                <TableHead className="w-[80px]">버전</TableHead>
                <TableHead className="w-[100px]">상태</TableHead>
                <TableHead className="w-[120px]">수정일</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    등록된 프롬프트가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template) => (
                  <TableRow key={template.id} className={!template.isActive ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center justify-center text-blue-600">
                        {TypeIcon(template.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{template.name}</p>
                          {template.isDefault && (
                            <Star className="h-4 w-4 text-yellow-500" weight="fill" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{template.slug}</p>
                        {template.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PROMPT_CATEGORY_LABELS[template.category] || template.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {template.modelConfig?.model?.split('-').slice(-1)[0] || 'flash'}
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
                          <DropdownMenuItem onClick={() => router.push(`/prompts/${template.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/prompts/${template.id}/versions`)}>
                            <ClockCounterClockwise className="mr-2 h-4 w-4" />
                            버전 기록
                          </DropdownMenuItem>
                          {!template.isDefault && (
                            <DropdownMenuItem onClick={() => handleSetDefault(template.id)}>
                              <Star className="mr-2 h-4 w-4" />
                              기본값 설정
                            </DropdownMenuItem>
                          )}
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

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        총 {filteredTemplates.length}개의 프롬프트
      </div>
    </div>
  );
}

function PromptTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">타입</TableHead>
              <TableHead>프롬프트명</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead className="w-[80px]">모델</TableHead>
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
                <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
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
