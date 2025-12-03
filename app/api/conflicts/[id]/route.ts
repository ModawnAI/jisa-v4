import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { conflictService } from '@/lib/services/conflict.service';

import type { ResolutionType } from '@/lib/services/conflict.service';

const resolveSchema = z.object({
  resolution: z.enum(['keep_existing', 'keep_new', 'merge', 'dismiss']),
  resolvedBy: z.string().uuid(),
  notes: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FIELD',
            message: '충돌 ID가 필요합니다.',
          },
        },
        { status: 400 }
      );
    }

    const conflict = await conflictService.getById(id);

    if (!conflict) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '충돌을 찾을 수 없습니다.',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: conflict,
    });
  } catch (error) {
    console.error('Conflict GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '충돌 조회 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FIELD',
            message: '충돌 ID가 필요합니다.',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = resolveSchema.parse(body);

    const resolved = await conflictService.resolveConflict(
      id,
      data.resolution as ResolutionType,
      data.resolvedBy,
      data.notes
    );

    return NextResponse.json({
      success: true,
      data: resolved,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '유효하지 않은 요청 데이터입니다.',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === '충돌을 찾을 수 없습니다.') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    console.error('Conflict PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '충돌 해결 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
