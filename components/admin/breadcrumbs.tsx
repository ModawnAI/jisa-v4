'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import { House, CaretRight } from '@phosphor-icons/react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const routeLabels: Record<string, string> = {
  dashboard: '대시보드',
  employees: '직원 관리',
  categories: '카테고리',
  templates: '템플릿',
  documents: '문서',
  upload: '업로드',
  chat: 'AI 채팅',
  lineage: '데이터 계보',
  analytics: '분석',
  settings: '설정',
  security: '보안',
  new: '새로 만들기',
  edit: '수정',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on dashboard
  if (segments.length <= 1 && segments[0] === 'dashboard') {
    return (
      <div className="flex items-center gap-2 text-lg font-semibold">
        <House className="h-5 w-5" />
        <span>대시보드</span>
      </div>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard" className="flex items-center gap-1">
              <House className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {segments.map((segment, index) => {
          const href = '/' + segments.slice(0, index + 1).join('/');
          const isLast = index === segments.length - 1;
          const label = routeLabels[segment] || segment;

          // Skip UUID segments (show as "상세")
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
          const displayLabel = isUuid ? '상세' : label;

          return (
            <Fragment key={segment}>
              <BreadcrumbSeparator>
                <CaretRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{displayLabel}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{displayLabel}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
