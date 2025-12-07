/**
 * Accuracy Analyzer & Self-Optimizer Service
 *
 * Core component of the autonomous RAG system that:
 * 1. Runs accuracy tests against the RAG system
 * 2. Analyzes failure patterns
 * 3. Generates and applies optimization actions
 * 4. Tracks improvement over iterations
 */

import { db } from '@/lib/db';
import {
  accuracyTests,
  accuracyResults,
  optimizationActions,
  pipelineRuns,
  ragTemplateSchemas,
  groundTruth,
  embeddingTemplates,
  type ExpectedValue,
  type Discrepancy,
  type OptimizationChange,
  type FailurePattern,
  type AccuracyTest as DbAccuracyTest,
  type AccuracyResult as DbAccuracyResult,
  type OptimizationAction as DbOptimizationAction,
  type MetadataFieldDefinition,
} from '@/lib/db/schema';
import { eq, and, desc, sql, inArray, gte } from 'drizzle-orm';

import type {
  TestStatus,
  DiscrepancySeverity,
  DiscrepancyType,
  OptimizationActionType,
  TestCategory,
} from './types';

// Re-export DB types for use in this service
type AccuracyTestRecord = DbAccuracyTest;
type AccuracyResultRecord = DbAccuracyResult;
type OptimizationActionRecord = DbOptimizationAction;

// =============================================================================
// Types
// =============================================================================

export interface TestRunResult {
  test: AccuracyTestRecord;
  result: AccuracyResultRecord;
}

export interface TestSuiteResult {
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  accuracy: number;
  results: TestRunResult[];
  duration: number;
}

export interface FailureAnalysis {
  patterns: FailurePattern[];
  suggestedOptimizations: OptimizationSuggestion[];
  criticalIssues: string[];
}

export interface OptimizationSuggestion {
  type: OptimizationActionType;
  target: string;
  change: OptimizationChange;
  reason: string;
  confidence: number;
  affectedTests: string[];
  estimatedImprovement: number;
}

export interface RagQueryResult {
  response: string;
  extractedValues: Record<string, unknown>;
  searchResults: Array<{
    score: number;
    metadata: Record<string, unknown>;
  }>;
  filters: Record<string, unknown>;
  namespace: string;
  routeType: string;
  intentType: string;
  intentConfidence: number;
  timings: {
    router: number;
    search: number;
    generation: number;
    total: number;
  };
}

// Callback type for RAG query execution
export type RagQueryExecutor = (
  query: string,
  context: { employeeId?: string; period?: string }
) => Promise<RagQueryResult>;

// =============================================================================
// Accuracy Analyzer Service
// =============================================================================

export class AccuracyAnalyzerService {
  private ragQueryExecutor: RagQueryExecutor | null = null;

  /**
   * Set the RAG query executor function
   */
  setQueryExecutor(executor: RagQueryExecutor): void {
    this.ragQueryExecutor = executor;
  }

  /**
   * Run all active tests for a schema
   */
  async runTestSuite(
    schemaId: string,
    options?: {
      pipelineRunId?: string;
      iteration?: number;
      categories?: string[];
      priorities?: string[];
    }
  ): Promise<TestSuiteResult> {
    const startTime = Date.now();

    // Get active tests
    const conditions = [
      eq(accuracyTests.schemaId, schemaId),
      eq(accuracyTests.isActive, true),
    ];

    const tests = await db
      .select()
      .from(accuracyTests)
      .where(and(...conditions))
      .orderBy(desc(sql`CASE priority WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END`));

    // Filter by options
    let filteredTests = tests;
    if (options?.categories) {
      filteredTests = filteredTests.filter(t => options.categories!.includes(t.category));
    }
    if (options?.priorities) {
      filteredTests = filteredTests.filter(t => options.priorities!.includes(t.priority));
    }

    const results: TestRunResult[] = [];
    let passed = 0;

    for (const test of filteredTests) {
      const result = await this.runSingleTest(test, options);
      results.push({ test: this.mapTest(test), result });

      if (result.passed) passed++;
    }

    return {
      testsRun: results.length,
      testsPassed: passed,
      testsFailed: results.length - passed,
      accuracy: results.length > 0 ? passed / results.length : 0,
      results,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Run a single test
   */
  async runSingleTest(
    test: typeof accuracyTests.$inferSelect,
    options?: {
      pipelineRunId?: string;
      iteration?: number;
    }
  ): Promise<AccuracyResultRecord> {
    const startTime = Date.now();

    if (!this.ragQueryExecutor) {
      return this.createFailedResult(test, 'No RAG query executor configured', options);
    }

    try {
      const targetEntity = test.targetEntity as Record<string, string | number>;

      // Execute RAG query
      const ragResult = await this.ragQueryExecutor(test.query, {
        employeeId: String(targetEntity.employeeId || ''),
        period: String(targetEntity.period || ''),
      });

      // Compare results
      const comparison = this.compareResults(
        ragResult.extractedValues,
        test.expectedValues as Record<string, ExpectedValue>,
        test.valueTolerance || 0.02
      );

      const result: AccuracyResultRecord = {
        id: crypto.randomUUID(),
        testId: test.id,
        pipelineRunId: options?.pipelineRunId || null,
        iteration: options?.iteration || 0,
        status: comparison.passed ? 'passed' : 'failed',
        passed: comparison.passed,
        accuracy: comparison.accuracy,
        response: ragResult.response,
        extractedValues: ragResult.extractedValues,
        discrepancies: comparison.discrepancies,
        discrepancyCount: comparison.discrepancies.length,
        searchResultsCount: ragResult.searchResults.length,
        topScore: ragResult.searchResults[0]?.score || 0,
        filtersUsed: ragResult.filters,
        namespaceSearched: ragResult.namespace,
        processingTimeMs: ragResult.timings.total,
        routerTimeMs: ragResult.timings.router,
        searchTimeMs: ragResult.timings.search,
        generationTimeMs: ragResult.timings.generation,
        routeType: ragResult.routeType,
        intentType: ragResult.intentType,
        intentConfidence: ragResult.intentConfidence,
        testedAt: new Date(),
      };

      // Save result to database
      await this.saveResult(result);

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      return this.createFailedResult(test, error, options);
    }
  }

  /**
   * Compare RAG results with expected values
   */
  private compareResults(
    actual: Record<string, unknown>,
    expected: Record<string, ExpectedValue>,
    tolerance: number
  ): { passed: boolean; accuracy: number; discrepancies: Discrepancy[] } {
    const discrepancies: Discrepancy[] = [];
    let matchCount = 0;
    const totalFields = Object.keys(expected).length;

    for (const [field, expectedValue] of Object.entries(expected)) {
      const actualValue = actual[field];

      if (actualValue === undefined) {
        discrepancies.push({
          field,
          expected: expectedValue.value,
          actual: undefined,
          type: 'missing',
          severity: this.determineSeverity(field, 'missing'),
          details: `Field "${field}" not found in response`,
        });
        continue;
      }

      const match = this.checkValueMatch(actualValue, expectedValue, tolerance);

      if (match.matches) {
        matchCount++;
      } else {
        discrepancies.push({
          field,
          expected: expectedValue.value,
          actual: actualValue,
          type: match.type,
          severity: this.determineSeverity(field, match.type),
          details: match.details,
        });
      }
    }

    const accuracy = totalFields > 0 ? matchCount / totalFields : 0;
    const passed = discrepancies.filter(d => d.severity === 'critical' || d.severity === 'high').length === 0
      && accuracy >= 0.8;

    return { passed, accuracy, discrepancies };
  }

  /**
   * Check if actual value matches expected
   */
  private checkValueMatch(
    actual: unknown,
    expected: ExpectedValue,
    tolerance: number
  ): { matches: boolean; type: DiscrepancyType; details?: string } {
    const useTolerance = expected.tolerance ?? tolerance;

    switch (expected.type) {
      case 'exact':
        if (actual === expected.value) {
          return { matches: true, type: 'within_tolerance' };
        }
        // Try string comparison
        if (String(actual).trim() === String(expected.value).trim()) {
          return { matches: true, type: 'within_tolerance' };
        }
        return {
          matches: false,
          type: 'wrong_value',
          details: `Expected exact match: ${expected.value}, got: ${actual}`,
        };

      case 'numeric_range':
        const actualNum = typeof actual === 'number' ? actual : Number(actual);
        const expectedNum = Number(expected.value);

        if (isNaN(actualNum)) {
          return {
            matches: false,
            type: 'type_mismatch',
            details: `Expected number, got: ${typeof actual}`,
          };
        }

        const diff = Math.abs(actualNum - expectedNum);
        const percentDiff = expectedNum !== 0 ? diff / Math.abs(expectedNum) : diff;

        if (percentDiff <= useTolerance) {
          return { matches: true, type: 'within_tolerance' };
        }

        return {
          matches: false,
          type: percentDiff <= 0.1 ? 'within_tolerance' : 'wrong_value',
          details: `Expected ${expectedNum} ± ${(useTolerance * 100).toFixed(1)}%, got ${actualNum} (${(percentDiff * 100).toFixed(1)}% diff)`,
        };

      case 'contains':
        const strActual = String(actual).toLowerCase();
        const strExpected = String(expected.value).toLowerCase();
        if (strActual.includes(strExpected)) {
          return { matches: true, type: 'within_tolerance' };
        }
        return {
          matches: false,
          type: 'wrong_value',
          details: `Expected to contain "${expected.value}"`,
        };

      case 'regex':
        try {
          const regex = new RegExp(String(expected.value));
          if (regex.test(String(actual))) {
            return { matches: true, type: 'within_tolerance' };
          }
          return {
            matches: false,
            type: 'format_mismatch',
            details: `Did not match pattern: ${expected.value}`,
          };
        } catch {
          return {
            matches: false,
            type: 'format_mismatch',
            details: 'Invalid regex pattern',
          };
        }

      case 'boolean_check':
        const boolActual = this.toBoolean(actual);
        const boolExpected = this.toBoolean(expected.value);
        if (boolActual === boolExpected) {
          return { matches: true, type: 'within_tolerance' };
        }
        return {
          matches: false,
          type: 'wrong_value',
          details: `Expected ${boolExpected}, got ${boolActual}`,
        };

      default:
        return {
          matches: false,
          type: 'type_mismatch',
          details: `Unknown comparison type: ${expected.type}`,
        };
    }
  }

  /**
   * Convert value to boolean
   */
  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const str = String(value).toLowerCase();
    return ['true', 'yes', '1', '예', 'y', '달성'].includes(str);
  }

  /**
   * Determine severity of discrepancy
   */
  private determineSeverity(field: string, type: DiscrepancyType): DiscrepancySeverity {
    // Missing critical fields
    if (type === 'missing') {
      if (/commission|fyc|income|수수료|커미션/i.test(field)) return 'critical';
      return 'high';
    }

    // Wrong values
    if (type === 'wrong_value') {
      if (/commission|fyc|income|수수료|커미션/i.test(field)) return 'high';
      return 'medium';
    }

    // Format/type issues
    return 'low';
  }

  /**
   * Analyze failure patterns from test results
   */
  async analyzeFailures(
    results: TestRunResult[],
    options?: { schemaId?: string }
  ): Promise<FailureAnalysis> {
    const failedResults = results.filter(r => !r.result.passed);

    if (failedResults.length === 0) {
      return {
        patterns: [],
        suggestedOptimizations: [],
        criticalIssues: [],
      };
    }

    const patterns: Map<string, FailurePattern> = new Map();
    const criticalIssues: string[] = [];

    // Analyze each failure
    for (const { test, result } of failedResults) {
      // Check for low relevance scores
      if ((result.topScore || 0) < 0.7) {
        const key = 'low_relevance';
        const existing = patterns.get(key) || {
          type: 'low_relevance' as const,
          avgScore: 0,
          occurrences: 0,
        };
        existing.avgScore = ((existing.avgScore || 0) * existing.occurrences + (result.topScore || 0)) / (existing.occurrences + 1);
        existing.occurrences++;
        patterns.set(key, existing);
      }

      // Check for filter issues
      const filters = result.filtersUsed as Record<string, unknown> || {};
      if (Object.keys(filters).length === 0) {
        const key = 'filter_mismatch';
        const existing = patterns.get(key) || {
          type: 'filter_mismatch' as const,
          occurrences: 0,
          suggestedFix: 'Add appropriate filters based on target entity',
        };
        existing.occurrences++;
        patterns.set(key, existing);
      }

      // Check for missing fields
      const discrepancies = result.discrepancies as Discrepancy[] || [];
      for (const disc of discrepancies) {
        if (disc.type === 'missing') {
          const key = `missing_field_${disc.field}`;
          const existing = patterns.get(key) || {
            type: 'missing_field' as const,
            field: disc.field,
            occurrences: 0,
          };
          existing.occurrences++;
          patterns.set(key, existing);

          if (disc.severity === 'critical') {
            criticalIssues.push(`Critical field "${disc.field}" missing from ${existing.occurrences} test(s)`);
          }
        }
      }

      // Check for value mismatches
      for (const disc of discrepancies) {
        if (disc.type === 'wrong_value') {
          const key = `value_mismatch_${disc.field}`;
          const existing = patterns.get(key) || {
            type: 'value_mismatch' as const,
            field: disc.field,
            occurrences: 0,
          };
          existing.occurrences++;
          patterns.set(key, existing);
        }
      }
    }

    // Generate optimization suggestions
    const suggestions = this.generateOptimizations(
      Array.from(patterns.values()),
      failedResults,
      options
    );

    return {
      patterns: Array.from(patterns.values()),
      suggestedOptimizations: suggestions,
      criticalIssues,
    };
  }

  /**
   * Generate optimization suggestions from failure patterns
   */
  private generateOptimizations(
    patterns: FailurePattern[],
    failedResults: TestRunResult[],
    options?: { schemaId?: string }
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'low_relevance':
          suggestions.push({
            type: 'embedding_update',
            target: 'embedding_template',
            change: {
              type: 'improve_semantic_anchors',
              after: { avgScore: pattern.avgScore },
              affectedFields: [],
            },
            reason: `Low search relevance scores (avg: ${((pattern.avgScore || 0) * 100).toFixed(1)}%)`,
            confidence: 0.8,
            affectedTests: failedResults
              .filter(r => (r.result.topScore || 0) < 0.7)
              .map(r => r.test.id),
            estimatedImprovement: 0.15,
          });
          break;

        case 'filter_mismatch':
          suggestions.push({
            type: 'filter_fix',
            target: 'query_router',
            change: {
              type: 'add_entity_filters',
              after: { employeeId: true, period: true },
            },
            reason: `Missing filters in ${pattern.occurrences} test(s)`,
            confidence: 0.9,
            affectedTests: failedResults
              .filter(r => Object.keys(r.result.filtersUsed || {}).length === 0)
              .map(r => r.test.id),
            estimatedImprovement: 0.2,
          });
          break;

        case 'missing_field':
          suggestions.push({
            type: 'metadata_add',
            target: 'schema',
            change: {
              type: 'add_field',
              after: { field: pattern.field },
              affectedFields: [pattern.field || ''],
            },
            reason: `Field "${pattern.field}" missing from ${pattern.occurrences} response(s)`,
            confidence: 0.7,
            affectedTests: failedResults
              .filter(r => (r.result.discrepancies as Discrepancy[] || [])
                .some(d => d.type === 'missing' && d.field === pattern.field))
              .map(r => r.test.id),
            estimatedImprovement: 0.1,
          });
          break;

        case 'value_mismatch':
          suggestions.push({
            type: 'field_alias',
            target: 'schema',
            change: {
              type: 'add_field_alias',
              after: { field: pattern.field },
              affectedFields: [pattern.field || ''],
            },
            reason: `Value mismatch for "${pattern.field}" in ${pattern.occurrences} test(s)`,
            confidence: 0.6,
            affectedTests: failedResults
              .filter(r => (r.result.discrepancies as Discrepancy[] || [])
                .some(d => d.type === 'wrong_value' && d.field === pattern.field))
              .map(r => r.test.id),
            estimatedImprovement: 0.05,
          });
          break;
      }
    }

    // Sort by confidence and estimated improvement
    suggestions.sort((a, b) =>
      (b.confidence * b.estimatedImprovement) - (a.confidence * a.estimatedImprovement)
    );

    return suggestions;
  }

  /**
   * Apply an optimization action
   */
  async applyOptimization(
    suggestion: OptimizationSuggestion,
    options?: {
      pipelineRunId?: string;
      iteration?: number;
      schemaId?: string;
      dryRun?: boolean;
    }
  ): Promise<{ success: boolean; error?: string; actionId?: string }> {
    // Record the action
    const action: typeof optimizationActions.$inferInsert = {
      schemaId: options?.schemaId,
      pipelineRunId: options?.pipelineRunId,
      iteration: options?.iteration,
      actionType: suggestion.type,
      target: suggestion.target,
      change: suggestion.change,
      reason: suggestion.reason,
      confidence: suggestion.confidence,
      affectedTests: suggestion.affectedTests,
      applied: false,
    };

    if (options?.dryRun) {
      return { success: true, error: 'Dry run - not applied' };
    }

    try {
      // Apply the optimization based on type
      switch (suggestion.type) {
        case 'schema_update':
        case 'metadata_add':
        case 'field_alias':
          await this.applySchemaUpdate(suggestion, options?.schemaId);
          break;

        case 'embedding_update':
          await this.applyEmbeddingUpdate(suggestion, options?.schemaId);
          break;

        case 'filter_fix':
          // Filter fixes require code changes, just record the suggestion
          break;

        case 'query_pattern':
          // Query pattern updates require code changes
          break;
      }

      action.applied = true;
      action.success = true;

      const [savedAction] = await db
        .insert(optimizationActions)
        .values(action)
        .returning();

      return { success: true, actionId: savedAction.id };
    } catch (err) {
      action.applied = false;
      action.success = false;
      action.error = err instanceof Error ? err.message : 'Unknown error';

      await db.insert(optimizationActions).values(action);

      return {
        success: false,
        error: action.error,
      };
    }
  }

  /**
   * Apply schema update optimization
   */
  private async applySchemaUpdate(
    suggestion: OptimizationSuggestion,
    schemaId?: string
  ): Promise<void> {
    if (!schemaId) return;

    const [schema] = await db
      .select()
      .from(ragTemplateSchemas)
      .where(eq(ragTemplateSchemas.id, schemaId));

    if (!schema) return;

    const fields = [...(schema.metadataFields || [])] as MetadataFieldDefinition[];

    if (suggestion.type === 'field_alias' && suggestion.change.affectedFields) {
      const fieldName = suggestion.change.affectedFields[0];
      const fieldIndex = fields.findIndex(f => f.key === fieldName);

      if (fieldIndex >= 0) {
        // Add alias
        const field = fields[fieldIndex];
        field.aliases = field.aliases || [];
        // Add common Korean aliases
        const koreanAliases = this.generateKoreanAliases(fieldName);
        field.aliases.push(...koreanAliases.filter(a => !field.aliases!.includes(a)));
        fields[fieldIndex] = field;
      }
    }

    await db
      .update(ragTemplateSchemas)
      .set({
        metadataFields: fields,
        updatedAt: new Date(),
      })
      .where(eq(ragTemplateSchemas.id, schemaId));
  }

  /**
   * Apply embedding template update
   */
  private async applyEmbeddingUpdate(
    suggestion: OptimizationSuggestion,
    schemaId?: string
  ): Promise<void> {
    if (!schemaId) return;

    const [template] = await db
      .select()
      .from(embeddingTemplates)
      .where(
        and(
          eq(embeddingTemplates.schemaId, schemaId),
          eq(embeddingTemplates.isActive, true)
        )
      );

    if (!template) return;

    // Update semantic anchors for better relevance
    const anchors = template.semanticAnchors as string[] || [];
    const newAnchors = this.generateSemanticAnchors(suggestion);

    await db
      .update(embeddingTemplates)
      .set({
        semanticAnchors: [...new Set([...anchors, ...newAnchors])],
        updatedAt: new Date(),
      })
      .where(eq(embeddingTemplates.id, template.id));
  }

  /**
   * Generate Korean field aliases
   */
  private generateKoreanAliases(field: string): string[] {
    const aliasMap: Record<string, string[]> = {
      commission: ['수수료', '커미션', '보수'],
      fyc: ['FYC', 'fYC', '신계약수수료'],
      income: ['수입', '급여', '소득'],
      contract: ['계약', '체결', '신계약'],
      employee: ['사원', '직원', '설계사'],
      period: ['기간', '마감월', '월'],
    };

    const aliases: string[] = [];
    for (const [key, values] of Object.entries(aliasMap)) {
      if (field.toLowerCase().includes(key)) {
        aliases.push(...values);
      }
    }
    return aliases;
  }

  /**
   * Generate semantic anchors for embedding
   */
  private generateSemanticAnchors(suggestion: OptimizationSuggestion): string[] {
    const anchors: string[] = [];

    // Add common query patterns as anchors
    anchors.push(
      '수수료 조회',
      '커미션 확인',
      '실적 확인',
      '달성 현황',
      '계약 건수'
    );

    return anchors;
  }

  /**
   * Save test result to database
   */
  private async saveResult(result: AccuracyResultRecord): Promise<void> {
    await db.insert(accuracyResults).values({
      testId: result.testId,
      pipelineRunId: result.pipelineRunId,
      iteration: result.iteration,
      status: result.status,
      passed: result.passed,
      accuracy: result.accuracy,
      response: result.response,
      extractedValues: result.extractedValues,
      discrepancies: result.discrepancies,
      discrepancyCount: result.discrepancyCount,
      searchResultsCount: result.searchResultsCount,
      topScore: result.topScore,
      filtersUsed: result.filtersUsed,
      namespaceSearched: result.namespaceSearched,
      processingTimeMs: result.processingTimeMs,
      routerTimeMs: result.routerTimeMs,
      searchTimeMs: result.searchTimeMs,
      generationTimeMs: result.generationTimeMs,
      routeType: result.routeType,
      intentType: result.intentType,
      intentConfidence: result.intentConfidence,
    });
  }

  /**
   * Create a failed result
   */
  private createFailedResult(
    test: typeof accuracyTests.$inferSelect,
    error: string,
    options?: { pipelineRunId?: string; iteration?: number }
  ): AccuracyResultRecord {
    return {
      id: crypto.randomUUID(),
      testId: test.id,
      pipelineRunId: options?.pipelineRunId || null,
      iteration: options?.iteration || 0,
      status: 'failed',
      passed: false,
      accuracy: 0,
      response: null,
      extractedValues: null,
      discrepancies: [{
        field: '_error',
        expected: 'success',
        actual: error,
        type: 'missing',
        severity: 'critical',
        details: error,
      }],
      discrepancyCount: 1,
      searchResultsCount: 0,
      topScore: 0,
      filtersUsed: null,
      namespaceSearched: null,
      processingTimeMs: 0,
      routerTimeMs: 0,
      searchTimeMs: 0,
      generationTimeMs: 0,
      routeType: 'error',
      intentType: null,
      intentConfidence: 0,
      testedAt: new Date(),
    };
  }

  /**
   * Map database test to type
   */
  private mapTest(test: typeof accuracyTests.$inferSelect): AccuracyTestRecord {
    return {
      id: test.id,
      schemaId: test.schemaId,
      testSuiteId: test.testSuiteId,
      category: test.category,
      priority: test.priority,
      name: test.name,
      description: test.description,
      query: test.query,
      queryPattern: test.queryPattern,
      targetEntity: test.targetEntity as Record<string, string | number>,
      expectedFields: test.expectedFields as string[],
      expectedValues: test.expectedValues as Record<string, ExpectedValue>,
      valueTolerance: test.valueTolerance ?? 0.02,
      allowedDiscrepancies: test.allowedDiscrepancies as string[] | null,
      generatedFrom: test.generatedFrom,
      isActive: test.isActive,
      groundTruthId: test.groundTruthId,
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
    };
  }

  /**
   * Get historical accuracy for a schema
   */
  async getAccuracyHistory(
    schemaId: string,
    days: number = 30
  ): Promise<Array<{ date: Date; accuracy: number; testsRun: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql`DATE(${accuracyResults.testedAt})`.as('date'),
        passed: sql`COUNT(*) FILTER (WHERE ${accuracyResults.passed})`.as('passed'),
        total: sql`COUNT(*)`.as('total'),
      })
      .from(accuracyResults)
      .innerJoin(accuracyTests, eq(accuracyResults.testId, accuracyTests.id))
      .where(
        and(
          eq(accuracyTests.schemaId, schemaId),
          gte(accuracyResults.testedAt, startDate)
        )
      )
      .groupBy(sql`DATE(${accuracyResults.testedAt})`)
      .orderBy(sql`DATE(${accuracyResults.testedAt})`);

    return results.map(r => ({
      date: new Date(r.date as string),
      accuracy: Number(r.total) > 0 ? Number(r.passed) / Number(r.total) : 0,
      testsRun: Number(r.total),
    }));
  }
}

// Singleton instance
export const accuracyAnalyzerService = new AccuracyAnalyzerService();
