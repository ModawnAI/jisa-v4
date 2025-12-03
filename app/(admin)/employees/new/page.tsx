import { PageHeader } from '@/components/admin/page-header';
import { EmployeeForm } from '../_components/employee-form';

export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="직원 추가"
        description="새로운 직원을 시스템에 등록합니다."
      />
      <EmployeeForm />
    </div>
  );
}
