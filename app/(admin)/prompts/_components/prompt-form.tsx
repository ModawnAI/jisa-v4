'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import { ArrowLeft, FloppyDisk, Plus, Trash, Code, TextAa } from '@phosphor-icons/react';
import Link from 'next/link';
import type { PromptTemplate, PromptVariable } from '@/lib/db/schema/prompt-templates';

// Label mappings
const PROMPT_TYPE_OPTIONS = [
  { value: 'system', label: '시스템', description: 'AI 기본 성격 설정' },
  { value: 'query_enhancement', label: '쿼리 향상', description: 'Pinecone 검색 최적화' },
  { value: 'answer_generation', label: '답변 생성', description: 'RAG 기반 최종 답변' },
  { value: 'commission_detection', label: '수수료 감지', description: '수수료 질문 판별' },
  { value: 'employee_rag', label: '직원 RAG', description: '직원별 RAG 프롬프트' },
  { value: 'error_response', label: '오류 응답', description: '오류 메시지 템플릿' },
  { value: 'greeting', label: '인사말', description: '환영 메시지' },
  { value: 'no_results', label: '결과 없음', description: '검색 결과 없음 메시지' },
];

const PROMPT_CATEGORY_OPTIONS = [
  { value: 'kakao_chat', label: '카카오 챗봇' },
  { value: 'admin_chat', label: '관리자 챗' },
  { value: 'document_processing', label: '문서 처리' },
  { value: 'analytics', label: '분석' },
];

const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (추천)' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

const VARIABLE_TYPES = [
  { value: 'string', label: '문자열' },
  { value: 'number', label: '숫자' },
  { value: 'boolean', label: '불린' },
  { value: 'json', label: 'JSON' },
  { value: 'array', label: '배열' },
];

const VARIABLE_SOURCES = [
  { value: 'user_input', label: '사용자 입력' },
  { value: 'system', label: '시스템' },
  { value: 'database', label: '데이터베이스' },
  { value: 'context', label: '컨텍스트' },
];

const variableSchema = z.object({
  name: z.string().min(1, '변수명은 필수입니다').regex(/^\w+$/, '영문, 숫자, 밑줄만 사용 가능'),
  description: z.string().min(1, '설명은 필수입니다'),
  required: z.boolean(),
  defaultValue: z.string().optional(),
  type: z.enum(['string', 'number', 'boolean', 'json', 'array']),
  source: z.enum(['user_input', 'system', 'database', 'context']).optional(),
});

const promptFormSchema = z.object({
  name: z.string().min(1, '프롬프트 이름은 필수입니다'),
  slug: z.string().min(1, '슬러그는 필수입니다').regex(/^[a-z0-9-]+$/, '소문자, 숫자, 하이픈만 사용'),
  description: z.string().optional(),
  type: z.enum(['system', 'query_enhancement', 'answer_generation', 'commission_detection', 'employee_rag', 'error_response', 'greeting', 'no_results']),
  category: z.enum(['kakao_chat', 'admin_chat', 'document_processing', 'analytics']),
  content: z.string().min(1, '프롬프트 내용은 필수입니다'),
  variables: z.array(variableSchema),
  modelConfig: z.object({
    model: z.string(),
    temperature: z.number().min(0).max(1),
    maxOutputTokens: z.number().min(1).max(8192),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().min(1).max(100).optional(),
  }),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  changeNote: z.string().optional(),
});

type PromptFormData = z.infer<typeof promptFormSchema>;

interface PromptFormProps {
  template?: PromptTemplate;
}

export function PromptForm({ template }: PromptFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const form = useForm<PromptFormData>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: {
      name: template?.name ?? '',
      slug: template?.slug ?? '',
      description: template?.description ?? '',
      type: (template?.type as PromptFormData['type']) ?? 'system',
      category: (template?.category as PromptFormData['category']) ?? 'kakao_chat',
      content: template?.content ?? '',
      variables: (template?.variables as PromptVariable[]) ?? [],
      modelConfig: {
        model: template?.modelConfig?.model ?? 'gemini-2.0-flash',
        temperature: template?.modelConfig?.temperature ?? 0.7,
        maxOutputTokens: template?.modelConfig?.maxOutputTokens ?? 1024,
        topP: template?.modelConfig?.topP,
        topK: template?.modelConfig?.topK,
      },
      isActive: template?.isActive ?? true,
      isDefault: template?.isDefault ?? false,
      changeNote: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variables',
  });

  const isEditMode = !!template;
  const watchName = form.watch('name');
  const watchContent = form.watch('content');
  const watchVariables = form.watch('variables');

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEditMode && watchName) {
      const newSlug = slugify(watchName);
      form.setValue('slug', newSlug);
    }
  }, [watchName, isEditMode, form]);

  // Extract variables from content
  const extractedVariables = watchContent?.match(/\{\{(\w+)\}\}/g)?.map(v => v.slice(2, -2)) ?? [];
  const definedVariables = watchVariables?.map(v => v.name) ?? [];
  const undefinedVariables = extractedVariables.filter(v => !definedVariables.includes(v));

  const onSubmit = async (data: PromptFormData) => {
    setLoading(true);

    try {
      const url = isEditMode ? `/api/prompts/${template.id}` : '/api/prompts';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '저장에 실패했습니다.');
      }

      toast.success(isEditMode ? '프롬프트가 수정되었습니다.' : '프롬프트가 생성되었습니다.');
      router.push('/prompts');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addVariable = (name?: string) => {
    append({
      name: name ?? '',
      description: '',
      required: false,
      defaultValue: '',
      type: 'string',
      source: 'user_input',
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>프롬프트의 기본 정보를 입력합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>프롬프트 이름 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 시스템 기본 프롬프트" {...field} />
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
                    <Input placeholder="예: system-default" {...field} />
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
                      placeholder="프롬프트에 대한 설명을 입력하세요..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>타입 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="타입 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROMPT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <span>{option.label}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            </div>
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
                name="category"
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
                        {PROMPT_CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prompt Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>프롬프트 내용</CardTitle>
                <CardDescription>
                  변수는 {'{{변수명}}'} 형식으로 사용합니다. 예: {'{{user_name}}'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={previewMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  {previewMode ? <Code className="mr-2 h-4 w-4" /> : <TextAa className="mr-2 h-4 w-4" />}
                  {previewMode ? '편집' : '미리보기'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    {previewMode ? (
                      <div className="rounded-md border bg-muted/50 p-4 font-mono text-sm whitespace-pre-wrap min-h-[300px]">
                        {field.value}
                      </div>
                    ) : (
                      <Textarea
                        placeholder="프롬프트 내용을 입력하세요..."
                        className="min-h-[300px] font-mono text-sm"
                        {...field}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Detected Variables */}
            {extractedVariables.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">감지된 변수:</p>
                <div className="flex flex-wrap gap-2">
                  {extractedVariables.map((varName) => (
                    <Badge
                      key={varName}
                      variant={definedVariables.includes(varName) ? 'default' : 'destructive'}
                      className="cursor-pointer"
                      onClick={() => {
                        if (!definedVariables.includes(varName)) {
                          addVariable(varName);
                        }
                      }}
                    >
                      {'{{'}{varName}{'}}'}
                      {!definedVariables.includes(varName) && ' (미정의)'}
                    </Badge>
                  ))}
                </div>
                {undefinedVariables.length > 0 && (
                  <p className="text-xs text-destructive">
                    미정의 변수를 클릭하면 변수 정의에 추가됩니다.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variables */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>변수 정의</CardTitle>
                <CardDescription>
                  프롬프트에서 사용하는 변수를 정의합니다. 필수 변수는 값이 없으면 오류가 발생합니다.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => addVariable()}>
                <Plus className="mr-2 h-4 w-4" />
                변수 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                정의된 변수가 없습니다. 위의 버튼을 클릭하여 추가하세요.
              </p>
            ) : (
              fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">변수 #{index + 1}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`variables.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>변수명 *</FormLabel>
                          <FormControl>
                            <Input placeholder="예: user_name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`variables.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>설명 *</FormLabel>
                          <FormControl>
                            <Input placeholder="예: 사용자 이름" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`variables.${index}.type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>타입</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {VARIABLE_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
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
                      name={`variables.${index}.source`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>소스</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? 'user_input'}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {VARIABLE_SOURCES.map((source) => (
                                <SelectItem key={source.value} value={source.value}>
                                  {source.label}
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
                      name={`variables.${index}.defaultValue`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>기본값</FormLabel>
                          <FormControl>
                            <Input placeholder="기본값 (선택)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`variables.${index}.required`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <FormLabel>필수 변수</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Model Config */}
        <Card>
          <CardHeader>
            <CardTitle>Gemini 모델 설정</CardTitle>
            <CardDescription>AI 모델 파라미터를 설정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="modelConfig.model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>모델 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="모델 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GEMINI_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="modelConfig.temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperature</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>0.0 ~ 1.0</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelConfig.maxOutputTokens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Tokens</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="8192"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormDescription>최대 8192</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelConfig.topP"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Top P (선택)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        placeholder="0.9"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val ? parseFloat(val) : undefined);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelConfig.topK"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Top K (선택)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="40"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val ? parseInt(val, 10) : undefined);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>상태 설정</CardTitle>
            <CardDescription>프롬프트의 활성화 및 기본값 설정</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">활성화</FormLabel>
                      <FormDescription>
                        비활성화 시 이 프롬프트는 사용되지 않습니다.
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

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">기본값</FormLabel>
                      <FormDescription>
                        해당 타입의 기본 프롬프트로 설정합니다.
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
            </div>

            {isEditMode && (
              <FormField
                control={form.control}
                name="changeNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>변경 노트</FormLabel>
                    <FormControl>
                      <Input placeholder="이 변경에 대한 간단한 설명..." {...field} />
                    </FormControl>
                    <FormDescription>
                      버전 기록에 표시됩니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/prompts">
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
