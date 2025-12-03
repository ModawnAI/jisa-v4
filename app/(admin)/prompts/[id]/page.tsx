import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { PromptForm } from '../_components/prompt-form';
import { promptTemplateService } from '@/lib/services/prompt-template.service';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPromptPage({ params }: PageProps) {
  const { id } = await params;

  const template = await promptTemplateService.getById(id);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="프롬프트 수정"
        description={`${template.name} (v${template.version}) 프롬프트를 수정합니다. 변경 시 새 버전이 생성됩니다.`}
      />
      <PromptForm template={template} />
    </div>
  );
}
