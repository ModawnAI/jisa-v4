import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  DownloadSimple,
  FileXls,
  FileCsv,
  FilePdf,
  FileDoc,
  File,
  User,
  Calendar,
  Tag,
  Folder,
  Warning,
} from '@phosphor-icons/react/dist/ssr';
import { documentService } from '@/lib/services/document.service';
import { PROCESSING_STATUS_LABELS } from '@/lib/constants';
import { formatDate, formatFileSize } from '@/lib/utils';
import { DocumentActions } from './_components/document-actions';

interface PageProps {
  params: Promise<{ id: string }>;
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

export default async function DocumentDetailPage({ params }: PageProps) {
  const { id } = await params;

  let document;
  try {
    document = await documentService.getById(id);
  } catch {
    notFound();
  }

  const FileIcon = fileTypeIcons[document.fileType] || File;

  return (
    <div className="space-y-6">
      <PageHeader
        title="문서 상세"
        description={document.fileName}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/documents">
              <ArrowLeft className="mr-2 h-4 w-4" weight="bold" />
              목록으로
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/api/documents/${document.id}/download?redirect=true`} target="_blank" rel="noopener noreferrer">
              <DownloadSimple className="mr-2 h-4 w-4" weight="bold" />
              다운로드
            </a>
          </Button>
          <DocumentActions document={document} />
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileIcon className="h-5 w-5 text-emerald-600" weight="duotone" />
                파일 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">파일명</p>
                  <p className="font-medium">{document.fileName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">파일 타입</p>
                  <p className="font-medium capitalize">{document.fileType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">파일 크기</p>
                  <p className="font-medium">{formatFileSize(document.fileSize)}</p>
                </div>
                {document.fileHash && (
                  <div>
                    <p className="text-sm text-muted-foreground">파일 해시</p>
                    <p className="font-mono text-xs truncate">{document.fileHash}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Classification Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" weight="duotone" />
                분류 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">카테고리</p>
                  {document.category ? (
                    <Badge variant="outline">{document.category.name}</Badge>
                  ) : (
                    <p className="text-muted-foreground">-</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">문서 타입</p>
                  {document.documentType ? (
                    <Badge variant="secondary">{document.documentType.name}</Badge>
                  ) : (
                    <p className="text-muted-foreground">-</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">템플릿</p>
                  {document.template ? (
                    <Link href={`/templates/${document.template.id}`} className="text-primary hover:underline">
                      {document.template.name}
                    </Link>
                  ) : (
                    <p className="text-muted-foreground">-</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">기간</p>
                  <p className="font-medium">{document.period || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Message (if failed) */}
          {document.status === 'failed' && document.errorMessage && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Warning className="h-5 w-5" weight="fill" />
                  처리 오류
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive">{document.errorMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* Metadata (if exists) */}
          {document.metadata && typeof document.metadata === 'object' && Object.keys(document.metadata as object).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" weight="duotone" />
                  메타데이터
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(document.metadata as object, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>처리 상태</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center">
                <Badge variant={statusColors[document.status] || 'secondary'} className="text-lg px-4 py-1">
                  {PROCESSING_STATUS_LABELS[document.status] || document.status}
                </Badge>
              </div>
              {document.processedAt && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">처리 완료일</p>
                  <p className="font-medium">{formatDate(document.processedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>관련 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {document.employee && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    연결된 직원
                  </p>
                  <Link href={`/employees/${document.employee.id}`} className="text-primary hover:underline">
                    {document.employee.name}
                  </Link>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  업로더
                </p>
                <p className="font-medium">{document.uploader?.name || document.uploader?.email || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" weight="duotone" />
                타임스탬프
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">생성일</span>
                <span>{formatDate(document.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">수정일</span>
                <span>{formatDate(document.updatedAt)}</span>
              </div>
              {document.processedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">처리일</span>
                  <span>{formatDate(document.processedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
