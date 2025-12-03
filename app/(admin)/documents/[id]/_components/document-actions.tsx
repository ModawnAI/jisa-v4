'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DotsThree, ArrowClockwise, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface Document {
  id: string;
  fileName: string;
  status: string;
}

interface DocumentActionsProps {
  document: Document;
}

export function DocumentActions({ document }: DocumentActionsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReprocess = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${document.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '재처리 요청에 실패했습니다.');
      }

      toast.success('재처리 요청이 완료되었습니다.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '재처리 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '삭제에 실패했습니다.');
      }

      toast.success('문서가 삭제되었습니다.');
      router.push('/documents');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다.');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const canReprocess = document.status === 'failed' || document.status === 'partial';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={loading}>
            <DotsThree className="h-4 w-4" weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canReprocess && (
            <DropdownMenuItem onClick={handleReprocess} disabled={loading}>
              <ArrowClockwise className="mr-2 h-4 w-4" />
              재처리
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={loading}
          >
            <Trash className="mr-2 h-4 w-4" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>문서 삭제</DialogTitle>
            <DialogDescription>
              &quot;{document.fileName}&quot; 문서를 삭제하시겠습니까?
              <br />
              삭제된 문서는 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
