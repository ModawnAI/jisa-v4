import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { lineageService } from '@/lib/services/lineage.service';

const querySchema = z.object({
  pineconeId: z.string().min(1, '벡터 ID가 필요합니다.'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = querySchema.parse({
      pineconeId: searchParams.get('pineconeId') || searchParams.get('vectorId'),
    });

    const trace = await lineageService.traceToSource(params.pineconeId);

    if (!trace) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '해당 벡터 ID의 계보 정보를 찾을 수 없습니다.',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: trace,
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

    console.error('Lineage trace error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '계보 추적 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
