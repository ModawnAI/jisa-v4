/**
 * Ground Truth Extractor Service
 *
 * Extracts accurate "ground truth" data from source documents
 * for RAG accuracy testing and self-optimization.
 */

import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import {
  groundTruth,
  accuracyTests,
  ragTemplateSchemas,
  type GroundTruthFieldValue,
  type ExpectedValue,
  type GroundTruth as DbGroundTruth,
  type AccuracyTest as DbAccuracyTest,
} from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

import type {
  DocumentAnalysis,
  SheetAnalysis,
  ColumnAnalysis,
  SemanticCategory,
  TestCategory,
} from './types';

// Re-export DB types for use in this service
type GroundTruthRecord = DbGroundTruth;
type AccuracyTestRecord = DbAccuracyTest;

// =============================================================================
// Types
// =============================================================================

export interface ExtractionResult {
  /** Extracted ground truth records */
  records: GroundTruthRecord[];
  /** Extraction statistics */
  stats: {
    totalRows: number;
    extractedRecords: number;
    skippedRows: number;
    fieldsExtracted: number;
    avgConfidence: number;
  };
  /** Errors encountered */
  errors: Array<{
    row: number;
    field?: string;
    error: string;
  }>;
}

export interface TestGenerationResult {
  /** Generated test cases */
  tests: AccuracyTestRecord[];
  /** Generation statistics */
  stats: {
    groundTruthRecords: number;
    testsGenerated: number;
    queryPatternsUsed: number;
  };
}

export interface EntityIdentifier {
  /** Employee ID/Number */
  employeeId?: string;
  /** Period (e.g., '202509') */
  period?: string;
  /** Additional identifiers */
  [key: string]: string | number | undefined;
}

export interface ExtractionConfig {
  /** Sheet to extract from (index or name) */
  sheet?: number | string;
  /** Key column for entity identification */
  keyColumn: string;
  /** Period column if applicable */
  periodColumn?: string;
  /** Fields to extract (all if not specified) */
  fields?: string[];
  /** Confidence threshold */
  minConfidence?: number;
  /** Skip rows with null keys */
  skipNullKeys?: boolean;
}

// =============================================================================
// Query Patterns for Test Generation
// =============================================================================

const QUERY_PATTERNS: Record<string, string[]> = {
  commission: [
    '내 {period} 수수료 알려줘',
    '{period} 커미션 얼마야?',
    '총 수수료가 얼마지?',
  ],
  fyc: [
    '내 FYC 알려줘',
    '{period} FYC가 얼마야?',
    'FYC 실적 조회',
  ],
  contract: [
    '내 계약 건수 알려줘',
    '{period} 체결 건수가 몇 건이야?',
    '신계약 몇 건?',
  ],
  mdrt: [
    'MDRT 달성했어?',
    '내 MDRT 현황 알려줘',
    'MDRT까지 얼마나 남았어?',
  ],
  income: [
    '내 수입 알려줘',
    '{period} 급여 얼마야?',
    'AGI 확인해줘',
  ],
  general: [
    '내 {field} 알려줘',
    '{field}가 뭐야?',
    '{field} 조회',
  ],
};

// =============================================================================
// Ground Truth Extractor Service
// =============================================================================

export class GroundTruthExtractorService {
  /**
   * Extract ground truth from an Excel document
   */
  async extractFromExcel(
    buffer: Buffer,
    config: ExtractionConfig,
    options?: {
      schemaId?: string;
      documentId?: string;
    }
  ): Promise<ExtractionResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Determine which sheet to process
    const sheetName = typeof config.sheet === 'number'
      ? workbook.SheetNames[config.sheet]
      : config.sheet || workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return {
        records: [],
        stats: { totalRows: 0, extractedRecords: 0, skippedRows: 0, fieldsExtracted: 0, avgConfidence: 0 },
        errors: [{ row: 0, error: `Sheet not found: ${sheetName}` }],
      };
    }

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

    const records: GroundTruthRecord[] = [];
    const errors: ExtractionResult['errors'] = [];
    let totalConfidence = 0;
    let skippedRows = 0;

    // Find key column
    const keyColIndex = this.findColumnIndex(worksheet, config.keyColumn);
    const periodColIndex = config.periodColumn
      ? this.findColumnIndex(worksheet, config.periodColumn)
      : null;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        // Get entity identifier
        const keyValue = this.getCellValue(row, config.keyColumn);

        if (keyValue === null || keyValue === undefined || keyValue === '') {
          if (config.skipNullKeys !== false) {
            skippedRows++;
            continue;
          }
        }

        // Build entity identifier
        const entityIdentifier: EntityIdentifier = {};

        if (keyValue) {
          entityIdentifier.employeeId = String(keyValue);
        }

        if (periodColIndex !== null && config.periodColumn) {
          const periodValue = this.getCellValue(row, config.periodColumn);
          if (periodValue) {
            entityIdentifier.period = this.normalizePeriod(String(periodValue));
          }
        }

        // Extract field values
        const fieldValues: Record<string, GroundTruthFieldValue> = {};
        let recordConfidence = 1.0;

        const fieldsToExtract = config.fields || Object.keys(row);

        for (const field of fieldsToExtract) {
          if (field === config.keyColumn || field === config.periodColumn) {
            continue;
          }

          const value = this.getCellValue(row, field);
          const confidence = this.calculateFieldConfidence(value);

          if (confidence >= (config.minConfidence || 0.5)) {
            fieldValues[this.normalizeFieldName(field)] = {
              value: this.normalizeValue(value),
              confidence,
              source: `${sheetName}!Row${i + 2}`,
              extractedAt: new Date().toISOString(),
            };

            recordConfidence = Math.min(recordConfidence, confidence);
          }
        }

        if (Object.keys(fieldValues).length > 0) {
          records.push({
            id: crypto.randomUUID(),
            schemaId: options?.schemaId || null,
            documentId: options?.documentId || null,
            entityIdentifier: entityIdentifier as Record<string, string | number>,
            fieldValues,
            confidence: recordConfidence,
            extractionMethod: 'auto',
            isValid: true,
            invalidatedReason: null,
            validUntil: null,
            extractedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          totalConfidence += recordConfidence;
        }
      } catch (err) {
        errors.push({
          row: i + 2, // Excel rows are 1-indexed, plus header
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return {
      records,
      stats: {
        totalRows: data.length,
        extractedRecords: records.length,
        skippedRows,
        fieldsExtracted: records.reduce((sum, r) => sum + Object.keys(r.fieldValues).length, 0),
        avgConfidence: records.length > 0 ? totalConfidence / records.length : 0,
      },
      errors,
    };
  }

  /**
   * Extract ground truth using document analysis results
   */
  async extractWithAnalysis(
    buffer: Buffer,
    analysis: DocumentAnalysis,
    options?: {
      schemaId?: string;
      documentId?: string;
    }
  ): Promise<ExtractionResult> {
    // Find the best sheet for extraction
    const sheets = analysis.structure.sheets || [];
    if (sheets.length === 0) {
      return {
        records: [],
        stats: { totalRows: 0, extractedRecords: 0, skippedRows: 0, fieldsExtracted: 0, avgConfidence: 0 },
        errors: [{ row: 0, error: 'No sheets found in document analysis' }],
      };
    }

    // Find key column from analysis
    const primarySheet = sheets[0];
    const keyColumn = this.findKeyColumn(primarySheet);
    const periodColumn = this.findPeriodColumn(primarySheet);

    if (!keyColumn) {
      return {
        records: [],
        stats: { totalRows: 0, extractedRecords: 0, skippedRows: 0, fieldsExtracted: 0, avgConfidence: 0 },
        errors: [{ row: 0, error: 'No key column found (employee_id, etc.)' }],
      };
    }

    return this.extractFromExcel(buffer, {
      sheet: primarySheet.name,
      keyColumn: keyColumn.name,
      periodColumn: periodColumn?.name,
      skipNullKeys: true,
    }, options);
  }

  /**
   * Save extracted ground truth to database
   */
  async saveGroundTruth(
    records: GroundTruthRecord[],
    options?: {
      replaceExisting?: boolean;
    }
  ): Promise<{ saved: number; updated: number; errors: number }> {
    let saved = 0;
    let updated = 0;
    let errors = 0;

    for (const record of records) {
      try {
        // Check for existing record with same entity identifier
        const existing = await db
          .select()
          .from(groundTruth)
          .where(
            and(
              eq(groundTruth.schemaId, record.schemaId || ''),
              sql`${groundTruth.entityIdentifier} = ${record.entityIdentifier}::jsonb`
            )
          )
          .limit(1);

        if (existing.length > 0) {
          if (options?.replaceExisting) {
            await db
              .update(groundTruth)
              .set({
                fieldValues: record.fieldValues,
                confidence: record.confidence,
                extractionMethod: record.extractionMethod,
                updatedAt: new Date(),
              })
              .where(eq(groundTruth.id, existing[0].id));
            updated++;
          }
        } else {
          await db.insert(groundTruth).values({
            schemaId: record.schemaId,
            documentId: record.documentId,
            entityIdentifier: record.entityIdentifier,
            fieldValues: record.fieldValues,
            confidence: record.confidence,
            extractionMethod: record.extractionMethod,
            isValid: true,
          });
          saved++;
        }
      } catch (err) {
        console.error('Error saving ground truth:', err);
        errors++;
      }
    }

    return { saved, updated, errors };
  }

  /**
   * Generate accuracy tests from ground truth records
   */
  async generateTests(
    groundTruthIds: string[],
    options?: {
      schemaId?: string;
      testSuiteId?: string;
      categories?: string[];
      maxTestsPerRecord?: number;
    }
  ): Promise<TestGenerationResult> {
    // Fetch ground truth records
    const records = await db
      .select()
      .from(groundTruth)
      .where(
        and(
          inArray(groundTruth.id, groundTruthIds),
          eq(groundTruth.isValid, true)
        )
      );

    const tests: AccuracyTestRecord[] = [];
    const queryPatternsUsed = new Set<string>();

    for (const record of records) {
      const fieldValues = record.fieldValues as Record<string, GroundTruthFieldValue>;
      const entityId = record.entityIdentifier as EntityIdentifier;

      // Determine categories from field names
      const categories = this.categorizeFields(Object.keys(fieldValues));

      for (const [category, fields] of Object.entries(categories)) {
        if (options?.categories && !options.categories.includes(category)) {
          continue;
        }

        // Generate tests for this category
        const categoryTests = this.generateCategoryTests(
          record,
          category,
          fields,
          fieldValues,
          entityId,
          options
        );

        tests.push(...categoryTests);

        categoryTests.forEach(t => {
          if (t.queryPattern) queryPatternsUsed.add(t.queryPattern);
        });

        // Limit tests per record
        if (options?.maxTestsPerRecord && tests.length >= options.maxTestsPerRecord * records.length) {
          break;
        }
      }
    }

    return {
      tests,
      stats: {
        groundTruthRecords: records.length,
        testsGenerated: tests.length,
        queryPatternsUsed: queryPatternsUsed.size,
      },
    };
  }

  /**
   * Save generated tests to database
   */
  async saveTests(
    tests: AccuracyTestRecord[]
  ): Promise<{ saved: number; errors: number }> {
    let saved = 0;
    let errors = 0;

    for (const test of tests) {
      try {
        await db.insert(accuracyTests).values({
          schemaId: test.schemaId,
          testSuiteId: test.testSuiteId,
          category: test.category,
          priority: test.priority,
          name: test.name,
          description: test.description,
          query: test.query,
          queryPattern: test.queryPattern,
          targetEntity: test.targetEntity,
          expectedFields: test.expectedFields,
          expectedValues: test.expectedValues,
          valueTolerance: test.valueTolerance,
          allowedDiscrepancies: test.allowedDiscrepancies,
          generatedFrom: 'ground_truth',
          groundTruthId: test.groundTruthId,
          isActive: true,
        });
        saved++;
      } catch (err) {
        console.error('Error saving test:', err);
        errors++;
      }
    }

    return { saved, errors };
  }

  /**
   * Get ground truth for a specific entity
   */
  async getGroundTruth(
    entityIdentifier: EntityIdentifier,
    options?: { schemaId?: string }
  ): Promise<GroundTruthRecord | null> {
    const conditions = [
      sql`${groundTruth.entityIdentifier} @> ${entityIdentifier}::jsonb`,
      eq(groundTruth.isValid, true),
    ];

    if (options?.schemaId) {
      conditions.push(eq(groundTruth.schemaId, options.schemaId));
    }

    const [record] = await db
      .select()
      .from(groundTruth)
      .where(and(...conditions))
      .limit(1);

    if (!record) return null;

    return record;
  }

  /**
   * Invalidate outdated ground truth
   */
  async invalidateGroundTruth(
    ids: string[],
    reason: string
  ): Promise<number> {
    await db
      .update(groundTruth)
      .set({
        isValid: false,
        invalidatedReason: reason,
        updatedAt: new Date(),
      })
      .where(inArray(groundTruth.id, ids));

    return ids.length;
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private findColumnIndex(
    worksheet: XLSX.WorkSheet,
    columnName: string
  ): number {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = worksheet[cellAddress];
      if (cell && String(cell.v).toLowerCase().includes(columnName.toLowerCase())) {
        return col;
      }
    }

    return -1;
  }

  private getCellValue(row: Record<string, unknown>, columnName: string): unknown {
    // Direct match
    if (columnName in row) {
      return row[columnName];
    }

    // Case-insensitive match
    const normalizedName = columnName.toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === normalizedName) {
        return row[key];
      }
    }

    return null;
  }

  private normalizeValue(value: unknown): string | number | boolean | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value;

    const strValue = String(value).trim();
    if (strValue === '') return null;

    // Try to parse as number
    const numValue = Number(strValue.replace(/,/g, ''));
    if (!isNaN(numValue)) return numValue;

    // Try to parse as boolean
    if (['true', 'yes', '예', 'Y'].includes(strValue.toLowerCase())) return true;
    if (['false', 'no', '아니오', 'N'].includes(strValue.toLowerCase())) return false;

    return strValue;
  }

  private normalizePeriod(period: string): string {
    // Handle various period formats
    // e.g., '2025년 9월' -> '202509', '2025-09' -> '202509'
    const cleaned = period.replace(/[년월\-\/\s]/g, '');

    if (/^\d{6}$/.test(cleaned)) return cleaned;
    if (/^\d{4}$/.test(cleaned)) return cleaned + '01'; // Year only

    // Try to extract year and month
    const match = period.match(/(\d{4})[^\d]*(\d{1,2})/);
    if (match) {
      return match[1] + match[2].padStart(2, '0');
    }

    return cleaned;
  }

  private normalizeFieldName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[\s_-]+/g, '_')
      .replace(/[^a-z0-9가-힣_]/g, '');
  }

  private calculateFieldConfidence(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (value === '') return 0;

    // Higher confidence for non-null values
    let confidence = 0.8;

    // Numbers are more reliable
    if (typeof value === 'number') confidence = 0.95;

    // Very large or very small numbers might be errors
    if (typeof value === 'number') {
      if (value > 1e12 || value < -1e12) confidence *= 0.8;
    }

    return confidence;
  }

  private findKeyColumn(sheet: SheetAnalysis): ColumnAnalysis | null {
    // Look for employee_id semantic category
    const employeeCol = sheet.headers.find(
      h => h.semanticCategory === 'employee_id'
    );
    if (employeeCol) return employeeCol;

    // Look for columns with '사번' or 'employee' in name
    const keyPatterns = [/사번/i, /employee/i, /emp.*id/i, /직원.*번호/i];
    for (const pattern of keyPatterns) {
      const col = sheet.headers.find(h => pattern.test(h.name));
      if (col) return col;
    }

    // Fall back to first key column identified
    if (sheet.keyColumns.length > 0) {
      return sheet.headers.find(h => h.name === sheet.keyColumns[0]) || null;
    }

    return null;
  }

  private findPeriodColumn(sheet: SheetAnalysis): ColumnAnalysis | null {
    // Look for period semantic category
    const periodCol = sheet.headers.find(
      h => h.semanticCategory === 'period'
    );
    if (periodCol) return periodCol;

    // Look for columns with period-related names
    const periodPatterns = [/마감월/i, /기간/i, /period/i, /month/i, /년월/i];
    for (const pattern of periodPatterns) {
      const col = sheet.headers.find(h => pattern.test(h.name));
      if (col) return col;
    }

    return null;
  }

  private categorizeFields(fields: string[]): Record<string, string[]> {
    const categories: Record<string, string[]> = {};

    const categoryPatterns: Record<string, RegExp[]> = {
      commission: [/수수료/i, /커미션/i, /commission/i],
      fyc: [/fyc/i, /mfyc/i],
      contract: [/계약/i, /건수/i, /contract/i],
      mdrt: [/mdrt/i],
      income: [/수입/i, /급여/i, /income/i, /agi/i],
      achievement: [/달성/i, /실적/i, /achievement/i],
    };

    for (const field of fields) {
      let assigned = false;

      for (const [category, patterns] of Object.entries(categoryPatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(field)) {
            if (!categories[category]) categories[category] = [];
            categories[category].push(field);
            assigned = true;
            break;
          }
        }
        if (assigned) break;
      }

      if (!assigned) {
        if (!categories['general']) categories['general'] = [];
        categories['general'].push(field);
      }
    }

    return categories;
  }

  private generateCategoryTests(
    record: typeof groundTruth.$inferSelect,
    category: string,
    fields: string[],
    fieldValues: Record<string, GroundTruthFieldValue>,
    entityId: EntityIdentifier,
    options?: {
      schemaId?: string;
      testSuiteId?: string;
    }
  ): AccuracyTestRecord[] {
    const tests: AccuracyTestRecord[] = [];
    const patterns = QUERY_PATTERNS[category] || QUERY_PATTERNS['general'];

    // Get period for query substitution
    const period = entityId.period || '';
    const periodDisplay = period ? this.formatPeriodDisplay(period) : '';

    for (const pattern of patterns) {
      // Skip patterns requiring period if not available
      if (pattern.includes('{period}') && !period) continue;

      // Build query from pattern
      let query = pattern
        .replace('{period}', periodDisplay)
        .replace('{field}', fields[0] || 'data');

      // Build expected values
      const expectedValues: Record<string, ExpectedValue> = {};
      const expectedFields: string[] = [];

      for (const field of fields) {
        const fieldValue = fieldValues[field];
        if (!fieldValue) continue;

        expectedFields.push(field);
        expectedValues[field] = {
          value: fieldValue.value,
          type: typeof fieldValue.value === 'number' ? 'numeric_range' : 'exact',
          tolerance: typeof fieldValue.value === 'number' ? 0.02 : undefined,
        };
      }

      if (expectedFields.length === 0) continue;

      tests.push({
        id: crypto.randomUUID(),
        schemaId: options?.schemaId || record.schemaId,
        testSuiteId: options?.testSuiteId || null,
        category,
        priority: this.determinePriority(category, fields),
        name: `${category} - ${fields.slice(0, 2).join(', ')}`,
        description: `Auto-generated test for ${category} fields`,
        query,
        queryPattern: pattern,
        targetEntity: entityId as Record<string, string | number>,
        expectedFields,
        expectedValues,
        valueTolerance: 0.02,
        allowedDiscrepancies: ['within_tolerance'],
        generatedFrom: 'ground_truth',
        groundTruthId: record.id,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return tests;
  }

  private formatPeriodDisplay(period: string): string {
    if (period.length === 6) {
      const year = period.substring(0, 4);
      const month = parseInt(period.substring(4, 6), 10);
      return `${year}년 ${month}월`;
    }
    return period;
  }

  private determinePriority(
    category: string,
    fields: string[]
  ): 'critical' | 'high' | 'medium' | 'low' {
    // Critical: commission, FYC related
    if (['commission', 'fyc'].includes(category)) return 'critical';

    // High: contract counts, income
    if (['contract', 'income'].includes(category)) return 'high';

    // Medium: MDRT, achievements
    if (['mdrt', 'achievement'].includes(category)) return 'medium';

    return 'low';
  }
}

// Singleton instance
export const groundTruthExtractorService = new GroundTruthExtractorService();
