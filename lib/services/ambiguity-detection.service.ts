/**
 * Ambiguity Detection Service
 *
 * Detects when user queries could match multiple document types
 * and triggers clarification flows to disambiguate.
 */

import { db } from '@/lib/db';
import { ambiguousKeywordRules, type ClarificationOption } from '@/lib/db/schema/ambiguity-rules';
import { eq, desc } from 'drizzle-orm';
import {
  type AmbiguousKeywordMatch,
  type ResultAmbiguityAnalysis,
  type AmbiguityDetectionResult,
  type SearchResultWithSource,
  type AmbiguityDetectionConfig,
  type ClarificationResponse,
  DEFAULT_AMBIGUITY_CONFIG,
  EXPLICIT_TEMPLATE_TRIGGERS,
  getExplicitTemplate,
} from '@/lib/types/ambiguity-detection';
import type { TemplateType } from '@/lib/ai/query-intent';

/**
 * Cached rule structure
 */
interface CachedRule {
  id: string;
  keywords: string[];
  competingTemplates: string[];
  clarificationQuestion: string;
  options: ClarificationOption[];
  scoreThreshold: number;
  priority: number;
}

class AmbiguityDetectionService {
  private rulesCache: CachedRule[] | null = null;
  private rulesCacheTime: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Main entry point: Detect ambiguity in a query
   */
  async detectAmbiguity(
    query: string,
    searchResults?: SearchResultWithSource[],
    config: Partial<AmbiguityDetectionConfig> = {}
  ): Promise<AmbiguityDetectionResult> {
    const fullConfig = { ...DEFAULT_AMBIGUITY_CONFIG, ...config };

    // Step 1: Check for explicit template triggers (bypasses ambiguity)
    const explicitTemplate = getExplicitTemplate(query);
    if (explicitTemplate) {
      console.log(`[Ambiguity] Explicit template trigger found: ${explicitTemplate}`);
      return {
        needsClarification: false,
        reason: 'none',
        keywordAnalysis: {
          hasAmbiguousKeywords: false,
          matchedKeywords: [],
          competingTemplates: [],
        },
      };
    }

    // Step 2: Check for ambiguous keywords
    const keywordAnalysis = fullConfig.checkKeywordsBeforeSearch
      ? await this.checkAmbiguousKeywords(query)
      : { hasAmbiguousKeywords: false, matchedKeywords: [], competingTemplates: [] };

    // Step 3: Analyze search results if provided
    let resultAnalysis: ResultAmbiguityAnalysis | undefined;
    if (searchResults && fullConfig.analyzeResultDistribution) {
      resultAnalysis = this.analyzeResultDistribution(
        searchResults,
        fullConfig.scoreThreshold,
        fullConfig.minResultsPerType
      );
    }

    // Step 4: Determine if clarification is needed
    const needsClarification = this.shouldTriggerClarification(
      keywordAnalysis,
      resultAnalysis,
      fullConfig
    );

    // Step 5: Build clarification if needed
    let clarification: AmbiguityDetectionResult['clarification'];
    if (needsClarification) {
      clarification = this.buildClarification(query, keywordAnalysis, resultAnalysis);
    }

    // Determine reason
    let reason: AmbiguityDetectionResult['reason'] = 'none';
    if (keywordAnalysis.hasAmbiguousKeywords && resultAnalysis?.isAmbiguous) {
      reason = 'both';
    } else if (keywordAnalysis.hasAmbiguousKeywords) {
      reason = 'keyword_match';
    } else if (resultAnalysis?.isAmbiguous) {
      reason = 'result_distribution';
    }

    return {
      needsClarification,
      reason,
      keywordAnalysis,
      resultAnalysis,
      clarification,
    };
  }

  /**
   * Check if query contains ambiguous keywords
   */
  async checkAmbiguousKeywords(query: string): Promise<AmbiguousKeywordMatch> {
    const rules = await this.getRules();
    const normalizedQuery = query.toLowerCase();

    for (const rule of rules) {
      const matchedKeywords = rule.keywords.filter(keyword =>
        normalizedQuery.includes(keyword.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        console.log(`[Ambiguity] Matched keywords: ${matchedKeywords.join(', ')} from rule ${rule.id}`);
        return {
          hasAmbiguousKeywords: true,
          matchedKeywords,
          competingTemplates: rule.competingTemplates,
          ruleId: rule.id,
          clarificationQuestion: rule.clarificationQuestion,
          options: rule.options,
          scoreThreshold: rule.scoreThreshold,
        };
      }
    }

    return {
      hasAmbiguousKeywords: false,
      matchedKeywords: [],
      competingTemplates: [],
    };
  }

  /**
   * Analyze search result distribution across document types
   */
  analyzeResultDistribution(
    results: SearchResultWithSource[],
    scoreThreshold: number = 0.15,
    minResultsPerType: number = 2
  ): ResultAmbiguityAnalysis {
    // Group results by document/metadata type
    const byType = new Map<string, { scores: number[]; count: number }>();

    for (const result of results) {
      const type = result.metadata?.metadataType || result.metadata?.documentType || 'unknown';
      if (!byType.has(type)) {
        byType.set(type, { scores: [], count: 0 });
      }
      const entry = byType.get(type)!;
      entry.scores.push(result.score);
      entry.count++;
    }

    // Calculate statistics per type
    const scoresByType: ResultAmbiguityAnalysis['scoresByType'] = {};
    const typeStats: Array<{ type: string; topScore: number; count: number; avgScore: number }> = [];

    for (const [type, data] of byType.entries()) {
      const topScore = Math.max(...data.scores);
      const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      scoresByType[type] = { topScore, count: data.count, avgScore };
      typeStats.push({ type, topScore, count: data.count, avgScore });
    }

    // Sort by top score descending
    typeStats.sort((a, b) => b.topScore - a.topScore);

    // Determine if ambiguous
    const documentTypes = typeStats.map(t => t.type);
    let isAmbiguous = false;
    let competingTypes: string[] | undefined;
    let scoreRatio: number | undefined;
    let dominantType: string | undefined;

    if (typeStats.length >= 2) {
      const [first, second] = typeStats;
      scoreRatio = second.topScore / first.topScore;

      // Check if both have enough results and close scores
      if (
        first.count >= minResultsPerType &&
        second.count >= minResultsPerType &&
        scoreRatio >= (1 - scoreThreshold)  // Within threshold (e.g., 85% = 1 - 0.15)
      ) {
        isAmbiguous = true;
        competingTypes = [first.type, second.type];
        console.log(`[Ambiguity] Result distribution ambiguous: ${first.type} (${first.topScore.toFixed(3)}) vs ${second.type} (${second.topScore.toFixed(3)}), ratio: ${scoreRatio.toFixed(3)}`);
      } else {
        dominantType = first.type;
      }
    } else if (typeStats.length === 1) {
      dominantType = typeStats[0].type;
    }

    return {
      isAmbiguous,
      documentTypes,
      scoresByType,
      competingTypes,
      dominantType,
      scoreRatio,
    };
  }

  /**
   * Determine if clarification should be triggered
   */
  private shouldTriggerClarification(
    keywordAnalysis: AmbiguousKeywordMatch,
    resultAnalysis: ResultAmbiguityAnalysis | undefined,
    config: AmbiguityDetectionConfig
  ): boolean {
    // If keywords indicate ambiguity
    if (keywordAnalysis.hasAmbiguousKeywords) {
      // If we also have result analysis, check if results confirm the ambiguity
      if (resultAnalysis) {
        // Keywords matched AND results are from competing types
        const keywordTemplates = new Set(keywordAnalysis.competingTemplates);
        const resultTypes = resultAnalysis.documentTypes;

        // Map result metadata types to templates
        const typeToTemplateMap: Record<string, string> = {
          'employee': 'compensation',
          'mdrt': 'mdrt',
          'generic': 'general',
        };

        const resultTemplates = resultTypes.map(t => typeToTemplateMap[t] || t);
        const hasCompetingResults = resultTemplates.some(t => keywordTemplates.has(t));

        if (hasCompetingResults && resultAnalysis.isAmbiguous) {
          return true;
        }

        // If results clearly favor one type, don't clarify
        if (resultAnalysis.dominantType && !resultAnalysis.isAmbiguous) {
          return false;
        }
      }

      // Keywords ambiguous but no result analysis - clarify to be safe
      return true;
    }

    // No keyword ambiguity but results are ambiguous
    if (resultAnalysis?.isAmbiguous) {
      return true;
    }

    return false;
  }

  /**
   * Build clarification question and options
   */
  private buildClarification(
    query: string,
    keywordAnalysis: AmbiguousKeywordMatch,
    resultAnalysis?: ResultAmbiguityAnalysis
  ): AmbiguityDetectionResult['clarification'] {
    // Use rule-defined clarification if available
    if (keywordAnalysis.clarificationQuestion && keywordAnalysis.options?.length) {
      return {
        question: keywordAnalysis.clarificationQuestion,
        options: keywordAnalysis.options,
        originalQuery: query,
      };
    }

    // Build dynamic clarification from result analysis
    if (resultAnalysis?.competingTypes) {
      const options: ClarificationOption[] = resultAnalysis.competingTypes.map(type => {
        const templateMap: Record<string, { label: string; description: string; template: string }> = {
          'employee': {
            label: '급여/실수령액',
            description: '이번달 실제 받은 금액',
            template: 'compensation',
          },
          'mdrt': {
            label: 'MDRT 달성현황',
            description: 'FYC/AGI 누적 실적',
            template: 'mdrt',
          },
          'generic': {
            label: '일반 문서',
            description: '회사 정책, 규정 등',
            template: 'general',
          },
        };

        const mapping = templateMap[type] || {
          label: type,
          description: type,
          template: type,
        };

        return {
          label: mapping.label,
          description: mapping.description,
          template: mapping.template,
          metadataType: type,
        };
      });

      return {
        question: '어떤 정보가 필요하신가요?',
        options,
        originalQuery: query,
      };
    }

    // Fallback generic clarification
    return {
      question: '더 구체적으로 알려주시겠어요?',
      options: [
        { label: '급여/수당', description: '급여 명세 관련', template: 'compensation' },
        { label: 'MDRT 실적', description: 'MDRT 달성 현황', template: 'mdrt' },
      ],
      originalQuery: query,
    };
  }

  /**
   * Parse user's clarification response
   */
  parseClarificationResponse(
    response: string,
    options: ClarificationOption[]
  ): ClarificationResponse | null {
    const normalized = response.trim().toLowerCase();

    // Check for number selection (1, 2, 3, etc.)
    const numberMatch = normalized.match(/^[1-9]$/);
    if (numberMatch) {
      const index = parseInt(numberMatch[0]) - 1;
      if (index >= 0 && index < options.length) {
        const selected = options[index];
        return {
          selectedIndex: index + 1,
          selectedTemplate: selected.template as TemplateType,
          selectedMetadataType: selected.metadataType,
          rawResponse: response,
        };
      }
    }

    // Check for emoji number selection (1️⃣, 2️⃣, etc.)
    const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    for (let i = 0; i < emojiNumbers.length; i++) {
      if (response.includes(emojiNumbers[i]) && i < options.length) {
        const selected = options[i];
        return {
          selectedIndex: i + 1,
          selectedTemplate: selected.template as TemplateType,
          selectedMetadataType: selected.metadataType,
          rawResponse: response,
        };
      }
    }

    // Check for label match
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      if (
        normalized.includes(option.label.toLowerCase()) ||
        normalized.includes(option.template.toLowerCase())
      ) {
        return {
          selectedIndex: i + 1,
          selectedTemplate: option.template as TemplateType,
          selectedMetadataType: option.metadataType,
          rawResponse: response,
        };
      }
    }

    // Check for template-specific keywords
    for (const [template, triggers] of Object.entries(EXPLICIT_TEMPLATE_TRIGGERS)) {
      for (const trigger of triggers) {
        if (normalized.includes(trigger.toLowerCase())) {
          const matchingOption = options.find(o => o.template === template);
          if (matchingOption) {
            const index = options.indexOf(matchingOption);
            return {
              selectedIndex: index + 1,
              selectedTemplate: template as TemplateType,
              selectedMetadataType: matchingOption.metadataType,
              rawResponse: response,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Format clarification message for display
   */
  formatClarificationMessage(clarification: AmbiguityDetectionResult['clarification']): string {
    if (!clarification) return '';

    const { question, options } = clarification;
    const optionLines = options.map((opt, idx) =>
      `${idx + 1}️⃣ ${opt.label} (${opt.description})`
    );

    return `${question}\n\n${optionLines.join('\n')}\n\n번호로 답변해 주세요.`;
  }

  /**
   * Get rules from database with caching
   */
  private async getRules(): Promise<CachedRule[]> {
    const now = Date.now();

    if (this.rulesCache && (now - this.rulesCacheTime) < this.CACHE_TTL_MS) {
      return this.rulesCache;
    }

    try {
      const rules = await db
        .select()
        .from(ambiguousKeywordRules)
        .where(eq(ambiguousKeywordRules.isActive, true))
        .orderBy(desc(ambiguousKeywordRules.priority));

      this.rulesCache = rules.map(rule => ({
        id: rule.id,
        keywords: rule.keywords,
        competingTemplates: rule.competingTemplates,
        clarificationQuestion: rule.clarificationQuestion,
        options: rule.options,
        scoreThreshold: parseFloat(rule.scoreThreshold || '0.85'),
        priority: rule.priority,
      }));

      this.rulesCacheTime = now;

      console.log(`[Ambiguity] Loaded ${this.rulesCache.length} rules from database`);
      return this.rulesCache;
    } catch (error) {
      console.error('[Ambiguity] Failed to load rules:', error);
      // Return empty array on error, will retry on next call
      return [];
    }
  }

  /**
   * Clear the rules cache (for testing or after updates)
   */
  clearCache(): void {
    this.rulesCache = null;
    this.rulesCacheTime = 0;
  }

  /**
   * Add a new rule (for admin use)
   */
  async addRule(rule: {
    keywords: string[];
    competingTemplates: string[];
    clarificationQuestion: string;
    options: ClarificationOption[];
    scoreThreshold?: number;
    priority?: number;
  }): Promise<string> {
    const [inserted] = await db
      .insert(ambiguousKeywordRules)
      .values({
        keywords: rule.keywords,
        competingTemplates: rule.competingTemplates,
        clarificationQuestion: rule.clarificationQuestion,
        options: rule.options,
        scoreThreshold: String(rule.scoreThreshold || 0.85),
        priority: rule.priority || 0,
        isActive: true,
      })
      .returning({ id: ambiguousKeywordRules.id });

    this.clearCache();
    return inserted.id;
  }
}

// Export singleton instance
export const ambiguityDetectionService = new AmbiguityDetectionService();
