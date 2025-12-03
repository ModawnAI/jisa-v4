import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pineconeService } from '@/lib/services/pinecone.service';
import { namespaceService } from '@/lib/services/namespace.service';
import { createEmbedding } from '@/lib/utils/embedding';
import { withErrorHandler } from '@/lib/errors/handler';
import { db } from '@/lib/db';
import { knowledgeChunks } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1, '검색어는 필수입니다'),
  categoryId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  includeOrganization: z.boolean().default(true),
  includePersonal: z.boolean().default(true),
  topK: z.number().min(1).max(100).default(10),
  minScore: z.number().min(0).max(1).default(0.5),
  clearanceLevel: z.enum(['basic', 'standard', 'advanced']).optional(),
});

export type SearchRequest = z.infer<typeof searchSchema>;

export interface SearchResultItem {
  id: string;
  score: number;
  namespace: string;
  content: string;
  documentId?: string;
  employeeId?: string;
  categoryId?: string;
  chunkIndex?: number;
  metadata?: Record<string, unknown>;
}

export interface SearchResponse {
  success: boolean;
  data: {
    results: SearchResultItem[];
    query: string;
    totalResults: number;
    searchedNamespaces: string[];
  };
}

/**
 * Vector search API
 * POST /api/vectors/search
 *
 * Searches across Pinecone namespaces using semantic similarity
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
  const validated = searchSchema.parse(body);

  // Get namespaces to search
  const namespaces = await namespaceService.getQueryNamespaces({
    includeOrganization: validated.includeOrganization,
    includePersonal: validated.includePersonal,
    employeeId: validated.employeeId,
    categoryId: validated.categoryId,
  });

  if (namespaces.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        results: [],
        query: validated.query,
        totalResults: 0,
        searchedNamespaces: [],
      },
    });
  }

  // Create embedding for the query
  const queryEmbedding = await createEmbedding(validated.query);

  // Build filter for clearance level if specified
  const filter = validated.clearanceLevel
    ? pineconeService.buildClearanceFilter(validated.clearanceLevel)
    : undefined;

  // Search across all namespaces in parallel
  const searchResults = await pineconeService.searchMultipleNamespaces(
    namespaces,
    queryEmbedding,
    {
      topK: validated.topK,
      filter,
      includeMetadata: true,
    }
  );

  // Merge and rank results from all namespaces
  const allResults: SearchResultItem[] = [];

  for (const [namespace, results] of searchResults.entries()) {
    for (const result of results) {
      // Filter by minimum score
      if (result.score < validated.minScore) continue;

      allResults.push({
        id: result.id,
        score: result.score,
        namespace,
        content: '', // Will be filled from database
        documentId: result.metadata?.documentId,
        employeeId: result.metadata?.employeeId,
        categoryId: result.metadata?.categoryId,
        chunkIndex: result.metadata?.chunkIndex,
        metadata: result.metadata as Record<string, unknown> | undefined,
      });
    }
  }

  // Sort by score descending
  allResults.sort((a, b) => b.score - a.score);

  // Take top K results
  const topResults = allResults.slice(0, validated.topK);

  // Fetch content from database for the top results
  if (topResults.length > 0) {
    const pineconeIds = topResults.map(r => r.id);
    const chunks = await db.query.knowledgeChunks.findMany({
      where: inArray(knowledgeChunks.pineconeId, pineconeIds),
      columns: {
        pineconeId: true,
        content: true,
      },
    });

    const contentMap = new Map(chunks.map(c => [c.pineconeId, c.content]));

    // Enrich results with content
    for (const result of topResults) {
      result.content = contentMap.get(result.id) || '';
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      results: topResults,
      query: validated.query,
      totalResults: topResults.length,
      searchedNamespaces: namespaces,
    },
  });
});

/**
 * Get search suggestions based on existing content
 * GET /api/vectors/search?suggest=true&q=...
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({
      success: true,
      data: { suggestions: [] },
    });
  }

  // For suggestions, we search with a smaller topK and lower threshold
  const namespaces = await namespaceService.getQueryNamespaces({});

  if (namespaces.length === 0) {
    return NextResponse.json({
      success: true,
      data: { suggestions: [] },
    });
  }

  const queryEmbedding = await createEmbedding(query);

  const searchResults = await pineconeService.searchMultipleNamespaces(
    namespaces.slice(0, 3), // Limit namespaces for suggestions
    queryEmbedding,
    {
      topK: 5,
      includeMetadata: true,
    }
  );

  // Extract unique content snippets for suggestions
  const suggestions: string[] = [];
  const seenContent = new Set<string>();

  for (const [, results] of searchResults.entries()) {
    for (const result of results) {
      if (result.score < 0.6) continue;

      // Get first 100 chars as suggestion
      const content = String(result.metadata?.content || '').slice(0, 100);
      if (content && !seenContent.has(content)) {
        seenContent.add(content);
        suggestions.push(content);
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      suggestions: suggestions.slice(0, 5),
    },
  });
});
