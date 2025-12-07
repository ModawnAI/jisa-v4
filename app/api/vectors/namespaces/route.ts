import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pineconeService } from '@/lib/services/pinecone.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

/**
 * List all Pinecone namespaces
 * GET /api/vectors/namespaces
 *
 * Returns all namespaces in the Pinecone index with their stats
 */
export const GET = withErrorHandler(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const stats = await pineconeService.listNamespaces();

  return NextResponse.json({
    success: true,
    data: {
      namespaces: stats.namespaces,
      totalRecords: stats.totalRecords,
      totalNamespaces: stats.namespaces.length,
      dimension: stats.dimension,
    },
  });
});

const deleteSchema = z.object({
  namespaces: z.array(z.string()).optional(),
  deleteAll: z.boolean().optional(),
  confirm: z.literal(true).describe('삭제를 확인하려면 confirm: true를 전송해주세요.'),
});

/**
 * Delete Pinecone namespaces
 * DELETE /api/vectors/namespaces
 *
 * Body:
 * - namespaces?: string[] - Specific namespaces to delete
 * - deleteAll?: boolean - Delete ALL namespaces (requires confirm: true)
 * - confirm: true - Required confirmation flag
 *
 * Either namespaces or deleteAll must be provided
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const validated = deleteSchema.parse(body);

  // Require either namespaces or deleteAll
  if (!validated.namespaces?.length && !validated.deleteAll) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '삭제할 네임스페이스를 지정하거나 deleteAll: true를 전송해주세요.',
        },
      },
      { status: 400 }
    );
  }

  if (validated.deleteAll) {
    // Delete all namespaces
    const result = await pineconeService.clearAllNamespaces();

    return NextResponse.json({
      success: true,
      data: {
        message: '모든 네임스페이스가 삭제되었습니다.',
        deletedNamespaces: result.deletedNamespaces,
        deletedCount: result.deletedNamespaces.length,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    });
  }

  // Delete specific namespaces
  const deletedNamespaces: string[] = [];
  const errors: Array<{ namespace: string; error: string }> = [];

  for (const namespace of validated.namespaces!) {
    try {
      await pineconeService.deleteNamespace(namespace);
      deletedNamespaces.push(namespace);
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      errors.push({ namespace, error: message });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      message: `${deletedNamespaces.length}개의 네임스페이스가 삭제되었습니다.`,
      deletedNamespaces,
      deletedCount: deletedNamespaces.length,
      errors: errors.length > 0 ? errors : undefined,
    },
  });
});
