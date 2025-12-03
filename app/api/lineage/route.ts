import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { lineageService } from '@/lib/services/lineage.service';

const querySchema = z.object({
  documentId: z.string().uuid().optional(),
  employeeId: z.string().optional(),
  namespace: z.string().optional(),
  pineconeIds: z.string().optional(), // comma-separated
  batchId: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = querySchema.parse({
      documentId: searchParams.get('documentId') || undefined,
      employeeId: searchParams.get('employeeId') || undefined,
      namespace: searchParams.get('namespace') || undefined,
      pineconeIds: searchParams.get('pineconeIds') || undefined,
      batchId: searchParams.get('batchId') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    const filters = {
      documentId: params.documentId,
      employeeId: params.employeeId,
      namespace: params.namespace,
      pineconeIds: params.pineconeIds ? params.pineconeIds.split(',') : undefined,
      batchId: params.batchId,
    };

    const result = await lineageService.getLineage(filters, params.page, params.limit);

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        page: params.page,
        pageSize: params.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / params.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '유효하지 않은 요청 파라미터입니다.',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    console.error('Lineage GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '계보 조회 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
