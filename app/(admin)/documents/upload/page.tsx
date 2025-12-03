import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { UploadForm } from './_components/upload-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { categoryService } from '@/lib/services/category.service';
import { templateService } from '@/lib/services/template.service';

async function UploadFormData() {
  const [categories, templates] = await Promise.all([
    categoryService.getSelectOptions(),
    templateService.getSelectOptions(),
  ]);

  return (
    <UploadForm
      categories={categories}
      templates={templates}
    />
  );
}

export default function DocumentUploadPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="문서 업로드"
        description="분석할 문서 파일을 업로드합니다."
      >
        <Button variant="outline" asChild>
          <Link href="/documents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={<UploadFormSkeleton />}>
        <UploadFormData />
      </Suspense>
    </div>
  );
}

function UploadFormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[200px] w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[80px]" />
        <Skeleton className="h-[80px]" />
      </div>
      <Skeleton className="h-10 w-[120px]" />
    </div>
  );
}
