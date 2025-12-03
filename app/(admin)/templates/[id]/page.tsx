import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { TemplateForm } from '../_components/template-form';
import { templateService } from '@/lib/services/template.service';
import { categoryService } from '@/lib/services/category.service';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params;

  let template;
  try {
    template = await templateService.getById(id);
  } catch {
    notFound();
  }

  const categories = await categoryService.getSelectOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="템플릿 수정"
        description={`${template.name} 템플릿의 정보를 수정합니다.`}
      />
      <TemplateForm template={template} categories={categories} />
    </div>
  );
}
