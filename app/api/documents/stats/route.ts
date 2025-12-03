import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/lib/services/document.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const statsQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
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
  const params = statsQuerySchema.parse({
    dateFrom: searchParams.get('dateFrom'),
    dateTo: searchParams.get('dateTo'),
  });

  const stats = await documentService.getStats({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });

  return NextResponse.json({
    success: true,
    data: stats,
  });
});
