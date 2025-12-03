'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { MagnifyingGlass, Users, FileText, Tag, Robot } from '@phosphor-icons/react';
import { navigation } from '@/lib/config/navigation';

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-9 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <MagnifyingGlass className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">검색...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="검색어를 입력하세요..." />
        <CommandList>
          <CommandEmpty>결과가 없습니다.</CommandEmpty>

          <CommandGroup heading="빠른 이동">
            {navigation.flatMap((section) =>
              section.items.map((item) => (
                <CommandItem
                  key={item.href}
                  onSelect={() => handleSelect(item.href)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                </CommandItem>
              ))
            )}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="빠른 작업">
            <CommandItem onSelect={() => handleSelect('/employees/new')}>
              <Users className="mr-2 h-4 w-4" />
              <span>새 직원 추가</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/documents/upload')}>
              <FileText className="mr-2 h-4 w-4" />
              <span>문서 업로드</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/categories/new')}>
              <Tag className="mr-2 h-4 w-4" />
              <span>새 카테고리</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/chat')}>
              <Robot className="mr-2 h-4 w-4" />
              <span>AI 채팅 시작</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
