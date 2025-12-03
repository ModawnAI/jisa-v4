'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DotsThree, Eye, Pencil, Trash, Robot } from '@phosphor-icons/react';
import { Pagination } from '@/components/ui/pagination';
import { formatDate } from '@/lib/utils';
import { CLEARANCE_LABELS } from '@/lib/constants';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email?: string | null;
  department?: string | null;
  position?: string | null;
  isActive: boolean;
  clearanceLevel: string;
  createdAt: string;
}

interface EmployeeTableProps {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const clearanceVariants: Record<string, string> = {
  basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  standard: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  advanced: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

export function EmployeeTable({ employees, pagination }: EmployeeTableProps) {
  const router = useRouter();

  const handleRowClick = (id: string) => {
    router.push(`/employees/${id}`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>직원</TableHead>
              <TableHead>부서/직급</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>권한 레벨</TableHead>
              <TableHead>등록일</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  직원이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(employee.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>
                          {employee.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {employee.employeeId}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{employee.department || '-'}</div>
                    <div className="text-sm text-muted-foreground">
                      {employee.position || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                      {employee.isActive ? '재직' : '퇴직'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${clearanceVariants[employee.clearanceLevel]}`}
                    >
                      {CLEARANCE_LABELS[employee.clearanceLevel]}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(employee.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <DotsThree className="h-4 w-4" weight="bold" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/employees/${employee.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          상세 보기
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/employees/${employee.id}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/chat?employeeId=${employee.id}`)}>
                          <Robot className="mr-2 h-4 w-4" />
                          AI 채팅
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash className="mr-2 h-4 w-4" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.limit}
        />
      )}
    </div>
  );
}
