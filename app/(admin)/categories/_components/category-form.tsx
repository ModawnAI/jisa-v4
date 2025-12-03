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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import {
  CLEARANCE_LABELS,
  NAMESPACE_TYPE_LABELS,
  type ClearanceLevel,
  type NamespaceType,
} from '@/lib/constants';
import { ArrowLeft, FloppyDisk } from '@phosphor-icons/react';
import Link from 'next/link';

const categoryFormSchema = z.object({
  name: z.string().min(1, '카테고리 이름은 필수입니다'),
  slug: z.string().min(1, '슬러그는 필수입니다'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.string().uuid().optional().nullable(),
  minClearanceLevel: z.enum(['basic', 'standard', 'advanced']),
  namespaceType: z.enum(['company', 'employee']),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  minClearanceLevel: string;
  namespaceType: string;
}

interface CategoryFormProps {
  category?: Category;
  parentId?: string;
}

export function CategoryForm({ category, parentId }: CategoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [parentOptions, setParentOptions] = useState<{ value: string; label: string }[]>([]);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name || '',
      slug: category?.slug || '',
      description: category?.description || '',
      icon: category?.icon || '',
      color: category?.color || '',
      parentId: category?.parentId || parentId || null,
      minClearanceLevel: (category?.minClearanceLevel as ClearanceLevel) || 'basic',
      namespaceType: (category?.namespaceType as NamespaceType) || 'company',
    },
  });

  const isEditMode = !!category;
  const watchName = form.watch('name');

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEditMode && watchName) {
      const newSlug = slugify(watchName);
      form.setValue('slug', newSlug);
    }
  }, [watchName, isEditMode, form]);

  // Fetch parent category options
  useEffect(() => {
    const fetchParents = async () => {
      try {
        const res = await fetch('/api/categories?format=select');
        const result = await res.json();
        if (result.success) {
          // Filter out the current category and its children for edit mode
          const options = result.data.filter(
            (opt: { value: string }) => opt.value !== category?.id
          );
          setParentOptions(options);
        }
      } catch (error) {
        console.error('Failed to fetch parent options:', error);
      }
    };

    fetchParents();
  }, [category?.id]);

  const onSubmit = async (data: CategoryFormData) => {
    setLoading(true);

    try {
      const url = isEditMode
        ? `/api/categories/${category.id}`
        : '/api/categories';

      const method = isEditMode ? 'PATCH' : 'POST';

      const body = {
        ...data,
        parentId: data.parentId || undefined,
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

      toast.success(isEditMode ? '카테고리가 수정되었습니다.' : '카테고리가 생성되었습니다.');
      router.push('/categories');
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
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>카테고리 이름 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 급여 문서" {...field} />
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
                    <Input placeholder="예: salary-documents" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL에 사용되는 고유 식별자입니다. 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.
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
                      placeholder="카테고리에 대한 설명을 입력하세요..."
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
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상위 카테고리</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="상위 카테고리 선택 (선택사항)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">없음 (최상위)</SelectItem>
                      {parentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    이 카테고리의 상위 카테고리를 선택하세요.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>접근 권한</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="minClearanceLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>최소 권한 레벨 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="권한 레벨 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CLEARANCE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    이 카테고리의 문서를 열람하기 위한 최소 권한 레벨입니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="namespaceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>네임스페이스 타입 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="네임스페이스 타입 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(NAMESPACE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    회사 전체: 모든 직원이 접근 가능 / 직원별: 해당 직원만 접근 가능
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/categories">
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
