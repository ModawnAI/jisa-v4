'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { CLEARANCE_LABELS } from '@/lib/constants';
import { SpinnerGap } from '@phosphor-icons/react';

const employeeSchema = z.object({
  employeeId: z.string().min(1, '사번은 필수입니다'),
  name: z.string().min(1, '이름은 필수입니다'),
  email: z.string().email('유효한 이메일을 입력하세요').optional().or(z.literal('')),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  clearanceLevel: z.enum(['basic', 'standard', 'advanced']).optional(),
  hireDate: z.date().optional(),
  isActive: z.boolean().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
  clearanceLevel: string;
  hireDate?: Date | string | null;
  isActive: boolean;
}

interface EmployeeFormProps {
  employee?: Employee;
}

export function EmployeeForm({ employee }: EmployeeFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeId: employee?.employeeId || '',
      name: employee?.name || '',
      email: employee?.email || '',
      phone: employee?.phone || '',
      department: employee?.department || '',
      position: employee?.position || '',
      clearanceLevel: (employee?.clearanceLevel as 'basic' | 'standard' | 'advanced') || 'basic',
      hireDate: employee?.hireDate ? new Date(employee.hireDate) : undefined,
      isActive: employee?.isActive ?? true,
    },
  });

  const onSubmit = async (data: EmployeeFormData) => {
    setLoading(true);

    try {
      const url = employee ? `/api/employees/${employee.id}` : '/api/employees';
      const method = employee ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          email: data.email || undefined,
          hireDate: data.hireDate?.toISOString(),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '저장에 실패했습니다.');
      }

      toast({
        title: employee ? '직원 정보가 수정되었습니다.' : '직원이 추가되었습니다.',
      });

      router.push('/employees');
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '오류가 발생했습니다.';
      toast({
        title: '오류가 발생했습니다.',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>직원 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사번 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="EMP001" disabled={!!employee} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="홍길동" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@company.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연락처</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="010-1234-5678" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>부서</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="영업부" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>직급</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="과장" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>입사일</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        onSelect={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clearanceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>권한 레벨</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="권한 레벨 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CLEARANCE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      RAG 시스템에서 접근할 수 있는 문서의 범위를 결정합니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />}
              {employee ? '수정' : '추가'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
