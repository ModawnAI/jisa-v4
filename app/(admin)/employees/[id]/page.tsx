import { notFound } from 'next/navigation';
import Link from 'next/link';
import { employeeService } from '@/lib/services/employee.service';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Robot, FileText, ClockCounterClockwise, ChatCircle } from '@phosphor-icons/react/dist/ssr';
import { formatDate } from '@/lib/utils';
import { CLEARANCE_LABELS } from '@/lib/constants';
import { EmployeeDocuments } from './_components/employee-documents';
import { EmployeeActivity } from './_components/employee-activity';
import { EmployeeChatHistory } from './_components/employee-chat-history';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailPage({ params }: PageProps) {
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
        title={employee.name}
        description={`사번: ${employee.employeeId} | ${employee.department || '부서 미지정'}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/chat?employeeId=${employee.id}`}>
              <Robot className="mr-2 h-4 w-4" />
              AI 채팅
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/employees/${employee.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              수정
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Info Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow label="이름" value={employee.name} />
            <InfoRow label="사번" value={employee.employeeId} />
            <InfoRow label="이메일" value={employee.email || '-'} />
            <InfoRow label="연락처" value={employee.phone || '-'} />
            <InfoRow label="부서" value={employee.department || '-'} />
            <InfoRow label="직급" value={employee.position || '-'} />
            <InfoRow
              label="상태"
              value={
                <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                  {employee.isActive ? '재직' : '퇴직'}
                </Badge>
              }
            />
            <InfoRow
              label="권한 레벨"
              value={CLEARANCE_LABELS[employee.clearanceLevel]}
            />
            <InfoRow
              label="입사일"
              value={employee.hireDate ? formatDate(employee.hireDate) : '-'}
            />
            <InfoRow label="등록일" value={formatDate(employee.createdAt)} />
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="documents">
            <TabsList>
              <TabsTrigger value="documents">
                <FileText className="mr-2 h-4 w-4" />
                문서
              </TabsTrigger>
              <TabsTrigger value="chats">
                <ChatCircle className="mr-2 h-4 w-4" />
                채팅 내역
              </TabsTrigger>
              <TabsTrigger value="activity">
                <ClockCounterClockwise className="mr-2 h-4 w-4" />
                활동 내역
              </TabsTrigger>
            </TabsList>
            <TabsContent value="documents" className="mt-4">
              <EmployeeDocuments employeeId={employee.id} />
            </TabsContent>
            <TabsContent value="chats" className="mt-4">
              <EmployeeChatHistory employeeId={employee.id} />
            </TabsContent>
            <TabsContent value="activity" className="mt-4">
              <EmployeeActivity employeeId={employee.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
