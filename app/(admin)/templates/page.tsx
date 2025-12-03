import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { TemplateTable } from './_components/template-table';
import { Button } from '@/components/ui/button';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { templateService } from '@/lib/services/template.service';
import { categoryService } from '@/lib/services/category.service';

async function TemplateData() {
  const [templatesResult, categories] = await Promise.all([
    templateService.list({ page: 1, pageSize: 20 }),
    categoryService.getSelectOptions(),
  ]);

  return (
    <TemplateTable
      initialData={templatesResult}
      categories={categories}
    />
  );
}

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="템플릿 관리"
        description="문서 처리를 위한 템플릿을 관리합니다."
      >
        <Button asChild>
          <Link href="/templates/new">
            <Plus className="mr-2 h-4 w-4" weight="bold" />
            템플릿 추가
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={<TemplateTableSkeleton />}>
        <TemplateData />
      </Suspense>
    </div>
  );
}

function TemplateTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
