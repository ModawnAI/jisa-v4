/**
 * Query Understanding Service
 *
 * Uses Gemini Flash to parse informal Korean queries
 * into structured QueryIntent objects for the RAG system.
 */

import { GoogleGenAI } from '@google/genai';
import {
  QueryIntent,
  QueryIntentType,
  TemplateType,
  CalculationType,
  MDRT_STANDARDS,
} from '@/lib/ai/query-intent';
import {
  buildQueryUnderstandingPrompt,
  FALLBACK_STATIC_PROMPT,
} from '@/lib/ai/prompts/query-understanding';
import { ragSchemaRegistryService } from './rag-schema-registry.service';
import type { RagTemplateSchema, ParsedIntentLog } from '@/lib/db/schema/rag-schema';
import {
  normalizePeriod as normalizePeriodUtil,
  getCurrentPeriod as getCurrentPeriodUtil,
} from '@/lib/utils/period';

// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Default configuration
const DEFAULT_CONFIG = {
  model: 'gemini-flash-latest',
  maxRetries: 2,
};

export interface QueryUnderstandingContext {
  employeeId?: string;
  sessionId?: string;
  previousQueries?: string[];
  currentPeriod?: string;
  availableNamespaces?: string[];
}

export interface QueryUnderstandingResult {
  intent: QueryIntent;
  processingTimeMs: number;
  modelUsed: string;
  schemasUsed: string[];
}

export class QueryUnderstandingService {
  private cachedSchemas: RagTemplateSchema[] | null = null;
  private schemaCacheTime: number = 0;
  private readonly SCHEMA_CACHE_TTL = 60000; // 1 minute

  /**
   * Analyze a user query and return structured intent
   */
  async analyzeQuery(
    userQuery: string,
    context: QueryUnderstandingContext = {}
  ): Promise<QueryUnderstandingResult> {
    const startTime = Date.now();

    // Get current schemas (cached)
    const schemas = await this.getSchemas();

    // Build the dynamic prompt
    const prompt = schemas.length > 0
      ? buildQueryUnderstandingPrompt(userQuery, schemas, {
          previousQueries: context.previousQueries,
          currentPeriod: context.currentPeriod || this.getCurrentPeriod(),
          availableNamespaces: context.availableNamespaces,
        })
      : `${FALLBACK_STATIC_PROMPT}\n\n사용자 질문: "${userQuery}"`;

    // Call Gemini Flash
    let parsedIntent: QueryIntent;
    let retries = 0;

    while (retries <= DEFAULT_CONFIG.maxRetries) {
      try {
        const contents = [
          {
            role: 'user' as const,
            parts: [{ text: prompt }],
          },
        ];

        const config = {
          responseMimeType: 'application/json',
        };

        const response = await ai.models.generateContent({
          model: DEFAULT_CONFIG.model,
          config,
          contents,
        });

        const responseText = response.text || '';

        // Parse the JSON response
        parsedIntent = this.parseResponse(responseText, userQuery);
        break;
      } catch (error) {
        retries++;
        if (retries > DEFAULT_CONFIG.maxRetries) {
          console.error('[QueryUnderstanding] Failed after retries:', error);
          // Return a fallback intent
          parsedIntent = this.createFallbackIntent(userQuery);
        }
      }
    }

    const processingTimeMs = Date.now() - startTime;

    // Log the query for feedback
    await this.logQuery(userQuery, parsedIntent!, context, processingTimeMs);

    return {
      intent: parsedIntent!,
      processingTimeMs,
      modelUsed: DEFAULT_CONFIG.model,
      schemasUsed: schemas.map((s) => s.templateSlug),
    };
  }

  /**
   * Parse the LLM response into a QueryIntent
   */
  private parseResponse(responseText: string, originalQuery: string): QueryIntent {
    try {
      // Clean up the response (remove markdown code blocks if present)
      let cleanText = responseText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.slice(7);
      }
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.slice(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.slice(0, -3);
      }
      cleanText = cleanText.trim();

      const parsed = JSON.parse(cleanText);

      // Validate and normalize the response
      return this.normalizeIntent(parsed, originalQuery);
    } catch (error) {
      console.error('[QueryUnderstanding] Failed to parse response:', error);
      return this.createFallbackIntent(originalQuery);
    }
  }

  /**
   * Normalize and validate the parsed intent
   */
  private normalizeIntent(parsed: Record<string, unknown>, originalQuery: string): QueryIntent {
    const intent: QueryIntent = {
      intent: this.validateIntent(parsed.intent as string),
      template: this.validateTemplate(parsed.template as string),
      fields: Array.isArray(parsed.fields) ? parsed.fields : [],
      filters: this.normalizeFilters(parsed.filters as Record<string, unknown>),
      semanticSearch: this.normalizeSemanticSearch(
        parsed.semanticSearch as Record<string, unknown>,
        parsed.intent as string
      ),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      originalQuery,
    };

    // Add calculation if present
    if (parsed.calculation && typeof parsed.calculation === 'object') {
      const calc = parsed.calculation as Record<string, unknown>;
      if (calc.type) {
        intent.calculation = {
          type: calc.type as CalculationType,
          params: calc.params as Record<string, unknown>,
        };
      }
    }

    // Add extracted entities if present
    if (parsed.extractedEntities && typeof parsed.extractedEntities === 'object') {
      intent.extractedEntities = parsed.extractedEntities as Record<string, unknown>;
    }

    return intent;
  }

  /**
   * Validate intent type
   */
  private validateIntent(intent: string): QueryIntentType {
    const validIntents: QueryIntentType[] = [
      'direct_lookup',
      'calculation',
      'comparison',
      'aggregation',
      'general_qa',
    ];

    if (validIntents.includes(intent as QueryIntentType)) {
      return intent as QueryIntentType;
    }

    return 'general_qa';
  }

  /**
   * Validate template type
   */
  private validateTemplate(template: string): TemplateType {
    const validTemplates: TemplateType[] = ['compensation', 'mdrt', 'general'];

    if (validTemplates.includes(template as TemplateType)) {
      return template as TemplateType;
    }

    return 'general';
  }

  /**
   * Normalize filters
   */
  private normalizeFilters(filters: Record<string, unknown> | undefined): QueryIntent['filters'] {
    if (!filters || typeof filters !== 'object') {
      return {};
    }

    const normalized: QueryIntent['filters'] = {};

    // Process period
    if (filters.period) {
      normalized.period = this.normalizePeriod(filters.period as string);
    }

    // Copy other valid filters
    if (filters.metadataType) normalized.metadataType = String(filters.metadataType);
    if (filters.chunkType) normalized.chunkType = String(filters.chunkType);
    if (filters.company) normalized.company = String(filters.company);
    if (filters.category) normalized.category = String(filters.category);

    return normalized;
  }

  /**
   * Normalize period strings to YYYYMM format
   *
   * CRITICAL: Uses centralized period utility to ensure consistency
   * between query filters and stored data in Pinecone.
   *
   * @see lib/utils/period.ts for all supported formats
   */
  private normalizePeriod(period: string): string {
    // Use centralized period utility which returns YYYYMM format
    return normalizePeriodUtil(period);
  }

  /**
   * Normalize semantic search config
   */
  private normalizeSemanticSearch(
    config: Record<string, unknown> | undefined,
    intent: string
  ): QueryIntent['semanticSearch'] {
    const defaultTopK = this.getDefaultTopK(intent);

    if (!config || typeof config !== 'object') {
      return {
        enabled: intent === 'general_qa',
        topK: defaultTopK,
      };
    }

    return {
      enabled: config.enabled !== false,
      query: config.query as string | undefined,
      topK: typeof config.topK === 'number' ? config.topK : defaultTopK,
    };
  }

  /**
   * Get default topK based on intent
   */
  private getDefaultTopK(intent: string): number {
    switch (intent) {
      case 'direct_lookup':
        return 3;
      case 'calculation':
        return 5;
      case 'comparison':
        return 10;
      case 'aggregation':
        return 20;
      case 'general_qa':
      default:
        return 5;
    }
  }

  /**
   * Create a fallback intent when parsing fails
   */
  private createFallbackIntent(originalQuery: string): QueryIntent {
    return {
      intent: 'general_qa',
      template: 'general',
      fields: [],
      filters: {},
      semanticSearch: {
        enabled: true,
        query: originalQuery,
        topK: 5,
      },
      confidence: 0.3,
      originalQuery,
    };
  }

  /**
   * Get current period in YYYYMM format
   *
   * Uses centralized period utility for consistency.
   */
  private getCurrentPeriod(): string {
    return getCurrentPeriodUtil();
  }

  /**
   * Get schemas with caching
   */
  private async getSchemas(): Promise<RagTemplateSchema[]> {
    const now = Date.now();

    if (this.cachedSchemas && now - this.schemaCacheTime < this.SCHEMA_CACHE_TTL) {
      return this.cachedSchemas;
    }

    this.cachedSchemas = await ragSchemaRegistryService.getActiveSchemas();
    this.schemaCacheTime = now;

    return this.cachedSchemas;
  }

  /**
   * Log query for feedback and analysis
   */
  private async logQuery(
    originalQuery: string,
    intent: QueryIntent,
    context: QueryUnderstandingContext,
    processingTimeMs: number
  ): Promise<void> {
    try {
      const parsedIntentLog: ParsedIntentLog = {
        intent: intent.intent,
        template: intent.template,
        fields: intent.fields,
        calculation: intent.calculation,
        filters: intent.filters as Record<string, unknown>,
        semanticSearch: intent.semanticSearch,
        confidence: intent.confidence,
      };

      await ragSchemaRegistryService.logQueryIntent({
        originalQuery,
        parsedIntent: parsedIntentLog,
        templateUsed: intent.template,
        filtersApplied: intent.filters,
        calculationPerformed: intent.calculation?.type,
        successful: true,
        responseTimeMs: processingTimeMs,
        employeeId: context.employeeId,
        sessionId: context.sessionId,
        confidence: intent.confidence,
        wasAmbiguous: intent.confidence < 0.7,
      });
    } catch (error) {
      // Don't fail the main operation if logging fails
      console.error('[QueryUnderstanding] Failed to log query:', error);
    }
  }

  /**
   * Clear the schema cache
   */
  clearCache(): void {
    this.cachedSchemas = null;
    this.schemaCacheTime = 0;
  }
}

export const queryUnderstandingService = new QueryUnderstandingService();
