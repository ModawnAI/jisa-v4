/**
 * Extensive RAG Test for Employee J00134
 *
 * Tests various query types to evaluate RAG accuracy
 * Uses the same approach as comprehensive-rag-test-j00307.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables BEFORE any other imports
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Verify environment
const requiredEnvVars = ['DATABASE_URL', 'PINECONE_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const EMPLOYEE_ID = 'J00134';

interface TestCase {
  category: string;
  query: string;
  expectedFields?: string[];
}

const testCases: TestCase[] = [
  // === Basic Information Queries ===
  { category: 'basic', query: '내 정보 알려줘', expectedFields: ['employeeId', 'name'] },
  { category: 'basic', query: '내 사번이 뭐야?', expectedFields: ['employeeId'] },
  { category: 'basic', query: '내 이름이 뭐야?', expectedFields: ['name'] },
  { category: 'basic', query: '내 소속 알려줘', expectedFields: ['department', 'branch'] },
  { category: 'basic', query: '내 직종이 뭐야?', expectedFields: ['jobType'] },

  // === Compensation Queries ===
  { category: 'compensation', query: '내 수당 알려줘', expectedFields: ['commission', 'totalCommission'] },
  { category: 'compensation', query: '내 총 수수료 얼마야?', expectedFields: ['totalCommission'] },
  { category: 'compensation', query: '내 커미션 얼마야?', expectedFields: ['commission'] },
  { category: 'compensation', query: '이번달 수당 내역 보여줘', expectedFields: ['commission'] },
  { category: 'compensation', query: '수당 상세내역 알려줘', expectedFields: ['commission', 'bonus'] },
  { category: 'compensation', query: '내 보너스 있어?', expectedFields: ['bonus'] },
  { category: 'compensation', query: '지급 예정 금액 알려줘', expectedFields: ['totalCommission', 'paymentAmount'] },

  // === Period-specific Queries ===
  { category: 'period', query: '9월 수당 알려줘', expectedFields: ['period', 'commission'] },
  { category: 'period', query: '2025년 9월 실적 알려줘', expectedFields: ['period'] },
  { category: 'period', query: '이번달 실적 보여줘', expectedFields: ['period'] },
  { category: 'period', query: '지난달 수당은?', expectedFields: ['period', 'commission'] },
  { category: 'period', query: '최근 수당 내역', expectedFields: ['period'] },

  // === Performance/Contract Queries ===
  { category: 'performance', query: '내 실적 알려줘', expectedFields: ['contracts', 'performance'] },
  { category: 'performance', query: '계약 건수 알려줘', expectedFields: ['contractCount', 'contracts'] },
  { category: 'performance', query: '이번달 계약 몇 건이야?', expectedFields: ['contractCount'] },
  { category: 'performance', query: '내 FYC 얼마야?', expectedFields: ['fyc', 'fycAmount'] },
  { category: 'performance', query: 'MFYC 알려줘', expectedFields: ['mfyc'] },
  { category: 'performance', query: '신계약 실적 보여줘', expectedFields: ['newContracts'] },

  // === MDRT Queries ===
  { category: 'mdrt', query: 'MDRT 달성률 알려줘', expectedFields: ['mdrt', 'achievementRate'] },
  { category: 'mdrt', query: 'MDRT 현황 보여줘', expectedFields: ['mdrt'] },
  { category: 'mdrt', query: 'MDRT 얼마나 남았어?', expectedFields: ['mdrt', 'remaining'] },
  { category: 'mdrt', query: 'COT 달성 가능해?', expectedFields: ['cot'] },
  { category: 'mdrt', query: 'TOT 기준 얼마야?', expectedFields: ['tot'] },

  // === Calculation Queries ===
  { category: 'calculation', query: '내 평균 수수료율 얼마야?', expectedFields: ['rate', 'commissionRate'] },
  { category: 'calculation', query: '목표 대비 달성률 알려줘', expectedFields: ['achievementRate', 'target'] },
  { category: 'calculation', query: '연간 누적 실적 얼마야?', expectedFields: ['yearlyTotal', 'cumulative'] },
  { category: 'calculation', query: '월평균 수당 얼마야?', expectedFields: ['average', 'monthlyAverage'] },

  // === Comparison Queries ===
  { category: 'comparison', query: '지난달과 비교해줘', expectedFields: ['comparison', 'difference'] },
  { category: 'comparison', query: '작년 동기 대비 실적은?', expectedFields: ['yearOverYear'] },
  { category: 'comparison', query: '전월 대비 증감률', expectedFields: ['growthRate'] },

  // === Complex/Mixed Queries ===
  { category: 'complex', query: '9월 수당이랑 MDRT 현황 알려줘', expectedFields: ['commission', 'mdrt'] },
  { category: 'complex', query: '내 모든 수당 내역 상세하게 알려줘', expectedFields: ['commission', 'details'] },
  { category: 'complex', query: '이번달 실적이랑 수당 요약해줘', expectedFields: ['performance', 'commission'] },

  // === Korean Natural Language Variations ===
  { category: 'natural', query: '수당 좀 확인해주세요', expectedFields: ['commission'] },
  { category: 'natural', query: '제 급여가 궁금해요', expectedFields: ['commission', 'payment'] },
  { category: 'natural', query: '얼마 받아요?', expectedFields: ['totalAmount'] },
  { category: 'natural', query: '돈 얼마야', expectedFields: ['totalAmount'] },
  { category: 'natural', query: '실적 확인', expectedFields: ['performance'] },

  // === Edge Cases ===
  { category: 'edge', query: '수당', expectedFields: ['commission'] },
  { category: 'edge', query: 'MDRT', expectedFields: ['mdrt'] },
  { category: 'edge', query: '정보', expectedFields: [] },
  { category: 'edge', query: '뭐야', expectedFields: [] },
];

interface TestResult {
  category: string;
  query: string;
  success: boolean;
  hasResponse: boolean;
  responseLength: number;
  hasNumericValues: boolean;
  executionTime: number;
  route?: string;
  routeConfidence?: number;
  error?: string;
  responsePreview?: string;
}

async function main() {
  // Dynamic imports AFTER env vars are loaded
  const { queryRouterService } = await import('@/lib/services/query-router.service');
  const { enhancedRAGService } = await import('@/lib/services/enhanced-rag.service');
  const { db } = await import('@/lib/db');
  const { employees } = await import('@/lib/db/schema/employees');
  const { eq } = await import('drizzle-orm');

  console.log('='.repeat(80));
  console.log(`EXTENSIVE RAG TEST FOR EMPLOYEE ${EMPLOYEE_ID}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Total test cases: ${testCases.length}`);
  console.log('='.repeat(80));
  console.log();

  // Get employee from database
  console.log('Looking up employee in database...');
  const employee = await db
    .select()
    .from(employees)
    .where(eq(employees.employeeId, EMPLOYEE_ID))
    .limit(1);

  if (employee.length === 0) {
    console.log(`Employee ${EMPLOYEE_ID} not found in database`);
    process.exit(1);
  }

  const dbEmployee = employee[0];
  const namespace = `emp_${dbEmployee.employeeId}`;

  console.log(`Found employee: ${dbEmployee.name} (${dbEmployee.employeeId})`);
  console.log(`Database ID: ${dbEmployee.id}`);
  console.log(`Namespace: ${namespace}`);
  console.log();

  async function runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Step 1: Router decision
      const routerDecision = await queryRouterService.route(testCase.query);
      const route = routerDecision.route;
      const routeConfidence = routerDecision.confidence;

      let response = '';

      if (route === 'instant') {
        response = routerDecision.response || 'No response';
      } else if (route === 'clarify') {
        response = routerDecision.clarifyQuestion || 'Need clarification';
      } else if (route === 'rag') {
        // Execute RAG query
        const ragContext = {
          employeeId: dbEmployee.employeeId,
          organizationId: 'default',
          namespace: namespace,
          sessionId: `test_${Date.now()}`,
          clearanceLevel: 'advanced' as const,
        };

        const ragResponse = await enhancedRAGService.query(testCase.query, ragContext);
        response = ragResponse.answer;
      } else {
        response = routerDecision.response || 'Fallback response';
      }

      const executionTime = Date.now() - startTime;
      const hasResponse = !!response && response.length > 0;
      const hasNumericValues = /\d/.test(response || '');

      return {
        category: testCase.category,
        query: testCase.query,
        success: hasResponse,
        hasResponse,
        responseLength: response?.length || 0,
        hasNumericValues,
        executionTime,
        route,
        routeConfidence,
        responsePreview: response?.substring(0, 200) || '',
      };
    } catch (error) {
      return {
        category: testCase.category,
        query: testCase.query,
        success: false,
        hasResponse: false,
        responseLength: 0,
        hasNumericValues: false,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  const results: TestResult[] = [];
  const categoryStats: Record<string, { total: number; passed: number; totalTime: number }> = {};

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`[${i + 1}/${testCases.length}] Testing: "${testCase.query}" (${testCase.category})`);

    const result = await runTest(testCase);
    results.push(result);

    // Update category stats
    if (!categoryStats[testCase.category]) {
      categoryStats[testCase.category] = { total: 0, passed: 0, totalTime: 0 };
    }
    categoryStats[testCase.category].total++;
    if (result.success) categoryStats[testCase.category].passed++;
    categoryStats[testCase.category].totalTime += result.executionTime;

    // Log result
    const status = result.success ? 'PASS' : 'FAIL';
    const routeInfo = result.route ? ` [${result.route}]` : '';
    console.log(`  ${status} (${result.executionTime}ms, ${result.responseLength} chars)${routeInfo}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    if (result.responsePreview) {
      console.log(`  Preview: ${result.responsePreview.substring(0, 100)}...`);
    }
    console.log();

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log('='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log();

  const totalPassed = results.filter(r => r.success).length;
  const totalTests = results.length;
  const overallAccuracy = ((totalPassed / totalTests) * 100).toFixed(1);

  console.log(`Overall: ${totalPassed}/${totalTests} passed (${overallAccuracy}%)`);
  console.log();

  console.log('By Category:');
  console.log('-'.repeat(60));
  for (const [category, stats] of Object.entries(categoryStats).sort((a, b) => a[0].localeCompare(b[0]))) {
    const accuracy = ((stats.passed / stats.total) * 100).toFixed(1);
    const avgTime = (stats.totalTime / stats.total).toFixed(0);
    console.log(`  ${category.padEnd(15)} ${stats.passed}/${stats.total} (${accuracy}%) avg: ${avgTime}ms`);
  }
  console.log();

  // Route distribution
  const routeStats: Record<string, number> = {};
  for (const r of results) {
    if (r.route) {
      routeStats[r.route] = (routeStats[r.route] || 0) + 1;
    }
  }
  console.log('Route Distribution:');
  console.log('-'.repeat(60));
  for (const [route, count] of Object.entries(routeStats)) {
    console.log(`  ${route.padEnd(15)} ${count} queries (${((count / totalTests) * 100).toFixed(1)}%)`);
  }
  console.log();

  // Print failures
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('Failed Tests:');
    console.log('-'.repeat(60));
    for (const failure of failures) {
      console.log(`  [${failure.category}] "${failure.query}"`);
      if (failure.error) {
        console.log(`    Error: ${failure.error}`);
      }
    }
    console.log();
  }

  // Print response statistics
  const responseLengths = results.filter(r => r.success).map(r => r.responseLength);
  const avgLength = responseLengths.length > 0
    ? (responseLengths.reduce((a, b) => a + b, 0) / responseLengths.length).toFixed(0)
    : 0;
  const withNumbers = results.filter(r => r.hasNumericValues).length;

  console.log('Response Statistics:');
  console.log('-'.repeat(60));
  console.log(`  Average response length: ${avgLength} chars`);
  console.log(`  Responses with numeric values: ${withNumbers}/${totalTests} (${((withNumbers / totalTests) * 100).toFixed(1)}%)`);
  console.log();

  // Print timing statistics
  const times = results.map(r => r.executionTime);
  const avgTime = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0);
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);

  console.log('Timing Statistics:');
  console.log('-'.repeat(60));
  console.log(`  Average: ${avgTime}ms`);
  console.log(`  Min: ${minTime}ms`);
  console.log(`  Max: ${maxTime}ms`);
  console.log(`  Total: ${times.reduce((a, b) => a + b, 0)}ms`);
  console.log();

  console.log('='.repeat(80));
  console.log(`Completed at: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
}

main().catch(console.error);
