import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/lib/services/employee.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  managerId: z.string().uuid().nullable().optional(),
  clearanceLevel: z.enum(['basic', 'standard', 'advanced']).optional(),
  hireDate: z.string().datetime().optional(),
  terminationDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const employee = await employeeService.getById(id);

  return NextResponse.json({
    success: true,
    data: employee,
  });
});

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const validated = updateEmployeeSchema.parse(body);

  const employee = await employeeService.update(id, {
    ...validated,
    email: validated.email || undefined,
    hireDate: validated.hireDate ? new Date(validated.hireDate) : undefined,
    terminationDate: validated.terminationDate ? new Date(validated.terminationDate) : undefined,
  });

  return NextResponse.json({
    success: true,
    data: employee,
  });
});

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  await employeeService.delete(id);

  return NextResponse.json({
    success: true,
    message: '직원이 삭제되었습니다.',
  });
});
