/**
 * Schema Registry Service
 *
 * Manages RAG template schemas with dynamic discovery, matching,
 * and versioning capabilities. Core component of the autonomous
 * RAG system.
 */

import { db } from '@/lib/db';
import {
  ragTemplateSchemas,
  metadataDiscoveryCache,
  type RagTemplateSchema,
  type NewRagTemplateSchema,
  type MetadataFieldDefinition,
  type ChunkTypeDefinition,
  type IntentConfiguration,
  type DiscoveredField,
} from '@/lib/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

import type {
  DocumentAnalysis,
  SheetAnalysis,
  ColumnAnalysis,
  SemanticCategory,
  ColumnType,
} from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Local DiscoveredSchema type that matches what generateSchemaFromAnalysis returns.
 * Different from the DiscoveredSchema in types.ts.
 */
interface LocalDiscoveredField {
  key: string;
  displayName: string;
  type: ColumnType;
  description?: string;
  isSearchable: boolean;
  isFilterable: boolean;
  isComputable: boolean;
  sampleValues?: (string | number | boolean)[];
  unit?: string;
  aliases: string[];
  confidence?: number;
}

interface LocalDiscoveredSchema {
  slug: string;
  displayName: string;
  description?: string;
  fields: LocalDiscoveredField[];
  chunkTypes: ChunkTypeDefinition[];
  supportedIntents: IntentConfiguration[];
  version: number;
  discoveredAt: Date;
  confidence: number;
  sourceDocumentType: string;
}

export interface SchemaMatchResult {
  /** Best matching schema */
  schema: RagTemplateSchema | null;
  /** Match confidence (0-1) */
  confidence: number;
  /** Matching details */
  matchDetails: {
    fieldMatches: number;
    fieldMismatches: number;
    semanticMatches: number;
    structureScore: number;
  };
  /** Suggestions for improving match */
  suggestions: string[];
}

export interface SchemaDiscoveryResult {
  /** Discovered schema definition */
  schema: LocalDiscoveredSchema;
  /** Was an existing schema updated? */
  isUpdate: boolean;
  /** Previous version if update */
  previousVersion?: number;
  /** Schema ID (new or existing) */
  schemaId: string;
}

export interface FieldAliasMapping {
  canonical: string;
  aliases: string[];
  category: SemanticCategory | null;
}

// =============================================================================
// Schema Registry Service
// =============================================================================

export class SchemaRegistryService {
  /**
   * Find the best matching schema for a document analysis
   */
  async findMatchingSchema(
    analysis: DocumentAnalysis
  ): Promise<SchemaMatchResult> {
    // Get all active schemas
    const schemas = await db
      .select()
      .from(ragTemplateSchemas)
      .where(eq(ragTemplateSchemas.isActive, true))
      .orderBy(desc(ragTemplateSchemas.priority));

    if (schemas.length === 0) {
      return {
        schema: null,
        confidence: 0,
        matchDetails: {
          fieldMatches: 0,
          fieldMismatches: 0,
          semanticMatches: 0,
          structureScore: 0,
        },
        suggestions: ['No schemas registered. Consider auto-discovering a schema from this document.'],
      };
    }

    // Score each schema
    const scored = schemas.map(schema => ({
      schema,
      ...this.scoreSchemaMatch(schema, analysis),
    }));

    // Sort by confidence
    scored.sort((a, b) => b.confidence - a.confidence);

    const best = scored[0];
    const suggestions: string[] = [];

    // Generate suggestions
    if (best.confidence < 0.5) {
      suggestions.push('Low confidence match. Consider creating a new schema for this document type.');
    }
    if (best.matchDetails.fieldMismatches > 0) {
      suggestions.push(
        `${best.matchDetails.fieldMismatches} field(s) in document not in schema. Consider updating the schema.`
      );
    }
    if (scored.length > 1 && scored[1].confidence > 0.7 * best.confidence) {
      suggestions.push(
        `Alternative match: ${scored[1].schema.templateSlug} (${(scored[1].confidence * 100).toFixed(1)}% confidence)`
      );
    }

    return {
      schema: best.schema,
      confidence: best.confidence,
      matchDetails: best.matchDetails,
      suggestions,
    };
  }

  /**
   * Score how well a schema matches a document analysis
   */
  private scoreSchemaMatch(
    schema: RagTemplateSchema,
    analysis: DocumentAnalysis
  ): Omit<SchemaMatchResult, 'schema' | 'suggestions'> {
    const schemaFields = (schema.metadataFields as MetadataFieldDefinition[]) || [];
    const documentFields = this.extractFieldsFromAnalysis(analysis);

    let fieldMatches = 0;
    let fieldMismatches = 0;
    let semanticMatches = 0;

    // Check each document field against schema
    for (const docField of documentFields) {
      const schemaField = this.findMatchingSchemaField(docField, schemaFields);
      if (schemaField) {
        fieldMatches++;
        if (docField.semanticCategory) {
          semanticMatches++;
        }
      } else {
        fieldMismatches++;
      }
    }

    // Structure score based on sheet/table detection
    let structureScore = 0.5;
    if (analysis.structure.sheets && analysis.structure.sheets.length > 0) {
      const sheet = analysis.structure.sheets[0];
      // Check for key columns
      if (sheet.keyColumns.length > 0) structureScore += 0.2;
      // Check for expected row counts
      if (sheet.rowCount > 10) structureScore += 0.1;
      // Check for structure markers matching schema
      if (sheet.structureMarkers.some(m => m.includes(schema.templateSlug))) {
        structureScore += 0.2;
      }
    }

    // Calculate overall confidence
    const totalFields = documentFields.length;
    const fieldScore = totalFields > 0 ? fieldMatches / totalFields : 0;
    const semanticScore = fieldMatches > 0 ? semanticMatches / fieldMatches : 0;

    // Weighted confidence calculation
    const confidence = Math.min(1,
      fieldScore * 0.5 +
      semanticScore * 0.3 +
      structureScore * 0.2
    );

    return {
      confidence,
      matchDetails: {
        fieldMatches,
        fieldMismatches,
        semanticMatches,
        structureScore,
      },
    };
  }

  /**
   * Extract fields from document analysis
   */
  private extractFieldsFromAnalysis(
    analysis: DocumentAnalysis
  ): Array<{ name: string; type: string; semanticCategory?: SemanticCategory }> {
    const fields: Array<{ name: string; type: string; semanticCategory?: SemanticCategory }> = [];

    if (analysis.structure.sheets) {
      for (const sheet of analysis.structure.sheets) {
        for (const col of sheet.headers) {
          fields.push({
            name: col.normalizedName || col.name,
            type: col.inferredType,
            semanticCategory: col.semanticCategory,
          });
        }
      }
    }

    return fields;
  }

  /**
   * Find a matching schema field (including aliases)
   */
  private findMatchingSchemaField(
    docField: { name: string; type: string; semanticCategory?: SemanticCategory },
    schemaFields: MetadataFieldDefinition[]
  ): MetadataFieldDefinition | null {
    const normalizedName = this.normalizeFieldName(docField.name);

    for (const schemaField of schemaFields) {
      // Direct match
      if (this.normalizeFieldName(schemaField.key) === normalizedName) {
        return schemaField;
      }

      // Alias match
      if (schemaField.aliases) {
        for (const alias of schemaField.aliases) {
          if (this.normalizeFieldName(alias) === normalizedName) {
            return schemaField;
          }
        }
      }

      // Display name match
      if (this.normalizeFieldName(schemaField.displayName) === normalizedName) {
        return schemaField;
      }
    }

    return null;
  }

  /**
   * Normalize field name for comparison
   */
  private normalizeFieldName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[\s_-]+/g, '')
      .replace(/[^a-z0-9가-힣]/g, '');
  }

  /**
   * Auto-discover and register a new schema from document analysis
   */
  async discoverSchema(
    analysis: DocumentAnalysis,
    options?: {
      suggestedSlug?: string;
      displayName?: string;
      description?: string;
      templateId?: string;
    }
  ): Promise<SchemaDiscoveryResult> {
    // Generate schema from analysis
    const discoveredSchema = this.generateSchemaFromAnalysis(analysis, options);

    // Check for existing schema with same slug
    const existing = await db
      .select()
      .from(ragTemplateSchemas)
      .where(eq(ragTemplateSchemas.templateSlug, discoveredSchema.slug))
      .limit(1);

    if (existing.length > 0) {
      // Update existing schema
      const updated = await this.updateSchemaWithDiscovery(
        existing[0],
        discoveredSchema
      );
      return {
        schema: discoveredSchema,
        isUpdate: true,
        previousVersion: existing[0].priority, // Using priority as a version proxy
        schemaId: updated.id,
      };
    }

    // Create new schema
    const newSchema: NewRagTemplateSchema = {
      templateId: options?.templateId,
      templateSlug: discoveredSchema.slug,
      displayName: discoveredSchema.displayName,
      description: discoveredSchema.description,
      metadataFields: discoveredSchema.fields.map(f => ({
        key: f.key,
        displayName: f.displayName,
        type: this.mapColumnTypeToFieldType(f.type),
        description: f.description,
        isSearchable: f.isSearchable,
        isFilterable: f.isFilterable,
        isComputable: f.isComputable,
        sampleValues: f.sampleValues,
        unit: f.unit,
        aliases: f.aliases,
      })),
      chunkTypes: discoveredSchema.chunkTypes,
      supportedIntents: discoveredSchema.supportedIntents,
      priority: 0,
      isActive: true,
    };

    const [created] = await db
      .insert(ragTemplateSchemas)
      .values(newSchema)
      .returning();

    return {
      schema: discoveredSchema,
      isUpdate: false,
      schemaId: created.id,
    };
  }

  /**
   * Generate schema definition from document analysis
   */
  private generateSchemaFromAnalysis(
    analysis: DocumentAnalysis,
    options?: {
      suggestedSlug?: string;
      displayName?: string;
      description?: string;
    }
  ): LocalDiscoveredSchema {
    // Generate slug from first sheet name or file name
    const slug = options?.suggestedSlug || this.generateSlug(analysis);

    // Extract fields from sheets
    const fields: LocalDiscoveredField[] = [];
    const chunkTypes: ChunkTypeDefinition[] = [];

    if (analysis.structure.sheets) {
      for (const sheet of analysis.structure.sheets) {
        // Add chunk type for this sheet
        chunkTypes.push({
          type: this.slugify(sheet.name),
          displayName: sheet.name,
          description: `Data from ${sheet.name} sheet`,
          typicalUseCase: 'Direct lookups and queries',
        });

        // Add fields from headers
        for (const col of sheet.headers) {
          // Skip if we already have this field
          if (fields.some(f => f.key === col.normalizedName)) {
            continue;
          }

          fields.push({
            key: col.normalizedName,
            displayName: col.name,
            type: col.inferredType,
            description: this.generateFieldDescription(col),
            isSearchable: this.isFieldSearchable(col),
            isFilterable: this.isFieldFilterable(col),
            isComputable: this.isFieldComputable(col),
            sampleValues: col.sampleValues?.slice(0, 5) as (string | number | boolean)[],
            unit: this.inferUnit(col),
            aliases: this.generateAliases(col),
            confidence: col.typeConfidence || 0.8,
          });
        }
      }
    }

    // Determine supported intents based on fields
    const supportedIntents = this.inferSupportedIntents(fields);

    return {
      slug,
      displayName: options?.displayName || this.generateDisplayName(analysis),
      description: options?.description || this.generateDescription(analysis),
      fields,
      chunkTypes,
      supportedIntents,
      version: 1,
      discoveredAt: new Date(),
      confidence: analysis.confidence,
      sourceDocumentType: analysis.documentType,
    };
  }

  /**
   * Update existing schema with new discoveries
   */
  private async updateSchemaWithDiscovery(
    existing: RagTemplateSchema,
    discovered: LocalDiscoveredSchema
  ): Promise<RagTemplateSchema> {
    const existingFields = (existing.metadataFields as MetadataFieldDefinition[]) || [];
    const existingFieldKeys = new Set(existingFields.map(f => f.key));

    // Merge fields - add new ones, don't remove existing
    const newFields = discovered.fields.filter(
      f => !existingFieldKeys.has(f.key)
    );

    if (newFields.length === 0) {
      // No new fields, just return existing
      return existing;
    }

    const mergedFields: MetadataFieldDefinition[] = [
      ...existingFields,
      ...newFields.map(f => ({
        key: f.key,
        displayName: f.displayName,
        type: this.mapColumnTypeToFieldType(f.type),
        description: f.description,
        isSearchable: f.isSearchable,
        isFilterable: f.isFilterable,
        isComputable: f.isComputable,
        sampleValues: f.sampleValues,
        unit: f.unit,
        aliases: f.aliases,
      })),
    ];

    // Merge chunk types
    const existingChunkTypes = (existing.chunkTypes as ChunkTypeDefinition[]) || [];
    const existingChunkTypeNames = new Set(existingChunkTypes.map(c => c.type));
    const newChunkTypes = discovered.chunkTypes.filter(
      c => !existingChunkTypeNames.has(c.type)
    );

    const mergedChunkTypes = [...existingChunkTypes, ...newChunkTypes];

    const [updated] = await db
      .update(ragTemplateSchemas)
      .set({
        metadataFields: mergedFields,
        chunkTypes: mergedChunkTypes,
        updatedAt: new Date(),
      })
      .where(eq(ragTemplateSchemas.id, existing.id))
      .returning();

    return updated;
  }

  /**
   * Get schema by ID
   */
  async getSchemaById(id: string): Promise<RagTemplateSchema | null> {
    const [schema] = await db
      .select()
      .from(ragTemplateSchemas)
      .where(eq(ragTemplateSchemas.id, id))
      .limit(1);
    return schema || null;
  }

  /**
   * Get schema by slug
   */
  async getSchemaBySlug(slug: string): Promise<RagTemplateSchema | null> {
    const [schema] = await db
      .select()
      .from(ragTemplateSchemas)
      .where(eq(ragTemplateSchemas.templateSlug, slug))
      .limit(1);
    return schema || null;
  }

  /**
   * Get all active schemas
   */
  async getAllActiveSchemas(): Promise<RagTemplateSchema[]> {
    return db
      .select()
      .from(ragTemplateSchemas)
      .where(eq(ragTemplateSchemas.isActive, true))
      .orderBy(desc(ragTemplateSchemas.priority));
  }

  /**
   * Add field alias to schema
   */
  async addFieldAlias(
    schemaId: string,
    fieldKey: string,
    alias: string
  ): Promise<boolean> {
    const schema = await this.getSchemaById(schemaId);
    if (!schema) return false;

    const fields = (schema.metadataFields as MetadataFieldDefinition[]) || [];
    const fieldIndex = fields.findIndex(f => f.key === fieldKey);

    if (fieldIndex === -1) return false;

    // Add alias if not already present
    const field = fields[fieldIndex];
    const aliases = field.aliases || [];
    if (aliases.includes(alias)) return true;

    aliases.push(alias);
    fields[fieldIndex] = { ...field, aliases };

    await db
      .update(ragTemplateSchemas)
      .set({
        metadataFields: fields,
        updatedAt: new Date(),
      })
      .where(eq(ragTemplateSchemas.id, schemaId));

    return true;
  }

  /**
   * Get all field aliases for a schema
   */
  async getFieldAliases(schemaId: string): Promise<FieldAliasMapping[]> {
    const schema = await this.getSchemaById(schemaId);
    if (!schema) return [];

    const fields = (schema.metadataFields as MetadataFieldDefinition[]) || [];

    return fields.map(f => ({
      canonical: f.key,
      aliases: f.aliases || [],
      category: this.inferCategoryFromFieldName(f.key),
    }));
  }

  /**
   * Cache discovered metadata from Pinecone
   */
  async cacheDiscoveredMetadata(
    namespace: string,
    fields: DiscoveredField[],
    sampleSize: number,
    ttlHours: number = 24
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    // Upsert cache entry
    await db
      .insert(metadataDiscoveryCache)
      .values({
        namespace,
        discoveredFields: fields,
        sampleSize,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [metadataDiscoveryCache.namespace],
        set: {
          discoveredFields: fields,
          sampleSize,
          discoveredAt: new Date(),
          expiresAt,
        },
      });
  }

  /**
   * Get cached metadata for namespace
   */
  async getCachedMetadata(
    namespace: string
  ): Promise<{ fields: DiscoveredField[]; sampleSize: number } | null> {
    const [cached] = await db
      .select()
      .from(metadataDiscoveryCache)
      .where(
        and(
          eq(metadataDiscoveryCache.namespace, namespace),
          sql`${metadataDiscoveryCache.expiresAt} > NOW()`
        )
      )
      .limit(1);

    if (!cached) return null;

    return {
      fields: cached.discoveredFields as DiscoveredField[],
      sampleSize: cached.sampleSize,
    };
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private generateSlug(analysis: DocumentAnalysis): string {
    if (analysis.structure.sheets && analysis.structure.sheets.length > 0) {
      return this.slugify(analysis.structure.sheets[0].name);
    }
    return this.slugify(analysis.fileInfo.fileName.replace(/\.[^.]+$/, ''));
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
  }

  private generateDisplayName(analysis: DocumentAnalysis): string {
    if (analysis.structure.sheets && analysis.structure.sheets.length > 0) {
      return analysis.structure.sheets[0].name;
    }
    return analysis.fileInfo.fileName.replace(/\.[^.]+$/, '');
  }

  private generateDescription(analysis: DocumentAnalysis): string {
    const parts: string[] = [];
    parts.push(`${analysis.documentType.toUpperCase()} document`);

    if (analysis.structure.sheets) {
      parts.push(`with ${analysis.structure.sheets.length} sheet(s)`);
      const totalCols = analysis.structure.sheets.reduce(
        (sum, s) => sum + s.columnCount, 0
      );
      parts.push(`and ${totalCols} total columns`);
    }

    return parts.join(' ');
  }

  private generateFieldDescription(col: ColumnAnalysis): string {
    const parts: string[] = [];

    if (col.semanticCategory) {
      parts.push(`${col.semanticCategory} field`);
    }

    parts.push(`(${col.inferredType})`);

    if (col.nullPercentage && col.nullPercentage > 0) {
      parts.push(`${(col.nullPercentage * 100).toFixed(0)}% null`);
    }

    return parts.join(' ');
  }

  private isFieldSearchable(col: ColumnAnalysis): boolean {
    // Text fields and employee info are searchable
    return col.inferredType === 'string' ||
           col.semanticCategory === 'employee_name' ||
           col.semanticCategory === 'department';
  }

  private isFieldFilterable(col: ColumnAnalysis): boolean {
    // Most fields can be used as filters
    return col.semanticCategory !== undefined ||
           col.inferredType === 'string' ||
           col.inferredType === 'number' ||
           col.inferredType === 'date';
  }

  private isFieldComputable(col: ColumnAnalysis): boolean {
    // Numeric fields are computable
    return col.inferredType === 'number' ||
           col.inferredType === 'currency' ||
           col.inferredType === 'percentage';
  }

  private inferUnit(col: ColumnAnalysis): string | undefined {
    if (col.inferredType === 'currency') return 'KRW';
    if (col.inferredType === 'percentage') return '%';
    return undefined;
  }

  private generateAliases(col: ColumnAnalysis): string[] {
    const aliases: string[] = [];

    // Add Korean/English variations
    const koreanPatterns: Record<string, string[]> = {
      employee_id: ['사번', 'employee_id', 'emp_no'],
      employee_name: ['성명', '이름', 'name'],
      commission: ['수수료', '커미션', 'commission'],
      period: ['기간', '마감월', 'period'],
    };

    if (col.semanticCategory && koreanPatterns[col.semanticCategory]) {
      aliases.push(...koreanPatterns[col.semanticCategory]);
    }

    return aliases.filter(a => a !== col.name && a !== col.normalizedName);
  }

  private inferSupportedIntents(
    fields: LocalDiscoveredField[]
  ): IntentConfiguration[] {
    const intents: IntentConfiguration[] = [];

    // Direct lookup always supported
    intents.push({
      intent: 'direct_lookup',
      isSupported: true,
      defaultTopK: 5,
    });

    // Calculation supported if we have numeric fields
    const hasNumeric = fields.some(f =>
      f.type === 'number' || f.type === 'currency' || f.type === 'percentage'
    );
    intents.push({
      intent: 'calculation',
      isSupported: hasNumeric,
      requiredFields: fields
        .filter(f => f.type === 'number' || f.type === 'currency')
        .map(f => f.key),
      defaultTopK: 10,
    });

    // Comparison supported if we have employee/period fields
    const hasComparable = fields.some(f =>
      f.key.includes('employee') || f.key.includes('period')
    );
    intents.push({
      intent: 'comparison',
      isSupported: hasComparable,
      defaultTopK: 20,
    });

    // Aggregation supported if we have numeric and groupable fields
    intents.push({
      intent: 'aggregation',
      isSupported: hasNumeric,
      defaultTopK: 50,
    });

    // General QA always supported
    intents.push({
      intent: 'general_qa',
      isSupported: true,
      defaultTopK: 5,
    });

    return intents;
  }

  private mapColumnTypeToFieldType(
    colType: string
  ): 'number' | 'string' | 'boolean' | 'date' | 'json' {
    switch (colType) {
      case 'number':
      case 'currency':
      case 'percentage':
        return 'number';
      case 'date':
        return 'date';
      case 'boolean':
        return 'boolean';
      case 'array':
      case 'object':
        return 'json';
      default:
        return 'string';
    }
  }

  private inferCategoryFromFieldName(name: string): SemanticCategory | null {
    // Maps Korean/English field names to semantic categories
    // Some keys may be non-standard categories for internal use
    const patterns: Record<string, RegExp[]> = {
      employee_id: [/사번/i, /employee/i, /emp/i],
      employee_name: [/성명/i, /이름/i, /name/i],
      department: [/소속/i, /부서/i, /department/i],
      job_type: [/직종/i, /직급/i, /position/i],
      date: [/일자/i, /date/i],
      period: [/기간/i, /월/i, /period/i],
      amount: [/금액/i, /amount/i],
      commission: [/수수료/i, /커미션/i, /commission/i],
      fyc: [/fyc/i, /mfyc/i],
      income: [/수입/i, /income/i],
      count: [/건수/i, /count/i],
      rate: [/율/i, /rate/i],
      status: [/상태/i, /status/i],
      contract: [/계약/i, /contract/i],
      product: [/상품/i, /product/i],
      customer: [/고객/i, /customer/i],
      achievement: [/달성/i, /achievement/i],
      target: [/목표/i, /target/i],
      difference: [/차이/i, /gap/i, /difference/i],
    };

    for (const [category, regexps] of Object.entries(patterns)) {
      for (const regexp of regexps) {
        if (regexp.test(name)) {
          return category as SemanticCategory;
        }
      }
    }

    return null;
  }
}

// Singleton instance
export const schemaRegistryService = new SchemaRegistryService();
