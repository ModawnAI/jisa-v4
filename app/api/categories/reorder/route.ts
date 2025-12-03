import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { categoryService } from '@/lib/services/category.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const reorderSchema = z.object({
  orders: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int().min(0),
  })),
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
  const { orders } = reorderSchema.parse(body);

  await categoryService.reorder(orders);

  return NextResponse.json({
    success: true,
    message: '카테고리 순서가 변경되었습니다.',
  });
});
