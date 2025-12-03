import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { PromptTable } from './_components/prompt-table';
import { Button } from '@/components/ui/button';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { promptTemplateService } from '@/lib/services/prompt-template.service';

async function PromptData() {
  const templates = await promptTemplateService.listTemplates();

  return <PromptTable initialData={templates} />;
}

export default function PromptsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="프롬프트 관리"
        description="AI 챗봇의 프롬프트 템플릿을 관리합니다. Gemini API 모델 설정과 변수를 편집할 수 있습니다."
      >
        <Button asChild>
          <Link href="/prompts/new">
            <Plus className="mr-2 h-4 w-4" weight="bold" />
            프롬프트 추가
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={<PromptTableSkeleton />}>
        <PromptData />
      </Suspense>
    </div>
  );
}

function PromptTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
