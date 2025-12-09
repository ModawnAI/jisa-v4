/**
 * RAG Evaluation Test Runner
 *
 * Executes test cases against the RAG system and evaluates responses
 * against ground truth data. Supports both RAG V1 and V2 architectures.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  TestCase,
  TestSuite,
  TestResult,
  TestSuiteResult,
  EvaluationReport,
  EvaluationConfig,
  CorrectnessMetrics,
  RetrievalMetrics,
  ResponseMetrics,
  ValidationRule,
  GroundTruth,
  TestCategory,
  TestDifficulty,
} from './types';
import { DEFAULT_EVALUATION_CONFIG } from './types';

// Dynamic imports for RAG services (to avoid circular dependencies)
let enhancedRagService: typeof import('../../lib/services/enhanced-rag.service') | null = null;

async function getEnhancedRagService() {
  if (!enhancedRagService) {
    enhancedRagService = await import('../../lib/services/enhanced-rag.service');
  }
  return enhancedRagService;
}

/**
 * Ground truth accessor with JSON path support
 */
function getGroundTruthValue(groundTruth: GroundTruth, pathStr: string): unknown {
  const parts = pathStr.split('.');
  let current: unknown = groundTruth;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    // Handle array indexing like employees[0] or employees[sabon=J00001]
    const arrayMatch = part.match(/^(\w+)\[(.+)\]$/);
    if (arrayMatch) {
      const [, arrayName, indexOrQuery] = arrayMatch;
      const arr = (current as Record<string, unknown>)[arrayName] as unknown[];
      if (!Array.isArray(arr)) return undefined;

      // Check if it's a query like sabon=J00001
      if (indexOrQuery.includes('=')) {
        const [key, value] = indexOrQuery.split('=');
        current = arr.find(
          (item) => (item as Record<string, unknown>)[key] === value
        );
      } else {
        current = arr[parseInt(indexOrQuery)];
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

/**
 * Transform ground truth values using predefined functions
 */
function transformValue(value: unknown, transformName: string): unknown {
  const transforms: Record<string, (v: unknown) => unknown> = {
    toNumber: (v: unknown) => Number(v),
    toString: (v: unknown) => String(v),
    toPercent: (v) => Number(v) * 100,
    toMillions: (v) => Number(v) / 1000000,
    formatCurrency: (v) => new Intl.NumberFormat('ko-KR').format(Number(v)),
    sum: (v) =>
      Array.isArray(v) ? v.reduce((a, b) => Number(a) + Number(b), 0) : v,
    count: (v) => (Array.isArray(v) ? v.length : 1),
    avg: (v) =>
      Array.isArray(v)
        ? v.reduce((a, b) => Number(a) + Number(b), 0) / v.length
        : v,
    max: (v) => (Array.isArray(v) ? Math.max(...v.map(Number)) : v),
    min: (v) => (Array.isArray(v) ? Math.min(...v.map(Number)) : v),
  };

  return transforms[transformName] ? transforms[transformName](value) : value;
}

/**
 * Calculate text similarity using Levenshtein distance
 */
function calculateTextSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(s1.length, s2.length);
  return 1 - matrix[s1.length][s2.length] / maxLen;
}

/**
 * Extract numeric value from response text
 * Prefers currency amounts (with 원, ₩, comma formatting) over IDs
 */
function extractNumericFromText(text: string): number | null {
  // First, try to find explicit currency amounts (higher priority)
  // Patterns: ₩45,272,186 or 45,272,186원 or 45,272,186 원
  const currencyPatterns = [
    /₩\s*([\d,]+(?:\.\d+)?)/g,  // ₩45,272,186
    /([\d,]+(?:\.\d+)?)\s*원/g,  // 45,272,186원
    /(-?[\d,]{4,}(?:\.\d+)?)/g,  // Numbers with 4+ digits (likely currency, not IDs)
  ];

  const candidates: number[] = [];

  // Try currency patterns first
  for (const pattern of currencyPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const numStr = match[1].replace(/,/g, '');
      const num = parseFloat(numStr);
      if (!isNaN(num) && num !== 0) {
        candidates.push(num);
      }
    }
    if (candidates.length > 0) break; // Stop at first pattern that finds something
  }

  // Try Korean formatted numbers (e.g., 1억 2천만, 4천5백만)
  const koreanPattern = /(\d+(?:\.\d+)?)\s*(억|천만|백만|만|천)/g;
  let koreanMatch;
  while ((koreanMatch = koreanPattern.exec(text)) !== null) {
    let num = parseFloat(koreanMatch[1]);
    const unit = koreanMatch[2];
    if (unit === '억') num *= 100000000;
    else if (unit === '천만') num *= 10000000;
    else if (unit === '백만') num *= 1000000;
    else if (unit === '만') num *= 10000;
    else if (unit === '천') num *= 1000;
    candidates.push(num);
  }

  // If no currency amounts found, try general number extraction
  // But exclude patterns that look like IDs (J00134, 134번 without currency context)
  if (candidates.length === 0) {
    // Look for numbers NOT preceded by J or followed by 번 without 원
    const generalPattern = /(?<!J)(-?[\d,]+(?:\.\d+)?)(?!번)/g;
    let match;
    while ((match = generalPattern.exec(text)) !== null) {
      const numStr = match[1].replace(/,/g, '');
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 1000) { // Only consider numbers > 1000 (likely amounts)
        candidates.push(num);
      }
    }
  }

  // Return the largest candidate (most likely to be a currency amount)
  if (candidates.length > 0) {
    return Math.max(...candidates.map(Math.abs));
  }

  return null;
}

/**
 * Validate answer against expected value
 */
function validateAnswer(
  actual: string,
  rule: ValidationRule,
  config: EvaluationConfig
): CorrectnessMetrics {
  const result: CorrectnessMetrics = {
    isCorrect: false,
    exactMatch: false,
    validationDetails: {
      rule,
      actualValue: actual,
      passed: false,
    },
  };

  try {
    switch (rule.type) {
      case 'numeric': {
        const actualNum = extractNumericFromText(actual);
        const expectedNum = Number(rule.expected);
        if (actualNum !== null) {
          const tolerance = rule.tolerance ?? config.numericTolerance;
          const diff = Math.abs(actualNum - expectedNum);
          const maxDiff = Math.abs(expectedNum) * tolerance;
          result.isCorrect = diff <= maxDiff;
          result.exactMatch = actualNum === expectedNum;
          result.numericAccuracy = 1 - diff / Math.abs(expectedNum || 1);
          result.validationDetails.passed = result.isCorrect;
          result.validationDetails.reason = result.isCorrect
            ? `Numeric match within ${tolerance * 100}% tolerance`
            : `Expected ${expectedNum}, got ${actualNum} (diff: ${diff})`;
        } else {
          result.validationDetails.reason = 'Could not extract numeric value from response';
        }
        break;
      }

      case 'numeric_range': {
        const actualNum = extractNumericFromText(actual);
        const [min, max] = rule.expected as [number, number];
        if (actualNum !== null) {
          result.isCorrect = actualNum >= min && actualNum <= max;
          result.validationDetails.passed = result.isCorrect;
          result.validationDetails.reason = result.isCorrect
            ? `Value ${actualNum} within range [${min}, ${max}]`
            : `Value ${actualNum} outside range [${min}, ${max}]`;
        }
        break;
      }

      case 'text': {
        const similarity = calculateTextSimilarity(actual, String(rule.expected));
        result.textSimilarity = similarity;
        result.exactMatch = actual.trim().toLowerCase() === String(rule.expected).trim().toLowerCase();
        result.isCorrect = similarity >= config.textSimilarityThreshold || result.exactMatch;
        result.validationDetails.passed = result.isCorrect;
        result.validationDetails.reason = result.isCorrect
          ? `Text similarity: ${(similarity * 100).toFixed(1)}%`
          : `Text similarity ${(similarity * 100).toFixed(1)}% below threshold`;
        break;
      }

      case 'text_contains': {
        const lowerActual = actual.toLowerCase();

        // Check containsAll (all terms must be present)
        const containsAllTerms = rule.containsAll || [];
        const allPresent =
          containsAllTerms.length === 0 ||
          containsAllTerms.every((term) =>
            lowerActual.includes(String(term).toLowerCase())
          );

        // Check containsAny (at least one term must be present)
        const containsAnyTerms = rule.containsAny || [];
        const anyPresent =
          containsAnyTerms.length === 0 ||
          containsAnyTerms.some((term) =>
            lowerActual.includes(String(term).toLowerCase())
          );

        // Also check legacy 'expected' array (treat as containsAll if non-empty)
        const legacyTerms = Array.isArray(rule.expected)
          ? (rule.expected as string[]).filter(t => t)
          : rule.expected ? [String(rule.expected)] : [];
        const legacyPresent =
          legacyTerms.length === 0 ||
          legacyTerms.every((term) =>
            lowerActual.includes(String(term).toLowerCase())
          );

        result.isCorrect = allPresent && anyPresent && legacyPresent;
        result.containsRequired = result.isCorrect;
        result.validationDetails.passed = result.isCorrect;

        const reasons: string[] = [];
        if (containsAllTerms.length > 0) {
          reasons.push(allPresent ? `containsAll: ✓` : `containsAll: missing`);
        }
        if (containsAnyTerms.length > 0) {
          reasons.push(anyPresent ? `containsAny: ✓` : `containsAny: none found`);
        }
        if (legacyTerms.length > 0) {
          reasons.push(legacyPresent ? `expected: ✓` : `expected: missing`);
        }
        result.validationDetails.reason = result.isCorrect
          ? `Contains all required terms: ${reasons.join(', ')}`
          : `Missing terms in response`;
        break;
      }

      case 'list': {
        const expectedList = rule.expected as string[];
        const lowerActual = actual.toLowerCase();
        const containsCount = expectedList.filter((item) =>
          lowerActual.includes(String(item).toLowerCase())
        ).length;
        result.isCorrect = containsCount >= expectedList.length * 0.8;
        result.validationDetails.passed = result.isCorrect;
        result.validationDetails.reason = `Found ${containsCount}/${expectedList.length} expected items`;
        break;
      }

      case 'boolean': {
        const lowerActual = actual.toLowerCase();
        const positiveTerms = ['yes', 'true', '예', '네', '맞', '충족', '달성', '가능'];
        const negativeTerms = ['no', 'false', '아니', '안됨', '미충족', '미달', '불가'];

        const isPositive = positiveTerms.some((t) => lowerActual.includes(t));
        const isNegative = negativeTerms.some((t) => lowerActual.includes(t));
        const expectedBool = rule.expected as boolean;

        result.isCorrect =
          (expectedBool && isPositive && !isNegative) ||
          (!expectedBool && isNegative && !isPositive);
        result.validationDetails.passed = result.isCorrect;
        result.validationDetails.reason = result.isCorrect
          ? `Boolean match: expected ${expectedBool}`
          : `Boolean mismatch: expected ${expectedBool}, response suggests ${isPositive ? 'positive' : isNegative ? 'negative' : 'unclear'}`;
        break;
      }

      case 'calculation': {
        // For calculations, extract the numeric result and verify
        const actualNum = extractNumericFromText(actual);
        const expectedNum = Number(rule.expected);
        if (actualNum !== null) {
          const tolerance = rule.tolerance ?? 0.05; // 5% default for calculations
          const diff = Math.abs(actualNum - expectedNum);
          const maxDiff = Math.abs(expectedNum) * tolerance;
          result.isCorrect = diff <= maxDiff;
          result.numericAccuracy = 1 - diff / Math.abs(expectedNum || 1);
          result.validationDetails.passed = result.isCorrect;
          result.validationDetails.reason = result.isCorrect
            ? `Calculation correct within ${tolerance * 100}% tolerance`
            : `Calculation incorrect: expected ${expectedNum}, got ${actualNum}`;
        }
        break;
      }

      case 'json': {
        try {
          // Try to extract JSON from response
          const jsonMatch = actual.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const requiredFields = rule.requiredFields || [];
            const hasAllFields = requiredFields.every(
              (f) => parsed[f] !== undefined
            );
            result.isCorrect = hasAllFields;
            result.validationDetails.passed = hasAllFields;
            result.validationDetails.reason = hasAllFields
              ? `JSON has all required fields`
              : `Missing required fields: ${requiredFields.filter((f) => parsed[f] === undefined).join(', ')}`;
          }
        } catch {
          result.validationDetails.reason = 'Could not parse JSON from response';
        }
        break;
      }
    }
  } catch (error) {
    result.validationDetails.reason = `Validation error: ${error}`;
  }

  return result;
}

/**
 * Calculate retrieval metrics
 */
function calculateRetrievalMetrics(
  sources: Array<{ id: string; score: number; preview?: string }>,
  testCase: TestCase,
  relevanceThreshold: number
): RetrievalMetrics {
  // For now, consider results above threshold as relevant
  // In a production system, you'd have ground truth relevance labels
  const relevantSources = sources.filter((s) => s.score >= relevanceThreshold);

  const precision =
    sources.length > 0 ? relevantSources.length / sources.length : 0;
  const recall = relevantSources.length > 0 ? 1 : 0; // Simplified - need ground truth
  const f1 =
    precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // Calculate MRR (Mean Reciprocal Rank)
  let mrr = 0;
  for (let i = 0; i < sources.length; i++) {
    if (sources[i].score >= relevanceThreshold) {
      mrr = 1 / (i + 1);
      break;
    }
  }

  // Calculate NDCG
  let dcg = 0;
  let idcg = 0;
  for (let i = 0; i < sources.length; i++) {
    const relevance = sources[i].score >= relevanceThreshold ? 1 : 0;
    dcg += relevance / Math.log2(i + 2);
    idcg += 1 / Math.log2(i + 2);
  }
  const ndcg = idcg > 0 ? dcg / idcg : 0;

  return {
    retrievedCount: sources.length,
    relevantCount: relevantSources.length,
    precision,
    recall,
    f1Score: f1,
    mrr,
    ndcg,
    avgScore:
      sources.length > 0
        ? sources.reduce((sum, s) => sum + s.score, 0) / sources.length
        : 0,
    sources: sources.map((s) => ({
      id: s.id,
      score: s.score,
      relevant: s.score >= relevanceThreshold,
    })),
  };
}

/**
 * Execute a single test case
 */
async function executeTestCase(
  testCase: TestCase,
  groundTruth: GroundTruth,
  config: EvaluationConfig
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const ragModule = await getEnhancedRagService();

    // Prepare RAG context with required fields
    const employeeNumber = testCase.context?.employeeNumber || 'J00134';
    const ragContext = {
      employeeId: testCase.context?.employeeId || 'test-user-uuid',
      employeeNumber: employeeNumber,
      organizationId: 'test-org',
      namespace: `emp_${employeeNumber}`, // Required namespace
      sessionId: `test-${testCase.id}-${Date.now()}`,
      useV2: config.ragVersion === 'v2',
      additionalNamespaces: ['org_shared'], // Include shared namespace
    };

    // Execute RAG query using the singleton service
    const ragResult = await ragModule.enhancedRAGService.query(
      testCase.query,
      ragContext
    );

    // Get expected value from ground truth
    let expectedValue = getGroundTruthValue(
      groundTruth,
      testCase.groundTruthSource.path
    );
    if (testCase.groundTruthSource.transform && expectedValue !== undefined) {
      expectedValue = transformValue(
        expectedValue,
        testCase.groundTruthSource.transform
      );
    }

    // Update validation rule with ground truth value
    // For numeric types, always use ground truth (0 is a placeholder, not a real expected value)
    // For text_contains, DON'T modify expected - it uses containsAll/containsAny instead
    const shouldUseGroundTruth =
      expectedValue !== undefined && (
        // Numeric type with placeholder 0
        (testCase.expectedAnswer.type === 'numeric' && testCase.expectedAnswer.expected === 0) ||
        // Numeric range with placeholder
        (testCase.expectedAnswer.type === 'numeric_range' && testCase.expectedAnswer.expected === 0) ||
        // Boolean type
        (testCase.expectedAnswer.type === 'boolean' && testCase.expectedAnswer.expected === undefined) ||
        // Explicitly undefined/null expected (not for text_contains - it has containsAll/containsAny)
        (testCase.expectedAnswer.type !== 'text_contains' &&
          (testCase.expectedAnswer.expected === undefined || testCase.expectedAnswer.expected === null))
      );

    const validationRule: ValidationRule = {
      ...testCase.expectedAnswer,
      expected: shouldUseGroundTruth ? expectedValue : testCase.expectedAnswer.expected,
    };

    // Calculate metrics
    const responseTime = Date.now() - startTime;
    const correctnessMetrics = validateAnswer(
      ragResult.answer,
      validationRule,
      config
    );

    // Convert sources to score-based format for retrieval metrics
    const sourcesWithScores = (ragResult.searchResults || []).map((result: { id?: string; score?: number; text?: string }, idx: number) => ({
      id: result.id || `source-${idx}`,
      score: result.score || (1 - idx * 0.1), // Use score if available, otherwise rank-based
      preview: result.text?.substring(0, 200) || '',
    }));

    const retrievalMetrics = calculateRetrievalMetrics(
      sourcesWithScores,
      testCase,
      config.relevanceThreshold
    );
    const responseMetrics: ResponseMetrics = {
      responseTimeMs: responseTime,
      clarificationNeeded: ragResult.needsClarification || false,
      errorOccurred: false,
    };

    return {
      testCase,
      status: correctnessMetrics.isCorrect ? 'passed' : 'failed',
      ragResponse: {
        answer: ragResult.answer,
        sources: (ragResult.sources || []).map((s: string, idx: number) => ({
          id: s,
          preview: '',
          score: sourcesWithScores[idx]?.score || 0,
        })),
        metadata: ragResult.metadata,
      },
      metrics: {
        correctness: correctnessMetrics,
        retrieval: retrievalMetrics,
        response: responseMetrics,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      testCase,
      status: 'error',
      ragResponse: {
        answer: '',
        sources: [],
      },
      metrics: {
        correctness: {
          isCorrect: false,
          exactMatch: false,
          validationDetails: {
            rule: testCase.expectedAnswer,
            actualValue: null,
            passed: false,
            reason: `Error: ${errorMessage}`,
          },
        },
        retrieval: {
          retrievedCount: 0,
          relevantCount: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
          mrr: 0,
          ndcg: 0,
          avgScore: 0,
          sources: [],
        },
        response: {
          responseTimeMs: Date.now() - startTime,
          clarificationNeeded: false,
          errorOccurred: true,
          errorMessage,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Execute a test suite
 */
async function executeTestSuite(
  suite: TestSuite,
  groundTruth: GroundTruth,
  config: EvaluationConfig
): Promise<TestSuiteResult> {
  const startTime = Date.now();
  const results: TestResult[] = [];

  if (config.verbose) {
    console.log(`\n📋 Running Test Suite: ${suite.name}`);
    console.log(`   ${suite.testCases.length} test cases`);
    console.log('─'.repeat(50));
  }

  for (const testCase of suite.testCases) {
    // Apply filters
    if (config.testIds && !config.testIds.includes(testCase.id)) {
      results.push({
        testCase,
        status: 'skipped',
        ragResponse: { answer: '', sources: [] },
        metrics: {
          correctness: {
            isCorrect: false,
            exactMatch: false,
            validationDetails: {
              rule: testCase.expectedAnswer,
              actualValue: null,
              passed: false,
              reason: 'Skipped by filter',
            },
          },
          retrieval: {
            retrievedCount: 0,
            relevantCount: 0,
            precision: 0,
            recall: 0,
            f1Score: 0,
            mrr: 0,
            ndcg: 0,
            avgScore: 0,
            sources: [],
          },
          response: {
            responseTimeMs: 0,
            clarificationNeeded: false,
            errorOccurred: false,
          },
        },
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    if (config.verbose) {
      process.stdout.write(`   [${testCase.id}] ${testCase.name}... `);
    }

    const result = await executeTestCase(testCase, groundTruth, config);
    results.push(result);

    if (config.verbose) {
      const statusIcon =
        result.status === 'passed'
          ? '✅'
          : result.status === 'failed'
            ? '❌'
            : result.status === 'error'
              ? '💥'
              : '⏭️';
      console.log(
        `${statusIcon} (${result.metrics.response.responseTimeMs}ms)`
      );
    }

    // Small delay between tests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const summary = {
    totalTests: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    errors: results.filter((r) => r.status === 'error').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    passRate: 0,
    avgResponseTime: 0,
    avgRetrievalPrecision: 0,
    avgRetrievalRecall: 0,
    avgF1Score: 0,
  };

  const executedResults = results.filter(
    (r) => r.status !== 'skipped' && r.status !== 'error'
  );
  if (executedResults.length > 0) {
    summary.passRate = summary.passed / executedResults.length;
    summary.avgResponseTime =
      executedResults.reduce(
        (sum, r) => sum + r.metrics.response.responseTimeMs,
        0
      ) / executedResults.length;
    summary.avgRetrievalPrecision =
      executedResults.reduce(
        (sum, r) => sum + r.metrics.retrieval.precision,
        0
      ) / executedResults.length;
    summary.avgRetrievalRecall =
      executedResults.reduce((sum, r) => sum + r.metrics.retrieval.recall, 0) /
      executedResults.length;
    summary.avgF1Score =
      executedResults.reduce((sum, r) => sum + r.metrics.retrieval.f1Score, 0) /
      executedResults.length;
  }

  if (config.verbose) {
    console.log('─'.repeat(50));
    console.log(
      `   Summary: ${summary.passed}/${summary.totalTests - summary.skipped} passed (${(summary.passRate * 100).toFixed(1)}%)`
    );
  }

  return {
    suite,
    results,
    summary,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

/**
 * Main evaluation runner
 */
export async function runEvaluation(
  testSuites: TestSuite[],
  groundTruth: GroundTruth,
  config: Partial<EvaluationConfig> = {}
): Promise<EvaluationReport> {
  const fullConfig: EvaluationConfig = {
    ...DEFAULT_EVALUATION_CONFIG,
    ...config,
  };

  const startTime = Date.now();
  const suiteResults: TestSuiteResult[] = [];

  console.log('\n🧪 RAG EVALUATION TEST RUNNER');
  console.log('═'.repeat(60));
  console.log(`Configuration:`);
  console.log(`  - RAG Version: ${fullConfig.ragVersion}`);
  console.log(`  - Reranking: ${fullConfig.useReranking}`);
  console.log(`  - Top-K: ${fullConfig.topK}`);
  console.log(`  - Rerank Top-N: ${fullConfig.rerankTopN}`);
  console.log('═'.repeat(60));

  // Filter suites by category if specified
  let filteredSuites = testSuites;
  if (fullConfig.categories) {
    filteredSuites = testSuites.filter((s) =>
      fullConfig.categories!.includes(s.category)
    );
  }

  for (const suite of filteredSuites) {
    const suiteResult = await executeTestSuite(suite, groundTruth, fullConfig);
    suiteResults.push(suiteResult);
  }

  // Calculate overall summary
  const allResults = suiteResults.flatMap((sr) => sr.results);
  const byCategory: EvaluationReport['overallSummary']['byCategory'] = {};
  const byDifficulty: EvaluationReport['overallSummary']['byDifficulty'] = {};

  for (const result of allResults) {
    const category = result.testCase.category;
    const difficulty = result.testCase.difficulty;

    if (!byCategory[category]) {
      byCategory[category] = { total: 0, passed: 0, passRate: 0 };
    }
    byCategory[category]!.total++;
    if (result.status === 'passed') byCategory[category]!.passed++;

    if (!byDifficulty[difficulty]) {
      byDifficulty[difficulty] = { total: 0, passed: 0, passRate: 0 };
    }
    byDifficulty[difficulty]!.total++;
    if (result.status === 'passed') byDifficulty[difficulty]!.passed++;
  }

  // Calculate pass rates
  for (const cat of Object.keys(byCategory) as TestCategory[]) {
    byCategory[cat]!.passRate =
      byCategory[cat]!.total > 0
        ? byCategory[cat]!.passed / byCategory[cat]!.total
        : 0;
  }
  for (const diff of Object.keys(byDifficulty) as TestDifficulty[]) {
    byDifficulty[diff]!.passRate =
      byDifficulty[diff]!.total > 0
        ? byDifficulty[diff]!.passed / byDifficulty[diff]!.total
        : 0;
  }

  const executedCount = allResults.filter(
    (r) => r.status !== 'skipped'
  ).length;
  const passedCount = allResults.filter((r) => r.status === 'passed').length;

  const report: EvaluationReport = {
    id: `eval-${Date.now()}`,
    name: `RAG Evaluation ${new Date().toISOString().split('T')[0]}`,
    description: `Comprehensive RAG evaluation with ${testSuites.length} test suites`,
    suiteResults,
    overallSummary: {
      totalSuites: suiteResults.length,
      totalTests: allResults.length,
      passed: passedCount,
      failed: allResults.filter((r) => r.status === 'failed').length,
      errors: allResults.filter((r) => r.status === 'error').length,
      skipped: allResults.filter((r) => r.status === 'skipped').length,
      overallPassRate: executedCount > 0 ? passedCount / executedCount : 0,
      byCategory,
      byDifficulty,
    },
    configuration: {
      ragVersion: fullConfig.ragVersion,
      useReranking: fullConfig.useReranking,
      topK: fullConfig.topK,
      rerankTopN: fullConfig.rerankTopN,
      embeddingModel: 'text-embedding-3-large',
      rerankModel: fullConfig.useReranking ? 'cohere-rerank-3.5' : undefined,
    },
    timestamp: new Date().toISOString(),
    totalDuration: Date.now() - startTime,
  };

  // Print final summary
  console.log('\n═'.repeat(60));
  console.log('📊 EVALUATION COMPLETE');
  console.log('═'.repeat(60));
  console.log(
    `Overall: ${report.overallSummary.passed}/${executedCount} tests passed (${(report.overallSummary.overallPassRate * 100).toFixed(1)}%)`
  );
  console.log(`\nBy Category:`);
  for (const [cat, stats] of Object.entries(byCategory)) {
    console.log(
      `  ${cat}: ${stats!.passed}/${stats!.total} (${(stats!.passRate * 100).toFixed(1)}%)`
    );
  }
  console.log(`\nBy Difficulty:`);
  for (const [diff, stats] of Object.entries(byDifficulty)) {
    console.log(
      `  ${diff}: ${stats!.passed}/${stats!.total} (${(stats!.passRate * 100).toFixed(1)}%)`
    );
  }
  console.log(`\nTotal Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);

  // Save results if configured
  if (fullConfig.saveResults && fullConfig.outputPath) {
    const outputDir = fullConfig.outputPath;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputFile = path.join(outputDir, `${report.id}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\nResults saved to: ${outputFile}`);
  }

  return report;
}

/**
 * Load ground truth from file
 */
export function loadGroundTruth(filePath: string): GroundTruth {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as GroundTruth;
}

/**
 * Load test suites from file
 */
export function loadTestSuites(filePath: string): TestSuite[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as TestSuite[];
}
