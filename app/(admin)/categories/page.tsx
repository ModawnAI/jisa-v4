import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { CategoryTree } from './_components/category-tree';
import { Button } from '@/components/ui/button';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="카테고리 관리"
        description="문서를 분류하기 위한 카테고리를 관리합니다."
      >
        <Button asChild>
          <Link href="/categories/new">
            <Plus className="mr-2 h-4 w-4" weight="bold" />
            카테고리 추가
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={<CategorySkeleton />}>
        <CategoryTree />
      </Suspense>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
