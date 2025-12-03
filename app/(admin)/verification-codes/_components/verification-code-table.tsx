'use client';

import { useRouter } from 'next/navigation';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DotsThree, Copy, Trash, Prohibit, CheckCircle, Clock, XCircle, Key } from '@phosphor-icons/react';
import { Pagination } from '@/components/ui/pagination';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface VerificationCode {
  id: string;
  code: string;
  kakaoUserId: string | null;
  employeeId: string | null;
  employeeCode: string | null;
  employeeName: string | null;
  status: string;
  role: string;
  tier: string;
  maxUses: number;
  currentUses: number;
  description: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string | null;
}

interface VerificationCodeTableProps {
  codes: VerificationCode[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Key }> = {
  active: { label: '활성', variant: 'default', icon: Key },
  used: { label: '사용됨', variant: 'secondary', icon: CheckCircle },
  expired: { label: '만료됨', variant: 'outline', icon: Clock },
  revoked: { label: '취소됨', variant: 'destructive', icon: XCircle },
};

const roleLabels: Record<string, string> = {
  ceo: 'CEO',
  admin: '관리자',
  manager: '매니저',
  senior: '시니어',
  junior: '주니어',
  user: '사용자',
};

const tierLabels: Record<string, string> = {
  enterprise: 'Enterprise',
  pro: 'Pro',
  basic: 'Basic',
  free: 'Free',
};

export function VerificationCodeTable({ codes, pagination }: VerificationCodeTableProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success('코드가 클립보드에 복사되었습니다.');
  };

  const handleRevoke = async () => {
    if (!revokeId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/verification-codes/${revokeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });
      if (!res.ok) throw new Error('Failed to revoke');
      toast.success('코드가 취소되었습니다.');
      router.refresh();
    } catch {
      toast.error('코드 취소에 실패했습니다.');
    } finally {
      setIsLoading(false);
      setRevokeId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/verification-codes/${deleteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('코드가 삭제되었습니다.');
      router.refresh();
    } catch {
      toast.error('코드 삭제에 실패했습니다.');
    } finally {
      setIsLoading(false);
      setDeleteId(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>코드</TableHead>
                <TableHead>직원</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>권한</TableHead>
                <TableHead>사용</TableHead>
                <TableHead>만료일</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    인증 코드가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                codes.map((code) => {
                  const status = statusConfig[code.status] || statusConfig.active;
                  const StatusIcon = status.icon;

                  return (
                    <TableRow key={code.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                            {code.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyCode(code.code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        {code.description && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {code.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{code.employeeName || '-'}</div>
                        <div className="text-sm text-muted-foreground">
                          {code.employeeCode || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" weight="bold" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{roleLabels[code.role] || code.role}</div>
                        <div className="text-xs text-muted-foreground">
                          {tierLabels[code.tier] || code.tier}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {code.currentUses} / {code.maxUses}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {code.expiresAt ? formatDate(code.expiresAt) : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <DotsThree className="h-4 w-4" weight="bold" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyCode(code.code)}>
                              <Copy className="mr-2 h-4 w-4" />
                              코드 복사
                            </DropdownMenuItem>
                            {code.status === 'active' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-yellow-600"
                                  onClick={() => setRevokeId(code.id)}
                                >
                                  <Prohibit className="mr-2 h-4 w-4" />
                                  취소하기
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(code.id)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {pagination && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
          />
        )}
      </div>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>코드를 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              취소된 코드는 더 이상 사용할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isLoading}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {isLoading ? '처리 중...' : '코드 취소'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>코드를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 코드가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
