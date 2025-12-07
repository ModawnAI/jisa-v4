import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pineconeService } from '@/lib/services/pinecone.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const cleanupSchema = z.object({
  documentId: z.string().uuid(),
});

/**
 * POST /api/vectors/cleanup
 * Clean up orphaned vectors by documentId across all namespaces
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { documentId } = cleanupSchema.parse(body);

  // Get all namespaces from Pinecone
  const { namespaces } = await pineconeService.listNamespaces();

  // Delete vectors with matching documentId from each namespace
  const results: Array<{ namespace: string; status: 'success' | 'error'; error?: string }> = [];

  await Promise.all(
    namespaces.map(async ({ name }) => {
      try {
        await pineconeService.deleteByDocumentId(name, documentId);
        results.push({ namespace: name, status: 'success' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.push({ namespace: name, status: 'error', error: message });
      }
    })
  );

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return NextResponse.json({
    success: true,
    data: {
      documentId,
      namespacesProcessed: namespaces.length,
      successCount,
      errorCount,
      errors: results.filter(r => r.status === 'error'),
    },
  });
});
