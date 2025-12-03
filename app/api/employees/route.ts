import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/lib/services/employee.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const createEmployeeSchema = z.object({
  employeeId: z.string().min(1, '직원 ID는 필수입니다'),
  name: z.string().min(1, '이름은 필수입니다'),
  email: z.string().email('유효한 이메일을 입력하세요').optional().or(z.literal('')),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  managerId: z.string().uuid().optional(),
  clearanceLevel: z.enum(['basic', 'standard', 'advanced']).optional(),
  hireDate: z.string().datetime().optional(),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);

  const filters = {
    search: searchParams.get('search') || undefined,
    isActive: searchParams.has('isActive')
      ? searchParams.get('isActive') === 'true'
      : undefined,
    department: searchParams.get('department') || undefined,
    clearanceLevel: searchParams.get('clearanceLevel') as 'basic' | 'standard' | 'advanced' | undefined,
  };

  const pagination = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
  };

  const result = await employeeService.list(filters, pagination);

  return NextResponse.json({
    success: true,
    ...result,
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const validated = createEmployeeSchema.parse(body);

  const employee = await employeeService.create({
    ...validated,
    email: validated.email || undefined,
    hireDate: validated.hireDate ? new Date(validated.hireDate) : undefined,
  });

  return NextResponse.json(
    { success: true, data: employee },
    { status: 201 }
  );
});
