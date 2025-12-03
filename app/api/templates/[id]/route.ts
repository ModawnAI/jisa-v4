import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { templateService } from '@/lib/services/template.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  documentTypeId: z.string().uuid().optional(),
  fileType: z.enum(['excel', 'csv', 'pdf', 'word']).optional(),
  processingMode: z.enum(['company', 'employee_split', 'employee_aggregate']).optional(),
  chunkingStrategy: z.enum(['auto', 'row_per_chunk', 'fixed_size', 'semantic']).optional(),
  chunkSize: z.number().int().positive().optional(),
  chunkOverlap: z.number().int().nonnegative().optional(),
  isRecurring: z.boolean().optional(),
  recurringPeriod: z.string().optional(),
  retentionDays: z.number().int().positive().optional(),
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

  const template = await templateService.getById(id);

  return NextResponse.json({
    success: true,
    data: template,
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
  const validated = updateTemplateSchema.parse(body);

  const template = await templateService.update(id, validated);

  return NextResponse.json({
    success: true,
    data: template,
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

  await templateService.delete(id);

  return NextResponse.json({
    success: true,
    data: { id },
  });
});
