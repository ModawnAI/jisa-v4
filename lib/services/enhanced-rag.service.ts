/**
 * Enhanced RAG Service with Intent-Aware Query Processing
 *
 * This service orchestrates the Intent-Aware RAG pipeline:
 * 0. Quick Route Check (instant responses, clarification handling)
 * 1. Pipeline State Check (block during updates)
 * 2. Query Understanding (Gemini Flash parses informal queries)
 * 3. Query Routing (based on intent type)
 * 4. Pinecone Search (with dynamic filters)
 * 5. Calculation Engine (MDRT gaps, aggregations, etc.)
 * 6. Response Generation (Gemini with context)
 *
 * IMPORTANT: Schemas and prompts are pre-generated on document upload/delete.
 * They are NOT regenerated per query - this service uses cached schemas only.
 *
 * V2 FEATURES (enabled via useV2 option):
 * - Hybrid search with dense + sparse embeddings
 * - Cohere cross-encoder reranking
 * - Reciprocal Rank Fusion (RRF)
 * - Redis embedding cache
 * - Enhanced observability
 */

import { GoogleGenAI } from '@google/genai';
import { createEmbedding } from '@/lib/utils/embedding';
import { pineconeService, type SearchResult, type VectorMetadata } from './pinecone.service';
// RAG V2 Services
import {
  hybridSearchService,
  rerankService,
  embeddingService,
  observabilityService,
  type RAGContext as RAGV2Context,
  type SearchMatch,
  type TieredMetadata,
} from './rag-v2';
import {
  queryUnderstandingService,
  type QueryUnderstandingContext,
} from './query-understanding.service';
import type {
  QueryIntent,
  QueryIntentType,
  CalculationType,
  MdrtStandard,
  RAGExecutionResult,
} from '@/lib/ai/query-intent';
import { MDRT_STANDARDS, FIELD_DISPLAY_NAMES } from '@/lib/ai/query-intent';
import {
  queryRouterService,
  type RouterDecision,
} from './query-router.service';
import {
  conversationStateService,
  type PendingClarification,
} from './conversation-state.service';
import {
  pipelineStateService,
  type PipelineCheckResult,
} from './pipeline-state.service';
import { ragMetricsService, type CompleteMetricData } from './rag-metrics.service';
import { schemaRegistryService } from './schema-registry.service';
import {
  ambiguityDetectionService,
} from './ambiguity-detection.service';
import type {
  AmbiguityDetectionResult,
  ClarificationOption,
} from '@/lib/types/ambiguity-detection';

// Initialize Gemini client
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return aiClient;
}

// Configuration
const CONFIG = {
  relevanceThreshold: 0.35,
  defaultTopK: 10,
  maxContextLength: 8000,
  model: 'gemini-flash-latest',
};

/**
 * Enhanced RAG query context
 */
export interface EnhancedRAGContext {
  /** Database UUID of the employee */
  employeeId: string;
  /**
   * Employee number (사번) for Pinecone filtering
   * CRITICAL: This is what gets stored in Pinecone metadata (e.g., "J00307")
   * If not provided, employeeId will be used (may cause filter mismatches)
   */
  employeeNumber?: string;
  organizationId: string;
  namespace: string;
  sessionId?: string;
  previousQueries?: string[];
  clearanceLevel?: 'basic' | 'standard' | 'advanced';
  /** Additional namespaces to search (e.g., organization namespace) */
  additionalNamespaces?: string[];
  /**
   * Enable RAG V2 features:
   * - Hybrid search with dense + sparse embeddings
   * - Cohere cross-encoder reranking
   * - Reciprocal Rank Fusion (RRF)
   * - Redis embedding cache
   * - Enhanced observability
   */
  useV2?: boolean;
}

/**
 * Enhanced RAG result with detailed metadata
 */
export interface EnhancedRAGResult extends RAGExecutionResult {
  intent: QueryIntent;
  searchResults: SearchResult[];
  processingBreakdown: {
    routerMs?: number;
    queryUnderstandingMs: number;
    embeddingMs: number;
    searchMs: number;
    rerankMs?: number;
    calculationMs: number;
    generationMs: number;
    totalMs: number;
  };
  /** Router decision details */
  routeDecision?: {
    route: string;
    confidence: number;
    processingTimeMs: number;
  };
  /** If true, pipeline is updating and query was blocked */
  pipelineBlocked?: boolean;
  /** User-friendly message when pipeline is blocked */
  pipelineMessage?: string;
  /** If true, need clarification from user */
  needsClarification?: boolean;
  /** Clarification question to ask */
  clarificationQuestion?: string;
  /** V2 search metrics (when useV2 is enabled) */
  v2Metrics?: {
    denseResultCount: number;
    sparseResultCount: number;
    fusedResultCount: number;
    rerankInputCount: number;
    rerankOutputCount: number;
    cacheHit: boolean;
  };
}

export class EnhancedRAGService {
  /**
   * Main entry point for enhanced RAG queries
   */
  async query(
    userQuery: string,
    context: EnhancedRAGContext
  ): Promise<EnhancedRAGResult> {
    const startTime = Date.now();
    const timing: Record<string, number> = {};

    console.log(`\n[Enhanced RAG] Query: "${userQuery}"`);
    console.log(`[Enhanced RAG] Employee: ${context.employeeId}, Namespace: ${context.namespace}`);

    // Collect all namespaces to check
    const allNamespaces = [context.namespace, ...(context.additionalNamespaces || [])];

    // ===========================================================
    // Step 0: Quick Route Check (instant responses)
    // ===========================================================
    const routerStart = Date.now();
    const routerDecision = await queryRouterService.route(userQuery, {
      sessionId: context.sessionId,
      employeeId: context.employeeId,
    });
    timing.router = Date.now() - routerStart;

    console.log(`[Enhanced RAG] Router: ${routerDecision.route} (confidence: ${routerDecision.confidence.toFixed(2)})`);

    // Handle instant response routes
    if (routerDecision.route === 'instant' && routerDecision.response) {
      const totalTime = Date.now() - startTime;
      console.log(`[Enhanced RAG] Instant response in ${totalTime}ms`);

      // Record metrics for instant response
      await this.recordMetrics({
        route: 'instant',
        routerTimeMs: timing.router,
        totalTimeMs: totalTime,
        resultCount: 0,
        wasInstantResponse: true,
      });

      return this.createInstantResult(routerDecision.response, timing.router, totalTime);
    }

    // ===========================================================
    // Step 1: Pipeline State Check (block during updates)
    // ===========================================================
    const pipelineStatus = pipelineStateService.checkPipelineStatus(allNamespaces);

    if (pipelineStatus.blocked) {
      const totalTime = Date.now() - startTime;
      console.log(`[Enhanced RAG] Pipeline blocked: ${pipelineStatus.message}`);

      return this.createBlockedResult(pipelineStatus, timing.router, totalTime);
    }

    // ===========================================================
    // Step 2: Check for pending clarification
    // ===========================================================
    if (context.sessionId && conversationStateService.hasPendingClarification(context.sessionId)) {
      const state = conversationStateService.getOrCreateState(context.sessionId, context.employeeId);

      if (state.pendingClarification) {
        const clarificationResult = await this.handleClarificationResponse(
          userQuery,
          state.pendingClarification,
          context
        );

        if (clarificationResult) {
          return clarificationResult;
        }
        // If clarification handling returned null, continue with normal flow
      }
    }

    // ===========================================================
    // Step 3: Query Understanding
    // ===========================================================
    const quStart = Date.now();
    const understandingContext: QueryUnderstandingContext = {
      employeeId: context.employeeId,
      sessionId: context.sessionId,
      previousQueries: context.previousQueries,
      availableNamespaces: allNamespaces,
    };

    const { intent, processingTimeMs, schemasUsed } = await queryUnderstandingService.analyzeQuery(
      userQuery,
      understandingContext
    );
    timing.queryUnderstanding = Date.now() - quStart;

    console.log(`[Enhanced RAG] Intent: ${intent.intent}, Template: ${intent.template}, Confidence: ${intent.confidence.toFixed(2)}`);
    console.log(`[Enhanced RAG] Fields: ${intent.fields.join(', ') || 'none'}`);
    console.log(`[Enhanced RAG] Filters: ${JSON.stringify(intent.filters)}`);

    // ===========================================================
    // Step 3b: Check if clarification needed
    // ===========================================================
    if (routerDecision.route === 'clarify' || intent.confidence < 0.5) {
      const clarificationQuestion = await this.buildClarificationQuestion(userQuery, intent, routerDecision);

      if (clarificationQuestion && context.sessionId) {
        // Store pending clarification
        conversationStateService.setPendingClarification(
          context.sessionId,
          userQuery,
          intent,
          clarificationQuestion,
          'general'
        );

        const totalTime = Date.now() - startTime;
        return this.createClarificationResult(clarificationQuestion, timing.router, timing.queryUnderstanding, totalTime);
      }
    }

    // ===========================================================
    // Step 4: Build Pinecone filters
    // ===========================================================
    const pineconeFilters = this.buildPineconeFilters(intent, context);

    // ===========================================================
    // Step 5 & 6: Search (V1 or V2)
    // ===========================================================
    const searchQuery = intent.semanticSearch.query || userQuery;
    const topK = intent.semanticSearch.topK || CONFIG.defaultTopK;
    let searchResults: SearchResult[];
    let v2Metrics: EnhancedRAGResult['v2Metrics'] | undefined;

    if (context.useV2) {
      // V2: Hybrid search with reranking
      const v2Result = await this.searchV2(
        searchQuery,
        context,
        pineconeFilters,
        topK,
        timing
      );
      searchResults = v2Result.results;
      v2Metrics = v2Result.metrics;
    } else {
      // V1: Traditional search
      const embStart = Date.now();
      const embedding = await createEmbedding(searchQuery);
      timing.embedding = Date.now() - embStart;

      const searchStart = Date.now();
      searchResults = await pineconeService.query(context.namespace, embedding, {
        topK,
        filter: pineconeFilters,
        includeMetadata: true,
      });

      // Fallback: If no results with filters, retry without filters
      if (searchResults.length === 0 && Object.keys(pineconeFilters).length > 0) {
        console.log('[Enhanced RAG] No results with filters, retrying without...');
        searchResults = await pineconeService.query(context.namespace, embedding, {
          topK,
          includeMetadata: true,
        });
      }

      // Also search additional namespaces if provided
      if (context.additionalNamespaces && context.additionalNamespaces.length > 0 && searchResults.length < topK) {
        for (const ns of context.additionalNamespaces) {
          const additionalResults = await pineconeService.query(ns, embedding, {
            topK: Math.max(3, topK - searchResults.length),
            filter: this.buildOrganizationFilters(intent, context),
            includeMetadata: true,
          });
          searchResults = [...searchResults, ...additionalResults];
        }
      }

      timing.search = Date.now() - searchStart;
    }

    console.log(`[Enhanced RAG] Found ${searchResults.length} results${context.useV2 ? ' (V2)' : ''}`);

    // ===========================================================
    // Step 6b: Post-Search Ambiguity Detection
    // ===========================================================
    const ambiguityStart = Date.now();
    const ambiguityResult = await ambiguityDetectionService.detectAmbiguity(
      userQuery,
      searchResults.map(r => ({
        id: r.id,
        score: r.score,
        metadata: r.metadata as Record<string, unknown>,
      })),
      { checkKeywordsBeforeSearch: true, analyzeResultDistribution: true }
    );
    timing.ambiguity = Date.now() - ambiguityStart;

    if (ambiguityResult.needsClarification && context.sessionId) {
      console.log(`[Enhanced RAG] Ambiguity detected: ${ambiguityResult.reason}`);

      // Build the clarification message
      const clarificationMessage = ambiguityDetectionService.formatClarificationMessage(
        ambiguityResult.clarification
      );

      // Store pending clarification with template type and options
      conversationStateService.setPendingClarification(
        context.sessionId,
        userQuery,
        {
          ...intent,
          // Store ambiguity options for later parsing
          extractedEntities: {
            ...intent.extractedEntities,
            ambiguityOptions: ambiguityResult.clarification?.options,
          },
        },
        clarificationMessage,
        'template'  // Use 'template' type for document type disambiguation
      );

      const totalTime = Date.now() - startTime;
      console.log(`[Enhanced RAG] Asking for disambiguation in ${totalTime}ms`);

      return this.createClarificationResult(
        clarificationMessage,
        timing.router,
        timing.queryUnderstanding,
        totalTime
      );
    }

    // ===========================================================
    // Step 7: Route to appropriate handler / Execute calculations
    // ===========================================================
    const calcStart = Date.now();
    let calculationResult: number | Record<string, number> | null = null;

    if (intent.calculation && searchResults.length > 0) {
      calculationResult = this.executeCalculation(intent, searchResults);
    }
    timing.calculation = Date.now() - calcStart;

    // ===========================================================
    // Step 8: Generate response
    // ===========================================================
    const genStart = Date.now();
    const answer = await this.generateResponse(
      userQuery,
      intent,
      searchResults,
      calculationResult,
      context
    );
    timing.generation = Date.now() - genStart;

    const totalTime = Date.now() - startTime;

    console.log(`[Enhanced RAG] Total time: ${totalTime}ms`);
    const timingBreakdown = context.useV2
      ? `Router=${timing.router}ms, QU=${timing.queryUnderstanding}ms, Emb=${timing.embedding}ms, Search=${timing.search}ms, Rerank=${timing.rerank || 0}ms, Calc=${timing.calculation}ms, Gen=${timing.generation}ms`
      : `Router=${timing.router}ms, QU=${timing.queryUnderstanding}ms, Emb=${timing.embedding}ms, Search=${timing.search}ms, Calc=${timing.calculation}ms, Gen=${timing.generation}ms`;
    console.log(`[Enhanced RAG] Breakdown: ${timingBreakdown}\n`);

    // ===========================================================
    // Step 9: Record metrics
    // ===========================================================
    await this.recordMetrics({
      route: routerDecision.route,
      routerTimeMs: timing.router,
      queryUnderstandingTimeMs: timing.queryUnderstanding,
      embeddingTimeMs: timing.embedding,
      searchTimeMs: timing.search,
      calculationTimeMs: timing.calculation,
      generationTimeMs: timing.generation,
      totalTimeMs: totalTime,
      resultCount: searchResults.length,
      intentType: intent.intent,
      confidence: intent.confidence,
    });

    // Log to V2 observability if enabled
    if (context.useV2) {
      const ragV2Context: RAGV2Context = {
        employeeId: context.employeeId,
        organizationId: context.organizationId,
        namespace: context.namespace,
        sessionId: context.sessionId,
        clearanceLevel: context.clearanceLevel,
      };
      observabilityService.logQuery(
        userQuery,
        {
          answer,
          sources: searchResults.slice(0, 3).map((r) => {
            const searchableText = r.metadata?.searchable_text;
            const previewText = typeof searchableText === 'string' ? searchableText.slice(0, 200) : '';
            return {
              id: r.id,
              preview: (r.metadata?.preview as string) || previewText || '',
              score: r.score,
              metadata: r.metadata as unknown as TieredMetadata,
            };
          }),
          confidence: intent.confidence,
          metrics: {
            queryUnderstanding: { timeMs: timing.queryUnderstanding, expandedQueries: 0 },
            broadRetrieval: {
              timeMs: timing.search,
              denseResults: v2Metrics?.denseResultCount || 0,
              sparseResults: v2Metrics?.sparseResultCount || 0,
              fusedResults: v2Metrics?.fusedResultCount || 0,
            },
            reranking: {
              timeMs: timing.rerank || 0,
              model: 'rerank-multilingual-v3.0',
              inputCount: v2Metrics?.rerankInputCount || 0,
              outputCount: v2Metrics?.rerankOutputCount || 0,
            },
            contextAssembly: { timeMs: 0, chunksExpanded: 0, tokensUsed: 0 },
            generation: { timeMs: timing.generation, model: CONFIG.model, tokensIn: 0, tokensOut: 0 },
            total: { timeMs: totalTime },
          },
        },
        ragV2Context
      ).catch(console.error); // Don't block on observability
    }

    return {
      answer,
      sources: searchResults.slice(0, 3).map((r) => r.id),
      metadata: {
        intent: intent.intent,
        template: intent.template,
        calculationResult: calculationResult ?? undefined,
        confidence: intent.confidence,
        processingTime: totalTime,
      },
      intent,
      searchResults,
      processingBreakdown: {
        routerMs: timing.router,
        queryUnderstandingMs: timing.queryUnderstanding,
        embeddingMs: timing.embedding,
        searchMs: timing.search,
        rerankMs: timing.rerank,
        calculationMs: timing.calculation,
        generationMs: timing.generation,
        totalMs: totalTime,
      },
      routeDecision: {
        route: routerDecision.route,
        confidence: routerDecision.confidence,
        processingTimeMs: timing.router,
      },
      v2Metrics,
    };
  }

  /**
   * V2 Search: Hybrid search with dense + sparse embeddings and Cohere reranking
   */
  private async searchV2(
    query: string,
    context: EnhancedRAGContext,
    filters: Record<string, unknown>,
    topK: number,
    timing: Record<string, number>
  ): Promise<{
    results: SearchResult[];
    metrics: EnhancedRAGResult['v2Metrics'];
  }> {
    const embStart = Date.now();

    // Generate hybrid embeddings (with caching)
    const hybridEmbedding = await embeddingService.generateHybridEmbedding(query);
    timing.embedding = Date.now() - embStart;

    const searchStart = Date.now();

    // Build namespaces to search
    const namespaces = [
      context.namespace,
      ...(context.additionalNamespaces || []),
    ];

    // Use hybrid search service with RRF
    const hybridResults = await hybridSearchService.search({
      text: query,
      namespaces,
      topK: topK * 2, // Over-fetch for reranking
      filters,
      includeMetadata: true,
    });

    timing.search = Date.now() - searchStart;

    // Rerank results using Cohere
    const rerankStart = Date.now();
    let rerankedResults: SearchResult[] = [];
    let rerankInputCount = hybridResults.matches.length;
    let rerankOutputCount = 0;

    if (hybridResults.matches.length > 0) {
      try {
        const reranked = await rerankService.rerankPineconeResults(
          query,
          hybridResults.matches.map(r => ({
            id: r.id,
            score: r.score,
            metadata: r.metadata as unknown as { searchable_text?: string; preview?: string },
          })),
          topK,
          'searchable_text' // Use searchable_text for better reranking
        );

        rerankedResults = reranked.map(r => ({
          id: r.id,
          score: r.rerankScore,
          metadata: r.metadata as unknown as VectorMetadata,
        }));
        rerankOutputCount = rerankedResults.length;
      } catch (error) {
        console.error('[Enhanced RAG V2] Reranking failed, using original order:', error);
        // Fallback to hybrid results without reranking
        rerankedResults = hybridResults.matches.slice(0, topK).map(r => ({
          id: r.id,
          score: r.score,
          metadata: r.metadata as unknown as VectorMetadata,
        }));
        rerankOutputCount = rerankedResults.length;
      }
    }

    timing.rerank = Date.now() - rerankStart;

    console.log(`[Enhanced RAG V2] Hybrid search: ${hybridResults.totalFound} found, ${hybridResults.matches.length} fused -> ${rerankedResults.length} reranked (strategy: ${hybridResults.strategy})`);

    return {
      results: rerankedResults,
      metrics: {
        denseResultCount: hybridResults.totalFound,
        sparseResultCount: 0, // Sparse not yet fully integrated
        fusedResultCount: hybridResults.matches.length,
        rerankInputCount,
        rerankOutputCount,
        cacheHit: hybridEmbedding.cached || false,
      },
    };
  }

  /**
   * Create result for instant responses (greetings, etc.)
   */
  private createInstantResult(
    response: string,
    routerMs: number,
    totalMs: number
  ): EnhancedRAGResult {
    const defaultIntent: QueryIntent = {
      intent: 'general_qa',
      template: 'general',
      confidence: 1.0,
      fields: [],
      filters: {},
      semanticSearch: { enabled: true, query: '', topK: 0 },
    };

    return {
      answer: response,
      sources: [],
      metadata: {
        intent: 'general_qa',
        template: 'general',
        calculationResult: undefined,
        confidence: 1.0,
        processingTime: totalMs,
      },
      intent: defaultIntent,
      searchResults: [],
      processingBreakdown: {
        routerMs,
        queryUnderstandingMs: 0,
        embeddingMs: 0,
        searchMs: 0,
        calculationMs: 0,
        generationMs: 0,
        totalMs,
      },
      routeDecision: {
        route: 'instant',
        confidence: 1.0,
        processingTimeMs: routerMs,
      },
    };
  }

  /**
   * Create result when pipeline is blocked
   */
  private createBlockedResult(
    pipelineStatus: PipelineCheckResult & { blocked: true },
    routerMs: number,
    totalMs: number
  ): EnhancedRAGResult {
    const defaultIntent: QueryIntent = {
      intent: 'general_qa',
      template: 'general',
      confidence: 0,
      fields: [],
      filters: {},
      semanticSearch: { enabled: false, query: '', topK: 0 },
    };

    return {
      answer: pipelineStatus.message,
      sources: [],
      metadata: {
        intent: 'general_qa',
        template: 'general',
        calculationResult: undefined,
        confidence: 0,
        processingTime: totalMs,
      },
      intent: defaultIntent,
      searchResults: [],
      processingBreakdown: {
        routerMs,
        queryUnderstandingMs: 0,
        embeddingMs: 0,
        searchMs: 0,
        calculationMs: 0,
        generationMs: 0,
        totalMs,
      },
      pipelineBlocked: true,
      pipelineMessage: pipelineStatus.message,
    };
  }

  /**
   * Create result when clarification is needed
   */
  private createClarificationResult(
    clarificationQuestion: string,
    routerMs: number,
    queryUnderstandingMs: number,
    totalMs: number
  ): EnhancedRAGResult {
    const defaultIntent: QueryIntent = {
      intent: 'general_qa',
      template: 'general',
      confidence: 0.3,
      fields: [],
      filters: {},
      semanticSearch: { enabled: false, query: '', topK: 0 },
    };

    return {
      answer: clarificationQuestion,
      sources: [],
      metadata: {
        intent: 'general_qa',
        template: 'general',
        calculationResult: undefined,
        confidence: 0.3,
        processingTime: totalMs,
      },
      intent: defaultIntent,
      searchResults: [],
      processingBreakdown: {
        routerMs,
        queryUnderstandingMs,
        embeddingMs: 0,
        searchMs: 0,
        calculationMs: 0,
        generationMs: 0,
        totalMs,
      },
      needsClarification: true,
      clarificationQuestion,
    };
  }

  /**
   * Handle response to a pending clarification
   */
  private async handleClarificationResponse(
    userQuery: string,
    pending: PendingClarification,
    context: EnhancedRAGContext
  ): Promise<EnhancedRAGResult | null> {
    // Clear the pending clarification by getting and modifying state
    if (context.sessionId) {
      const state = conversationStateService.getOrCreateState(context.sessionId, context.employeeId);
      state.pendingClarification = undefined;
    }

    // Check if user is answering the clarification or asking something new
    const isAnsweringClarification = this.isAnsweringClarification(userQuery, pending);

    if (!isAnsweringClarification) {
      // User asked something completely different, proceed with normal flow
      return null;
    }

    // For template disambiguation, parse the selection and update confirmed context
    if (pending.clarificationType === 'template') {
      const ambiguityOptions = pending.partialIntent?.extractedEntities?.ambiguityOptions as ClarificationOption[] | undefined;

      if (ambiguityOptions) {
        const parsed = ambiguityDetectionService.parseClarificationResponse(userQuery, ambiguityOptions);

        if (parsed) {
          console.log(`[Enhanced RAG] Template clarification: selected ${parsed.selectedTemplate} (${parsed.selectedMetadataType})`);

          // Update confirmed context with the selected template
          if (context.sessionId) {
            const state = conversationStateService.getOrCreateState(context.sessionId, context.employeeId);
            state.confirmedContext.templateType = parsed.selectedTemplate;
          }

          // Re-run original query with explicit template/filter
          // The enhanceQueryWithClarification will add the template context
        }
      }
    }

    // Enhance the original query with clarification response
    const enhancedQuery = this.enhanceQueryWithClarification(pending.originalQuery, userQuery, pending);

    // Re-run query with enhanced context
    console.log(`[Enhanced RAG] Clarification response detected, enhanced query: "${enhancedQuery}"`);

    // Return null to let the enhanced query be processed normally
    // We update the context to include the clarification
    return null;
  }

  /**
   * Check if user is answering a clarification question
   */
  private isAnsweringClarification(response: string, pending: PendingClarification): boolean {
    const normalized = response.toLowerCase().trim();

    // Check for short affirmative/selective responses based on clarification type
    const shortResponsePatterns = [
      /^[1-4]$/,  // Single digit selection
      /^(네|예|응|어|맞아|그래|ㅇㅇ|ok|yes)$/i,
      /^첫번째|두번째|세번째|네번째$/,
      /^(급여|실적|mdrt|환수)/i,
    ];

    // Check clarification type specific patterns
    if (pending.clarificationType === 'period') {
      const periodPatterns = [/월/, /분기/, /년/, /이번/, /지난/];
      if (periodPatterns.some(p => p.test(normalized))) {
        return true;
      }
    }

    if (pending.clarificationType === 'template') {
      const templatePatterns = [/수수료/, /급여/, /mdrt/, /일정/];
      if (templatePatterns.some(p => p.test(normalized))) {
        return true;
      }
    }

    return shortResponsePatterns.some((pattern) => pattern.test(normalized));
  }

  /**
   * Enhance query with clarification response
   */
  private enhanceQueryWithClarification(
    originalQuery: string,
    clarificationResponse: string,
    pending: PendingClarification
  ): string {
    // For template clarification, add explicit template context
    if (pending.clarificationType === 'template') {
      const ambiguityOptions = pending.partialIntent?.extractedEntities?.ambiguityOptions as ClarificationOption[] | undefined;

      if (ambiguityOptions) {
        const parsed = ambiguityDetectionService.parseClarificationResponse(clarificationResponse, ambiguityOptions);

        if (parsed?.selectedTemplate) {
          // Map template to Korean context word
          const templateContext: Record<string, string> = {
            compensation: '급여명세',
            mdrt: 'MDRT 달성현황',
            general: '일반 정보',
          };
          const context = templateContext[parsed.selectedTemplate] || parsed.selectedTemplate;
          return `${originalQuery} (${context})`;
        }
      }
    }

    // Simple enhancement - combine original query with clarification
    return `${originalQuery} (${clarificationResponse})`;
  }

  /**
   * Build clarification question when intent is ambiguous
   */
  private async buildClarificationQuestion(
    query: string,
    intent: QueryIntent,
    routerDecision: RouterDecision
  ): Promise<string | null> {
    // Use router's suggested clarification if available
    if (routerDecision.clarifyQuestion) {
      return routerDecision.clarifyQuestion;
    }

    // Build clarification based on ambiguous intent
    if (intent.confidence < 0.5) {
      return `"${query}"에 대해 더 구체적으로 알려주시겠어요?

다음 중 어떤 정보가 필요하신가요?
1. 급여/수당 관련
2. MDRT 실적 관련
3. 계약/실적 현황
4. 기타

번호나 키워드로 답변해 주세요.`;
    }

    return null;
  }

  /**
   * Get clarification options based on intent
   */
  private getClarificationOptions(intent: QueryIntent): string[] {
    return ['급여', '수당', 'MDRT', '실적', '계약', '환수'];
  }

  /**
   * Build filters for organization namespace (less restrictive than employee)
   */
  private buildOrganizationFilters(
    intent: QueryIntent,
    context: EnhancedRAGContext
  ): Record<string, unknown> {
    const filters: Record<string, unknown> = {};
    const andConditions: Record<string, unknown>[] = [];

    // Period filter
    if (intent.filters.period) {
      andConditions.push({ period: { $eq: intent.filters.period } });
    }

    // Clearance level filter
    if (context.clearanceLevel) {
      const allowedLevels = this.getAllowedClearanceLevels(context.clearanceLevel);
      andConditions.push({ clearanceLevel: { $in: allowedLevels } });
    }

    if (andConditions.length === 1) {
      return andConditions[0];
    } else if (andConditions.length > 1) {
      return { $and: andConditions };
    }

    return filters;
  }

  /**
   * Record metrics for analytics
   */
  private async recordMetrics(data: {
    route: string;
    routerTimeMs: number;
    queryUnderstandingTimeMs?: number;
    embeddingTimeMs?: number;
    searchTimeMs?: number;
    calculationTimeMs?: number;
    generationTimeMs?: number;
    totalTimeMs: number;
    resultCount: number;
    intentType?: string;
    confidence?: number;
    wasInstantResponse?: boolean;
  }): Promise<void> {
    try {
      await ragMetricsService.recordSimpleMetric({
        route: data.route,
        routerTimeMs: data.routerTimeMs,
        queryUnderstandingTimeMs: data.queryUnderstandingTimeMs || 0,
        embeddingTimeMs: data.embeddingTimeMs || 0,
        searchTimeMs: data.searchTimeMs || 0,
        calculationTimeMs: data.calculationTimeMs || 0,
        generationTimeMs: data.generationTimeMs || 0,
        totalTimeMs: data.totalTimeMs,
        resultCount: data.resultCount,
        intentType: data.intentType,
        confidence: data.confidence,
        wasInstantResponse: data.wasInstantResponse,
      });
    } catch (error) {
      // Don't fail the query if metrics recording fails
      console.error('[Enhanced RAG] Failed to record metrics:', error);
    }
  }

  /**
   * Build Pinecone filters from intent
   *
   * CRITICAL: Uses employeeNumber (사번, e.g., "J00307") for filtering,
   * NOT the database UUID. This matches how data is stored in Pinecone.
   *
   * Period format is YYYYMM (e.g., "202509") - must match stored data.
   */
  private buildPineconeFilters(
    intent: QueryIntent,
    context: EnhancedRAGContext
  ): Record<string, unknown> {
    const filters: Record<string, unknown> = {};
    const andConditions: Record<string, unknown>[] = [];

    // CRITICAL: Use employeeNumber (사번) for filtering, NOT database UUID
    // The employeeNumber is what gets stored in Pinecone metadata
    // Example: "J00307" (사번) instead of UUID
    const employeeFilter = context.employeeNumber || context.employeeId;
    andConditions.push({ employeeId: { $eq: employeeFilter } });

    console.log(`[Enhanced RAG] Employee filter: ${employeeFilter} (from ${context.employeeNumber ? 'employeeNumber' : 'employeeId'})`);

    // Period filter - already in YYYYMM format from query-understanding service
    // Also search reportMonth (YYYY-MM format) for backward compatibility with older data
    if (intent.filters.period) {
      const periodYYYYMM = intent.filters.period; // e.g., "202511"
      const reportMonthFormat = `${periodYYYYMM.slice(0, 4)}-${periodYYYYMM.slice(4)}`; // e.g., "2025-11"

      // Use $or to match either format for backward compatibility
      andConditions.push({
        $or: [
          { period: { $eq: periodYYYYMM } },
          { reportMonth: { $eq: reportMonthFormat } },
        ],
      });
      console.log(`[Enhanced RAG] Period filter: ${periodYYYYMM} (or reportMonth: ${reportMonthFormat})`);
    }

    // Check for confirmed template from conversation state (disambiguation result)
    // This takes precedence over intent-derived filters
    if (context.sessionId) {
      const confirmedContext = conversationStateService.getConfirmedContext(context.sessionId);
      if (confirmedContext?.templateType) {
        // Map template to metadataType
        const templateToMetadataType: Record<string, string> = {
          compensation: 'employee',
          mdrt: 'mdrt',
          general: 'generic',
        };
        const metadataTypeFromTemplate = templateToMetadataType[confirmedContext.templateType];
        if (metadataTypeFromTemplate) {
          andConditions.push({ metadataType: { $eq: metadataTypeFromTemplate } });
          console.log(`[Enhanced RAG] Using confirmed template: ${confirmedContext.templateType} -> metadataType: ${metadataTypeFromTemplate}`);
        }
      }
    }

    // Metadata type filter (from intent, if not already set by confirmed context)
    if (intent.filters.metadataType) {
      // Only add if not already added from confirmed context
      const hasMetadataTypeFilter = andConditions.some(
        cond => cond && typeof cond === 'object' && 'metadataType' in cond
      );
      if (!hasMetadataTypeFilter) {
        andConditions.push({ metadataType: { $eq: intent.filters.metadataType } });
      }
    }

    // Chunk type filter
    if (intent.filters.chunkType) {
      andConditions.push({ chunkType: { $eq: intent.filters.chunkType } });
    }

    // Company filter
    if (intent.filters.company) {
      andConditions.push({ company: { $eq: intent.filters.company } });
    }

    // Category filter
    if (intent.filters.category) {
      andConditions.push({ category: { $eq: intent.filters.category } });
    }

    // Clearance level filter
    if (context.clearanceLevel) {
      const allowedLevels = this.getAllowedClearanceLevels(context.clearanceLevel);
      andConditions.push({ clearanceLevel: { $in: allowedLevels } });
    }

    // Combine conditions
    if (andConditions.length === 1) {
      return andConditions[0];
    } else if (andConditions.length > 1) {
      return { $and: andConditions };
    }

    return filters;
  }

  /**
   * Get allowed clearance levels based on user's level
   */
  private getAllowedClearanceLevels(userLevel: 'basic' | 'standard' | 'advanced'): string[] {
    switch (userLevel) {
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
   * Execute calculations based on intent
   */
  private executeCalculation(
    intent: QueryIntent,
    results: SearchResult[]
  ): number | Record<string, number> | null {
    if (!intent.calculation) return null;

    const { type, params } = intent.calculation;

    switch (type) {
      case 'mdrt_gap':
        return this.calculateMdrtGap(results, params?.standard as MdrtStandard);

      case 'period_diff':
        return this.calculatePeriodDiff(results, params?.periods as string[], params?.field as string);

      case 'sum':
        return this.calculateSum(results, params?.field as string);

      case 'average':
        return this.calculateAverage(results, params?.field as string);

      case 'count':
        return this.calculateCount(results);

      case 'percentage':
        return this.calculatePercentage(results, params?.field as string, params as Record<string, unknown>);

      case 'tax_reverse':
        return this.calculateTaxReverse(results, params?.field as string);

      default:
        console.log(`[Enhanced RAG] Unknown calculation type: ${type}`);
        return null;
    }
  }

  /**
   * Calculate MDRT gap
   */
  private calculateMdrtGap(
    results: SearchResult[],
    standard: MdrtStandard = 'fycMdrt'
  ): Record<string, number> {
    // Find the current FYC or AGI value from results
    let currentValue = 0;
    let currentFyc = 0;
    let currentAgi = 0;

    for (const result of results) {
      const metadata = result.metadata;
      if (metadata) {
        // Look for FYC values
        if (metadata.fyc !== undefined) {
          currentFyc = Math.max(currentFyc, Number(metadata.fyc) || 0);
        }
        if (metadata.fycTotal !== undefined) {
          currentFyc = Math.max(currentFyc, Number(metadata.fycTotal) || 0);
        }
        // Look for AGI values
        if (metadata.agi !== undefined) {
          currentAgi = Math.max(currentAgi, Number(metadata.agi) || 0);
        }
        if (metadata.agiTotal !== undefined) {
          currentAgi = Math.max(currentAgi, Number(metadata.agiTotal) || 0);
        }
      }
    }

    // Determine which value to use based on standard
    currentValue = standard.startsWith('fyc') ? currentFyc : currentAgi;

    const targetValue = MDRT_STANDARDS[standard];
    const gap = targetValue - currentValue;
    const progress = (currentValue / targetValue) * 100;

    return {
      current: currentValue,
      target: targetValue,
      gap: Math.max(0, gap),
      progress: Math.min(100, progress),
      achieved: currentValue >= targetValue ? 1 : 0,
    };
  }

  /**
   * Calculate difference between periods
   */
  private calculatePeriodDiff(
    results: SearchResult[],
    periods?: string[],
    field?: string
  ): Record<string, number> {
    if (!periods || periods.length < 2 || !field) {
      return { error: -1 };
    }

    const valuesByPeriod = new Map<string, number>();

    for (const result of results) {
      const metadata = result.metadata;
      if (metadata?.period && metadata[field] !== undefined) {
        const period = String(metadata.period);
        const value = Number(metadata[field]) || 0;
        valuesByPeriod.set(period, value);
      }
    }

    const value1 = valuesByPeriod.get(periods[0]) || 0;
    const value2 = valuesByPeriod.get(periods[1]) || 0;
    const diff = value2 - value1;
    const percentChange = value1 !== 0 ? ((diff / value1) * 100) : 0;

    return {
      [periods[0]]: value1,
      [periods[1]]: value2,
      difference: diff,
      percentChange,
    };
  }

  /**
   * Calculate sum of a field
   */
  private calculateSum(results: SearchResult[], field?: string): number {
    if (!field) return 0;

    let sum = 0;
    for (const result of results) {
      const value = result.metadata?.[field];
      if (value !== undefined) {
        sum += Number(value) || 0;
      }
    }
    return sum;
  }

  /**
   * Calculate average of a field
   */
  private calculateAverage(results: SearchResult[], field?: string): number {
    if (!field || results.length === 0) return 0;

    const sum = this.calculateSum(results, field);
    const count = results.filter((r) => r.metadata?.[field] !== undefined).length;
    return count > 0 ? sum / count : 0;
  }

  /**
   * Calculate count of results
   */
  private calculateCount(results: SearchResult[]): number {
    return results.length;
  }

  /**
   * Calculate percentage
   */
  private calculatePercentage(
    results: SearchResult[],
    field?: string,
    params?: Record<string, unknown>
  ): number {
    if (!field) return 0;

    const total = params?.total as number;
    const sum = this.calculateSum(results, field);

    if (total && total > 0) {
      return (sum / total) * 100;
    }

    return 0;
  }

  /**
   * Reverse calculate tax (3.3% tax to gross)
   */
  private calculateTaxReverse(results: SearchResult[], field?: string): Record<string, number> {
    if (!field) return { error: -1 };

    let netAmount = 0;
    for (const result of results) {
      const value = result.metadata?.[field];
      if (value !== undefined) {
        netAmount += Number(value) || 0;
      }
    }

    // Reverse 3.3% tax calculation
    // netAmount = grossAmount * (1 - 0.033)
    // grossAmount = netAmount / 0.967
    const grossAmount = netAmount / 0.967;
    const taxAmount = grossAmount - netAmount;

    return {
      netAmount,
      grossAmount: Math.round(grossAmount),
      taxAmount: Math.round(taxAmount),
      taxRate: 3.3,
    };
  }

  /**
   * Generate response using Gemini
   */
  private async generateResponse(
    originalQuery: string,
    intent: QueryIntent,
    results: SearchResult[],
    calculation: number | Record<string, number> | null,
    context: EnhancedRAGContext
  ): Promise<string> {
    // Check for low relevance
    if (results.length === 0) {
      return this.generateNoResultsResponse(originalQuery, intent);
    }

    const maxScore = Math.max(...results.map((r) => r.score));
    if (maxScore < CONFIG.relevanceThreshold) {
      return this.generateLowRelevanceResponse(originalQuery, intent, maxScore);
    }

    // Build context from results
    const formattedContext = this.formatContextForLLM(results, intent);

    // Build calculation summary if present
    const calculationSummary = calculation
      ? this.formatCalculationResult(intent, calculation)
      : '';

    // Generate response prompt
    const prompt = this.buildResponsePrompt(
      originalQuery,
      intent,
      formattedContext,
      calculationSummary
    );

    try {
      const ai = getAIClient();

      const contents = [
        {
          role: 'user' as const,
          parts: [{ text: prompt }],
        },
      ];

      const response = await ai.models.generateContent({
        model: CONFIG.model,
        contents,
      });

      return response.text || '죄송합니다. 응답을 생성할 수 없습니다.';
    } catch (error) {
      console.error('[Enhanced RAG] Response generation error:', error);
      return '죄송합니다. 답변 생성 중 오류가 발생했습니다.';
    }
  }

  /**
   * Format context for LLM
   */
  private formatContextForLLM(results: SearchResult[], intent: QueryIntent): string {
    const contextParts: string[] = [];
    let totalLength = 0;

    for (let i = 0; i < results.length && totalLength < CONFIG.maxContextLength; i++) {
      const result = results[i];
      const metadata = result.metadata;

      let part = `\n[문서 ${i + 1}] (관련도: ${result.score.toFixed(3)})\n`;

      if (metadata) {
        // Format based on template type
        if (intent.template === 'compensation') {
          part += this.formatCompensationContext(metadata);
        } else if (intent.template === 'mdrt') {
          part += this.formatMdrtContext(metadata, intent);
        } else {
          part += this.formatGeneralContext(metadata);
        }

        // Extract monthly data if user asked for specific month
        if (intent.filters.period) {
          const monthlyData = this.extractMonthlyData(metadata, intent.filters.period);
          if (monthlyData) {
            part += `\n\n📊 ${this.formatPeriodDisplay(intent.filters.period)} 상세 데이터:\n`;
            part += monthlyData;
          }
        }

        // Add searchable text if present
        const text = metadata.searchableText || metadata.text || metadata.content;
        if (text) {
          part += `\n내용: ${String(text).substring(0, 500)}\n`;
        }
      }

      if (totalLength + part.length <= CONFIG.maxContextLength) {
        contextParts.push(part);
        totalLength += part.length;
      }
    }

    return contextParts.join('\n');
  }

  /**
   * Extract monthly-specific data from JSON fields in metadata
   * JSON fields like monthlyCommissions, monthlyIncomes contain per-month values
   */
  private extractMonthlyData(metadata: VectorMetadata, period: string): string | null {
    const lines: string[] = [];

    // Convert period YYYYMM to YYYY-MM for JSON key lookup
    const periodKey = `${period.slice(0, 4)}-${period.slice(4)}`;

    // Common monthly JSON fields and their display names
    const monthlyFields: Record<string, string> = {
      monthlyCommissions: '월 커미션',
      monthlyIncomes: '월 수입',
      monthlyFyc: '월 FYC',
      monthlyAgi: '월 AGI',
      monthlyOverrides: '월 오버라이드',
      monthlyClawbacks: '월 환수',
    };

    for (const [field, displayName] of Object.entries(monthlyFields)) {
      const rawData = metadata[field];
      if (!rawData) continue;

      // Parse JSON if it's a string (Pinecone stores as JSON string)
      let jsonData: Record<string, number>;
      if (typeof rawData === 'string') {
        try {
          jsonData = JSON.parse(rawData);
        } catch {
          continue;
        }
      } else if (typeof rawData === 'object' && rawData !== null && !Array.isArray(rawData)) {
        jsonData = rawData as unknown as Record<string, number>;
      } else {
        continue;
      }

      // Try both YYYY-MM and YYYYMM formats
      const value = jsonData[periodKey] ?? jsonData[period];
      if (value !== undefined) {
        lines.push(`- ${displayName}: ${this.formatCurrency(value)}`);
      }
    }

    return lines.length > 0 ? lines.join('\n') : null;
  }

  /**
   * Format period for display (YYYYMM -> YYYY년 MM월)
   */
  private formatPeriodDisplay(period: string): string {
    if (/^\d{6}$/.test(period)) {
      const year = period.slice(0, 4);
      const month = parseInt(period.slice(4), 10);
      return `${year}년 ${month}월`;
    }
    return period;
  }

  /**
   * Format compensation-specific context
   * Note: All "총" (total) values are cumulative/annual totals, not monthly values
   */
  private formatCompensationContext(metadata: VectorMetadata): string {
    const lines: string[] = [];

    if (metadata.period) lines.push(`기간: ${metadata.period}`);
    if (metadata.reportMonth) lines.push(`보고월: ${metadata.reportMonth}`);
    if (metadata.finalPayment !== undefined) lines.push(`최종지급액: ${this.formatCurrency(metadata.finalPayment)}`);
    // Clearly label cumulative values to avoid confusion with monthly values
    if (metadata.totalCommission !== undefined) lines.push(`총 커미션 (누적합계): ${this.formatCurrency(metadata.totalCommission)}`);
    if (metadata.totalOverride !== undefined) lines.push(`총 오버라이드 (누적합계): ${this.formatCurrency(metadata.totalOverride)}`);
    if (metadata.totalIncentive !== undefined) lines.push(`총 시책금 (누적합계): ${this.formatCurrency(metadata.totalIncentive)}`);
    if (metadata.totalClawback !== undefined) lines.push(`총 환수금 (누적합계): ${this.formatCurrency(metadata.totalClawback)}`);
    if (metadata.company) lines.push(`보험사: ${metadata.company}`);
    if (metadata.contractCount) lines.push(`계약 건수: ${metadata.contractCount}건`);

    return lines.join('\n');
  }

  /**
   * Format MDRT-specific context
   */
  private formatMdrtContext(metadata: VectorMetadata, intent?: QueryIntent): string {
    const lines: string[] = [];

    // Period info
    if (metadata.fiscalYear) lines.push(`회계연도: ${metadata.fiscalYear}`);
    if (metadata.quarter) lines.push(`분기: ${metadata.quarter}`);
    if (metadata.latestMonthWithData) lines.push(`최신 데이터: ${metadata.latestMonthWithData}`);
    if (metadata.period) lines.push(`기간: ${metadata.period}`);

    // MDRT progress (cumulative for the fiscal year)
    if (metadata.fycMdrtProgress !== undefined) lines.push(`FYC MDRT 진행률: ${metadata.fycMdrtProgress}%`);
    if (metadata.agiMdrtProgress !== undefined) lines.push(`AGI MDRT 진행률: ${metadata.agiMdrtProgress}%`);

    // Cumulative values (clearly labeled as cumulative)
    if (metadata.cumulativeFyc !== undefined) lines.push(`누적 FYC (연간): ${this.formatCurrency(metadata.cumulativeFyc)}`);
    if (metadata.cumulativeAgi !== undefined) lines.push(`누적 AGI (연간): ${this.formatCurrency(metadata.cumulativeAgi)}`);
    if (metadata.fyc !== undefined) lines.push(`FYC: ${this.formatCurrency(metadata.fyc)}`);
    if (metadata.fycTotal !== undefined) lines.push(`누적 FYC: ${this.formatCurrency(metadata.fycTotal)}`);
    if (metadata.agi !== undefined) lines.push(`AGI: ${this.formatCurrency(metadata.agi)}`);
    if (metadata.agiTotal !== undefined) lines.push(`누적 AGI: ${this.formatCurrency(metadata.agiTotal)}`);

    // Income (clearly distinguish cumulative vs monthly)
    if (metadata.newContractIncome !== undefined) {
      lines.push(`신계약수입 (누적): ${this.formatCurrency(metadata.newContractIncome)}`);
    }
    if (metadata.renewalIncome !== undefined) {
      lines.push(`유지수입 (누적): ${this.formatCurrency(metadata.renewalIncome)}`);
    }
    if (metadata.totalIncome !== undefined) {
      lines.push(`총수입 (누적): ${this.formatCurrency(metadata.totalIncome)}`);
    }

    return lines.join('\n');
  }

  /**
   * Format general context
   */
  private formatGeneralContext(metadata: VectorMetadata): string {
    const lines: string[] = [];

    if (metadata.period) lines.push(`기간: ${metadata.period}`);
    if (metadata.documentId) lines.push(`문서: ${metadata.documentId}`);
    if (metadata.chunkType) lines.push(`유형: ${metadata.chunkType}`);

    // Add any numeric fields
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'number' && !['chunkIndex', 'score'].includes(key)) {
        const displayName = FIELD_DISPLAY_NAMES[key] || key;
        lines.push(`${displayName}: ${this.formatCurrency(value)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format calculation result for inclusion in prompt
   */
  private formatCalculationResult(
    intent: QueryIntent,
    result: number | Record<string, number>
  ): string {
    if (typeof result === 'number') {
      return `계산 결과: ${this.formatCurrency(result)}`;
    }

    const calcType = intent.calculation?.type;

    if (calcType === 'mdrt_gap') {
      const r = result as { current: number; target: number; gap: number; progress: number; achieved: number };
      return `
MDRT 계산 결과:
- 현재 실적: ${this.formatCurrency(r.current)}
- 목표: ${this.formatCurrency(r.target)}
- 달성률: ${r.progress.toFixed(1)}%
- 남은 금액: ${this.formatCurrency(r.gap)}
- 달성 여부: ${r.achieved ? '달성' : '미달성'}`;
    }

    if (calcType === 'period_diff') {
      const entries = Object.entries(result);
      const lines = entries.map(([key, value]) => {
        if (key === 'percentChange') {
          return `- 변동률: ${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
        }
        if (key === 'difference') {
          return `- 차이: ${value > 0 ? '+' : ''}${this.formatCurrency(value)}`;
        }
        return `- ${key}: ${this.formatCurrency(value)}`;
      });
      return `기간 비교 결과:\n${lines.join('\n')}`;
    }

    if (calcType === 'tax_reverse') {
      const r = result as { netAmount: number; grossAmount: number; taxAmount: number; taxRate: number };
      return `
세금 역산 결과:
- 실수령액: ${this.formatCurrency(r.netAmount)}
- 세전금액: ${this.formatCurrency(r.grossAmount)}
- 원천징수액: ${this.formatCurrency(r.taxAmount)}
- 세율: ${r.taxRate}%`;
    }

    // Default format for other calculations
    const lines = Object.entries(result).map(
      ([key, value]) => `- ${key}: ${typeof value === 'number' ? this.formatCurrency(value) : value}`
    );
    return `계산 결과:\n${lines.join('\n')}`;
  }

  /**
   * Build response generation prompt
   */
  private buildResponsePrompt(
    originalQuery: string,
    intent: QueryIntent,
    context: string,
    calculationSummary: string
  ): string {
    // Add period-specific guidance if user asked for a specific month
    const periodGuidance = intent.filters.period
      ? `
⚠️ 중요 지침 (반드시 따르세요):
사용자가 "${this.formatPeriodDisplay(intent.filters.period)}" 데이터만 요청했습니다.

1. "📊 ${this.formatPeriodDisplay(intent.filters.period)} 상세 데이터" 섹션에서 해당 월의 값을 찾아 사용하세요
2. "월 커미션", "월 수입" 등 "월"로 시작하는 값을 사용하세요
3. "(누적합계)", "(누적)" 표시가 있는 값은 연간 누적치이므로 절대 사용하지 마세요
4. 해당 월 데이터가 0원이면 정확히 "0원"이라고 답변하세요
5. "총 커미션" 같은 합계 값이 아닌 "월 커미션" 값을 사용하세요

예시: 11월 커미션을 물으면 "월 커미션: 0원"이 있으면 "0원"이라고 답변해야 합니다.
`
      : '';

    return `당신은 보험 설계사를 위한 급여 및 실적 관리 AI 어시스턴트입니다.

사용자 질문: "${originalQuery}"

질문 분석:
- 의도: ${this.getIntentDescription(intent.intent)}
- 템플릿: ${intent.template}
- 조회 필드: ${intent.fields.join(', ') || '일반 조회'}
- 조회 기간: ${intent.filters.period ? this.formatPeriodDisplay(intent.filters.period) : '전체'}
- 신뢰도: ${(intent.confidence * 100).toFixed(0)}%

검색된 관련 정보:
${context}
${calculationSummary ? `\n${calculationSummary}` : ''}
${periodGuidance}
답변 지침:
1. 정확성: 검색된 정보와 계산 결과만 사용하세요
2. 기간 일치: 사용자가 특정 월을 물어보면 해당 월의 데이터만 사용하세요
3. 구체성: 구체적인 숫자와 금액을 명시하세요
4. 친절함: 존댓말을 사용하고 이해하기 쉽게 설명하세요
5. 실용성: 필요시 조언이나 다음 단계를 제안하세요
6. 형식: 순수 텍스트만 사용하고 마크다운 기호는 사용하지 마세요

답변을 시작하세요:`;
  }

  /**
   * Get Korean description of intent
   */
  private getIntentDescription(intent: QueryIntentType): string {
    const descriptions: Record<QueryIntentType, string> = {
      direct_lookup: '단순 조회',
      calculation: '계산 요청',
      comparison: '비교 분석',
      aggregation: '집계/합산',
      general_qa: '일반 질의',
    };
    return descriptions[intent] || intent;
  }

  /**
   * Generate no results response
   */
  private generateNoResultsResponse(query: string, intent: QueryIntent): string {
    const suggestions = this.getSuggestions(intent);

    return `안녕하세요.

질문하신 "${query}"에 대한 정보를 찾을 수 없습니다.

다음과 같이 질문해 보세요:
${suggestions.map((s) => `• ${s}`).join('\n')}

무엇을 도와드릴까요?`;
  }

  /**
   * Generate low relevance response
   */
  private generateLowRelevanceResponse(
    query: string,
    intent: QueryIntent,
    maxScore: number
  ): string {
    return `안녕하세요.

질문하신 "${query}"와 관련된 정확한 정보를 찾기 어렵습니다.
(관련도: ${(maxScore * 100).toFixed(0)}%)

더 구체적인 질문을 해주시면 정확한 답변을 드릴 수 있습니다.

예시:
• "이번 달 최종지급액 알려줘"
• "MDRT까지 얼마 남았어?"
• "지난달 환수금 내역"

무엇을 도와드릴까요?`;
  }

  /**
   * Get suggestions based on intent
   */
  private getSuggestions(intent: QueryIntent): string[] {
    if (intent.template === 'compensation') {
      return [
        '이번 달 최종지급액은?',
        '지난달 커미션 내역',
        '환수금 현황',
        '보험사별 계약 현황',
      ];
    }

    if (intent.template === 'mdrt') {
      return [
        'MDRT까지 얼마 남았어?',
        'FYC 진행률',
        'AGI 누적 현황',
        '월별 실적 비교',
      ];
    }

    return [
      '급여 현황 알려줘',
      '계약 건수가 몇 개야?',
      '최근 실적 조회',
      '환수 내역 확인',
    ];
  }

  /**
   * Format currency for display
   */
  private formatCurrency(value: unknown): string {
    const num = Number(value);
    if (isNaN(num)) return String(value);

    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(num);
  }
}

export const enhancedRAGService = new EnhancedRAGService();
