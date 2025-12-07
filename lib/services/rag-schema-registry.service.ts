/**
 * RAG Schema Registry Service
 *
 * Manages dynamic RAG schemas with automatic discovery
 * from Pinecone metadata and feedback-based improvements.
 */

import { db } from '@/lib/db';
import {
  ragTemplateSchemas,
  queryIntentLogs,
  metadataDiscoveryCache,
  type RagTemplateSchema,
  type NewRagTemplateSchema,
  type MetadataFieldDefinition,
  type DiscoveredField,
  type NewQueryIntentLog,
} from '@/lib/db/schema/rag-schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { pineconeService } from './pinecone.service';
import { DEFAULT_RAG_SCHEMAS } from '@/lib/ai/prompts/query-understanding';

// Cache duration in milliseconds
const SCHEMA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DISCOVERY_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache
let schemaCache: {
  schemas: RagTemplateSchema[];
  timestamp: number;
} | null = null;

export class RagSchemaRegistryService {
  /**
   * Get all active RAG schemas with caching
   */
  async getActiveSchemas(forceRefresh = false): Promise<RagTemplateSchema[]> {
    // Check in-memory cache
    if (!forceRefresh && schemaCache && Date.now() - schemaCache.timestamp < SCHEMA_CACHE_DURATION) {
      return schemaCache.schemas;
    }

    // Fetch from database
    const schemas = await db.query.ragTemplateSchemas.findMany({
      where: eq(ragTemplateSchemas.isActive, true),
      orderBy: [desc(ragTemplateSchemas.priority)],
    });

    // If no schemas exist, bootstrap with defaults
    if (schemas.length === 0) {
      await this.bootstrapDefaultSchemas();
      return this.getActiveSchemas(true);
    }

    // Update cache
    schemaCache = {
      schemas,
      timestamp: Date.now(),
    };

    return schemas;
  }

  /**
   * Get schema by template slug
   */
  async getSchemaBySlug(slug: string): Promise<RagTemplateSchema | null> {
    const schemas = await this.getActiveSchemas();
    return schemas.find((s) => s.templateSlug === slug) || null;
  }

  /**
   * Bootstrap default schemas into database
   */
  async bootstrapDefaultSchemas(): Promise<void> {
    console.log('[RAG Registry] Bootstrapping default schemas...');

    for (const schema of DEFAULT_RAG_SCHEMAS) {
      // Check if already exists
      const existing = await db.query.ragTemplateSchemas.findFirst({
        where: eq(ragTemplateSchemas.templateSlug, schema.templateSlug),
      });

      if (!existing) {
        await db.insert(ragTemplateSchemas).values(schema as NewRagTemplateSchema);
        console.log(`[RAG Registry] Created schema: ${schema.templateSlug}`);
      }
    }

    // Clear cache
    schemaCache = null;
  }

  /**
   * Discover metadata fields from Pinecone namespace
   */
  async discoverMetadataFromNamespace(namespace: string): Promise<DiscoveredField[]> {
    // Check cache first
    const cached = await db.query.metadataDiscoveryCache.findFirst({
      where: and(
        eq(metadataDiscoveryCache.namespace, namespace),
        gte(metadataDiscoveryCache.expiresAt, new Date())
      ),
    });

    if (cached) {
      return cached.discoveredFields as DiscoveredField[];
    }

    // Fetch samples from Pinecone
    try {
      // Get namespace stats
      const stats = await pineconeService.getNamespaceStats(namespace);

      if (!stats.vectorCount || stats.vectorCount === 0) {
        return [];
      }

      // Fetch sample vectors with metadata
      const sampleResults = await pineconeService.querySample(namespace, Math.min(100, stats.vectorCount));

      if (!sampleResults || sampleResults.length === 0) {
        return [];
      }

      // Analyze metadata fields
      const fieldAnalysis = new Map<string, {
        values: unknown[];
        types: Set<string>;
        nullCount: number;
      }>();

      for (const result of sampleResults) {
        const metadata = result.metadata || {};

        for (const [key, value] of Object.entries(metadata)) {
          if (!fieldAnalysis.has(key)) {
            fieldAnalysis.set(key, { values: [], types: new Set(), nullCount: 0 });
          }

          const analysis = fieldAnalysis.get(key)!;

          if (value === null || value === undefined) {
            analysis.nullCount++;
          } else {
            analysis.values.push(value);
            analysis.types.add(this.inferType(value));
          }
        }
      }

      // Convert to DiscoveredField format
      const discoveredFields: DiscoveredField[] = [];

      for (const [key, analysis] of fieldAnalysis.entries()) {
        const inferredType = this.determineMostLikelyType(analysis.types);

        discoveredFields.push({
          key,
          inferredType,
          occurrenceCount: analysis.values.length + analysis.nullCount,
          sampleValues: analysis.values.slice(0, 5),
          nullCount: analysis.nullCount,
        });
      }

      // Cache the discovery
      const expiresAt = new Date(Date.now() + DISCOVERY_CACHE_DURATION);

      await db
        .insert(metadataDiscoveryCache)
        .values({
          namespace,
          discoveredFields,
          sampleSize: sampleResults.length,
          uniqueValuesPerField: Object.fromEntries(
            discoveredFields.map((f) => [f.key, new Set(f.sampleValues).size])
          ),
          discoveredAt: new Date(),
          expiresAt,
        })
        .onConflictDoUpdate({
          target: metadataDiscoveryCache.namespace,
          set: {
            discoveredFields,
            sampleSize: sampleResults.length,
            discoveredAt: new Date(),
            expiresAt,
          },
        });

      return discoveredFields;
    } catch (error) {
      console.error(`[RAG Registry] Failed to discover metadata for ${namespace}:`, error);
      return [];
    }
  }

  /**
   * Suggest schema updates based on discovered metadata
   */
  async suggestSchemaUpdates(
    templateSlug: string,
    namespace: string
  ): Promise<{
    newFields: MetadataFieldDefinition[];
    missingFields: string[];
  }> {
    const schema = await this.getSchemaBySlug(templateSlug);

    if (!schema) {
      return { newFields: [], missingFields: [] };
    }

    const currentFields = new Set(
      (schema.metadataFields as MetadataFieldDefinition[]).map((f) => f.key)
    );

    const discoveredFields = await this.discoverMetadataFromNamespace(namespace);

    const newFields: MetadataFieldDefinition[] = [];
    const discoveredKeys = new Set<string>();

    for (const field of discoveredFields) {
      discoveredKeys.add(field.key);

      if (!currentFields.has(field.key)) {
        // New field discovered
        newFields.push({
          key: field.key,
          displayName: this.generateDisplayName(field.key),
          type: field.inferredType as MetadataFieldDefinition['type'],
          isSearchable: field.inferredType === 'string',
          isFilterable: true,
          isComputable: field.inferredType === 'number',
          sampleValues: field.sampleValues as (string | number | boolean)[],
        });
      }
    }

    // Find fields in schema but not in Pinecone
    const missingFields: string[] = [];
    for (const field of currentFields) {
      if (!discoveredKeys.has(field) && field !== 'period') {
        missingFields.push(field);
      }
    }

    return { newFields, missingFields };
  }

  /**
   * Update schema with new fields
   */
  async updateSchemaFields(
    templateSlug: string,
    newFields: MetadataFieldDefinition[]
  ): Promise<RagTemplateSchema | null> {
    const schema = await this.getSchemaBySlug(templateSlug);

    if (!schema) {
      return null;
    }

    const currentFields = schema.metadataFields as MetadataFieldDefinition[];
    const updatedFields = [...currentFields, ...newFields];

    const [updated] = await db
      .update(ragTemplateSchemas)
      .set({
        metadataFields: updatedFields,
        updatedAt: new Date(),
      })
      .where(eq(ragTemplateSchemas.id, schema.id))
      .returning();

    // Clear cache
    schemaCache = null;

    return updated;
  }

  /**
   * Log query intent for feedback and analysis
   */
  async logQueryIntent(log: NewQueryIntentLog): Promise<void> {
    await db.insert(queryIntentLogs).values(log);
  }

  /**
   * Get query intent statistics for a template
   */
  async getIntentStats(templateSlug: string, days = 7): Promise<{
    totalQueries: number;
    successRate: number;
    intentBreakdown: Record<string, number>;
    avgConfidence: number;
    lowConfidenceQueries: number;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await db.query.queryIntentLogs.findMany({
      where: and(
        eq(queryIntentLogs.templateUsed, templateSlug),
        gte(queryIntentLogs.createdAt, since)
      ),
    });

    if (logs.length === 0) {
      return {
        totalQueries: 0,
        successRate: 0,
        intentBreakdown: {},
        avgConfidence: 0,
        lowConfidenceQueries: 0,
      };
    }

    const intentBreakdown: Record<string, number> = {};
    let totalConfidence = 0;
    let successCount = 0;
    let lowConfidenceCount = 0;

    for (const log of logs) {
      const intent = log.parsedIntent as { intent: string };
      intentBreakdown[intent.intent] = (intentBreakdown[intent.intent] || 0) + 1;

      if (log.successful) successCount++;
      if (log.confidence !== null) {
        totalConfidence += log.confidence;
        if (log.confidence < 0.7) lowConfidenceCount++;
      }
    }

    return {
      totalQueries: logs.length,
      successRate: (successCount / logs.length) * 100,
      intentBreakdown,
      avgConfidence: totalConfidence / logs.length,
      lowConfidenceQueries: lowConfidenceCount,
    };
  }

  /**
   * Get queries with low confidence for review
   */
  async getLowConfidenceQueries(
    limit = 20
  ): Promise<Array<{ query: string; confidence: number; template: string }>> {
    const logs = await db.query.queryIntentLogs.findMany({
      where: and(
        sql`${queryIntentLogs.confidence} < 0.7`,
        eq(queryIntentLogs.wasAmbiguous, true)
      ),
      orderBy: [desc(queryIntentLogs.createdAt)],
      limit,
    });

    return logs.map((log) => ({
      query: log.originalQuery,
      confidence: log.confidence || 0,
      template: log.templateUsed || 'unknown',
    }));
  }

  /**
   * Create a new RAG schema
   */
  async createSchema(schema: NewRagTemplateSchema): Promise<RagTemplateSchema> {
    const [created] = await db
      .insert(ragTemplateSchemas)
      .values(schema)
      .returning();

    // Clear cache
    schemaCache = null;

    return created;
  }

  /**
   * Update an existing schema
   */
  async updateSchema(
    id: string,
    updates: Partial<NewRagTemplateSchema>
  ): Promise<RagTemplateSchema | null> {
    const [updated] = await db
      .update(ragTemplateSchemas)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(ragTemplateSchemas.id, id))
      .returning();

    // Clear cache
    schemaCache = null;

    return updated || null;
  }

  /**
   * Deactivate a schema
   */
  async deactivateSchema(id: string): Promise<void> {
    await db
      .update(ragTemplateSchemas)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(ragTemplateSchemas.id, id));

    // Clear cache
    schemaCache = null;
  }

  // ============ Private Helpers ============

  private inferType(value: unknown): 'number' | 'string' | 'boolean' | 'date' | 'json' | 'unknown' {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      // Check if it's a date
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
      // Check if it's JSON
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          JSON.parse(value);
          return 'json';
        } catch {
          return 'string';
        }
      }
      return 'string';
    }
    if (typeof value === 'object') return 'json';
    return 'unknown';
  }

  private determineMostLikelyType(
    types: Set<string>
  ): 'number' | 'string' | 'boolean' | 'date' | 'json' | 'unknown' {
    if (types.size === 0) return 'unknown';
    if (types.size === 1) return [...types][0] as 'number' | 'string' | 'boolean' | 'date' | 'json' | 'unknown';

    // Priority: number > date > string > json > boolean > unknown
    if (types.has('number')) return 'number';
    if (types.has('date')) return 'date';
    if (types.has('string')) return 'string';
    if (types.has('json')) return 'json';
    if (types.has('boolean')) return 'boolean';
    return 'unknown';
  }

  private generateDisplayName(key: string): string {
    // Convert camelCase or snake_case to readable Korean-ish names
    const words = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase()
      .split(' ');

    return words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    schemaCache = null;
  }
}

export const ragSchemaRegistryService = new RagSchemaRegistryService();
