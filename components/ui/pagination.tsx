'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CaretLeft, CaretRight, CaretDoubleLeft, CaretDoubleRight } from '@phosphor-icons/react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize?: number;
}

export function Pagination({ currentPage, totalPages, total, pageSize = 10 }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>총 {total}개</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {total}개 중 {start}-{end}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPage(1)}
          disabled={currentPage <= 1}
        >
          <CaretDoubleLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPage(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <CaretLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1 px-2">
          <span className="text-sm">
            {currentPage} / {totalPages}
          </span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <CaretRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPage(totalPages)}
          disabled={currentPage >= totalPages}
        >
          <CaretDoubleRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
