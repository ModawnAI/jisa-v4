import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { conflictService } from '@/lib/services/conflict.service';

import type { ConflictStatus, ConflictType } from '@/lib/services/conflict.service';

const querySchema = z.object({
  status: z.enum([
    'detected',
    'reviewing',
    'resolved_keep_existing',
    'resolved_keep_new',
    'resolved_merged',
    'dismissed',
  ]).optional(),
  conflictType: z.enum([
    'duplicate_content',
    'version_mismatch',
    'category_mismatch',
    'metadata_conflict',
    'employee_mismatch',
  ]).optional(),
  documentId: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

const createSchema = z.object({
  newDocumentId: z.string().uuid(),
  existingDocumentId: z.string().uuid().optional(),
  conflictType: z.enum([
    'duplicate_content',
    'version_mismatch',
    'category_mismatch',
    'metadata_conflict',
    'employee_mismatch',
  ]),
  conflictDetails: z.object({
    similarityScore: z.number().min(0).max(1).optional(),
    conflictingFields: z.array(z.object({
      field: z.string(),
      existingValue: z.unknown(),
      newValue: z.unknown(),
    })).optional(),
    affectedRows: z.array(z.number()).optional(),
    affectedVectorIds: z.array(z.string()).optional(),
    suggestedResolution: z.enum(['keep_existing', 'keep_new', 'merge']).optional(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = querySchema.parse({
      status: searchParams.get('status') || undefined,
      conflictType: searchParams.get('conflictType') || undefined,
      documentId: searchParams.get('documentId') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 10,
    });

    const result = await conflictService.getConflicts(
      {
        status: params.status as ConflictStatus | undefined,
        conflictType: params.conflictType as ConflictType | undefined,
        documentId: params.documentId,
      },
      params.page,
      params.limit
    );

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

    console.error('Conflicts GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '충돌 목록 조회 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const conflict = await conflictService.createConflict({
      newDocumentId: data.newDocumentId,
      existingDocumentId: data.existingDocumentId,
      conflictType: data.conflictType,
      conflictDetails: data.conflictDetails,
    });

    return NextResponse.json(
      {
        success: true,
        data: conflict,
      },
      { status: 201 }
    );
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

    console.error('Conflicts POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '충돌 생성 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
