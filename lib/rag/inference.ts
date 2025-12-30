/**
 * RAG Inference Pipeline
 * Based on RAG-SYSTEM-ARCHITECTURE.md
 *
 * 8-Step Pipeline:
 * 1. Embedding Generation (OpenAI)
 * 2. Vector Search (Pinecone) - topK: 30, query all namespaces
 * 3. Deduplication - keep highest scoring chunk per postId
 * 4. Cohere Reranking - rerank-v3.5, topN: 5
 * 5. Recency Boost - time-based multipliers
 * 6. Priority Sorting - pinned > important > regular
 * 7. Context Building - formatted content + attachments
 * 8. Gemini Inference - generate response
 */

import { GoogleGenAI } from '@google/genai';
import { Pinecone } from '@pinecone-database/pinecone';
import { CohereClient } from 'cohere-ai';
import OpenAI from 'openai';
import {
  PINECONE_CONFIG,
  ALL_NAMESPACES,
  SEARCH_CONFIG,
  RERANK_CONFIG,
  RECENCY_MULTIPLIERS,
  INFERENCE_CONFIG,
  SYSTEM_PROMPT,
  ERROR_MESSAGES,
} from './config';
import type {
  VectorMetadata,
  PineconeMatch,
  RAGSearchOptions,
  RAGSearchResult,
  RAGChatResponse,
  RAGSearchResponse,
  AttachmentInfo,
  ContextItem,
  QueryMetrics,
} from './types';

// Lazy initialization of clients
let openaiClient: OpenAI | null = null;
let pineconeClient: Pinecone | null = null;
let geminiClient: GoogleGenAI | null = null;
let cohereClient: CohereClient | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return openaiClient;
}

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  }
  return pineconeClient;
}

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return geminiClient;
}

function getCohereClient(): CohereClient {
  if (!cohereClient) {
    cohereClient = new CohereClient({ token: process.env.COHERE_API_KEY! });
  }
  return cohereClient;
}

/**
 * STEP 1: Generate embedding using OpenAI text-embedding-3-large
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 3072,
  });
  return response.data[0].embedding;
}

/**
 * STEP 2: Vector Search (Pinecone)
 * Query all namespaces in parallel, merge results
 */
async function vectorSearch(
  embedding: number[],
  options: RAGSearchOptions
): Promise<PineconeMatch[]> {
  const pinecone = getPineconeClient();
  const index = pinecone.index(PINECONE_CONFIG.indexName);
  const topK = options.topK || SEARCH_CONFIG.broadTopK;

  // Determine namespaces to search
  let namespacesToSearch: readonly string[] = ALL_NAMESPACES;
  if (options.categoryFilter && options.categoryFilter.length > 0) {
    // If category filter provided, only search those namespaces
    namespacesToSearch = options.categoryFilter;
  }

  // Build metadata filter
  const filter = buildMetadataFilter(options);

  // Query all namespaces in parallel
  const searchPromises = namespacesToSearch.map(async (namespace) => {
    try {
      const queryParams: {
        vector: number[];
        topK: number;
        includeMetadata: boolean;
        filter?: Record<string, unknown>;
      } = {
        vector: embedding,
        topK,
        includeMetadata: true,
      };

      if (Object.keys(filter).length > 0) {
        queryParams.filter = filter;
      }

      const result = await index.namespace(namespace).query(queryParams);
      return (result.matches || []).map((match) => ({
        id: match.id,
        score: match.score ?? 0,
        metadata: {
          ...(match.metadata as unknown as VectorMetadata),
          _namespace: namespace,
        } as VectorMetadata,
      }));
    } catch (error) {
      console.error(`[RAG] Error searching namespace ${namespace}:`, error);
      return [];
    }
  });

  const allResults = await Promise.all(searchPromises);

  // Merge and sort by score
  const mergedResults = allResults
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return mergedResults;
}

/**
 * Build metadata filter from options
 */
function buildMetadataFilter(options: RAGSearchOptions): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  // Date range filter
  if (options.dateFrom || options.dateTo) {
    const dateFilter: Record<string, number> = {};
    if (options.dateFrom) {
      dateFilter.$gte = new Date(options.dateFrom).getTime();
    }
    if (options.dateTo) {
      dateFilter.$lte = new Date(options.dateTo).getTime();
    }
    // Use backdatedAt if available, else createdAt
    filter.$or = [
      { backdatedAt: dateFilter },
      { createdAt: dateFilter },
    ];
  }

  // Important only filter
  if (options.includeImportantOnly) {
    filter.isImportant = true;
  }

  return filter;
}

/**
 * STEP 3: Deduplication
 * Multiple chunks from same post -> keep highest scoring
 */
function deduplicateResults(matches: PineconeMatch[]): PineconeMatch[] {
  const postMap = new Map<string, PineconeMatch>();

  for (const match of matches) {
    const postId = match.metadata.postId;
    const existing = postMap.get(postId);

    if (!existing || match.score > existing.score) {
      postMap.set(postId, match);
    }
  }

  return Array.from(postMap.values()).sort((a, b) => b.score - a.score);
}

/**
 * STEP 4: Cohere Reranking
 */
async function rerankResults(
  query: string,
  matches: PineconeMatch[],
  topN: number
): Promise<PineconeMatch[]> {
  if (matches.length === 0) return [];

  try {
    const cohere = getCohereClient();

    // Prepare documents for reranking
    const documents = matches.map((match) => {
      const meta = match.metadata;
      const text = meta.searchable_text || `${meta.title}\n\n${meta.excerpt}`;
      return text;
    });

    const response = await cohere.rerank({
      model: RERANK_CONFIG.model,
      query,
      documents,
      topN: Math.min(topN, matches.length),
      returnDocuments: false,
    });

    // Map reranked results back to matches with rerank scores
    const rerankedMatches: PineconeMatch[] = response.results.map((result) => {
      const originalMatch = matches[result.index];
      return {
        ...originalMatch,
        score: result.relevanceScore, // Replace score with rerank score
        metadata: {
          ...originalMatch.metadata,
          _originalScore: originalMatch.score,
          _rerankScore: result.relevanceScore,
        } as VectorMetadata,
      };
    });

    return rerankedMatches;
  } catch (error) {
    console.error('[RAG] Cohere rerank error:', error);
    // Fallback: return original top N
    return matches.slice(0, topN);
  }
}

/**
 * STEP 5: Recency Boost
 * Apply time-based multipliers to rerank scores
 */
function applyRecencyBoost(matches: PineconeMatch[]): PineconeMatch[] {
  const now = Date.now();

  return matches.map((match) => {
    const meta = match.metadata;
    // Use backdatedAt if available, else createdAt
    const postDate = meta.backdatedAt > 0 ? meta.backdatedAt : meta.createdAt;
    const ageMs = now - postDate;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    let multiplier: number = RECENCY_MULTIPLIERS.OLDER_THAN_365_DAYS;
    if (ageDays <= 7) {
      multiplier = RECENCY_MULTIPLIERS.WITHIN_7_DAYS;
    } else if (ageDays <= 30) {
      multiplier = RECENCY_MULTIPLIERS.WITHIN_30_DAYS;
    } else if (ageDays <= 90) {
      multiplier = RECENCY_MULTIPLIERS.WITHIN_90_DAYS;
    } else if (ageDays <= 365) {
      multiplier = RECENCY_MULTIPLIERS.WITHIN_365_DAYS;
    }

    return {
      ...match,
      score: match.score * multiplier,
      metadata: {
        ...match.metadata,
        _recencyMultiplier: multiplier,
        _boostedScore: match.score * multiplier,
      } as VectorMetadata,
    };
  });
}

/**
 * STEP 6: Priority Sorting
 * Final ordering: pinned > important > regular (each sorted by score)
 */
function prioritySort(matches: PineconeMatch[]): PineconeMatch[] {
  const pinned: PineconeMatch[] = [];
  const important: PineconeMatch[] = [];
  const regular: PineconeMatch[] = [];

  for (const match of matches) {
    if (match.metadata.isPinned) {
      pinned.push(match);
    } else if (match.metadata.isImportant) {
      important.push(match);
    } else {
      regular.push(match);
    }
  }

  // Sort each group by score
  pinned.sort((a, b) => b.score - a.score);
  important.sort((a, b) => b.score - a.score);
  regular.sort((a, b) => b.score - a.score);

  return [...pinned, ...important, ...regular];
}

/**
 * Parse attachments from JSON string
 */
function parseAttachments(attachmentsJson: string | undefined): AttachmentInfo[] {
  if (!attachmentsJson) return [];
  try {
    return JSON.parse(attachmentsJson);
  } catch {
    return [];
  }
}

/**
 * Format date from timestamp
 */
function formatDate(timestamp: number): string {
  if (!timestamp || timestamp === 0) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Convert PineconeMatch to RAGSearchResult
 */
function toSearchResult(match: PineconeMatch): RAGSearchResult {
  const meta = match.metadata;
  const attachments = parseAttachments(meta.attachmentsJson);
  const dateTs = meta.backdatedAt > 0 ? meta.backdatedAt : meta.createdAt;

  return {
    postId: meta.postId,
    title: meta.title,
    content: meta.searchable_text || meta.excerpt,
    category: meta.categoryName,
    categorySlug: meta.categorySlug,
    score: (meta as unknown as { _originalScore?: number })._originalScore || match.score,
    rerankScore: (meta as unknown as { _rerankScore?: number })._rerankScore,
    boostedScore: (meta as unknown as { _boostedScore?: number })._boostedScore || match.score,
    metadata: meta,
    attachments: attachments.length > 0 ? attachments : undefined,
    date: formatDate(dateTs),
  };
}

/**
 * STEP 7: Context Building
 * Format results for Gemini prompt
 */
function buildContext(results: RAGSearchResult[]): string {
  const contextParts: string[] = [];

  for (const result of results) {
    let contextItem = '---\n';
    contextItem += `제목: ${result.title}\n`;
    contextItem += `카테고리: ${result.category}\n`;
    contextItem += `날짜: ${result.date}\n`;

    // Add flags
    const flags: string[] = [];
    if (result.metadata.isImportant) flags.push('필독');
    if (result.metadata.isPinned) flags.push('고정');
    if (flags.length > 0) {
      contextItem += `(${flags.join(')(')}) \n`;
    }

    contextItem += `\n내용:\n${result.content}\n`;
    contextItem += '---\n';

    contextParts.push(contextItem);
  }

  // Build attachment context
  const attachmentContext = buildAttachmentContext(results);

  return contextParts.join('\n') + attachmentContext;
}

/**
 * Build attachment context section (for Gemini context)
 */
function buildAttachmentContext(results: RAGSearchResult[]): string {
  const attachmentParts: string[] = [];

  for (const result of results) {
    if (!result.attachments || result.attachments.length === 0) continue;

    let attachmentSection = `\n[${result.title}]\n`;

    for (const attachment of result.attachments) {
      const isImage = attachment.isImage || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].some(
        (ext) => attachment.fileName?.toLowerCase().endsWith(ext)
      );

      if (isImage) {
        attachmentSection += `이미지: ${attachment.fileName}\n`;
        if (attachment.description) {
          attachmentSection += `  설명: ${attachment.description}\n`;
        }
      } else {
        attachmentSection += `문서: ${attachment.fileName}\n`;
        if (attachment.description) {
          attachmentSection += `  설명: ${attachment.description}\n`;
        }
      }
    }

    attachmentParts.push(attachmentSection);
  }

  if (attachmentParts.length === 0) return '';

  return '\n\n첨부파일 정보\n' + attachmentParts.join('\n');
}

/**
 * Format attachments for final response (user-facing download links)
 * Pure text formatting for KakaoTalk
 * Only includes the single most relevant attachment from the first source
 */
function formatAttachmentsForResponse(results: RAGSearchResult[]): string {
  // Find the first (most relevant) source that has attachments
  const sourceWithAttachments = results.find(
    r => r.attachments && r.attachments.length > 0
  );

  if (!sourceWithAttachments || !sourceWithAttachments.attachments) {
    return '';
  }

  // Get the first attachment with a valid URL
  const topAttachment = sourceWithAttachments.attachments.find(att => att.fileUrl);

  if (!topAttachment) {
    return '';
  }

  let attachmentText = '\n\n────────────────────\n';
  attachmentText += '첨부파일 다운로드\n\n';
  attachmentText += `${topAttachment.fileName || '첨부파일'}\n`;
  attachmentText += `${topAttachment.fileUrl}\n`;

  return attachmentText;
}

/**
 * STEP 8: Gemini Inference
 * Generate response using context and query
 */
async function generateResponse(
  query: string,
  context: string
): Promise<string> {
  const gemini = getGeminiClient();

  const userPrompt = `${SYSTEM_PROMPT}

아래는 관련 공지사항 내용입니다:

${context}

---

사용자 질문: ${query}

위 공지사항 내용을 바탕으로 질문에 답변해주세요.
답변에 사용한 공지사항의 제목을 인용해주세요.
첨부파일이 있는 경우 해당 정보도 포함해주세요.`;

  try {
    const response = await gemini.models.generateContent({
      model: INFERENCE_CONFIG.model,
      contents: userPrompt,
      config: {
        temperature: INFERENCE_CONFIG.temperature,
        maxOutputTokens: INFERENCE_CONFIG.maxOutputTokens,
      },
    });

    return response.text || ERROR_MESSAGES.GENERATION_ERROR;
  } catch (error) {
    console.error('[RAG] Gemini generation error:', error);
    return ERROR_MESSAGES.GENERATION_ERROR;
  }
}

/**
 * Main RAG Query Pipeline
 * Executes all 8 steps
 */
export async function ragQuery(
  query: string,
  options: RAGSearchOptions = {}
): Promise<RAGChatResponse> {
  const startTime = Date.now();
  const metrics: Partial<QueryMetrics> = {};

  try {
    // STEP 1: Embedding Generation
    console.log('[RAG] Step 1: Embedding Generation');
    const embedStart = Date.now();
    const embedding = await generateEmbedding(query);
    metrics.embeddingTimeMs = Date.now() - embedStart;
    console.log(`[RAG] Embedding generated in ${metrics.embeddingTimeMs}ms`);

    // STEP 2: Vector Search
    console.log('[RAG] Step 2: Vector Search');
    const searchStart = Date.now();
    const searchResults = await vectorSearch(embedding, {
      ...options,
      topK: SEARCH_CONFIG.broadTopK, // Fetch 30 for reranking
    });
    metrics.searchTimeMs = Date.now() - searchStart;
    console.log(`[RAG] Found ${searchResults.length} matches in ${metrics.searchTimeMs}ms`);

    if (searchResults.length === 0) {
      return {
        query,
        answer: ERROR_MESSAGES.NO_RESULTS,
        sources: [],
        latencyMs: Date.now() - startTime,
      };
    }

    // STEP 3: Deduplication
    console.log('[RAG] Step 3: Deduplication');
    const dedupStart = Date.now();
    const deduped = deduplicateResults(searchResults);
    metrics.deduplicationTimeMs = Date.now() - dedupStart;
    console.log(`[RAG] Deduped to ${deduped.length} unique posts in ${metrics.deduplicationTimeMs}ms`);

    // STEP 4: Cohere Reranking
    console.log('[RAG] Step 4: Cohere Reranking');
    const rerankStart = Date.now();
    const rerankTopN = options.rerankTopN || SEARCH_CONFIG.defaultRerankTopN;
    const reranked = options.rerank !== false
      ? await rerankResults(query, deduped, rerankTopN)
      : deduped.slice(0, rerankTopN);
    metrics.rerankTimeMs = Date.now() - rerankStart;
    console.log(`[RAG] Reranked to top ${reranked.length} in ${metrics.rerankTimeMs}ms`);

    // STEP 5: Recency Boost
    console.log('[RAG] Step 5: Recency Boost');
    const boostStart = Date.now();
    const boosted = options.recencyBoost !== false
      ? applyRecencyBoost(reranked)
      : reranked;
    metrics.recencyBoostTimeMs = Date.now() - boostStart;

    // STEP 6: Priority Sorting
    console.log('[RAG] Step 6: Priority Sorting');
    const sorted = options.includePinnedFirst !== false
      ? prioritySort(boosted)
      : boosted.sort((a, b) => b.score - a.score);

    // Convert to search results
    const results = sorted.map(toSearchResult);

    // STEP 7: Context Building
    console.log('[RAG] Step 7: Context Building');
    const contextStart = Date.now();
    const context = buildContext(results);
    metrics.contextBuildTimeMs = Date.now() - contextStart;

    // STEP 8: Gemini Inference
    console.log('[RAG] Step 8: Gemini Inference');
    const inferenceStart = Date.now();
    let answer = await generateResponse(query, context);
    metrics.inferenceTimeMs = Date.now() - inferenceStart;
    console.log(`[RAG] Generated response in ${metrics.inferenceTimeMs}ms`);

    // STEP 9: Append attachment download links
    const attachmentLinks = formatAttachmentsForResponse(results);
    if (attachmentLinks) {
      answer += attachmentLinks;
      console.log('[RAG] Appended attachment download links');
    }

    const totalTime = Date.now() - startTime;
    console.log(`[RAG] Total pipeline time: ${totalTime}ms`);

    return {
      query,
      answer,
      sources: results,
      latencyMs: totalTime,
    };
  } catch (error) {
    console.error('[RAG] Pipeline error:', error);
    return {
      query,
      answer: ERROR_MESSAGES.SEARCH_ERROR,
      sources: [],
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Search-only function (no inference)
 */
export async function search(options: RAGSearchOptions & { query: string }): Promise<RAGSearchResponse> {
  const startTime = Date.now();

  try {
    // STEP 1: Embedding
    const embedding = await generateEmbedding(options.query);

    // STEP 2: Vector Search
    const searchResults = await vectorSearch(embedding, {
      ...options,
      topK: options.topK || SEARCH_CONFIG.broadTopK,
    });

    if (searchResults.length === 0) {
      return {
        query: options.query,
        results: [],
        total: 0,
        latencyMs: Date.now() - startTime,
      };
    }

    // STEP 3: Deduplication
    const deduped = deduplicateResults(searchResults);

    // STEP 4: Cohere Reranking
    const rerankTopN = options.rerankTopN || SEARCH_CONFIG.defaultRerankTopN;
    const reranked = options.rerank !== false
      ? await rerankResults(options.query, deduped, rerankTopN)
      : deduped.slice(0, rerankTopN);

    // STEP 5: Recency Boost
    const boosted = options.recencyBoost !== false
      ? applyRecencyBoost(reranked)
      : reranked;

    // STEP 6: Priority Sorting
    const sorted = options.includePinnedFirst !== false
      ? prioritySort(boosted)
      : boosted.sort((a, b) => b.score - a.score);

    // Convert to search results
    const results = sorted.map(toSearchResult);

    return {
      query: options.query,
      results,
      total: results.length,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[RAG Search] Error:', error);
    return {
      query: options.query,
      results: [],
      total: 0,
      latencyMs: Date.now() - startTime,
    };
  }
}

// Export for use in other modules
export {
  generateEmbedding,
  vectorSearch,
  deduplicateResults,
  rerankResults,
  applyRecencyBoost,
  prioritySort,
  buildContext,
  generateResponse,
};
