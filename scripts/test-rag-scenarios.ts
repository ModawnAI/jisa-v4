/**
 * RAG Query Testing Script
 *
 * Tests the RAG pipeline with realistic queries across different scenarios:
 * - Instant responses (greetings, thanks)
 * - RAG queries (compensation, MDRT lookups)
 * - Clarification-needed queries (ambiguous)
 * - Fallback queries (out of scope)
 *
 * Run: npx tsx scripts/test-rag-scenarios.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local first, then .env - MUST be before any other imports
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Verify environment
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set after loading .env.local');
  console.log('Environment vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('SUPABASE')));
  process.exit(1);
}

// Now dynamically import the rest
async function run() {
  const { queryRouterService } = await import('@/lib/services/query-router.service');
  const { queryUnderstandingService } = await import('@/lib/services/query-understanding.service');
  // Note: ragMetricsService and db imports skipped - table may not exist yet

  // Test query scenarios
  const TEST_SCENARIOS = {
    instant: {
      description: 'Instant Response Queries (greetings, simple)',
      queries: [
        '안녕하세요',
        '안녕',
        '반가워요',
        '고마워요',
        '감사합니다',
        '수고하세요',
        '도움이 필요해요',
        '뭐해?',
        '오늘 날씨 어때?',
        '잘 있어',
      ],
    },
    rag_compensation: {
      description: 'RAG Queries - Compensation Lookups',
      queries: [
        '내 수수료 알려줘',
        '이번 달 최종지급액은?',
        '11월 급여 얼마야?',
        '내 총수입 확인해줘',
        '환수금액 얼마야?',
        '지난달 수수료 내역',
        '메리츠화재 계약 수수료',
        '삼성생명 계약 건',
        '내 계약 몇 개야?',
        '오버라이드 수입',
      ],
    },
    rag_performance: {
      description: 'RAG Queries - Performance/Achievement Lookups (natural Korean)',
      queries: [
        '올해 실적 달성률 알려줘',
        '목표 달성 기준 얼마야?',
        '실적 목표 달성했나?',
        '올해 실적 진척도',
        '내 초년도 수수료 얼마야?',
        '연간 보험료 확인해줘',
        '목표 달성하려면 얼마나 더 필요해?',
        '목표까지 남은 금액',
      ],
    },
    clarify: {
      description: 'Ambiguous Queries (needs clarification)',
      queries: [
        '얼마야?',
        '확인해줘',
        '내역',
        '계약',
        '수수료',
        '정보',
        '알려줘',
        '?',
        '뭐지',
      ],
    },
    fallback: {
      description: 'Out of Scope Queries (fallback)',
      queries: [
        '주식 추천해줘',
        '비트코인 가격',
        '오늘 점심 뭐 먹지?',
        '날씨 알려줘',
        '영화 추천해줘',
        '코드 작성해줘',
        '피자 주문해줘',
        '농담 해줘',
      ],
    },
  };

  interface TestResult {
    scenario: string;
    query: string;
    route: string;
    confidence: number;
    processingTimeMs: number;
    response?: string;
    intent?: {
      intent: { intent: string; template: string; confidence: number };
      processingTimeMs: number;
    };
    error?: string;
  }

  interface ScenarioSummary {
    scenario: string;
    description: string;
    totalQueries: number;
    avgProcessingTimeMs: number;
    routeDistribution: Record<string, number>;
    avgConfidence: number;
    successRate: number;
  }

  /**
   * Run a single query test
   */
  async function runQueryTest(query: string, scenario: string): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Stage 0: Router decision
      const routerDecision = await queryRouterService.route(query);

      const result: TestResult = {
        scenario,
        query,
        route: routerDecision.route,
        confidence: routerDecision.confidence,
        processingTimeMs: routerDecision.processingTimeMs,
        response: routerDecision.response || routerDecision.clarifyQuestion,
      };

      // If RAG route, also run query understanding (but don't execute full RAG)
      if (routerDecision.route === 'rag') {
        try {
          const intentResult = await queryUnderstandingService.analyzeQuery(query);
          result.intent = {
            intent: {
              intent: intentResult.intent.intent,
              template: intentResult.intent.template,
              confidence: intentResult.intent.confidence,
            },
            processingTimeMs: intentResult.processingTimeMs,
          };
          result.processingTimeMs += intentResult.processingTimeMs;
        } catch (error) {
          console.warn(`  Intent analysis failed: ${error}`);
        }
      }

      // Skip metrics recording - table may not exist
      // await ragMetricsService.recordSimpleMetric({...});

      return result;
    } catch (error) {
      return {
        scenario,
        query,
        route: 'error',
        confidence: 0,
        processingTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run all tests for a scenario
   */
  async function runScenarioTests(
    scenarioKey: string,
    scenario: { description: string; queries: string[] }
  ): Promise<TestResult[]> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Scenario: ${scenario.description}`);
    console.log(`${'='.repeat(60)}`);

    const results: TestResult[] = [];

    for (const query of scenario.queries) {
      console.log(`\n  Testing: "${query}"`);
      const result = await runQueryTest(query, scenarioKey);

      console.log(`    Route: ${result.route} (confidence: ${result.confidence.toFixed(2)})`);
      console.log(`    Time: ${result.processingTimeMs}ms`);

      if (result.response) {
        console.log(`    Response: ${result.response.substring(0, 60)}...`);
      }

      if (result.intent) {
        console.log(`    Intent: ${result.intent.intent.intent} (template: ${result.intent.intent.template})`);
      }

      if (result.error) {
        console.log(`    ERROR: ${result.error}`);
      }

      results.push(result);

      // Small delay between queries
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Summarize scenario results
   */
  function summarizeScenario(
    scenarioKey: string,
    description: string,
    results: TestResult[]
  ): ScenarioSummary {
    const routeDistribution: Record<string, number> = {};
    let totalTime = 0;
    let totalConfidence = 0;
    let successCount = 0;

    for (const result of results) {
      routeDistribution[result.route] = (routeDistribution[result.route] || 0) + 1;
      totalTime += result.processingTimeMs;
      totalConfidence += result.confidence;
      if (!result.error) successCount++;
    }

    return {
      scenario: scenarioKey,
      description,
      totalQueries: results.length,
      avgProcessingTimeMs: Math.round(totalTime / results.length),
      routeDistribution,
      avgConfidence: totalConfidence / results.length,
      successRate: successCount / results.length,
    };
  }

  /**
   * Query existing metrics from database
   */
  async function analyzeExistingMetrics() {
    console.log(`\n${'='.repeat(60)}`);
    console.log('Analyzing Existing Metrics from Database');
    console.log(`${'='.repeat(60)}`);

    // Dynamic imports for database operations
    const { db } = await import('@/lib/db');
    const { ragMetrics } = await import('@/lib/db/schema/rag-metrics');
    const { sql, gte, desc } = await import('drizzle-orm');

    // Last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Route distribution
    const routeStats = await db
      .select({
        route: ragMetrics.route,
        count: sql<number>`count(*)::int`,
        avgTime: sql<number>`avg(total_time_ms)::int`,
        avgConfidence: sql<number>`avg(route_confidence)::float`,
      })
      .from(ragMetrics)
      .where(gte(ragMetrics.createdAt, since))
      .groupBy(ragMetrics.route);

    console.log('\nRoute Distribution (last 24h):');
    console.log('-'.repeat(50));
    for (const stat of routeStats) {
      console.log(
        `  ${stat.route.padEnd(10)} | Count: ${String(stat.count).padStart(4)} | Avg Time: ${String(stat.avgTime || 0).padStart(5)}ms | Confidence: ${(stat.avgConfidence || 0).toFixed(2)}`
      );
    }

    // Intent distribution
    const intentStats = await db
      .select({
        intentType: ragMetrics.intentType,
        count: sql<number>`count(*)::int`,
      })
      .from(ragMetrics)
      .where(gte(ragMetrics.createdAt, since))
      .groupBy(ragMetrics.intentType);

    console.log('\nIntent Distribution:');
    console.log('-'.repeat(50));
    for (const stat of intentStats) {
      if (stat.intentType) {
        console.log(`  ${(stat.intentType || 'null').padEnd(15)} | Count: ${stat.count}`);
      }
    }

    // Recent queries sample
    const recentQueries = await db
      .select({
        query: ragMetrics.query,
        route: ragMetrics.route,
        totalTimeMs: ragMetrics.totalTimeMs,
        createdAt: ragMetrics.createdAt,
      })
      .from(ragMetrics)
      .orderBy(desc(ragMetrics.createdAt))
      .limit(10);

    console.log('\nRecent Queries:');
    console.log('-'.repeat(50));
    for (const q of recentQueries) {
      const timeStr = q.createdAt ? new Date(q.createdAt).toLocaleTimeString() : 'N/A';
      console.log(`  [${timeStr}] ${q.route.padEnd(8)} | ${q.query.substring(0, 40)}`);
    }

    // Success rate
    const successStats = await db
      .select({
        successful: ragMetrics.successful,
        count: sql<number>`count(*)::int`,
      })
      .from(ragMetrics)
      .where(gte(ragMetrics.createdAt, since))
      .groupBy(ragMetrics.successful);

    const total = successStats.reduce((sum: number, s: { successful: boolean | null; count: number }) => sum + s.count, 0);
    const successCount = successStats.find((s: { successful: boolean | null; count: number }) => s.successful)?.count || 0;

    console.log('\nOverall Stats:');
    console.log('-'.repeat(50));
    console.log(`  Total Queries: ${total}`);
    console.log(`  Success Rate: ${total > 0 ? ((successCount / total) * 100).toFixed(1) : 0}%`);

    return {
      routeStats,
      intentStats,
      recentQueries,
      totalQueries: total,
      successRate: total > 0 ? successCount / total : 0,
    };
  }

  // Main execution
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       RAG Pipeline Query Scenario Testing                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  console.log('\n✓ Environment check passed');
  console.log(`  - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY?.substring(0, 10)}...`);
  console.log(`  - DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 30)}...`);

  const allResults: TestResult[] = [];
  const summaries: ScenarioSummary[] = [];

  // Run each scenario
  for (const [key, scenario] of Object.entries(TEST_SCENARIOS)) {
    const results = await runScenarioTests(key, scenario);
    allResults.push(...results);
    summaries.push(summarizeScenario(key, scenario.description, results));
  }

  // Print summary
  console.log(`\n\n${'═'.repeat(70)}`);
  console.log('SUMMARY REPORT');
  console.log(`${'═'.repeat(70)}`);

  for (const summary of summaries) {
    console.log(`\n${summary.description}`);
    console.log('-'.repeat(50));
    console.log(`  Queries: ${summary.totalQueries}`);
    console.log(`  Avg Time: ${summary.avgProcessingTimeMs}ms`);
    console.log(`  Avg Confidence: ${summary.avgConfidence.toFixed(2)}`);
    console.log(`  Success Rate: ${(summary.successRate * 100).toFixed(1)}%`);
    console.log(`  Route Distribution:`);
    for (const [route, count] of Object.entries(summary.routeDistribution)) {
      const percent = ((count / summary.totalQueries) * 100).toFixed(0);
      console.log(`    - ${route}: ${count} (${percent}%)`);
    }
  }

  // Expected vs Actual route matching
  console.log(`\n\n${'═'.repeat(70)}`);
  console.log('ROUTE ACCURACY ANALYSIS');
  console.log(`${'═'.repeat(70)}`);

  const expectedRoutes: Record<string, string> = {
    instant: 'instant',
    rag_compensation: 'rag',
    rag_performance: 'rag',
    clarify: 'clarify',
    fallback: 'fallback',
  };

  for (const summary of summaries) {
    const expectedRoute = expectedRoutes[summary.scenario];
    const actualCount = summary.routeDistribution[expectedRoute] || 0;
    const accuracy = ((actualCount / summary.totalQueries) * 100).toFixed(1);

    console.log(`\n${summary.description}`);
    console.log(`  Expected Route: ${expectedRoute}`);
    console.log(`  Accuracy: ${accuracy}% (${actualCount}/${summary.totalQueries})`);

    // Show misrouted queries
    const misrouted = allResults.filter(
      (r) => r.scenario === summary.scenario && r.route !== expectedRoute
    );

    if (misrouted.length > 0) {
      console.log('  Misrouted queries:');
      for (const m of misrouted) {
        console.log(`    - "${m.query}" → ${m.route} (expected: ${expectedRoute})`);
      }
    }
  }

  // Overall metrics
  const totalQueries = allResults.length;
  const totalTime = allResults.reduce((sum, r) => sum + r.processingTimeMs, 0);
  const errorCount = allResults.filter((r) => r.error).length;

  console.log(`\n\n${'═'.repeat(70)}`);
  console.log('OVERALL STATISTICS');
  console.log(`${'═'.repeat(70)}`);
  console.log(`  Total Queries Tested: ${totalQueries}`);
  console.log(`  Total Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`  Average Time per Query: ${Math.round(totalTime / totalQueries)}ms`);
  console.log(`  Error Rate: ${((errorCount / totalQueries) * 100).toFixed(1)}%`);

  // Skip DB metrics analysis - table may not exist
  // await analyzeExistingMetrics();

  console.log('\n\n✅ Testing complete!\n');
}

run().catch(console.error);
