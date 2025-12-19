/**
 * RAG V2 Service
 *
 * Multi-stage RAG pipeline with:
 * - Query understanding and expansion
 * - Hybrid search (dense + sparse)
 * - Cross-encoder reranking (Cohere)
 * - Tiered metadata retrieval
 * - Context assembly and generation
 */

import { GoogleGenAI } from '@google/genai';
import { db } from '@/lib/db';
import { knowledgeChunks } from '@/lib/db/schema/knowledge-chunks';
import { inArray } from 'drizzle-orm';
import { embeddingService } from './embedding.service';
import { hybridSearchService } from './hybrid-search.service';
import { rerankService } from './rerank.service';
import { cacheService } from './cache.service';
import type {
  RAGContext,
  RAGResult,
  RAGStageMetrics,
  QueryUnderstanding,
  SearchMatch,
  RetrievalConfig,
} from './types';

// Gemini client
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });
  }
  return geminiClient;
}

// Configuration
const RAG_CONFIG = {
  model: 'gemini-3-flash-preview',
  maxContextTokens: 30000,
  maxOutputTokens: 2000,
  temperature: 0.3,
} as const;

// Namespace utilities
const NAMESPACE_UTILS = {
  getEmployeeNamespace: (organizationId: string): string =>
    `org_${organizationId}_employee`,
  getPublicNamespace: (organizationId: string): string =>
    `org_${organizationId}_public`,
  getPolicyNamespace: (organizationId: string): string =>
    `org_${organizationId}_policy`,
  // Legacy format for backwards compatibility
  getLegacyEmployeeNamespace: (sabon: string): string =>
    `emp_${sabon}`,
};

class RAGV2Service {
  private retrievalConfig: RetrievalConfig;

  constructor(config: Partial<RetrievalConfig> = {}) {
    this.retrievalConfig = {
      broadTopK: 50,
      rerankTopN: 10,
      rerankModel: 'cohere',
      useMmr: true,
      mmrLambda: 0.7,
      denseWeight: 0.7,
      sparseWeight: 0.3,
      rrfK: 60,
      ...config,
    };
  }

  /**
   * Main RAG pipeline entry point
   */
  async query(
    question: string,
    context: RAGContext
  ): Promise<RAGResult> {
    const metrics: RAGStageMetrics = {
      queryUnderstanding: { timeMs: 0, expandedQueries: 0 },
      broadRetrieval: { timeMs: 0, denseResults: 0, sparseResults: 0, fusedResults: 0 },
      reranking: { timeMs: 0, model: '', inputCount: 0, outputCount: 0 },
      contextAssembly: { timeMs: 0, chunksExpanded: 0, tokensUsed: 0 },
      generation: { timeMs: 0, model: '', tokensIn: 0, tokensOut: 0 },
      total: { timeMs: 0 },
    };

    const totalStart = Date.now();

    try {
      // Stage 1: Query Understanding
      const queryStart = Date.now();
      const understood = await this.understandQuery(question, context);
      metrics.queryUnderstanding.timeMs = Date.now() - queryStart;
      metrics.queryUnderstanding.expandedQueries = understood.expandedQueries.length;

      // Stage 2: Build namespaces to search
      const namespaces = this.buildNamespaces(context);

      // Stage 3: Broad Retrieval with Hybrid Search
      const retrievalStart = Date.now();
      const searchResults = await hybridSearchService.search({
        text: question,
        namespaces,
        topK: this.retrievalConfig.broadTopK,
        filters: this.buildFilters(context, understood),
        includeMetadata: true,
      });
      metrics.broadRetrieval.timeMs = Date.now() - retrievalStart;
      metrics.broadRetrieval.denseResults = searchResults.totalFound;
      metrics.broadRetrieval.fusedResults = searchResults.matches.length;

      // Handle no results
      if (searchResults.matches.length === 0) {
        return this.buildNoResultsResponse(question, metrics, totalStart);
      }

      // Stage 4: Reranking with Cohere
      const rerankStart = Date.now();
      const reranked = await rerankService.rerankPineconeResults(
        question,
        searchResults.matches.map((m) => ({
          id: m.id,
          score: m.score,
          metadata: m.metadata as { searchable_text?: string; preview?: string },
        })),
        this.retrievalConfig.rerankTopN
      );
      metrics.reranking.timeMs = Date.now() - rerankStart;
      metrics.reranking.model = 'cohere-rerank-multilingual-v3.0';
      metrics.reranking.inputCount = searchResults.matches.length;
      metrics.reranking.outputCount = reranked.length;

      // Map reranked results back to SearchMatch
      const rerankedMatches: SearchMatch[] = reranked.map((r) => {
        const original = searchResults.matches.find((m) => m.id === r.id)!;
        return {
          ...original,
          score: r.rerankScore,
        };
      });

      // Stage 5: Context Assembly (fetch full content if needed)
      const assemblyStart = Date.now();
      const assembledContext = await this.assembleContext(rerankedMatches);
      metrics.contextAssembly.timeMs = Date.now() - assemblyStart;
      metrics.contextAssembly.chunksExpanded = assembledContext.chunks.length;
      metrics.contextAssembly.tokensUsed = this.estimateTokens(assembledContext.text);

      // Stage 6: Generation
      const genStart = Date.now();
      const answer = await this.generate(
        question,
        assembledContext.text,
        understood,
        context
      );
      metrics.generation.timeMs = Date.now() - genStart;
      metrics.generation.model = RAG_CONFIG.model;
      metrics.generation.tokensIn = metrics.contextAssembly.tokensUsed;
      metrics.generation.tokensOut = this.estimateTokens(answer);

      metrics.total.timeMs = Date.now() - totalStart;

      return {
        answer,
        sources: rerankedMatches.slice(0, 5).map((m) => ({
          id: m.id,
          preview: m.metadata.preview || '',
          score: m.score,
          metadata: m.metadata,
        })),
        metrics,
        confidence: this.calculateConfidence(rerankedMatches, understood),
      };
    } catch (error) {
      console.error('[RAGV2Service] Error in query pipeline:', error);
      metrics.total.timeMs = Date.now() - totalStart;

      return {
        answer: '죄송합니다, 질문을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.',
        sources: [],
        metrics,
        confidence: 0,
      };
    }
  }

  /**
   * Query understanding with intent detection
   */
  private async understandQuery(
    query: string,
    context: RAGContext
  ): Promise<QueryUnderstanding> {
    const normalizedQuery = query.toLowerCase();

    // Detect intent
    let intentType: QueryUnderstanding['intent']['type'] = 'general';
    let confidence = 0.5;

    // Compensation lookup patterns
    const compensationPatterns = [
      '급여', '월급', '실수령', '지급', '명세', '수당', '오버라이드',
      '환수', '차감', '입금', '통장', '건별', '계약별',
    ];

    // MDRT patterns
    const mdrtPatterns = [
      'mdrt', '엠디알티', 'cot', 'tot', '달성', '진행률',
      '자격', '목표', '남은 금액', '부족', 'fyc', 'agi',
    ];

    // Calculation patterns
    const calcPatterns = ['합계', '총', '평균', '합산', '계산'];

    // Comparison patterns
    const comparePatterns = ['비교', '차이', '대비', '전월', '지난달'];

    if (compensationPatterns.some((p) => normalizedQuery.includes(p))) {
      intentType = 'lookup';
      confidence = 0.85;
    } else if (mdrtPatterns.some((p) => normalizedQuery.includes(p))) {
      intentType = 'lookup';
      confidence = 0.85;
    } else if (calcPatterns.some((p) => normalizedQuery.includes(p))) {
      intentType = 'calculation';
      confidence = 0.75;
    } else if (comparePatterns.some((p) => normalizedQuery.includes(p))) {
      intentType = 'comparison';
      confidence = 0.75;
    }

    // Extract entities
    const entities: QueryUnderstanding['entities'] = {};

    // Period extraction (YYYYMM or month references)
    const periodMatch = normalizedQuery.match(/(\d{4})년?\s*(\d{1,2})월/);
    if (periodMatch) {
      entities.period = `${periodMatch[1]}${periodMatch[2].padStart(2, '0')}`;
    } else if (normalizedQuery.includes('이번 달') || normalizedQuery.includes('이번달')) {
      const now = new Date();
      entities.period = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    } else if (normalizedQuery.includes('지난 달') || normalizedQuery.includes('지난달')) {
      const now = new Date();
      now.setMonth(now.getMonth() - 1);
      entities.period = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Query expansion
    const expandedQueries: string[] = [query];

    // Add Korean variations
    if (normalizedQuery.includes('급여')) {
      expandedQueries.push(query.replace('급여', '월급'));
      expandedQueries.push(query.replace('급여', '실수령액'));
    }
    if (normalizedQuery.includes('mdrt')) {
      expandedQueries.push(query.replace(/mdrt/i, 'MDRT 달성현황'));
    }

    return {
      originalQuery: query,
      expandedQueries,
      intent: {
        type: intentType,
        confidence,
      },
      entities,
      isTimeSensitive: !!entities.period || normalizedQuery.includes('최근'),
      needsMultipleDocTypes: intentType === 'comparison',
    };
  }

  /**
   * Build namespaces to search
   */
  private buildNamespaces(context: RAGContext): string[] {
    const namespaces: string[] = [];

    // Primary namespace for employee data (legacy format)
    if (context.employeeNumber) {
      namespaces.push(NAMESPACE_UTILS.getLegacyEmployeeNamespace(context.employeeNumber));
    }

    // Organization-level namespaces (new consolidated format)
    if (context.organizationId) {
      namespaces.push(NAMESPACE_UTILS.getEmployeeNamespace(context.organizationId));
      namespaces.push(NAMESPACE_UTILS.getPublicNamespace(context.organizationId));
      namespaces.push(NAMESPACE_UTILS.getPolicyNamespace(context.organizationId));
    }

    // Additional specified namespaces
    if (context.additionalNamespaces) {
      namespaces.push(...context.additionalNamespaces);
    }

    // Deduplicate
    return [...new Set(namespaces)];
  }

  /**
   * Build filters for search
   */
  private buildFilters(
    context: RAGContext,
    understood: QueryUnderstanding
  ): Record<string, unknown> {
    const filters: Record<string, unknown> = {};

    // Clearance level filter
    if (context.clearanceLevel) {
      const allowedLevels = this.getAllowedClearanceLevels(context.clearanceLevel);
      filters.clearanceLevel = { $in: allowedLevels };
    }

    // Period filter if time-sensitive
    if (understood.entities.period && understood.isTimeSensitive) {
      filters.period = understood.entities.period;
    }

    // Employee filter for consolidated namespaces
    if (context.employeeId) {
      filters.employeeId = context.employeeId;
    }

    return Object.keys(filters).length > 0 ? filters : {};
  }

  /**
   * Get allowed clearance levels
   */
  private getAllowedClearanceLevels(
    level: 'basic' | 'standard' | 'advanced'
  ): string[] {
    switch (level) {
      case 'advanced':
        return ['basic', 'standard', 'advanced'];
      case 'standard':
        return ['basic', 'standard'];
      case 'basic':
      default:
        return ['basic'];
    }
  }

  /**
   * Assemble context from search results
   */
  private async assembleContext(
    matches: SearchMatch[]
  ): Promise<{ text: string; chunks: Array<{ id: string; content: string }> }> {
    const chunks: Array<{ id: string; content: string }> = [];

    // First, try to get content from cache
    const chunkRefs = matches.map((m) => m.metadata.chunkRef || m.id);
    const cachedContent = await cacheService.getChunksBatch(chunkRefs);

    // For matches not in cache, check metadata or fetch from DB
    for (const match of matches) {
      const ref = match.metadata.chunkRef || match.id;
      let content = cachedContent.get(ref);

      if (!content) {
        // Try metadata first (searchable_text stored in Pinecone)
        const searchableText = (match.metadata as { searchable_text?: string }).searchable_text;
        if (searchableText) {
          content = searchableText;
        } else if (match.fullContent) {
          content = match.fullContent;
        } else {
          // Fallback to preview
          content = match.metadata.preview || '';
        }

        // Cache for future use
        if (content) {
          await cacheService.setChunkContent(ref, content);
        }
      }

      if (content) {
        chunks.push({ id: match.id, content });
      }
    }

    // Assemble into context text with source markers
    const contextParts = chunks.map((chunk, index) => {
      return `[Source ${index + 1}]\n${chunk.content}`;
    });

    return {
      text: contextParts.join('\n\n---\n\n'),
      chunks,
    };
  }

  /**
   * Generate answer using Gemini
   */
  private async generate(
    question: string,
    context: string,
    understood: QueryUnderstanding,
    ragContext: RAGContext
  ): Promise<string> {
    const client = getGeminiClient();

    const systemPrompt = this.buildSystemPrompt(understood, ragContext);
    const userPrompt = this.buildUserPrompt(question, context);

    try {
      const response = await client.models.generateContent({
        model: RAG_CONFIG.model,
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
        ],
        config: {
          temperature: RAG_CONFIG.temperature,
          maxOutputTokens: RAG_CONFIG.maxOutputTokens,
        },
      });

      return response.text || '답변을 생성할 수 없습니다.';
    } catch (error) {
      console.error('[RAGV2Service] Generation error:', error);
      throw error;
    }
  }

  /**
   * Build system prompt based on intent
   */
  private buildSystemPrompt(
    understood: QueryUnderstanding,
    context: RAGContext
  ): string {
    const basePrompt = `당신은 보험 설계사를 위한 급여/수수료 정보를 안내하는 AI 어시스턴트입니다.

핵심 원칙:
1. 제공된 컨텍스트 정보만을 사용하여 답변합니다.
2. 금액은 원화 형식으로 명확하게 표시합니다.
3. 확실하지 않은 정보는 추측하지 않습니다.
4. 간결하고 명확하게 답변합니다.`;

    let intentGuidance = '';
    switch (understood.intent.type) {
      case 'lookup':
        intentGuidance = '\n\n사용자가 특정 정보를 조회하고 있습니다. 정확한 수치와 함께 명확하게 답변해주세요.';
        break;
      case 'calculation':
        intentGuidance = '\n\n사용자가 계산 결과를 요청하고 있습니다. 계산 과정을 간단히 설명하고 결과를 제시해주세요.';
        break;
      case 'comparison':
        intentGuidance = '\n\n사용자가 비교 정보를 요청하고 있습니다. 비교 대상을 명확히 하고 차이점을 설명해주세요.';
        break;
    }

    return basePrompt + intentGuidance;
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(question: string, context: string): string {
    return `다음 정보를 참고하여 질문에 답변해주세요.

[참고 정보]
${context}

[질문]
${question}

[답변]`;
  }

  /**
   * Build response when no results found
   */
  private buildNoResultsResponse(
    question: string,
    metrics: RAGStageMetrics,
    totalStart: number
  ): RAGResult {
    metrics.total.timeMs = Date.now() - totalStart;

    return {
      answer: '죄송합니다, 요청하신 정보를 찾을 수 없습니다. 질문을 다르게 표현해 보시거나, 더 구체적인 정보를 제공해 주세요.',
      sources: [],
      metrics,
      confidence: 0,
      needsClarification: true,
      clarificationQuestion: '어떤 정보를 찾고 계신가요?',
    };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    matches: SearchMatch[],
    understood: QueryUnderstanding
  ): number {
    if (matches.length === 0) return 0;

    // Base confidence from top match score
    const topScore = matches[0].score;

    // Adjust based on intent confidence
    const intentFactor = understood.intent.confidence;

    // Adjust based on number of supporting results
    const supportFactor = Math.min(matches.length / 5, 1);

    return Math.min(topScore * intentFactor * (0.7 + 0.3 * supportFactor), 1);
  }

  /**
   * Estimate token count
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~2 characters per token for Korean/mixed
    return Math.ceil(text.length / 2);
  }

  /**
   * Update retrieval configuration
   */
  updateConfig(config: Partial<RetrievalConfig>): void {
    this.retrievalConfig = { ...this.retrievalConfig, ...config };
    hybridSearchService.updateConfig(config);
  }
}

// Export singleton instance
export const ragV2Service = new RAGV2Service();
