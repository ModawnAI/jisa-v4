/**
 * Schema Registry Service
 *
 * Dynamically discovers and manages RAG schemas based on
 * actual data in Pinecone.
 *
 * IMPORTANT: Schemas are NOT regenerated per query!
 * They are only updated when:
 * - Documents are uploaded
 * - Documents are deleted
 * - Manual refresh is triggered
 *
 * The pipeline state service coordinates schema updates and
 * blocks queries during regeneration.
 */

import { pineconeService, type VectorMetadata } from './pinecone.service';
import type { TemplateType, CalculationType } from '@/lib/ai/query-intent';
import { createEmbedding } from '@/lib/utils/embedding';
import { pipelineStateService } from './pipeline-state.service';

/**
 * Field definition discovered from metadata
 */
export interface DiscoveredField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array';
  description: string;
  displayName: string;
  examples: Array<string | number>;
  frequency: number; // How often this field appears (0-1)
}

/**
 * Calculation definition based on available fields
 */
export interface DiscoveredCalculation {
  type: CalculationType;
  name: string;
  description: string;
  requiredFields: string[];
  available: boolean;
}

/**
 * Dynamic schema discovered from Pinecone data
 */
export interface DynamicSchema {
  templateType: TemplateType | string;
  namespace: string;
  fields: DiscoveredField[];
  calculations: DiscoveredCalculation[];
  examples: string[];
  vectorCount: number;
  lastUpdated: Date;
  lastDiscoveredAt: Date;
}

/**
 * Schema discovery result
 */
export interface SchemaDiscoveryResult {
  schemas: DynamicSchema[];
  totalNamespaces: number;
  totalVectors: number;
  discoveryTimeMs: number;
}

/**
 * Cache entry with metadata
 */
interface CacheEntry {
  schemas: DynamicSchema[];
  cachedAt: Date;
  expiresAt: Date;
  namespaceHash: string;
}

// Field type inference rules
const TYPE_INFERENCE_RULES = [
  { pattern: /^\d{4}-\d{2}(-\d{2})?$/, type: 'date' as const },
  { pattern: /^\d+(\.\d+)?$/, type: 'number' as const },
  { pattern: /^(true|false)$/i, type: 'boolean' as const },
];

// Known field display names (Korean)
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  // Common fields
  period: '기간',
  employeeId: '직원 ID',
  employeeName: '직원명',
  documentId: '문서 ID',
  categoryId: '카테고리 ID',
  clearanceLevel: '보안등급',

  // Compensation fields
  totalCommission: '총 커미션',
  totalOverride: '총 오버라이드',
  totalIncentive: '총 인센티브',
  totalClawback: '총 환수금',
  finalPayment: '최종지급액',
  netPayment: '실수령액',
  contractCount: '계약건수',

  // MDRT fields
  fycAmount: 'FYC 금액',
  agiAmount: 'AGI 금액',
  fycMdrtProgress: 'FYC MDRT 진행률',
  agiMdrtProgress: 'AGI MDRT 진행률',

  // General fields
  title: '제목',
  content: '내용',
  summary: '요약',
  date: '날짜',
  type: '유형',
};

// Field descriptions
const FIELD_DESCRIPTIONS: Record<string, string> = {
  period: '데이터 기준 기간 (YYYY-MM 형식)',
  totalCommission: '월별 총 커미션 금액',
  totalOverride: '월별 총 오버라이드 금액',
  totalIncentive: '월별 총 인센티브 금액',
  finalPayment: '세금/공제 후 최종 지급액',
  fycAmount: '초년도 커미션 (First Year Commission)',
  agiAmount: '조정후 총소득 (Adjusted Gross Income)',
  clearanceLevel: '문서 접근 권한 수준 (basic/standard/advanced)',
};

// Default calculation definitions
const DEFAULT_CALCULATIONS: Record<TemplateType, DiscoveredCalculation[]> = {
  compensation: [
    {
      type: 'sum',
      name: '합계',
      description: '선택 기간의 합계 계산',
      requiredFields: ['totalCommission', 'totalOverride', 'totalIncentive'],
      available: true,
    },
    {
      type: 'period_diff',
      name: '기간비교',
      description: '두 기간 간 차이 계산',
      requiredFields: ['period', 'totalCommission'],
      available: true,
    },
    {
      type: 'average',
      name: '평균',
      description: '선택 기간의 평균 계산',
      requiredFields: ['totalCommission'],
      available: true,
    },
  ],
  mdrt: [
    {
      type: 'mdrt_gap',
      name: 'MDRT 갭',
      description: 'MDRT 달성까지 남은 금액',
      requiredFields: ['fycAmount', 'agiAmount'],
      available: true,
    },
    {
      type: 'percentage',
      name: '달성률',
      description: 'MDRT 달성률 계산',
      requiredFields: ['fycAmount', 'agiAmount'],
      available: true,
    },
  ],
  general: [
    {
      type: 'count',
      name: '카운트',
      description: '항목 수 계산',
      requiredFields: [],
      available: true,
    },
  ],
};

// Sampling size for schema discovery
const DISCOVERY_SAMPLE_SIZE = 100;

// Pre-generated prompt cache (never expires until explicitly invalidated)
interface GeneratedPromptCache {
  prompt: string;
  schemas: DynamicSchema[];
  generatedAt: Date;
  namespaceHash: string;
}

class SchemaRegistryService {
  private cache: Map<string, CacheEntry> = new Map();
  private promptCache: Map<string, GeneratedPromptCache> = new Map();
  private discoveryInProgress: Map<string, Promise<DynamicSchema[]>> = new Map();

  /**
   * Get active schemas for namespaces (returns cached only, does NOT regenerate)
   *
   * This method returns cached schemas immediately. If no cached schemas exist,
   * it returns an empty array. Use triggerSchemaUpdate() to regenerate.
   */
  async getActiveSchemas(namespaces: string[]): Promise<DynamicSchema[]> {
    const cacheKey = this.getCacheKey(namespaces);
    const cached = this.cache.get(cacheKey);

    // Return cached schemas (no TTL check - only invalidated on document changes)
    if (cached) {
      return cached.schemas;
    }

    // If no cached schemas, check if we need initial discovery
    // This only happens on first access after server start
    if (pipelineStateService.needsInitialUpdate(cacheKey)) {
      // Trigger initial update in background, return empty for now
      this.triggerSchemaUpdate(namespaces, 'initial').catch(console.error);
      return [];
    }

    return [];
  }

  /**
   * Get pre-generated prompt for namespaces (returns cached prompt)
   *
   * This is the primary method to use for query processing.
   * The prompt is pre-generated when documents are uploaded/deleted.
   */
  getPromptForNamespaces(namespaces: string[]): string | null {
    const cacheKey = this.getCacheKey(namespaces);
    const cached = this.promptCache.get(cacheKey);

    if (cached) {
      return cached.prompt;
    }

    // Check individual namespace prompts and combine
    const combinedSchemas: DynamicSchema[] = [];
    for (const ns of namespaces) {
      const nsCache = this.promptCache.get(ns);
      if (nsCache) {
        combinedSchemas.push(...nsCache.schemas);
      }
    }

    if (combinedSchemas.length > 0) {
      return this.buildPromptSection(combinedSchemas);
    }

    return null;
  }

  /**
   * Trigger schema update for namespaces
   * Called when documents are uploaded or deleted
   *
   * This is the ONLY way to regenerate schemas.
   */
  async triggerSchemaUpdate(
    namespaces: string[],
    reason: 'document_upload' | 'document_delete' | 'manual' | 'initial'
  ): Promise<void> {
    const cacheKey = this.getCacheKey(namespaces);

    // Check if already updating
    const inProgress = this.discoveryInProgress.get(cacheKey);
    if (inProgress) {
      console.log(`[SchemaRegistry] Update already in progress for ${cacheKey}`);
      return;
    }

    // Notify pipeline state service
    for (const ns of namespaces) {
      await pipelineStateService.requestUpdate(ns, reason === 'initial' ? 'manual' : reason);
    }

    console.log(`[SchemaRegistry] Starting schema update for ${cacheKey} (reason: ${reason})`);
    const startTime = Date.now();

    // Start discovery
    const discoveryPromise = this.discoverSchemas(namespaces);
    this.discoveryInProgress.set(cacheKey, discoveryPromise);

    try {
      const schemas = await discoveryPromise;

      // Cache schemas (no expiration - only invalidated on document changes)
      this.cache.set(cacheKey, {
        schemas,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year (effectively never)
        namespaceHash: this.hashNamespaces(namespaces),
      });

      // Pre-generate and cache the prompt
      const prompt = this.buildPromptSection(schemas);
      this.promptCache.set(cacheKey, {
        prompt,
        schemas,
        generatedAt: new Date(),
        namespaceHash: this.hashNamespaces(namespaces),
      });

      // Also cache individual namespace prompts
      for (const schema of schemas) {
        this.promptCache.set(schema.namespace, {
          prompt: this.buildPromptSection([schema]),
          schemas: [schema],
          generatedAt: new Date(),
          namespaceHash: schema.namespace,
        });
      }

      const duration = Date.now() - startTime;
      console.log(`[SchemaRegistry] Schema update completed for ${cacheKey} (${duration}ms, ${schemas.length} schemas)`);

      // Notify pipeline state service of completion
      for (const ns of namespaces) {
        pipelineStateService.completeUpdate(ns, true);
      }
    } catch (error) {
      console.error(`[SchemaRegistry] Schema update failed for ${cacheKey}:`, error);

      // Notify pipeline state service of failure
      for (const ns of namespaces) {
        pipelineStateService.completeUpdate(ns, false, String(error));
      }
    } finally {
      this.discoveryInProgress.delete(cacheKey);
    }
  }

  /**
   * Force refresh schemas (call after document upload/delete)
   * @deprecated Use triggerSchemaUpdate() instead for proper pipeline coordination
   */
  async refreshSchemas(namespaces: string[]): Promise<DynamicSchema[]> {
    await this.triggerSchemaUpdate(namespaces, 'manual');
    return this.getActiveSchemas(namespaces);
  }

  /**
   * Invalidate cache for specific namespaces
   * Called internally when document changes occur
   */
  invalidateCache(namespaces?: string[]): void {
    if (!namespaces) {
      this.cache.clear();
      this.promptCache.clear();
      return;
    }

    const cacheKey = this.getCacheKey(namespaces);
    this.cache.delete(cacheKey);
    this.promptCache.delete(cacheKey);

    // Also invalidate any cache entries that include these namespaces
    for (const [key] of this.cache.entries()) {
      for (const ns of namespaces) {
        if (key.includes(ns)) {
          this.cache.delete(key);
          this.promptCache.delete(key);
          break;
        }
      }
    }

    // Invalidate individual namespace caches
    for (const ns of namespaces) {
      this.cache.delete(ns);
      this.promptCache.delete(ns);
    }
  }

  /**
   * Check if schemas are ready for given namespaces
   */
  hasSchemas(namespaces: string[]): boolean {
    const cacheKey = this.getCacheKey(namespaces);
    return this.cache.has(cacheKey) || namespaces.every(ns => this.promptCache.has(ns));
  }

  /**
   * Get schema update status
   */
  getUpdateStatus(namespaces: string[]): {
    ready: boolean;
    hasSchemas: boolean;
    lastUpdated: Date | null;
    isUpdating: boolean;
  } {
    const cacheKey = this.getCacheKey(namespaces);
    const cached = this.cache.get(cacheKey);
    const isUpdating = this.discoveryInProgress.has(cacheKey);

    return {
      ready: !isUpdating && !!cached,
      hasSchemas: !!cached,
      lastUpdated: cached?.cachedAt || null,
      isUpdating,
    };
  }

  /**
   * Discover schemas from Pinecone metadata
   */
  private async discoverSchemas(namespaces: string[]): Promise<DynamicSchema[]> {
    const schemas: DynamicSchema[] = [];

    for (const namespace of namespaces) {
      try {
        const schema = await this.discoverNamespaceSchema(namespace);
        if (schema && schema.vectorCount > 0) {
          schemas.push(schema);
        }
      } catch (error) {
        console.error(`Failed to discover schema for namespace ${namespace}:`, error);
        // Continue with other namespaces
      }
    }

    return schemas;
  }

  /**
   * Discover schema for a single namespace
   */
  private async discoverNamespaceSchema(namespace: string): Promise<DynamicSchema | null> {
    // Get namespace stats
    const stats = await pineconeService.getNamespaceStats(namespace);
    if (stats.vectorCount === 0) {
      return null;
    }

    // Sample vectors to discover metadata structure
    const samples = await this.sampleVectors(namespace, DISCOVERY_SAMPLE_SIZE);
    if (samples.length === 0) {
      return null;
    }

    // Analyze metadata to discover fields
    const fields = this.discoverFieldsFromMetadata(samples);

    // Infer template type from namespace and fields
    const templateType = this.inferTemplateType(namespace, fields);

    // Get applicable calculations
    const calculations = this.getCalculationsForFields(templateType, fields);

    // Generate example queries
    const examples = this.generateExampleQueries(templateType, fields);

    return {
      templateType,
      namespace,
      fields,
      calculations,
      examples,
      vectorCount: stats.vectorCount,
      lastUpdated: this.getLatestUpdateTime(samples),
      lastDiscoveredAt: new Date(),
    };
  }

  /**
   * Sample vectors from a namespace using random embedding
   */
  private async sampleVectors(
    namespace: string,
    count: number
  ): Promise<VectorMetadata[]> {
    try {
      // Use a random embedding to get diverse samples
      const randomEmbedding = await this.getRandomEmbedding();

      const results = await pineconeService.query(namespace, randomEmbedding, {
        topK: count,
        includeMetadata: true,
      });

      return results
        .filter((r) => r.metadata)
        .map((r) => r.metadata as VectorMetadata);
    } catch (error) {
      console.error(`Failed to sample vectors from ${namespace}:`, error);
      return [];
    }
  }

  /**
   * Generate a random embedding for sampling
   */
  private async getRandomEmbedding(): Promise<number[]> {
    // Use a generic query to get samples
    const sampleQueries = [
      '최근 수수료 정보',
      'MDRT 달성 현황',
      '이번달 일정',
      '총 커미션 합계',
    ];
    const query = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
    return createEmbedding(query);
  }

  /**
   * Discover fields from sampled metadata
   */
  private discoverFieldsFromMetadata(samples: VectorMetadata[]): DiscoveredField[] {
    const fieldStats = new Map<string, {
      types: Set<string>;
      examples: Array<string | number>;
      count: number;
    }>();

    // Analyze all samples
    for (const sample of samples) {
      for (const [key, value] of Object.entries(sample)) {
        if (value === null || value === undefined) continue;

        // Skip internal fields
        if (['id', 'chunkIndex', 'contentHash', 'createdAt'].includes(key)) continue;

        if (!fieldStats.has(key)) {
          fieldStats.set(key, { types: new Set(), examples: [], count: 0 });
        }

        const stats = fieldStats.get(key)!;
        stats.count++;
        stats.types.add(this.inferFieldType(value));

        // Collect unique examples (up to 5)
        if (stats.examples.length < 5 && !stats.examples.includes(value as string | number)) {
          stats.examples.push(value as string | number);
        }
      }
    }

    // Convert to DiscoveredField array
    const fields: DiscoveredField[] = [];

    for (const [name, stats] of fieldStats.entries()) {
      const frequency = stats.count / samples.length;

      // Only include fields that appear in at least 10% of samples
      if (frequency < 0.1) continue;

      fields.push({
        name,
        type: this.resolveFieldType(stats.types),
        description: FIELD_DESCRIPTIONS[name] || `${name} 필드`,
        displayName: FIELD_DISPLAY_NAMES[name] || name,
        examples: stats.examples,
        frequency,
      });
    }

    // Sort by frequency (most common first)
    return fields.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Infer field type from value
   */
  private inferFieldType(value: unknown): string {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';

    const strValue = String(value);
    for (const { pattern, type } of TYPE_INFERENCE_RULES) {
      if (pattern.test(strValue)) return type;
    }

    return 'string';
  }

  /**
   * Resolve final field type from collected types
   */
  private resolveFieldType(types: Set<string>): DiscoveredField['type'] {
    if (types.size === 1) {
      const value = types.values().next().value;
      return (value as DiscoveredField['type']) || 'string';
    }

    // If mixed types, default to string
    if (types.has('string')) return 'string';
    if (types.has('number')) return 'number';

    return 'string';
  }

  /**
   * Infer template type from namespace and fields
   */
  private inferTemplateType(
    namespace: string,
    fields: DiscoveredField[]
  ): TemplateType | string {
    const fieldNames = fields.map((f) => f.name.toLowerCase());

    // Check for compensation indicators
    if (
      fieldNames.some((f) =>
        ['commission', 'override', 'incentive', 'payment', 'clawback'].some((k) =>
          f.includes(k)
        )
      )
    ) {
      return 'compensation';
    }

    // Check for MDRT indicators
    if (
      fieldNames.some((f) =>
        ['fyc', 'agi', 'mdrt', 'cot', 'tot'].some((k) => f.includes(k))
      )
    ) {
      return 'mdrt';
    }

    // Check namespace prefix for hints
    if (namespace.startsWith('org_') || namespace.startsWith('emp_')) {
      // Could be compensation or mdrt based on document category
      // Default to general if can't determine
    }

    return 'general';
  }

  /**
   * Get calculations available for discovered fields
   */
  private getCalculationsForFields(
    templateType: TemplateType | string,
    fields: DiscoveredField[]
  ): DiscoveredCalculation[] {
    const fieldNames = new Set(fields.map((f) => f.name));
    const baseCalculations = DEFAULT_CALCULATIONS[templateType as TemplateType] || DEFAULT_CALCULATIONS.general;

    return baseCalculations.map((calc) => ({
      ...calc,
      available: calc.requiredFields.every((f) => fieldNames.has(f)) || calc.requiredFields.length === 0,
    }));
  }

  /**
   * Generate example queries based on discovered schema
   */
  private generateExampleQueries(
    templateType: TemplateType | string,
    fields: DiscoveredField[]
  ): string[] {
    const examples: string[] = [];
    const numericFields = fields.filter((f) => f.type === 'number');
    const hasPeriod = fields.some((f) => f.name === 'period');

    switch (templateType) {
      case 'compensation':
        if (hasPeriod) {
          examples.push('이번달 수수료 알려줘');
          examples.push('지난달 커미션 얼마야?');
        }
        if (numericFields.length > 0) {
          examples.push(`${numericFields[0].displayName} 합계 알려줘`);
        }
        examples.push('올해 총 수입 얼마야?');
        break;

      case 'mdrt':
        examples.push('MDRT 달성률 알려줘');
        examples.push('COT까지 얼마 남았어?');
        examples.push('현재 FYC 금액이 얼마야?');
        break;

      default:
        examples.push('최근 정보 알려줘');
        if (hasPeriod) {
          examples.push('이번달 현황 보여줘');
        }
    }

    return examples.slice(0, 5);
  }

  /**
   * Get latest update time from samples
   */
  private getLatestUpdateTime(samples: VectorMetadata[]): Date {
    let latest = new Date(0);

    for (const sample of samples) {
      if (sample.createdAt) {
        const date = new Date(sample.createdAt);
        if (date > latest) {
          latest = date;
        }
      }
    }

    return latest.getTime() > 0 ? latest : new Date();
  }

  /**
   * Generate cache key from namespaces
   */
  private getCacheKey(namespaces: string[]): string {
    return namespaces.sort().join(',');
  }

  /**
   * Hash namespaces for comparison
   */
  private hashNamespaces(namespaces: string[]): string {
    return namespaces.sort().join('|');
  }

  /**
   * Check if cache entry is expired
   * Note: Schemas no longer expire based on TTL.
   * They are only invalidated when documents change.
   */
  private isCacheExpired(_entry: CacheEntry): boolean {
    // Schemas never expire based on time - only invalidated on document changes
    return false;
  }

  /**
   * Get all cached schemas info (for debugging)
   */
  getCacheInfo(): Array<{
    key: string;
    schemaCount: number;
    cachedAt: Date;
    expiresAt: Date;
    expired: boolean;
  }> {
    const info: Array<{
      key: string;
      schemaCount: number;
      cachedAt: Date;
      expiresAt: Date;
      expired: boolean;
    }> = [];

    for (const [key, entry] of this.cache.entries()) {
      info.push({
        key,
        schemaCount: entry.schemas.length,
        cachedAt: entry.cachedAt,
        expiresAt: entry.expiresAt,
        expired: this.isCacheExpired(entry),
      });
    }

    return info;
  }

  /**
   * Build prompt section from schemas
   */
  buildPromptSection(schemas: DynamicSchema[]): string {
    if (schemas.length === 0) {
      return '현재 사용 가능한 데이터가 없습니다.';
    }

    const sections = schemas.map((schema) => {
      const fieldList = schema.fields
        .slice(0, 10) // Limit to top 10 fields
        .map((f) => `  - ${f.displayName} (${f.name}): ${f.description}`)
        .join('\n');

      const calcList = schema.calculations
        .filter((c) => c.available)
        .map((c) => `  - ${c.name}: ${c.description}`)
        .join('\n');

      const exampleList = schema.examples
        .map((e) => `  - "${e}"`)
        .join('\n');

      return `## ${this.getTemplateDisplayName(schema.templateType)} 데이터 (${schema.vectorCount}개 벡터)

사용 가능한 필드:
${fieldList}

가능한 계산:
${calcList || '  (없음)'}

질문 예시:
${exampleList}`;
    });

    return sections.join('\n\n');
  }

  /**
   * Get display name for template type
   */
  private getTemplateDisplayName(templateType: TemplateType | string): string {
    const names: Record<string, string> = {
      compensation: '수수료/커미션',
      mdrt: 'MDRT 현황',
      general: '일반 정보',
    };
    return names[templateType] || templateType;
  }
}

// Export singleton instance
export const schemaRegistryService = new SchemaRegistryService();

// Export types
export type { SchemaRegistryService };
