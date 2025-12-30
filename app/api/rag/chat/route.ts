/**
 * RAG Chat API Endpoint
 * POST /api/rag/chat
 *
 * Full RAG pipeline with inference.
 * Supports both regular JSON response and SSE streaming.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragQuery, search } from '@/lib/rag';
import type { RAGSearchOptions, SSEEvent } from '@/lib/rag/types';

// Request body schema
interface ChatRequest {
  query: string;
  options?: RAGSearchOptions;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'query is required and must be a string' },
        { status: 400, headers: corsHeaders }
      );
    }

    const options: RAGSearchOptions = body.options || {};

    // Check if streaming is requested
    if (options.stream) {
      return handleStreamingResponse(body.query, options);
    }

    // Regular JSON response
    const result = await ragQuery(body.query, options);

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error('[RAG Chat API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Handle SSE streaming response
 */
function handleStreamingResponse(query: string, options: RAGSearchOptions) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: SSEEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        // Step 1: Searching
        sendEvent({ type: 'searching' });

        // Get search results first
        const searchResult = await search({ query, ...options });

        // Step 2: Send context (search results)
        sendEvent({
          type: 'context',
          data: searchResult.results.map((r) => ({
            postId: r.postId,
            title: r.title,
            category: r.category,
            date: r.date,
            score: r.score,
          })),
        });

        // Step 3: Generating
        sendEvent({ type: 'generating' });

        // Get full RAG response
        const result = await ragQuery(query, options);

        // Step 4: Send answer in chunks (simulate streaming)
        const chunkSize = 50; // Characters per chunk
        const answer = result.answer;

        for (let i = 0; i < answer.length; i += chunkSize) {
          const chunk = answer.slice(i, i + chunkSize);
          sendEvent({ type: 'chunk', data: chunk });
          // Small delay to simulate streaming
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Step 5: Done
        sendEvent({ type: 'done' });

        controller.close();
      } catch (error) {
        console.error('[RAG Chat Streaming] Error:', error);
        sendEvent({
          type: 'error',
          data: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders,
    },
  });
}
