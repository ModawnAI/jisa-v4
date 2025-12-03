import { notFound } from 'next/navigation';
import { categoryService } from '@/lib/services/category.service';
import { PageHeader } from '@/components/admin/page-header';
import { CategoryForm } from '../_components/category-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: PageProps) {
  const { id } = await params;

  let category;
  try {
    category = await categoryService.getById(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="카테고리 수정"
        description={`${category.name} 카테고리의 정보를 수정합니다.`}
      />
      <CategoryForm category={category} />
    </div>
  );
}
