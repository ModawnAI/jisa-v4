'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, CaretUpDown, Check, Copy } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  employeeId: z.string().min(1, '직원을 선택해주세요'),
  role: z.enum(['ceo', 'admin', 'manager', 'senior', 'junior', 'user']),
  tier: z.enum(['enterprise', 'pro', 'basic', 'free']),
  maxUses: z.number().int().min(1).max(100),
  expiresInDays: z.number().int().min(1).max(365),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  department: string | null;
}

interface CreatedCode {
  code: string;
  employee: {
    name: string;
    employeeId: string;
  };
}

export function CreateCodeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCode, setCreatedCode] = useState<CreatedCode | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: '',
      role: 'user',
      tier: 'free',
      maxUses: 1,
      expiresInDays: 30,
      description: '',
    },
  });

  // Load employees when dialog opens
  useEffect(() => {
    if (open && employees.length === 0) {
      loadEmployees();
    }
  }, [open, employees.length]);

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await fetch('/api/employees?limit=100&isActive=true');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/verification-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '코드 생성에 실패했습니다.');
      }

      setCreatedCode({
        code: result.data.code,
        employee: result.data.employee,
      });

      toast.success('인증 코드가 생성되었습니다!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '코드 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success('코드가 클립보드에 복사되었습니다.');
  };

  const handleClose = () => {
    setOpen(false);
    setCreatedCode(null);
    form.reset();
    router.refresh();
  };

  const selectedEmployee = employees.find(e => e.id === form.watch('employeeId'));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          코드 생성
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {createdCode ? (
          <>
            <DialogHeader>
              <DialogTitle>인증 코드가 생성되었습니다!</DialogTitle>
              <DialogDescription>
                {createdCode.employee.name}님의 카카오톡 인증 코드입니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6">
                <code className="text-2xl font-bold tracking-wider">
                  {createdCode.code}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyCode(createdCode.code)}
                >
                  <Copy className="h-5 w-5" />
                </Button>
              </div>

              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium">직원에게 전달할 안내 메시지:</p>
                <p className="mt-2 text-muted-foreground">
                  카카오톡에서 아래 코드를 입력하여 인증을 완료해주세요:
                  <br />
                  <strong>{createdCode.code}</strong>
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                닫기
              </Button>
              <Button onClick={() => {
                setCreatedCode(null);
                form.reset();
              }}>
                추가 생성
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>인증 코드 생성</DialogTitle>
              <DialogDescription>
                직원의 카카오톡 인증을 위한 코드를 생성합니다.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Employee Selection */}
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>직원 선택</FormLabel>
                      <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                'justify-between',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {selectedEmployee
                                ? `${selectedEmployee.name} (${selectedEmployee.employeeId})`
                                : '직원을 선택하세요'}
                              <CaretUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder="이름 또는 사번으로 검색..." />
                            <CommandList>
                              <CommandEmpty>
                                {loadingEmployees ? '로딩 중...' : '검색 결과가 없습니다.'}
                              </CommandEmpty>
                              <CommandGroup>
                                {employees.map((employee) => (
                                  <CommandItem
                                    key={employee.id}
                                    value={`${employee.name} ${employee.employeeId}`}
                                    onSelect={() => {
                                      field.onChange(employee.id);
                                      setEmployeeOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        employee.id === field.value ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    <div>
                                      <div className="font-medium">{employee.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {employee.employeeId}
                                        {employee.department && ` · ${employee.department}`}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        코드 형식: EMP-{selectedEmployee?.employeeId || '{사번}'}-XXXX
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  {/* Role Selection */}
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>역할</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">사용자</SelectItem>
                            <SelectItem value="junior">주니어</SelectItem>
                            <SelectItem value="senior">시니어</SelectItem>
                            <SelectItem value="manager">매니저</SelectItem>
                            <SelectItem value="admin">관리자</SelectItem>
                            <SelectItem value="ceo">CEO</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tier Selection */}
                  <FormField
                    control={form.control}
                    name="tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>등급</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Max Uses */}
                  <FormField
                    control={form.control}
                    name="maxUses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>최대 사용 횟수</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Expires In Days */}
                  <FormField
                    control={form.control}
                    name="expiresInDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>만료 기간 (일)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || 30)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>설명 (선택)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="이 코드에 대한 메모를 입력하세요..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? '생성 중...' : '코드 생성'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
