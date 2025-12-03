import { PageHeader } from '@/components/admin/page-header';
import { TemplateForm } from '../_components/template-form';
import { categoryService } from '@/lib/services/category.service';

export default async function NewTemplatePage() {
  const categories = await categoryService.getSelectOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="템플릿 추가"
        description="새로운 문서 처리 템플릿을 생성합니다."
      />
      <TemplateForm categories={categories} />
    </div>
  );
}
