import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { DocumentTable } from './_components/document-table';
import { Button } from '@/components/ui/button';
import { Upload } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { documentService } from '@/lib/services/document.service';
import { categoryService } from '@/lib/services/category.service';
import { templateService } from '@/lib/services/template.service';

async function DocumentData() {
  const [documentsResult, categories, templates] = await Promise.all([
    documentService.list({ page: 1, pageSize: 20 }),
    categoryService.getSelectOptions(),
    templateService.getSelectOptions(),
  ]);

  return (
    <DocumentTable
      initialData={documentsResult}
      categories={categories}
      templates={templates}
    />
  );
}

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="문서 관리"
        description="업로드된 문서를 관리하고 처리 상태를 확인합니다."
      >
        <Button asChild>
          <Link href="/documents/upload">
            <Upload className="mr-2 h-4 w-4" weight="bold" />
            문서 업로드
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={<DocumentTableSkeleton />}>
        <DocumentData />
      </Suspense>
    </div>
  );
}

function DocumentTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
