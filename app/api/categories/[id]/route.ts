import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { categoryService } from '@/lib/services/category.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
  minClearanceLevel: z.enum(['basic', 'standard', 'advanced']).optional(),
  namespaceType: z.enum(['company', 'employee']).optional(),
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

  const category = await categoryService.getById(id);

  return NextResponse.json({
    success: true,
    data: category,
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
  const validated = updateCategorySchema.parse(body);

  const category = await categoryService.update(id, validated);

  return NextResponse.json({
    success: true,
    data: category,
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

  await categoryService.delete(id);

  return NextResponse.json({
    success: true,
    message: '카테고리가 삭제되었습니다.',
  });
});
