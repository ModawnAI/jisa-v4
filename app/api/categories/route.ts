import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { categoryService } from '@/lib/services/category.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { slugify } from '@/lib/utils';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1, '카테고리 이름은 필수입니다'),
  slug: z.string().optional(),
  parentId: z.string().uuid().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  minClearanceLevel: z.enum(['basic', 'standard', 'advanced']).optional(),
  namespaceType: z.enum(['company', 'employee']).optional(),
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
  const format = searchParams.get('format'); // 'tree' or 'flat' or 'select'
  const includeInactive = searchParams.get('includeInactive') === 'true';

  let data;
  if (format === 'tree') {
    data = await categoryService.getTree(includeInactive);
  } else if (format === 'select') {
    data = await categoryService.getSelectOptions(includeInactive);
  } else {
    data = await categoryService.list(includeInactive);
  }

  return NextResponse.json({
    success: true,
    data,
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
  const validated = createCategorySchema.parse(body);

  const category = await categoryService.create({
    ...validated,
    slug: validated.slug || slugify(validated.name),
  });

  return NextResponse.json({
    success: true,
    data: category,
  }, { status: 201 });
});
