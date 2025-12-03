import { notFound } from 'next/navigation';
import { employeeService } from '@/lib/services/employee.service';
import { PageHeader } from '@/components/admin/page-header';
import { EmployeeForm } from '../../_components/employee-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: PageProps) {
  const { id } = await params;

  let employee;
  try {
    employee = await employeeService.getById(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="직원 수정"
        description={`${employee.name} (${employee.employeeId})의 정보를 수정합니다.`}
      />
      <EmployeeForm employee={employee} />
    </div>
  );
}
