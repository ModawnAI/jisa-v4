'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useDebouncedCallback } from 'use-debounce';

export function VerificationCodeFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      params.delete('page'); // Reset to first page on filter change
      return params.toString();
    },
    [searchParams]
  );

  const handleSearch = useDebouncedCallback((value: string) => {
    router.push(`/verification-codes?${createQueryString('search', value)}`);
  }, 300);

  const handleStatusChange = (value: string) => {
    router.push(`/verification-codes?${createQueryString('status', value === 'all' ? '' : value)}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="코드 또는 사번으로 검색..."
          defaultValue={searchParams.get('search') || ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        defaultValue={searchParams.get('status') || 'all'}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">모든 상태</SelectItem>
          <SelectItem value="active">활성</SelectItem>
          <SelectItem value="used">사용됨</SelectItem>
          <SelectItem value="expired">만료됨</SelectItem>
          <SelectItem value="revoked">취소됨</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
