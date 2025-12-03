import { PageHeader } from '@/components/admin/page-header';
import { CategoryForm } from '../_components/category-form';

interface PageProps {
  searchParams: Promise<{ parentId?: string }>;
}

export default async function NewCategoryPage({ searchParams }: PageProps) {
  const { parentId } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="카테고리 추가"
        description="새로운 카테고리를 생성합니다."
      />
      <CategoryForm parentId={parentId} />
    </div>
  );
}
