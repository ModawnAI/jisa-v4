import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/lib/services/document.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const updateDocumentSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  documentTypeId: z.string().uuid().optional().nullable(),
  templateId: z.string().uuid().optional().nullable(),
  period: z.string().optional().nullable(),
  employeeId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const { id } = await context!.params;
  const document = await documentService.getById(id);

  return NextResponse.json({
    success: true,
    data: document,
  });
});

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const { id } = await context!.params;
  const body = await request.json();
  const validated = updateDocumentSchema.parse(body);

  // Convert nullable to undefined for service
  const input = {
    categoryId: validated.categoryId ?? undefined,
    documentTypeId: validated.documentTypeId ?? undefined,
    templateId: validated.templateId ?? undefined,
    period: validated.period ?? undefined,
    employeeId: validated.employeeId ?? undefined,
    metadata: validated.metadata,
  };

  const document = await documentService.update(id, input);

  return NextResponse.json({
    success: true,
    data: document,
  });
});

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const { id } = await context!.params;

  // Check query params for hard delete
  const { searchParams } = new URL(request.url);
  const hardDelete = searchParams.get('hard') === 'true';

  if (hardDelete) {
    await documentService.hardDelete(id);
  } else {
    await documentService.delete(id, user.id);
  }

  return NextResponse.json({
    success: true,
    data: { deleted: true },
  });
});
