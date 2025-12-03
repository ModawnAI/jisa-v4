'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, ClockCounterClockwise, Eye, ArrowCounterClockwise } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import type { PromptTemplateVersion, PromptTemplate } from '@/lib/db/schema/prompt-templates';

export default function VersionHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [versions, setVersions] = useState<PromptTemplateVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<PromptTemplateVersion | null>(null);
  const [restoreVersion, setRestoreVersion] = useState<PromptTemplateVersion | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch template and versions in parallel
        const [templateRes, versionsRes] = await Promise.all([
          fetch(`/api/prompts/${id}`),
          fetch(`/api/prompts/${id}/versions`),
        ]);

        const templateResult = await templateRes.json();
        const versionsResult = await versionsRes.json();

        if (templateResult.success) {
          setTemplate(templateResult.data);
        }
        if (versionsResult.success) {
          setVersions(versionsResult.data);
        }
      } catch {
        toast.error('버전 기록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  const handleRestore = async () => {
    if (!restoreVersion) return;

    setRestoring(true);
    try {
      const res = await fetch(`/api/prompts/${id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: restoreVersion.version }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '복원에 실패했습니다.');
      }

      toast.success(`버전 ${restoreVersion.version}이(가) 복원되었습니다.`);
      setRestoreVersion(null);
      router.push(`/prompts/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '복원에 실패했습니다.');
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="버전 기록"
        description={template ? `${template.name} 프롬프트의 변경 기록입니다.` : '버전 기록'}
      >
        <Button variant="outline" asChild>
          <Link href={`/prompts/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            프롬프트로 돌아가기
          </Link>
        </Button>
      </PageHeader>

      {/* Current Version Info */}
      {template && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockCounterClockwise className="h-5 w-5" />
              현재 버전
            </CardTitle>
            <CardDescription>현재 활성화된 버전 정보입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="default" className="text-lg px-3 py-1">
                v{template.version}
              </Badge>
              <span className="text-sm text-muted-foreground">
                마지막 수정: {formatDate(template.updatedAt)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version History Table */}
      <Card>
        <CardHeader>
          <CardTitle>버전 기록</CardTitle>
          <CardDescription>
            총 {versions.length}개의 버전이 있습니다. 이전 버전을 미리보거나 복원할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">버전</TableHead>
                <TableHead>변경 노트</TableHead>
                <TableHead className="w-[150px]">생성일</TableHead>
                <TableHead className="w-[120px]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    버전 기록이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                versions.map((version) => (
                  <TableRow
                    key={version.id}
                    className={version.version === template?.version ? 'bg-muted/50' : ''}
                  >
                    <TableCell>
                      <Badge
                        variant={version.version === template?.version ? 'default' : 'secondary'}
                      >
                        v{version.version}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {version.changeNote || '(변경 노트 없음)'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(version.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewVersion(version)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {version.version !== template?.version && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRestoreVersion(version)}
                          >
                            <ArrowCounterClockwise className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>버전 {previewVersion?.version} 미리보기</DialogTitle>
            <DialogDescription>
              {previewVersion?.changeNote || '변경 노트 없음'} - {previewVersion && formatDate(previewVersion.createdAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">프롬프트 내용</h4>
              <div className="rounded-md border bg-muted/50 p-4 font-mono text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {previewVersion?.content}
              </div>
            </div>

            {previewVersion?.variables && previewVersion.variables.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">변수</h4>
                <div className="flex flex-wrap gap-2">
                  {previewVersion.variables.map((v) => (
                    <Badge key={v.name} variant="outline">
                      {'{{'}{v.name}{'}}'}
                      {v.required && <span className="text-destructive ml-1">*</span>}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {previewVersion?.modelConfig && (
              <div>
                <h4 className="text-sm font-medium mb-2">모델 설정</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>모델: <span className="font-mono">{previewVersion.modelConfig.model}</span></div>
                  <div>Temperature: <span className="font-mono">{previewVersion.modelConfig.temperature}</span></div>
                  <div>Max Tokens: <span className="font-mono">{previewVersion.modelConfig.maxOutputTokens}</span></div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewVersion(null)}>
              닫기
            </Button>
            {previewVersion && previewVersion.version !== template?.version && (
              <Button onClick={() => {
                setPreviewVersion(null);
                setRestoreVersion(previewVersion);
              }}>
                <ArrowCounterClockwise className="mr-2 h-4 w-4" />
                이 버전으로 복원
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={!!restoreVersion} onOpenChange={() => setRestoreVersion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>버전 복원 확인</DialogTitle>
            <DialogDescription>
              버전 {restoreVersion?.version}을(를) 복원하시겠습니까?
              현재 버전의 변경 사항은 기록으로 남습니다.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreVersion(null)}>
              취소
            </Button>
            <Button onClick={handleRestore} disabled={restoring}>
              {restoring ? '복원 중...' : '복원'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
