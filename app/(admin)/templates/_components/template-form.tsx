'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import {
  FILE_TYPE_LABELS,
  PROCESSING_MODE_LABELS,
  CHUNKING_STRATEGY_LABELS,
} from '@/lib/constants';
import { ArrowLeft, FloppyDisk } from '@phosphor-icons/react';
import Link from 'next/link';

const templateFormSchema = z.object({
  name: z.string().min(1, '템플릿 이름은 필수입니다'),
  slug: z.string().min(1, '슬러그는 필수입니다'),
  description: z.string().optional(),
  categoryId: z.string().uuid('카테고리를 선택해주세요'),
  fileType: z.enum(['excel', 'csv', 'pdf', 'word']),
  processingMode: z.enum(['company', 'employee_split', 'employee_aggregate']),
  chunkingStrategy: z.enum(['auto', 'row_per_chunk', 'fixed_size', 'semantic']),
  chunkSize: z.string().optional(),
  chunkOverlap: z.string().optional(),
  isRecurring: z.boolean(),
  recurringPeriod: z.string().optional().nullable(),
  retentionDays: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

interface Template {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  fileType: string;
  processingMode: string;
  chunkingStrategy: string;
  chunkSize: number | null;
  chunkOverlap: number | null;
  isRecurring: boolean;
  recurringPeriod: string | null;
  retentionDays: number | null;
}

interface TemplateFormProps {
  template?: Template;
  categories: { value: string; label: string }[];
}

export function TemplateForm({ template, categories }: TemplateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template?.name ?? '',
      slug: template?.slug ?? '',
      description: template?.description ?? '',
      categoryId: template?.categoryId ?? '',
      fileType: (template?.fileType as 'excel' | 'csv' | 'pdf' | 'word') ?? 'excel',
      processingMode: (template?.processingMode as 'company' | 'employee_split' | 'employee_aggregate') ?? 'company',
      chunkingStrategy: (template?.chunkingStrategy as 'auto' | 'row_per_chunk' | 'fixed_size' | 'semantic') ?? 'auto',
      chunkSize: template?.chunkSize?.toString() ?? '',
      chunkOverlap: template?.chunkOverlap?.toString() ?? '',
      isRecurring: template?.isRecurring ?? false,
      recurringPeriod: template?.recurringPeriod ?? undefined,
      retentionDays: template?.retentionDays?.toString() ?? '',
    },
  });

  const isEditMode = !!template;
  const watchName = form.watch('name');
  const watchIsRecurring = form.watch('isRecurring');
  const watchChunkingStrategy = form.watch('chunkingStrategy');

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEditMode && watchName) {
      const newSlug = slugify(watchName);
      form.setValue('slug', newSlug);
    }
  }, [watchName, isEditMode, form]);

  const onSubmit = async (data: TemplateFormData) => {
    setLoading(true);

    try {
      const url = isEditMode
        ? `/api/templates/${template.id}`
        : '/api/templates';

      const method = isEditMode ? 'PATCH' : 'POST';

      const body = {
        ...data,
        chunkSize: data.chunkSize ? parseInt(data.chunkSize, 10) : undefined,
        chunkOverlap: data.chunkOverlap ? parseInt(data.chunkOverlap, 10) : undefined,
        recurringPeriod: data.isRecurring ? data.recurringPeriod : undefined,
        retentionDays: data.retentionDays ? parseInt(data.retentionDays, 10) : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '저장에 실패했습니다.');
      }

      toast.success(isEditMode ? '템플릿이 수정되었습니다.' : '템플릿이 생성되었습니다.');
      router.push('/templates');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>템플릿의 기본 정보를 입력합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>템플릿 이름 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 급여 명세서 템플릿" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>슬러그 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: salary-statement" {...field} />
                  </FormControl>
                  <FormDescription>
                    고유 식별자입니다. 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="템플릿에 대한 설명을 입력하세요..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>카테고리 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="카테고리 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    이 템플릿이 속할 카테고리를 선택하세요.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* File Processing */}
        <Card>
          <CardHeader>
            <CardTitle>파일 처리 설정</CardTitle>
            <CardDescription>문서 파일 처리 방식을 설정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fileType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>파일 타입 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="파일 타입 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(FILE_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="processingMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>처리 모드 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="처리 모드 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PROCESSING_MODE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      회사 전체: 전 직원 공유 / 직원별: 개인별 처리
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Chunking Settings */}
        <Card>
          <CardHeader>
            <CardTitle>청킹 설정</CardTitle>
            <CardDescription>문서를 벡터 DB에 저장하기 위한 청킹 방식을 설정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="chunkingStrategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>청킹 전략 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="청킹 전략 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CHUNKING_STRATEGY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    자동: 파일 타입에 따라 자동 결정 / 행별: Excel/CSV 각 행 / 고정: 문자 수 기준 / 의미: AI 기반
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(watchChunkingStrategy === 'fixed_size' || watchChunkingStrategy === 'semantic') && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="chunkSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>청크 크기</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="예: 1000"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>문자 수 기준</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="chunkOverlap"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>청크 오버랩</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="예: 200"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>청크 간 중복 문자 수</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recurring Settings */}
        <Card>
          <CardHeader>
            <CardTitle>반복 설정</CardTitle>
            <CardDescription>정기적으로 업로드되는 문서에 대한 설정입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">반복 문서</FormLabel>
                    <FormDescription>
                      매월/분기/년 단위로 정기 업로드되는 문서인 경우 활성화하세요.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {watchIsRecurring && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="recurringPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>반복 주기</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="주기 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">월간</SelectItem>
                          <SelectItem value="quarterly">분기</SelectItem>
                          <SelectItem value="yearly">연간</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retentionDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>보존 기간 (일)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="예: 365"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>
                        이전 버전 데이터 보존 기간
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/templates">
              <ArrowLeft className="mr-2 h-4 w-4" />
              취소
            </Link>
          </Button>
          <Button type="submit" disabled={loading}>
            <FloppyDisk className="mr-2 h-4 w-4" weight="bold" />
            {loading ? '저장 중...' : isEditMode ? '수정' : '생성'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
