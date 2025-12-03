import { PageHeader } from '@/components/admin/page-header';
import { PromptForm } from '../_components/prompt-form';

export default function NewPromptPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="프롬프트 추가"
        description="새로운 AI 프롬프트 템플릿을 생성합니다. 변수와 Gemini 모델 설정을 포함할 수 있습니다."
      />
      <PromptForm />
    </div>
  );
}
