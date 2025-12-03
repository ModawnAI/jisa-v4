'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DotsThree,
  CaretLeft,
  CaretRight,
  FunnelSimple,
  Warning,
  CheckCircle,
  XCircle,
  GitMerge,
  File,
  Eye,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { CONFLICT_STATUS_LABELS, CONFLICT_TYPE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils/date';

interface ConflictDetails {
  similarityScore?: number;
  conflictingFields?: { field: string; existingValue: unknown; newValue: unknown }[];
  suggestedResolution?: string;
}

interface ConflictRecord {
  id: string;
  newDocumentId: string;
  existingDocumentId: string | null;
  conflictType: string;
  status: string;
  conflictDetails: unknown;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  createdAt: Date;
  newDocument?: {
    id: string;
    fileName: string;
    status: string;
    createdAt: Date;
  };
  existingDocument?: {
    id: string;
    fileName: string;
    status: string;
    createdAt: Date;
  } | null;
  resolver?: {
    id: string;
    name: string;
    employeeId: string;
  } | null;
}

interface ConflictTableProps {
  initialData: {
    data: ConflictRecord[];
    meta: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

// Helper to safely cast conflictDetails
function getConflictDetails(details: unknown): ConflictDetails | null {
  if (!details || typeof details !== 'object') return null;
  return details as ConflictDetails;
}

const statusIcons: Record<string, React.ElementType> = {
  detected: Warning,
  reviewing: Eye,
  resolved_keep_existing: CheckCircle,
  resolved_keep_new: CheckCircle,
  resolved_merged: GitMerge,
  dismissed: XCircle,
};

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  detected: 'destructive',
  reviewing: 'outline',
  resolved_keep_existing: 'default',
  resolved_keep_new: 'default',
  resolved_merged: 'default',
  dismissed: 'secondary',
};

export function ConflictTable({ initialData }: ConflictTableProps) {
  const [records, setRecords] = useState(initialData.data);
  const [meta, setMeta] = useState(initialData.meta);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Resolve dialog state
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ConflictRecord | null>(null);
  const [resolution, setResolution] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchRecords = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', meta.pageSize.toString());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('conflictType', typeFilter);

      const res = await fetch(`/api/conflicts?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        setRecords(result.data);
        setMeta(result.meta);
      }
    } catch {
      toast.error('충돌 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedConflict || !resolution) return;

    setResolving(true);
    try {
      // TODO: Replace with actual user ID from auth context
      const res = await fetch(`/api/conflicts/${selectedConflict.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution,
          resolvedBy: '00000000-0000-0000-0000-000000000000', // Placeholder
          notes: resolutionNotes || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '해결에 실패했습니다.');
      }

      toast.success('충돌이 해결되었습니다.');
      setResolveDialogOpen(false);
      setSelectedConflict(null);
      setResolution('');
      setResolutionNotes('');
      fetchRecords(meta.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '해결에 실패했습니다.');
    } finally {
      setResolving(false);
    }
  };

  const openResolveDialog = (conflict: ConflictRecord) => {
    setSelectedConflict(conflict);
    const details = getConflictDetails(conflict.conflictDetails);
    setResolution(details?.suggestedResolution || '');
    setResolveDialogOpen(true);
  };

  const StatusIcon = (status: string) => {
    const Icon = statusIcons[status] || Warning;
    return <Icon className="h-4 w-4" weight="fill" />;
  };

  if (loading && records.length === 0) {
    return <ConflictTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); }}>
                <SelectTrigger className="w-[140px]">
                  <FunnelSimple className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  {Object.entries(CONFLICT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="충돌 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 유형</SelectItem>
                  {Object.entries(CONFLICT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => fetchRecords(1)} variant="secondary">
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
                <TableHead className="w-[100px]">상태</TableHead>
                <TableHead>충돌 유형</TableHead>
                <TableHead>신규 문서</TableHead>
                <TableHead>기존 문서</TableHead>
                <TableHead>유사도</TableHead>
                <TableHead className="w-[120px]">감지일</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    충돌이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Badge
                        variant={statusColors[record.status] || 'secondary'}
                        className="flex w-fit items-center gap-1"
                      >
                        {StatusIcon(record.status)}
                        {CONFLICT_STATUS_LABELS[record.status] || record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CONFLICT_TYPE_LABELS[record.conflictType] || record.conflictType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {record.newDocument?.fileName || '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.newDocument?.createdAt
                            ? formatDate(record.newDocument.createdAt)
                            : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.existingDocument ? (
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            {record.existingDocument.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(record.existingDocument.createdAt)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const details = getConflictDetails(record.conflictDetails);
                        return details?.similarityScore !== undefined ? (
                          <Badge
                            variant={
                              details.similarityScore >= 0.9
                                ? 'destructive'
                                : details.similarityScore >= 0.7
                                  ? 'outline'
                                  : 'secondary'
                            }
                          >
                            {(details.similarityScore * 100).toFixed(0)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(record.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <DotsThree className="h-4 w-4" weight="bold" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!record.status.startsWith('resolved') && record.status !== 'dismissed' && (
                            <>
                              <DropdownMenuItem onClick={() => openResolveDialog(record)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                충돌 해결
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => window.open(`/documents/${record.newDocumentId}`, '_blank')}
                          >
                            <File className="mr-2 h-4 w-4" />
                            신규 문서 보기
                          </DropdownMenuItem>
                          {record.existingDocumentId && (
                            <DropdownMenuItem
                              onClick={() => window.open(`/documents/${record.existingDocumentId}`, '_blank')}
                            >
                              <File className="mr-2 h-4 w-4" />
                              기존 문서 보기
                            </DropdownMenuItem>
                          )}
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
              onClick={() => fetchRecords(meta.page - 1)}
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
              onClick={() => fetchRecords(meta.page + 1)}
            >
              <CaretRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>충돌 해결</DialogTitle>
            <DialogDescription>
              이 충돌을 어떻게 해결하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>해결 방식</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger>
                  <SelectValue placeholder="해결 방식 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep_existing">기존 문서 유지</SelectItem>
                  <SelectItem value="keep_new">신규 문서 유지</SelectItem>
                  <SelectItem value="merge">병합</SelectItem>
                  <SelectItem value="dismiss">무시</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>메모 (선택사항)</Label>
              <Textarea
                placeholder="해결에 대한 메모를 입력하세요..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialogOpen(false)}
              disabled={resolving}
            >
              취소
            </Button>
            <Button onClick={handleResolve} disabled={!resolution || resolving}>
              {resolving ? '처리 중...' : '해결'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConflictTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">상태</TableHead>
              <TableHead>충돌 유형</TableHead>
              <TableHead>신규 문서</TableHead>
              <TableHead>기존 문서</TableHead>
              <TableHead>유사도</TableHead>
              <TableHead className="w-[120px]">감지일</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                <TableCell><Skeleton className="h-5 w-[50px]" /></TableCell>
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
