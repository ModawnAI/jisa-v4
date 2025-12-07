'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { UsersThree, SpinnerGap } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  hasVerificationCode?: boolean;
}

export function GenerateAllButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [employeesWithoutCodes, setEmployeesWithoutCodes] = useState<Employee[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const checkEmployeesWithoutCodes = async () => {
    setIsChecking(true);
    try {
      // Fetch all active employees
      const empRes = await fetch('/api/employees?limit=1000&isActive=true');
      const empData = await empRes.json();

      if (!empData.success) {
        throw new Error('직원 목록을 불러오는데 실패했습니다.');
      }

      const employees: Employee[] = empData.data || [];

      // Fetch all active verification codes
      const codesRes = await fetch('/api/verification-codes?limit=1000&status=active');
      const codesData = await codesRes.json();

      const codesEmployeeIds = new Set(
        (codesData.data || []).map((c: { employeeId: string }) => c.employeeId)
      );

      // Filter employees without active codes
      const withoutCodes = employees.filter((e) => !codesEmployeeIds.has(e.id));

      setEmployeesWithoutCodes(withoutCodes);
      setDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '확인 중 오류가 발생했습니다.');
    } finally {
      setIsChecking(false);
    }
  };

  const generateAllCodes = async () => {
    if (employeesWithoutCodes.length === 0) {
      toast.info('모든 직원에게 이미 인증 코드가 있습니다.');
      setDialogOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/verification-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: employeesWithoutCodes.map((e) => e.id),
          role: 'user',
          tier: 'free',
          maxUses: 1,
          expiresInDays: 365,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '코드 생성에 실패했습니다.');
      }

      const { summary } = result.data;
      toast.success(
        `${summary.success}명의 직원에게 인증 코드가 생성되었습니다.${
          summary.failed > 0 ? ` (${summary.failed}명 실패)` : ''
        }`
      );

      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '코드 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" onClick={checkEmployeesWithoutCodes} disabled={isChecking}>
          {isChecking ? (
            <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UsersThree className="mr-2 h-4 w-4" />
          )}
          전체 코드 생성
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>전체 직원 인증 코드 생성</AlertDialogTitle>
          <AlertDialogDescription>
            {employeesWithoutCodes.length === 0 ? (
              '모든 활성 직원에게 이미 인증 코드가 있습니다.'
            ) : (
              <>
                인증 코드가 없는 <strong>{employeesWithoutCodes.length}명</strong>의 직원에게
                인증 코드를 생성합니다.
                <br />
                <br />
                <span className="text-sm text-muted-foreground">
                  기본 설정: 역할(사용자), 등급(Free), 유효기간(365일)
                </span>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>취소</AlertDialogCancel>
          {employeesWithoutCodes.length > 0 && (
            <AlertDialogAction onClick={generateAllCodes} disabled={isLoading}>
              {isLoading ? (
                <>
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                `${employeesWithoutCodes.length}명 코드 생성`
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
