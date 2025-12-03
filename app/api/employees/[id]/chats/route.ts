import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { chatSessions, chatMessages } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withErrorHandler } from '@/lib/errors/handler';

export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id: employeeId } = await context!.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  // Get query params
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const offset = (page - 1) * pageSize;

  // Get chat sessions for this employee with messages
  const sessions = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      summary: chatSessions.summary,
      metadata: chatSessions.metadata,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
    })
    .from(chatSessions)
    .where(eq(chatSessions.employeeId, employeeId))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(pageSize)
    .offset(offset);

  // Get total count
  const allSessions = await db
    .select({ id: chatSessions.id })
    .from(chatSessions)
    .where(eq(chatSessions.employeeId, employeeId));
  const total = allSessions.length;

  // Get messages for each session
  const sessionsWithMessages = await Promise.all(
    sessions.map(async (session) => {
      const messages = await db
        .select({
          id: chatMessages.id,
          role: chatMessages.role,
          content: chatMessages.content,
          sourceChunkIds: chatMessages.sourceChunkIds,
          ragContext: chatMessages.ragContext,
          promptTokens: chatMessages.promptTokens,
          completionTokens: chatMessages.completionTokens,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, session.id))
        .orderBy(chatMessages.createdAt);

      return {
        ...session,
        messages,
      };
    })
  );

  return NextResponse.json({
    success: true,
    data: {
      sessions: sessionsWithMessages,
      total,
      page,
      pageSize,
      hasMore: offset + sessions.length < total,
    },
  });
});
