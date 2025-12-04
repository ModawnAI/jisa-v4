import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/lib/services/document.service';
import { inngest } from '@/lib/inngest/client';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

// Route segment config for App Router
export const maxDuration = 60; // 60 seconds max for file processing
export const dynamic = 'force-dynamic';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'partial']).optional(),
  period: z.string().optional(),
  employeeId: z.string().uuid().optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
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

  const result = await documentService.list({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    categoryId: params.categoryId,
    templateId: params.templateId,
    status: params.status,
    period: params.period,
    employeeId: params.employeeId,
    includeDeleted: params.includeDeleted,
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

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: '파일을 선택해주세요.' } },
      { status: 400 }
    );
  }

  // Parse optional fields
  const categoryId = formData.get('categoryId') as string | null;
  const documentTypeId = formData.get('documentTypeId') as string | null;
  const templateId = formData.get('templateId') as string | null;
  const period = formData.get('period') as string | null;
  const employeeId = formData.get('employeeId') as string | null;
  const metadataStr = formData.get('metadata') as string | null;

  let metadata: Record<string, unknown> | undefined;
  if (metadataStr) {
    try {
      metadata = JSON.parse(metadataStr);
    } catch {
      // Ignore invalid JSON
    }
  }

  const document = await documentService.create({
    file,
    categoryId: categoryId || undefined,
    documentTypeId: documentTypeId || undefined,
    templateId: templateId || undefined,
    period: period || undefined,
    employeeId: employeeId || undefined,
    uploadedBy: user.id,
    metadata,
  });

  // Trigger document processing via Inngest
  await inngest.send({
    name: 'document/process',
    data: { documentId: document.id },
  });

  return NextResponse.json({
    success: true,
    data: document,
  }, { status: 201 });
});
