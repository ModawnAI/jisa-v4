import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ragChatService, StreamChunk } from '@/lib/services/rag-chat.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ),
  employeeId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  includeOrganization: z.boolean().default(true),
  includePersonal: z.boolean().default(true),
  stream: z.boolean().default(true),
  topK: z.number().min(1).max(20).default(10),
  minScore: z.number().min(0).max(1).default(0.5),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(100).max(4096).default(1024),
  clearanceLevel: z.enum(['basic', 'standard', 'advanced']).optional(),
});

export type ChatRequest = z.infer<typeof chatSchema>;

/**
 * Chat API
 * POST /api/chat
 *
 * Supports both streaming and non-streaming responses
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const validated = chatSchema.parse(body);

  const chatOptions = {
    employeeId: validated.employeeId,
    categoryId: validated.categoryId,
    includeOrganization: validated.includeOrganization,
    includePersonal: validated.includePersonal,
    topK: validated.topK,
    minScore: validated.minScore,
    temperature: validated.temperature,
    maxTokens: validated.maxTokens,
    clearanceLevel: validated.clearanceLevel,
  };

  if (validated.stream) {
    // Streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of ragChatService.chatStream(
            validated.messages,
            chatOptions
          )) {
            const data = JSON.stringify(chunk) + '\n';
            controller.enqueue(encoder.encode(data));
          }
        } catch (error) {
          const errorChunk: StreamChunk = {
            type: 'error',
            data: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
          };
          const data = JSON.stringify(errorChunk) + '\n';
          controller.enqueue(encoder.encode(data));
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } else {
    // Non-streaming response
    const response = await ragChatService.chat(validated.messages, chatOptions);

    return NextResponse.json({
      success: true,
      data: response,
    });
  }
});
