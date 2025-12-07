/**
 * Namespace Strategy Service
 *
 * Determines optimal namespace search strategies based on
 * query intent and context. Applies score weights to
 * prioritize results from relevant namespaces.
 */

import type { QueryIntent, QueryIntentType } from '@/lib/ai/query-intent';
import type { SearchResult } from './pinecone.service';

/**
 * Namespace search strategy
 */
export interface NamespaceSearchStrategy {
  namespaces: string[];
  weights: Record<string, number>;
  fallbackOrder: string[];
  searchSequentially: boolean;
  description: string;
}

/**
 * Query context for strategy selection
 */
export interface StrategyContext {
  employeeId?: string;
  organizationId?: string;
  categoryId?: string;
  includePublic?: boolean;
}

/**
 * Weighted search result
 */
export interface WeightedSearchResult extends SearchResult {
  originalScore: number;
  weightedScore: number;
  sourceNamespace: string;
  namespaceType: 'employee' | 'organization' | 'public';
}

/**
 * Namespace prefixes
 */
const NAMESPACE_PREFIXES = {
  employee: 'emp_',
  organization: 'org_',
  public: 'public',
} as const;

/**
 * Default weights by namespace type
 */
const DEFAULT_WEIGHTS = {
  employee: 1.5,     // Personal data is most relevant
  organization: 1.0, // Org data is baseline
  public: 0.8,       // Public data is less specific
} as const;

/**
 * Intent-specific strategy configurations
 */
const INTENT_STRATEGIES: Record<QueryIntentType, {
  priorityOrder: Array<'employee' | 'organization' | 'public'>;
  weights: Record<string, number>;
  requiresEmployee: boolean;
  description: string;
}> = {
  direct_lookup: {
    priorityOrder: ['employee', 'organization', 'public'],
    weights: { employee: 1.5, organization: 1.0, public: 0.7 },
    requiresEmployee: true,
    description: '개인 데이터 우선 조회',
  },
  calculation: {
    priorityOrder: ['employee'],
    weights: { employee: 1.0 },
    requiresEmployee: true,
    description: '개인 데이터만 사용한 계산',
  },
  comparison: {
    priorityOrder: ['employee', 'organization'],
    weights: { employee: 1.3, organization: 1.0 },
    requiresEmployee: true,
    description: '개인/조직 데이터 비교',
  },
  aggregation: {
    priorityOrder: ['employee', 'organization'],
    weights: { employee: 1.2, organization: 1.0 },
    requiresEmployee: true,
    description: '개인/조직 데이터 집계',
  },
  general_qa: {
    priorityOrder: ['public', 'organization', 'employee'],
    weights: { public: 1.2, organization: 1.0, employee: 0.8 },
    requiresEmployee: false,
    description: '일반 정보 조회 (공개 우선)',
  },
};

class NamespaceStrategyService {
  /**
   * Get optimal search strategy based on intent
   */
  getStrategy(intent: QueryIntent, context: StrategyContext): NamespaceSearchStrategy {
    const intentConfig = INTENT_STRATEGIES[intent.intent] || INTENT_STRATEGIES.general_qa;
    const namespaces: string[] = [];
    const weights: Record<string, number> = {};
    const fallbackOrder: string[] = [];

    // Build namespace list based on priority order and context
    for (const nsType of intentConfig.priorityOrder) {
      const namespace = this.resolveNamespace(nsType, context);
      if (namespace) {
        namespaces.push(namespace);
        weights[namespace] = intentConfig.weights[nsType] || DEFAULT_WEIGHTS[nsType];
        fallbackOrder.push(namespace);
      }
    }

    // Always include public namespace if requested (unless calculation)
    if (
      context.includePublic !== false &&
      intent.intent !== 'calculation' &&
      !namespaces.includes(NAMESPACE_PREFIXES.public)
    ) {
      namespaces.push(NAMESPACE_PREFIXES.public);
      weights[NAMESPACE_PREFIXES.public] = intentConfig.weights.public || DEFAULT_WEIGHTS.public;
      fallbackOrder.push(NAMESPACE_PREFIXES.public);
    }

    // Determine if sequential search is needed
    const searchSequentially = intent.intent === 'calculation' || namespaces.length === 1;

    return {
      namespaces,
      weights,
      fallbackOrder,
      searchSequentially,
      description: intentConfig.description,
    };
  }

  /**
   * Get strategy for unknown/low-confidence queries
   */
  getDefaultStrategy(context: StrategyContext): NamespaceSearchStrategy {
    const namespaces: string[] = [];
    const weights: Record<string, number> = {};

    // Include all available namespaces with balanced weights
    if (context.employeeId) {
      const empNs = `${NAMESPACE_PREFIXES.employee}${context.employeeId}`;
      namespaces.push(empNs);
      weights[empNs] = 1.2;
    }

    if (context.organizationId || context.categoryId) {
      const orgNs = `${NAMESPACE_PREFIXES.organization}${context.categoryId || context.organizationId}`;
      namespaces.push(orgNs);
      weights[orgNs] = 1.0;
    }

    // Always include public
    namespaces.push(NAMESPACE_PREFIXES.public);
    weights[NAMESPACE_PREFIXES.public] = 0.9;

    return {
      namespaces,
      weights,
      fallbackOrder: namespaces,
      searchSequentially: false,
      description: '기본 전략 (모든 네임스페이스 검색)',
    };
  }

  /**
   * Apply weights to search results
   */
  applyWeights(
    results: SearchResult[],
    namespace: string,
    strategy: NamespaceSearchStrategy
  ): WeightedSearchResult[] {
    const weight = strategy.weights[namespace] || 1.0;
    const nsType = this.getNamespaceType(namespace);

    return results.map((result) => ({
      ...result,
      originalScore: result.score,
      weightedScore: result.score * weight,
      sourceNamespace: namespace,
      namespaceType: nsType,
    }));
  }

  /**
   * Merge and rank results from multiple namespaces
   */
  mergeAndRankResults(
    resultsByNamespace: Map<string, SearchResult[]>,
    strategy: NamespaceSearchStrategy,
    topK: number = 10
  ): WeightedSearchResult[] {
    const allResults: WeightedSearchResult[] = [];

    for (const [namespace, results] of resultsByNamespace.entries()) {
      const weighted = this.applyWeights(results, namespace, strategy);
      allResults.push(...weighted);
    }

    // Sort by weighted score (descending)
    allResults.sort((a, b) => b.weightedScore - a.weightedScore);

    // Deduplicate by content hash if available
    const seen = new Set<string>();
    const deduplicated: WeightedSearchResult[] = [];

    for (const result of allResults) {
      const key = result.metadata?.contentHash || result.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(result);
      }

      if (deduplicated.length >= topK) break;
    }

    return deduplicated;
  }

  /**
   * Get results with fallback strategy
   */
  async searchWithFallback(
    searchFn: (namespace: string) => Promise<SearchResult[]>,
    strategy: NamespaceSearchStrategy,
    minResults: number = 3
  ): Promise<WeightedSearchResult[]> {
    const allResults: WeightedSearchResult[] = [];

    if (strategy.searchSequentially) {
      // Search namespaces one by one until we have enough results
      for (const namespace of strategy.fallbackOrder) {
        const results = await searchFn(namespace);
        const weighted = this.applyWeights(results, namespace, strategy);
        allResults.push(...weighted);

        if (allResults.length >= minResults) break;
      }
    } else {
      // Search all namespaces in parallel
      const resultsByNamespace = new Map<string, SearchResult[]>();

      await Promise.all(
        strategy.namespaces.map(async (namespace) => {
          const results = await searchFn(namespace);
          resultsByNamespace.set(namespace, results);
        })
      );

      for (const [namespace, results] of resultsByNamespace.entries()) {
        const weighted = this.applyWeights(results, namespace, strategy);
        allResults.push(...weighted);
      }
    }

    // Sort and return
    return allResults.sort((a, b) => b.weightedScore - a.weightedScore);
  }

  /**
   * Check if strategy requires employee context
   */
  requiresEmployeeContext(intent: QueryIntentType): boolean {
    const config = INTENT_STRATEGIES[intent];
    return config?.requiresEmployee ?? false;
  }

  /**
   * Get namespace type from namespace string
   */
  getNamespaceType(namespace: string): 'employee' | 'organization' | 'public' {
    if (namespace.startsWith(NAMESPACE_PREFIXES.employee)) return 'employee';
    if (namespace.startsWith(NAMESPACE_PREFIXES.organization)) return 'organization';
    return 'public';
  }

  /**
   * Resolve namespace string from type and context
   */
  private resolveNamespace(
    type: 'employee' | 'organization' | 'public',
    context: StrategyContext
  ): string | null {
    switch (type) {
      case 'employee':
        return context.employeeId
          ? `${NAMESPACE_PREFIXES.employee}${context.employeeId}`
          : null;

      case 'organization':
        const id = context.categoryId || context.organizationId;
        return id ? `${NAMESPACE_PREFIXES.organization}${id}` : null;

      case 'public':
        return NAMESPACE_PREFIXES.public;

      default:
        return null;
    }
  }

  /**
   * Get human-readable description for namespace
   */
  getNamespaceDescription(namespace: string): string {
    const type = this.getNamespaceType(namespace);
    const descriptions = {
      employee: '개인 데이터',
      organization: '조직 데이터',
      public: '공개 데이터',
    };
    return descriptions[type];
  }

  /**
   * Analyze result distribution by namespace
   */
  analyzeResultDistribution(
    results: WeightedSearchResult[]
  ): Record<string, { count: number; avgScore: number; avgWeightedScore: number }> {
    const distribution: Record<
      string,
      { count: number; totalScore: number; totalWeightedScore: number }
    > = {};

    for (const result of results) {
      if (!distribution[result.sourceNamespace]) {
        distribution[result.sourceNamespace] = {
          count: 0,
          totalScore: 0,
          totalWeightedScore: 0,
        };
      }

      const stats = distribution[result.sourceNamespace];
      stats.count++;
      stats.totalScore += result.originalScore;
      stats.totalWeightedScore += result.weightedScore;
    }

    const analysis: Record<
      string,
      { count: number; avgScore: number; avgWeightedScore: number }
    > = {};

    for (const [ns, stats] of Object.entries(distribution)) {
      analysis[ns] = {
        count: stats.count,
        avgScore: stats.totalScore / stats.count,
        avgWeightedScore: stats.totalWeightedScore / stats.count,
      };
    }

    return analysis;
  }
}

// Export singleton instance
export const namespaceStrategyService = new NamespaceStrategyService();

// Export types
export type { NamespaceStrategyService };
