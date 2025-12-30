/**
 * RAG Search API Endpoint
 * POST /api/rag/search
 *
 * Search only (no inference).
 * Returns matching documents with scores.
 */

import { NextRequest, NextResponse } from 'next/server';
import { search } from '@/lib/rag';
import type { RAGSearchOptions } from '@/lib/rag/types';

// Request body schema
interface SearchRequest {
  query: string;
  options?: Omit<RAGSearchOptions, 'stream'>;
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
    const body: SearchRequest = await request.json();

    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'query is required and must be a string' },
        { status: 400, headers: corsHeaders }
      );
    }

    const options = body.options || {};

    const result = await search({
      query: body.query,
      ...options,
    });

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error('[RAG Search API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
