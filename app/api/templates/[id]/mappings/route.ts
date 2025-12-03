import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { templateService } from '@/lib/services/template.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const columnMappingSchema = z.object({
  sourceColumn: z.string().min(1, '소스 컬럼명은 필수입니다'),
  sourceColumnIndex: z.number().int().nonnegative().optional(),
  targetField: z.string().min(1, '대상 필드명은 필수입니다'),
  targetFieldType: z.enum(['string', 'number', 'date', 'currency']),
  fieldRole: z.enum(['employee_identifier', 'content', 'metadata', 'skip']).optional(),
  transformFunction: z.string().optional(),
  defaultValue: z.string().optional(),
  isRequired: z.boolean().optional(),
  validationRegex: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

const setMappingsSchema = z.array(columnMappingSchema);

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

  const mappings = await templateService.getColumnMappings(id);

  return NextResponse.json({
    success: true,
    data: mappings,
  });
});

export const POST = withErrorHandler(async (
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
  const validated = setMappingsSchema.parse(body);

  const mappings = await templateService.setColumnMappings(id, validated);

  return NextResponse.json({
    success: true,
    data: mappings,
  });
});
