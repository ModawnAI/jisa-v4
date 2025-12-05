'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { formatFileSize } from '@/lib/utils';
import { LIMITS, FILE_TYPE_LABELS } from '@/lib/constants';
import {
  UploadSimple,
  X,
  FileXls,
  FileCsv,
  FilePdf,
  FileDoc,
  File as FileIcon,
  CheckCircle,
  XCircle,
  Spinner,
  CloudArrowUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const uploadFormSchema = z.object({
  categoryId: z.string().uuid('카테고리를 선택해주세요').optional().or(z.literal('')),
  templateId: z.string().uuid('템플릿을 선택해주세요').optional().or(z.literal('')),
  period: z.string().optional(),
});

type UploadFormData = z.infer<typeof uploadFormSchema>;

interface UploadFormProps {
  categories: { value: string; label: string }[];
  templates: { value: string; label: string }[];
}

interface FileWithProgress {
  file: File;  // Keep original File reference
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const ACCEPTED_FILE_TYPES = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

const fileTypeIcons: Record<string, React.ElementType> = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileXls,
  'application/vnd.ms-excel': FileXls,
  'text/csv': FileCsv,
  'application/pdf': FilePdf,
  'application/msword': FileDoc,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileDoc,
};

export function UploadForm({ categories, templates }: UploadFormProps) {
  const router = useRouter();
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filteredTemplates, setFilteredTemplates] = useState(templates);

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      categoryId: '',
      templateId: '',
      period: '',
    },
  });

  const watchCategoryId = form.watch('categoryId');

  // Filter templates by selected category
  useEffect(() => {
    if (watchCategoryId && watchCategoryId !== 'none') {
      // We'll need to fetch templates filtered by category
      // For now, show all templates (can enhance later)
      setFilteredTemplates(templates);
    } else {
      setFilteredTemplates(templates);
    }
  }, [watchCategoryId, templates]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithProgress[] = acceptedFiles.map((file) => ({
      file,  // Keep original File reference
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      progress: 0,
      status: 'pending' as const,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: LIMITS.MAX_FILE_SIZE,
    maxFiles: LIMITS.MAX_UPLOAD_FILES,
    onDropRejected: (rejections) => {
      rejections.forEach((rejection) => {
        rejection.errors.forEach((error) => {
          if (error.code === 'file-too-large') {
            toast.error(`파일이 너무 큽니다. 최대 ${formatFileSize(LIMITS.MAX_FILE_SIZE)}까지 업로드할 수 있습니다.`);
          } else if (error.code === 'file-invalid-type') {
            toast.error('지원하지 않는 파일 형식입니다. Excel, CSV, PDF, Word 파일만 업로드할 수 있습니다.');
          } else if (error.code === 'too-many-files') {
            toast.error(`한 번에 최대 ${LIMITS.MAX_UPLOAD_FILES}개까지 업로드할 수 있습니다.`);
          }
        });
      });
    },
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadFile = async (fileWithProgress: FileWithProgress, formData: UploadFormData) => {
    const data = new FormData();
    data.append('file', fileWithProgress.file);  // Use the original File object
    data.append('fileName', fileWithProgress.file.name);  // Send filename separately to preserve it

    if (formData.categoryId && formData.categoryId !== 'none') {
      data.append('categoryId', formData.categoryId);
    }
    if (formData.templateId && formData.templateId !== 'none') {
      data.append('templateId', formData.templateId);
    }
    if (formData.period) {
      data.append('period', formData.period);
    }

    // Update status to uploading
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileWithProgress.id ? { ...f, status: 'uploading' as const, progress: 10 } : f
      )
    );

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileWithProgress.id && f.status === 'uploading' && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        );
      }, 200);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: data,
      });

      clearInterval(progressInterval);

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '업로드에 실패했습니다.');
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileWithProgress.id ? { ...f, status: 'success' as const, progress: 100 } : f
        )
      );

      return result.data;
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileWithProgress.id
            ? {
                ...f,
                status: 'error' as const,
                progress: 0,
                error: error instanceof Error ? error.message : '업로드 실패',
              }
            : f
        )
      );
      throw error;
    }
  };

  const onSubmit = async (data: UploadFormData) => {
    if (files.length === 0) {
      toast.error('업로드할 파일을 선택해주세요.');
      return;
    }

    const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error');
    if (pendingFiles.length === 0) {
      toast.info('모든 파일이 이미 업로드되었습니다.');
      router.push('/documents');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of pendingFiles) {
      try {
        await uploadFile(file, data);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setUploading(false);

    if (successCount > 0 && errorCount === 0) {
      toast.success(`${successCount}개 파일이 업로드되었습니다.`);
      router.push('/documents');
      router.refresh();
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`${successCount}개 성공, ${errorCount}개 실패`);
    } else {
      toast.error('파일 업로드에 실패했습니다.');
    }
  };

  const getFileIcon = (mimeType: string) => {
    const Icon = fileTypeIcons[mimeType] || FileIcon;
    return <Icon className="h-8 w-8" weight="duotone" />;
  };

  const getStatusIcon = (status: FileWithProgress['status']) => {
    switch (status) {
      case 'uploading':
        return <Spinner className="h-5 w-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" weight="fill" />;
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Dropzone */}
        <Card>
          <CardHeader>
            <CardTitle>파일 선택</CardTitle>
            <CardDescription>
              업로드할 파일을 드래그하거나 클릭하여 선택하세요.
              Excel, CSV, PDF, Word 파일을 지원합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              {...getRootProps()}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
                isDragActive && !isDragReject && 'border-primary bg-primary/5',
                isDragReject && 'border-destructive bg-destructive/5',
                !isDragActive && 'border-muted-foreground/25 hover:border-primary/50'
              )}
            >
              <input {...getInputProps()} />
              <CloudArrowUp
                className={cn(
                  'h-12 w-12 mb-4',
                  isDragActive && !isDragReject && 'text-primary',
                  isDragReject && 'text-destructive',
                  !isDragActive && 'text-muted-foreground'
                )}
                weight="duotone"
              />
              {isDragReject ? (
                <p className="text-destructive">지원하지 않는 파일 형식입니다</p>
              ) : isDragActive ? (
                <p className="text-primary">파일을 여기에 놓으세요</p>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    파일을 드래그하거나 <span className="text-primary font-medium">클릭</span>하여 선택
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    최대 {formatFileSize(LIMITS.MAX_FILE_SIZE)}, {LIMITS.MAX_UPLOAD_FILES}개 파일
                  </p>
                </>
              )}
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  선택된 파일 ({files.length}개)
                </p>
                <div className="space-y-2">
                  {files.map((fileItem) => (
                    <div
                      key={fileItem.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="text-emerald-600">
                        {getFileIcon(fileItem.file.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(fileItem.file.size)}
                        </p>
                        {fileItem.status === 'uploading' && (
                          <Progress value={fileItem.progress} className="mt-1 h-1" />
                        )}
                        {fileItem.status === 'error' && fileItem.error && (
                          <p className="text-xs text-destructive mt-1">{fileItem.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(fileItem.status)}
                        {fileItem.status !== 'uploading' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeFile(fileItem.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supported file types */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(FILE_TYPE_LABELS).map(([key, label]) => (
                <span
                  key={key}
                  className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                >
                  {label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>문서 정보</CardTitle>
            <CardDescription>
              카테고리와 템플릿을 지정하면 문서가 자동으로 처리됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카테고리</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="카테고리 선택 (선택사항)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">선택 안함</SelectItem>
                        {categories.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      문서의 분류 카테고리를 선택하세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>템플릿</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="템플릿 선택 (선택사항)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">선택 안함</SelectItem>
                        {filteredTemplates.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      문서 처리에 사용할 템플릿을 선택하세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>기간</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="예: 2024-01, 2024-Q1, 2024"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    문서가 해당하는 기간을 입력하세요 (월별, 분기별, 연도).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={uploading || files.length === 0}>
            <UploadSimple className="mr-2 h-4 w-4" weight="bold" />
            {uploading ? '업로드 중...' : `업로드 (${files.filter(f => f.status === 'pending' || f.status === 'error').length}개)`}
          </Button>
          {files.length > 0 && !uploading && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setFiles([])}
            >
              전체 삭제
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
