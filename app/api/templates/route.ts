import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { templateService } from '@/lib/services/template.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { slugify } from '@/lib/utils';
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string().min(1, '템플릿 이름은 필수입니다'),
  slug: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid('유효한 카테고리를 선택해주세요'),
  documentTypeId: z.string().uuid().optional(),
  fileType: z.enum(['excel', 'csv', 'pdf', 'word']),
  processingMode: z.enum(['company', 'employee_split', 'employee_aggregate']).optional(),
  chunkingStrategy: z.enum(['auto', 'row_per_chunk', 'fixed_size', 'semantic']).optional(),
  chunkSize: z.number().int().positive().optional(),
  chunkOverlap: z.number().int().nonnegative().optional(),
  isRecurring: z.boolean().optional(),
  recurringPeriod: z.string().optional(),
  retentionDays: z.number().int().positive().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  fileType: z.enum(['excel', 'csv', 'pdf', 'word']).optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
  format: z.enum(['list', 'select']).optional().default('list'),
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
  const params = listQuerySchema.parse(Object.fromEntries(searchParams));

  if (params.format === 'select') {
    const data = await templateService.getSelectOptions(params.categoryId);
    return NextResponse.json({
      success: true,
      data,
    });
  }

  const result = await templateService.list({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    categoryId: params.categoryId,
    fileType: params.fileType,
    includeInactive: params.includeInactive,
  });

  return NextResponse.json({
    success: true,
    data: result.data,
    meta: result.meta,
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
  const validated = createTemplateSchema.parse(body);

  const template = await templateService.create({
    ...validated,
    slug: validated.slug || slugify(validated.name),
  });

  return NextResponse.json({
    success: true,
    data: template,
  }, { status: 201 });
});
