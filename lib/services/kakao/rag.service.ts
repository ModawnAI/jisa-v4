/**
 * RAG Service for KakaoTalk Chatbot
 * Retrieval-Augmented Generation using Pinecone + OpenAI + Gemini + Cohere
 *
 * NEW 8-Step Pipeline (based on RAG-SYSTEM-ARCHITECTURE.md):
 * 1. Embedding Generation (OpenAI text-embedding-3-large)
 * 2. Vector Search (Pinecone) - query all namespaces in parallel
 * 3. Deduplication - keep highest scoring chunk per postId
 * 4. Cohere Reranking - rerank-v3.5
 * 5. Recency Boost - time-based multipliers
 * 6. Priority Sorting - pinned > important > regular
 * 7. Context Building - formatted content + attachments
 * 8. Gemini Inference - generate response
 */

import { GoogleGenAI } from '@google/genai';
import { Pinecone } from '@pinecone-database/pinecone';
import { createEmbedding } from '@/lib/utils/embedding';
import { createClient as createServiceClient } from '@/lib/supabase/server';
import { rbacService } from '@/lib/services/kakao/rbac.service';
import { ragQuery as hofRagQuery, search as hofSearch } from '@/lib/rag';
import metadataKeyConfig from '@/lib/config/metadata-key.json';
import pdfUrlsConfig from '@/lib/config/pdf-urls.json';
import type {
  MetadataKey,
  PdfAttachment,
  EnhancedQuery,
  PineconeMatch,
  PineconeQueryResult,
} from '@/lib/types/kakao';

// Lazy initialization of clients
let genaiClient: GoogleGenAI | null = null;
let pineconeClient: Pinecone | null = null;

function getGenAIClient(): GoogleGenAI {
  if (!genaiClient) {
    genaiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return genaiClient;
}

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  }
  return pineconeClient;
}

// Constants from environment - trim() to remove any accidental trailing whitespace/newlines
const INDEX_NAME = (process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX || 'jisa-v4').trim();
const NAMESPACE = process.env.KAKAO_RAG_NAMESPACE || 'kakao-chatbot';
const PUBLIC_NAMESPACE = 'public'; // Public documents accessible to everyone
const RELEVANCE_THRESHOLD = 0.3;

/**
 * Get metadata key configuration
 */
function getMetadataKey(): MetadataKey {
  return metadataKeyConfig as MetadataKey;
}

/**
 * Get PDF URLs configuration
 */
function getPdfUrls(): { schedule_pdfs: PdfAttachment[]; policy_pdfs: PdfAttachment[] } {
  return pdfUrlsConfig as { schedule_pdfs: PdfAttachment[]; policy_pdfs: PdfAttachment[] };
}

/**
 * Determine which PDFs to attach based on query and results
 */
export function getRelevantPdfs(userQuery: string, results: PineconeQueryResult): PdfAttachment[] {
  try {
    const pdfConfig = getPdfUrls();
    const relevantPdfs: PdfAttachment[] = [];

    // Check if query is about schedules/training/education
    const scheduleKeywords = ['일정', '스케줄', '교육', '강의', '시험', '행사', 'KRS', '입문과정', '시간표'];
    const isScheduleQuery = scheduleKeywords.some(keyword => userQuery.includes(keyword));

    // Check if query is about Hanwha commissions/policies
    const hanwhaKeywords = ['한화생명', '한화', '시책', '수수료', '커미션', '익월', '13차월'];
    const isHanwhaQuery = hanwhaKeywords.some(keyword => userQuery.includes(keyword));

    // Check results for schedule or Hanwha data
    let hasScheduleResults = false;
    let hasHanwhaResults = false;

    if (results.matches) {
      for (const match of results.matches.slice(0, 5)) {
        const chunkType = (match.metadata?.chunk_type as string) || '';
        if (['event_individual', 'day_summary', 'event_range'].includes(chunkType)) {
          hasScheduleResults = true;
        }
        if (['table_cell_commission', 'table_row_summary', 'table_column_summary'].includes(chunkType)) {
          hasHanwhaResults = true;
        }
      }
    }

    // Add schedule PDFs if relevant
    if (isScheduleQuery || hasScheduleResults) {
      if (pdfConfig.schedule_pdfs?.[0]) {
        relevantPdfs.push(pdfConfig.schedule_pdfs[0]);
      }

      // Add KRS PDF if KRS-related
      if ((userQuery.toLowerCase().includes('krs') || userQuery.includes('입문')) && pdfConfig.schedule_pdfs?.[1]) {
        relevantPdfs.push(pdfConfig.schedule_pdfs[1]);
      }
    }

    // Add policy PDFs if relevant
    if (isHanwhaQuery || hasHanwhaResults) {
      if (pdfConfig.policy_pdfs?.[0]) {
        relevantPdfs.push(pdfConfig.policy_pdfs[0]);
      }
    }

    return relevantPdfs;
  } catch (error) {
    console.error('Error loading PDF configuration:', error);
    return [];
  }
}

/**
 * Format PDF attachments for inclusion in response
 */
export function formatPdfAttachments(pdfs: PdfAttachment[]): string {
  if (!pdfs || pdfs.length === 0) {
    return '';
  }

  let attachmentText = '\n\n' + '─'.repeat(40) + '\n';
  attachmentText += '📎 참고 자료\n\n';

  for (const pdf of pdfs) {
    attachmentText += `${pdf.description}\n`;
    attachmentText += `${pdf.url}\n\n`;
  }

  return attachmentText;
}

/**
 * Format HOF RAG source attachments for KakaoTalk response
 */
export function formatSourceAttachments(sources: Array<{
  title: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType?: string;
    isImage?: boolean;
  }>;
}>): string {
  const allAttachments: Array<{
    title: string;
    fileName: string;
    fileUrl: string;
    isImage: boolean;
  }> = [];

  // Collect all attachments from sources
  for (const source of sources) {
    if (!source.attachments || source.attachments.length === 0) continue;

    for (const att of source.attachments) {
      if (!att.fileUrl) continue;

      const isImage = att.isImage || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].some(
        ext => att.fileName?.toLowerCase().endsWith(ext)
      );

      allAttachments.push({
        title: source.title,
        fileName: att.fileName || '첨부파일',
        fileUrl: att.fileUrl,
        isImage,
      });
    }
  }

  if (allAttachments.length === 0) {
    return '';
  }

  // Group by source title
  const byTitle = new Map<string, typeof allAttachments>();
  for (const att of allAttachments) {
    const existing = byTitle.get(att.title) || [];
    existing.push(att);
    byTitle.set(att.title, existing);
  }

  let attachmentText = '\n\n' + '─'.repeat(40) + '\n';
  attachmentText += '📎 첨부파일 다운로드\n\n';

  for (const [title, attachments] of byTitle) {
    // Truncate title if too long
    const shortTitle = title.length > 30 ? title.slice(0, 30) + '...' : title;
    attachmentText += `[${shortTitle}]\n`;

    for (const att of attachments) {
      const icon = att.isImage ? '🖼️' : '📄';
      attachmentText += `${icon} ${att.fileName}\n`;
      attachmentText += `${att.fileUrl}\n\n`;
    }
  }

  return attachmentText;
}

/**
 * Step 1: Use Gemini Flash to enhance query and generate Pinecone filters
 */
export async function enhanceQueryWithGeminiFlash(
  userQuery: string,
  metadataKey: MetadataKey
): Promise<EnhancedQuery> {
  const hanwhaInstructions = `
## HANWHA COMMISSION QUERIES (한화생명 11월 시책 - 초세밀 데이터)

**이 네임스페이스는 264개의 초세밀 벡터로 구성되어 있습니다:**

### CRITICAL FILTERING RULES for Hanwha:
1. **NEVER use product_name or product_name_clean in filters** - semantic search will find products!
2. **ONLY use these fields**:
   - chunk_type (REQUIRED: "table_cell_commission" or "table_row_summary" or "table_column_summary")
   - Boolean flags: is_comprehensive, is_current_month, is_13th_month, is_fc_policy, is_hq_policy
   - payment_term (ONLY if user explicitly says "20년납", "10년납", etc.)
3. **Semantic search handles product matching** automatically via searchable_text field

## SCHEDULE QUERIES (일정, 교육, 시험 - 초세밀 데이터)

**For schedule queries, use MINIMAL filters to avoid missing data!**
`;

  const prompt = `You are an expert query optimizer for a Korean insurance branch office RAG system.

${hanwhaInstructions}

## AVAILABLE METADATA IN PINECONE:
**Chunk Types:** ${metadataKey.chunk_types.join(', ')}
**Companies:** ${metadataKey.companies.join(', ')}
**Boolean Filters:** ${metadataKey.boolean_filters.join(', ')}

## USER QUERY:
"${userQuery}"

## OUTPUT FORMAT (VALID JSON ONLY):
\`\`\`json
{
  "enhanced_query": "optimized Korean search text with core terms",
  "filters": {
    // Pinecone filter object, or null if no filters needed
  },
  "reasoning": "Brief explanation"
}
\`\`\`

Return ONLY valid JSON, no markdown.`;

  try {
    const genai = getGenAIClient();
    const response = await genai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    let responseText = (response.text || '').trim();

    // Clean markdown
    if (responseText.startsWith('```json')) {
      responseText = responseText.slice(7);
    }
    if (responseText.startsWith('```')) {
      responseText = responseText.slice(3);
    }
    if (responseText.endsWith('```')) {
      responseText = responseText.slice(0, -3);
    }

    const parsed = JSON.parse(responseText.trim());
    return parsed as EnhancedQuery;
  } catch (error) {
    console.error('Query enhancement error:', error);
    return {
      enhanced_query: userQuery,
      filters: null,
      reasoning: 'Failed to enhance query',
    };
  }
}

/**
 * Step 2: Generate embedding using OpenAI (delegates to lib/utils/embedding)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return createEmbedding(text);
}

/**
 * Step 3: Query Pinecone with enhanced query and filters
 */
export async function searchPinecone(
  embedding: number[],
  filters: Record<string, unknown> | null = null,
  topK: number = 10,
  namespace: string = NAMESPACE
): Promise<PineconeQueryResult> {
  const pinecone = getPineconeClient();
  const index = pinecone.index(INDEX_NAME);

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

  if (filters) {
    queryParams.filter = filters;
  }

  const results = await index.namespace(namespace).query(queryParams);

  return {
    matches: (results.matches || []).map(match => ({
      id: match.id,
      score: match.score ?? 0,
      metadata: (match.metadata as Record<string, unknown>) || {},
    })),
  };
}

/**
 * Search multiple namespaces and merge results by score
 */
export async function searchMultipleNamespaces(
  embedding: number[],
  filters: Record<string, unknown> | null = null,
  topK: number = 10,
  namespaces: string[] = [NAMESPACE, PUBLIC_NAMESPACE]
): Promise<PineconeQueryResult> {
  const pinecone = getPineconeClient();
  const index = pinecone.index(INDEX_NAME);

  // Search all namespaces in parallel
  const searchPromises = namespaces.map(async (ns) => {
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

    // Only apply filters for non-public namespaces (public docs have simpler structure)
    if (filters && ns !== PUBLIC_NAMESPACE) {
      queryParams.filter = filters;
    }

    try {
      const results = await index.namespace(ns).query(queryParams);
      return (results.matches || []).map(match => ({
        id: match.id,
        score: match.score ?? 0,
        metadata: {
          ...(match.metadata as Record<string, unknown>) || {},
          _namespace: ns, // Track source namespace
        },
      }));
    } catch (error) {
      console.error(`[RAG] Error searching namespace ${ns}:`, error);
      return [];
    }
  });

  const allResults = await Promise.all(searchPromises);

  // Merge and sort all results by score
  const mergedMatches = allResults
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return { matches: mergedMatches };
}

/**
 * Step 4: Format context for Gemini
 */
export function formatContext(results: PineconeQueryResult): string {
  if (!results.matches || results.matches.length === 0) {
    return '검색 결과가 없습니다.';
  }

  const contextParts: string[] = [];

  for (let idx = 0; idx < results.matches.length; idx++) {
    const match = results.matches[idx];
    const meta = match.metadata;
    const chunkType = (meta?.chunk_type as string) || 'N/A';
    const docType = (meta?.doc_type as string) || '';
    const namespace = (meta?._namespace as string) || '';

    const isHanwha = ['table_cell_commission', 'table_row_summary', 'table_column_summary'].includes(chunkType);
    const isSchedule = ['event_individual', 'day_summary', 'event_range'].includes(chunkType);
    const isPublic = namespace === PUBLIC_NAMESPACE || meta?.is_public === true;

    // Public document types (from public-document-processor)
    const isPublicCommissionRate = docType === 'commission_rate';
    const isPublicPolicy = docType === 'policy_announcement';
    const isPublicSchedule = docType === 'schedule';

    let context = `\n## 문서 ${idx + 1} (관련도: ${match.score.toFixed(3)})\n`;
    context += `\n**출처:** ${(meta?.source_file as string) || (meta?.originalFileName as string) || 'N/A'}\n`;

    // Handle public documents (mirroring employee data patterns)
    if (isPublic) {
      const docTypeLabels: Record<string, string> = {
        commission_rate: '수수료율 정보',
        policy_announcement: '시책/공지',
        schedule: '일정/시간표',
        general_info: '일반 정보',
      };
      context += `**유형:** ${docTypeLabels[docType] || docType || chunkType}\n`;

      if (isPublicCommissionRate) {
        if (meta?.insurance_company) context += `**보험사:** ${meta.insurance_company}\n`;
        if (meta?.product_category) context += `**상품분류:** ${meta.product_category}\n`;
        if (meta?.sheet_name) context += `**시트:** ${meta.sheet_name}\n`;
      } else if (isPublicPolicy) {
        if (meta?.policy_type) context += `**시책유형:** ${meta.policy_type}\n`;
      } else if (isPublicSchedule) {
        if (meta?.schedule_type) context += `**교육유형:** ${meta.schedule_type}\n`;
      }

      if (meta?.period) context += `**기간:** ${meta.period}\n`;
      if (meta?.effective_date) context += `**시행일:** ${meta.effective_date}\n`;
      if (meta?.branch) context += `**지사:** ${meta.branch}\n`;
      if (meta?.page_number) context += `**페이지:** ${meta.page_number}/${meta.total_pages || '?'}\n`;
    } else {
      // Handle existing document types
      context += `**유형:** ${chunkType}\n`;

      if (isSchedule) {
        if (meta?.title) context += `**제목:** ${meta.title}\n`;
        if (meta?.date) context += `**날짜:** ${meta.date}\n`;
        if (meta?.time) context += `**시간:** ${meta.time}\n`;
        if (meta?.location) context += `**장소:** ${meta.location}\n`;
        if (meta?.presenter) context += `**강사:** ${meta.presenter}\n`;
      } else if (isHanwha) {
        if (meta?.product_name) context += `**상품명:** ${meta.product_name}\n`;
        if (meta?.payment_term) context += `**납기:** ${meta.payment_term}\n`;
        if (meta?.commission_label) context += `**시책 유형:** ${meta.commission_label}\n`;
        if (meta?.commission_value) context += `**수수료율:** ${meta.commission_value}\n`;
      }
    }

    const searchableText = (meta?.searchable_text as string) || (meta?.natural_description as string) || (meta?.full_text as string) || (meta?.text as string) || '';
    if (searchableText) {
      context += `\n**상세 내용:**\n${searchableText}\n`;
    }

    contextParts.push(context);
  }

  return contextParts.join('\n');
}

/**
 * Step 5: Generate answer with Gemini Flash
 */
export async function generateAnswerWithGemini(
  userQuery: string,
  context: string
): Promise<string> {
  const formattingInstructions = `
특별 지침 (출력 형식):
- 순수 텍스트만 사용하세요
- 마크다운 기호를 절대 사용하지 마세요 (**, ##, *, -, [], (), | 등 모두 금지)
- 표 형식 금지: 표를 만들지 마세요
- 목록은 간단한 번호나 기호로만 표시: "1. ", "2. ", "• " 등
- 강조가 필요한 경우 대문자나 줄바꿈으로 표현하세요
- 들여쓰기와 줄바꿈만으로 구조를 표현하세요
`;

  const prompt = `당신은 모드온 AI입니다. 아래 검색된 정보를 바탕으로 사용자 질문에 정확하고 친절하게 답변하세요.

사용자 질문:
${userQuery}

검색된 관련 정보 (최대 10개 문서):
${context}

핵심 지침:
1. 정확성: 검색된 정보만을 사용하여 답변하세요.
2. 관련성: 질문과 직접 관련된 정보를 선택하세요.
3. 구조화: 이해하기 쉽게 정리하세요.
4. 친절함: 존댓말을 사용하세요.

${formattingInstructions}

답변을 시작하세요:`;

  try {
    const genai = getGenAIClient();
    const response = await genai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || '';
  } catch (error) {
    console.error('Answer generation error:', error);
    return '죄송합니다. 답변을 생성하는 중 오류가 발생했습니다.';
  }
}

/**
 * Complete RAG Pipeline - Main Entry Point (without RBAC)
 *
 * NEW: Uses the 8-step HOF RAG pipeline from RAG-SYSTEM-ARCHITECTURE.md:
 * 1. Embedding Generation (OpenAI text-embedding-3-large)
 * 2. Vector Search (Pinecone) - query all namespaces in parallel
 * 3. Deduplication - keep highest scoring chunk per postId
 * 4. Cohere Reranking - rerank-v3.5
 * 5. Recency Boost - time-based multipliers
 * 6. Priority Sorting - pinned > important > regular
 * 7. Context Building - formatted content + attachments
 * 8. Gemini Inference - generate response
 */
export async function ragAnswer(userQuery: string, topK: number = 10): Promise<string> {
  try {
    console.log(`\n[RAG] Query: ${userQuery}`);
    console.log('[RAG] Using NEW 8-step HOF RAG pipeline');

    // Use the new HOF RAG pipeline
    const result = await hofRagQuery(userQuery, {
      topK: 30, // Fetch more for reranking
      rerank: true,
      rerankTopN: topK,
      recencyBoost: true,
      includePinnedFirst: true,
    });

    console.log(`[RAG] Pipeline completed in ${result.latencyMs}ms`);
    console.log(`[RAG] Sources: ${result.sources.length}`);

    // If no results, provide helpful message
    if (result.sources.length === 0) {
      return `안녕하세요. 모드온 AI입니다.

질문하신 내용과 관련된 정보를 찾기 어렵습니다.

구체적인 질문을 해주시면 더 정확한 답변을 드릴 수 있습니다.

예시:
- 12월 정착지원금 신청 방법
- 변액보험 시험 일정
- MD 공지사항 확인

무엇을 도와드릴까요?`;
    }

    // Attachments are already included by the HOF RAG pipeline in inference.ts
    // Just return the answer directly
    return result.answer;
  } catch (error) {
    console.error('[RAG] Error:', error);
    return `죄송합니다. 답변을 생성하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * RAG Answer with RBAC filtering
 *
 * NEW: Uses the 8-step HOF RAG pipeline with RBAC overlay
 */
export async function ragAnswerWithRBAC(
  userQuery: string,
  userId: string | null,
  topK: number = 10
): Promise<string> {
  try {
    console.log('[RAG-RBAC] Starting RAG with RBAC for user:', userId);
    console.log('[RAG-RBAC] Using NEW 8-step HOF RAG pipeline');

    // Use the new HOF RAG pipeline
    const result = await hofRagQuery(userQuery, {
      topK: 30, // Fetch more for reranking
      rerank: true,
      rerankTopN: topK,
      recencyBoost: true,
      includePinnedFirst: true,
    });

    console.log(`[RAG-RBAC] Pipeline completed in ${result.latencyMs}ms`);
    console.log(`[RAG-RBAC] Sources: ${result.sources.length}`);

    // If no results, provide helpful message
    if (result.sources.length === 0) {
      return `안녕하세요. 모드온 AI입니다.

질문하신 내용과 관련된 정보를 찾기 어렵습니다.

구체적인 질문을 해주시면 더 정확한 답변을 드릴 수 있습니다.

예시:
- 12월 정착지원금 신청 방법
- 변액보험 시험 일정
- MD 공지사항 확인

무엇을 도와드릴까요?`;
    }

    // Attachments are already included by the HOF RAG pipeline in inference.ts
    // Log query
    if (userId) {
      await logRAGQuery(userId, userQuery, result.answer, result.sources.length);
    }

    return result.answer;
  } catch (error) {
    console.error('[RAG-RBAC] Error:', error);
    return '죄송합니다. 답변 생성 중 오류가 발생했습니다.';
  }
}

/**
 * Search Pinecone with RBAC filtering
 */
export async function searchPineconeWithRBAC(
  embedding: number[],
  queryFilters: Record<string, unknown> | null,
  userId: string | null,
  topK: number = 10
): Promise<PineconeQueryResult> {
  let combinedFilter: Record<string, unknown> | null = null;

  // Apply RBAC filtering for authenticated users
  if (userId) {
    const rbacFilter = await rbacService.buildPineconeFilter(userId);

    if (queryFilters) {
      combinedFilter = { $and: [queryFilters, rbacFilter] };
    } else {
      combinedFilter = rbacFilter;
    }

    console.log('[RAG-RBAC] RBAC filter applied');
  } else {
    // Unauthenticated: public content only
    if (queryFilters) {
      combinedFilter = {
        $and: [queryFilters, { access_level: { $in: ['public'] } }],
      };
    } else {
      combinedFilter = { access_level: { $in: ['public'] } };
    }

    console.log('[RAG-RBAC] Public content only (unauthenticated)');
  }

  // Search Pinecone
  const results = await searchPinecone(embedding, combinedFilter, topK);

  // Post-filter by metadata
  if (userId) {
    return await filterResultsByMetadata(userId, results);
  }

  return results;
}

/**
 * Post-filter results by metadata-based access control
 */
async function filterResultsByMetadata(
  userId: string,
  results: PineconeQueryResult
): Promise<PineconeQueryResult> {
  const accessibleMatches: PineconeMatch[] = [];

  for (const match of results.matches) {
    const { allowed, reason } = await rbacService.canAccessContent(
      userId,
      match.metadata
    );

    if (allowed) {
      accessibleMatches.push(match);
    } else {
      console.log(`[RAG-RBAC] Filtered result ${match.id}: ${reason}`);

      // Log access denial for audit
      await rbacService.logAccessAttempt({
        userId,
        resourceType: 'context',
        resourceId: match.id,
        accessGranted: false,
        denialReason: reason,
      });
    }
  }

  return { matches: accessibleMatches };
}

/**
 * Log RAG query
 */
async function logRAGQuery(
  userId: string,
  query: string,
  response: string,
  resultsCount: number
): Promise<void> {
  try {
    const supabase = await createServiceClient();

    await supabase.from('query_logs').insert({
      user_id: userId,
      session_id: `session_${Date.now()}`,
      query_text: query,
      response_text: response,
      query_type: 'rag',
      metadata: {
        results_count: resultsCount,
        has_rbac: true,
      },
    });
  } catch (error) {
    console.error('[RAG-RBAC] Failed to log query:', error);
  }
}

const ragService = {
  ragAnswer,
  ragAnswerWithRBAC,
  enhanceQueryWithGeminiFlash,
  generateEmbedding,
  searchPinecone,
  searchMultipleNamespaces,
  formatContext,
  generateAnswerWithGemini,
  getRelevantPdfs,
  formatPdfAttachments,
  formatSourceAttachments,
  PUBLIC_NAMESPACE,
};

export default ragService;
