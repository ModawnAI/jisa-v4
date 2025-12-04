'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  UploadSimple,
  FileXls,
  FileCsv,
  DownloadSimple,
  CheckCircle,
  XCircle,
  Warning,
  Trash,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImportResult {
  success: boolean;
  row: number;
  employeeId: string;
  name: string;
  error?: string;
}

interface ImportResponse {
  success: boolean;
  data?: {
    total: number;
    success: number;
    skipped: number;
    errors: number;
    results: ImportResult[];
    parseErrors: { row: number; errors: string[] }[];
  };
  error?: {
    code: string;
    message: string;
  };
}

type ImportState = 'idle' | 'selected' | 'uploading' | 'complete';

export function BulkImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ImportState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResponse['data'] | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setState('selected');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: state === 'uploading',
  });

  const handleDownloadTemplate = async (format: 'xlsx' | 'csv') => {
    try {
      const response = await fetch(`/api/employees/template?format=${format}`);
      if (!response.ok) throw new Error('템플릿 다운로드 실패');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee_import_template.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('템플릿이 다운로드되었습니다.');
    } catch {
      toast.error('템플릿 다운로드에 실패했습니다.');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setState('uploading');
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('skipDuplicates', skipDuplicates.toString());

      setProgress(30);

      const response = await fetch('/api/employees/bulk', {
        method: 'POST',
        body: formData,
      });

      setProgress(80);

      const data: ImportResponse = await response.json();

      setProgress(100);

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || '가져오기 실패');
      }

      setResult(data.data!);
      setState('complete');

      if (data.data!.success > 0) {
        toast.success(`${data.data!.success}명의 직원이 등록되었습니다.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '가져오기에 실패했습니다.');
      setState('selected');
    }
  };

  const handleReset = () => {
    setFile(null);
    setState('idle');
    setProgress(0);
    setResult(null);
  };

  const handleClose = () => {
    if (state === 'complete' && result && result.success > 0) {
      router.refresh();
    }
    handleReset();
    setOpen(false);
  };

  const getFileIcon = () => {
    if (!file) return null;
    return file.name.endsWith('.csv') ? (
      <FileCsv className="h-12 w-12 text-green-500" />
    ) : (
      <FileXls className="h-12 w-12 text-emerald-600" />
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UploadSimple className="mr-2 h-4 w-4" />
          일괄 등록
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>직원 일괄 등록</DialogTitle>
          <DialogDescription>
            Excel 또는 CSV 파일로 직원을 일괄 등록합니다.
          </DialogDescription>
        </DialogHeader>

        {/* Template Download Section */}
        {state === 'idle' && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="mb-3 text-sm font-medium">1. 템플릿 다운로드</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadTemplate('xlsx')}
              >
                <DownloadSimple className="mr-2 h-4 w-4" />
                Excel 템플릿
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadTemplate('csv')}
              >
                <DownloadSimple className="mr-2 h-4 w-4" />
                CSV 템플릿
              </Button>
            </div>
          </div>
        )}

        {/* File Upload Section */}
        {(state === 'idle' || state === 'selected') && (
          <div className="space-y-4">
            {state === 'idle' && (
              <p className="text-sm font-medium">2. 파일 업로드</p>
            )}

            <div
              {...getRootProps()}
              className={cn(
                'flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50',
                state === 'selected' && 'border-primary bg-primary/5'
              )}
            >
              <input {...getInputProps()} />

              {state === 'selected' && file ? (
                <div className="flex flex-col items-center gap-2">
                  {getFileIcon()}
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    파일 제거
                  </Button>
                </div>
              ) : (
                <>
                  <UploadSimple className="mb-2 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive
                      ? '파일을 놓으세요'
                      : '파일을 드래그하거나 클릭하여 선택하세요'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    지원 형식: .xlsx, .csv (최대 5MB)
                  </p>
                </>
              )}
            </div>

            {state === 'selected' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(checked as boolean)}
                />
                <label
                  htmlFor="skipDuplicates"
                  className="text-sm text-muted-foreground"
                >
                  중복 사번은 건너뛰기 (체크 해제 시 오류로 처리)
                </label>
              </div>
            )}
          </div>
        )}

        {/* Uploading Progress */}
        {state === 'uploading' && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {getFileIcon()}
                <div className="absolute -right-1 -top-1 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
              <p className="font-medium">파일을 처리하고 있습니다...</p>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Results */}
        {state === 'complete' && result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-muted-foreground">전체</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                <p className="text-2xl font-bold text-green-600">{result.success}</p>
                <p className="text-xs text-green-600">성공</p>
              </div>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
                <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                <p className="text-xs text-yellow-600">건너뜀</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                <p className="text-2xl font-bold text-red-600">{result.errors}</p>
                <p className="text-xs text-red-600">오류</p>
              </div>
            </div>

            {/* Detailed Results */}
            {(result.results.length > 0 || result.parseErrors.length > 0) && (
              <div className="rounded-lg border">
                <div className="border-b bg-muted/50 px-4 py-2">
                  <p className="text-sm font-medium">상세 결과</p>
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="divide-y">
                    {/* Parse errors */}
                    {result.parseErrors.map((err, idx) => (
                      <div
                        key={`parse-${idx}`}
                        className="flex items-start gap-3 px-4 py-2"
                      >
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="font-medium">행 {err.row}</span>
                          </p>
                          <p className="text-xs text-red-600">
                            {err.errors.join(', ')}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Import results */}
                    {result.results.map((r, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 px-4 py-2"
                      >
                        {r.success ? (
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        ) : r.error?.includes('건너뜀') ? (
                          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="font-medium">{r.employeeId}</span>
                            <span className="mx-1 text-muted-foreground">-</span>
                            <span>{r.name}</span>
                          </p>
                          {r.error && (
                            <p className={cn(
                              'text-xs',
                              r.error.includes('건너뜀') ? 'text-yellow-600' : 'text-red-600'
                            )}>
                              {r.error}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {state === 'complete' ? (
            <>
              <Button variant="outline" onClick={handleReset}>
                다시 가져오기
              </Button>
              <Button onClick={handleClose}>완료</Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={state === 'uploading'}
              >
                취소
              </Button>
              <Button
                onClick={handleImport}
                disabled={state !== 'selected' || !file}
              >
                {state === 'uploading' ? '처리 중...' : '가져오기'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
