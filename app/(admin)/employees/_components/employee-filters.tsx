'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { CLEARANCE_LABELS } from '@/lib/constants';

export function EmployeeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset to first page
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    updateFilter('search', term || null);
  }, 300);

  const clearFilters = () => {
    router.push(pathname);
  };

  const hasFilters =
    searchParams.has('search') ||
    searchParams.has('isActive') ||
    searchParams.has('department') ||
    searchParams.has('clearanceLevel');

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="이름, 사번, 이메일 검색..."
          defaultValue={searchParams.get('search') || ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select
        value={searchParams.get('isActive') || 'all'}
        onValueChange={(value) => updateFilter('isActive', value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 상태</SelectItem>
          <SelectItem value="true">재직</SelectItem>
          <SelectItem value="false">퇴직</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('clearanceLevel') || 'all'}
        onValueChange={(value) => updateFilter('clearanceLevel', value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="권한 레벨" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 권한</SelectItem>
          {Object.entries(CLEARANCE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          필터 초기화
        </Button>
      )}
    </div>
  );
}
