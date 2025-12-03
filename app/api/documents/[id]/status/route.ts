import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/lib/services/document.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'partial']),
  errorMessage: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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
  const validated = updateStatusSchema.parse(body);

  const document = await documentService.updateStatus(id, validated.status, {
    errorMessage: validated.errorMessage,
    metadata: validated.metadata,
  });

  return NextResponse.json({
    success: true,
    data: document,
  });
});
