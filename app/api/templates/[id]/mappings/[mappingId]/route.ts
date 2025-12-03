import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { templateService } from '@/lib/services/template.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const updateMappingSchema = z.object({
  sourceColumn: z.string().min(1).optional(),
  sourceColumnIndex: z.number().int().nonnegative().optional(),
  targetField: z.string().min(1).optional(),
  targetFieldType: z.enum(['string', 'number', 'date', 'currency']).optional(),
  fieldRole: z.enum(['employee_identifier', 'content', 'metadata', 'skip']).optional(),
  transformFunction: z.string().optional(),
  defaultValue: z.string().optional(),
  isRequired: z.boolean().optional(),
  validationRegex: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { mappingId } = await context!.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const validated = updateMappingSchema.parse(body);

  const mapping = await templateService.updateColumnMapping(mappingId, validated);

  return NextResponse.json({
    success: true,
    data: mapping,
  });
});

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { mappingId } = await context!.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  await templateService.deleteColumnMapping(mappingId);

  return NextResponse.json({
    success: true,
    data: { id: mappingId },
  });
});
