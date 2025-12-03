'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Code, FileText, Copy, Check, Hash, User, File } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface VectorSample {
  id: string;
  dbId?: string;
  namespace: string;
  content?: string;
  chunkContent?: string;
  contentHash?: string;
  chunkIndex?: number;
  employeeId?: string | null;
  documentId?: string;
  documentName?: string;
  categoryName?: string;
  metadata: Record<string, unknown>;
}

interface VectorTableProps {
  vectors: VectorSample[];
  namespace: string;
  isLoading: boolean;
  onBack: () => void;
}

export function VectorTable({ vectors, namespace, isLoading, onBack }: VectorTableProps) {
  const [selectedVector, setSelectedVector] = useState<VectorSample | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success('ID가 복사되었습니다.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyMetadata = async () => {
    if (selectedVector) {
      await navigator.clipboard.writeText(JSON.stringify(selectedVector.metadata, null, 2));
      toast.success('메타데이터가 복사되었습니다.');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
                <ArrowLeft size={16} className="mr-1.5" />
                <span className="hidden sm:inline">돌아가기</span>
              </Button>
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <div className="min-w-0">
                <CardTitle className="font-mono text-sm sm:text-base truncate">{namespace}</CardTitle>
                <CardDescription className="text-xs">{vectors.length}개의 벡터 샘플</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {vectors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FileText size={32} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">이 네임스페이스에 벡터가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vectors.map((vector) => (
                <div
                  key={vector.id}
                  onClick={() => setSelectedVector(vector)}
                  className="group relative rounded-lg border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-[180px] sm:max-w-[280px]">
                        {vector.id}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleCopyId(vector.id, e)}
                      >
                        {copiedId === vector.id ? (
                          <Check size={12} className="text-green-500" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVector(vector);
                      }}
                    >
                      <Code size={14} className="mr-1" />
                      JSON
                    </Button>
                  </div>

                  {/* Document Info */}
                  {(vector.documentName || vector.categoryName) && (
                    <div className="flex items-center gap-2 mb-2">
                      <File size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{vector.documentName || '문서 없음'}</span>
                      {vector.categoryName && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {vector.categoryName}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Content Preview */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {vector.content || vector.chunkContent || '콘텐츠 없음'}
                  </p>

                  {/* Metadata Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {vector.employeeId && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <User size={10} />
                        {vector.employeeId}
                      </Badge>
                    )}
                    {vector.chunkIndex !== undefined && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Hash size={10} />
                        청크 {vector.chunkIndex}
                      </Badge>
                    )}
                    {typeof vector.metadata?.metadataType === 'string' && (
                      <Badge variant="secondary" className="text-xs">
                        {vector.metadata.metadataType}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vector Detail Modal */}
      <Dialog open={!!selectedVector} onOpenChange={() => setSelectedVector(null)}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b shrink-0">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                <FileText size={20} weight="duotone" className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg">벡터 상세 정보</DialogTitle>
                <DialogDescription className="font-mono text-xs truncate mt-1">
                  {selectedVector?.id}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 sm:px-6 py-4 space-y-5">
              {selectedVector && (
                <>
                  {/* Quick Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedVector.documentName && (
                      <div className="col-span-2 p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">문서</p>
                        <p className="text-sm font-medium truncate">{selectedVector.documentName}</p>
                      </div>
                    )}
                    {selectedVector.categoryName && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">카테고리</p>
                        <p className="text-sm font-medium">{selectedVector.categoryName}</p>
                      </div>
                    )}
                    {selectedVector.chunkIndex !== undefined && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">청크 인덱스</p>
                        <p className="text-sm font-medium">#{selectedVector.chunkIndex}</p>
                      </div>
                    )}
                    {selectedVector.employeeId && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">직원 ID</p>
                        <p className="text-sm font-medium font-mono">{selectedVector.employeeId}</p>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">콘텐츠</h4>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap break-words leading-relaxed max-h-[200px] overflow-y-auto">
                      {selectedVector.content || selectedVector.chunkContent || '콘텐츠 없음'}
                    </div>
                  </div>

                  {/* Metadata JSON */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">메타데이터 (JSON)</h4>
                      <Button variant="ghost" size="sm" onClick={handleCopyMetadata} className="h-7 text-xs">
                        <Copy size={12} className="mr-1.5" />
                        복사
                      </Button>
                    </div>
                    <div className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs overflow-auto max-h-[300px]">
                      <pre className="whitespace-pre-wrap break-all">
                        <code>{JSON.stringify(selectedVector.metadata, null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
