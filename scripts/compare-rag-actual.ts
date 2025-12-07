/**
 * RAG vs Actual Data Comparison Test
 * Tests RAG responses against actual extracted data for J00307 정다운
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Verify environment
if (!process.env.DATABASE_URL || !process.env.PINECONE_API_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Actual data extracted from Excel files
const ACTUAL_DATA = {
  employee: {
    사번: 'J00307',
    사원명: '정다운',
    마감월: '202509',
    소속: '윤나래(7)',
  },
  compensation: {
    커미션계: -180653,
    FC커미션계: 5264,
    오버라이드계: 0,
    과세계: 0,
    공제계: 0,
    소득세: 0,
    주민세: 0,
    최종지급액: -180653,
  },
  contracts: {
    총계약건수: 4,
    총보험료: 105970,
    총MFYC: 29094,
    총지급수수료: 5264,
    details: [
      { 보험사: '메리츠화재', 증권번호: '6AEBO3858', 지급수수료: 0 },
      { 보험사: '메리츠화재', 증권번호: '6ADEG54423', 지급수수료: 1439 },
      { 보험사: '메리츠화재', 증권번호: '6ADGN32577', 지급수수료: 2386 },
      { 보험사: '메리츠화재', 증권번호: '6ADEG54423', 지급수수료: 1439 },
    ],
  },
  mdrt: {
    총수입: 1368110,
  },
};

interface TestQuery {
  question: string;
  expectedFields: string[];
  expectedValues: Record<string, number | string>;
  category: 'compensation' | 'contract' | 'mdrt' | 'general';
}

const TEST_QUERIES: TestQuery[] = [
  // Compensation queries
  {
    question: '내 수수료 알려줘',
    expectedFields: ['커미션계', '최종지급액'],
    expectedValues: { 커미션계: -180653, 최종지급액: -180653 },
    category: 'compensation',
  },
  {
    question: '이번 달 최종지급액은?',
    expectedFields: ['최종지급액'],
    expectedValues: { 최종지급액: -180653 },
    category: 'compensation',
  },
  {
    question: '커미션 내역 알려줘',
    expectedFields: ['커미션계', 'FC커미션계'],
    expectedValues: { 커미션계: -180653, FC커미션계: 5264 },
    category: 'compensation',
  },
  {
    question: '오버라이드 수입 얼마야?',
    expectedFields: ['오버라이드계'],
    expectedValues: { 오버라이드계: 0 },
    category: 'compensation',
  },

  // Contract queries
  {
    question: '내 계약 몇 개야?',
    expectedFields: ['계약건수'],
    expectedValues: { 계약건수: 4 },
    category: 'contract',
  },
  {
    question: '계약 내역 알려줘',
    expectedFields: ['계약건수', '총보험료', '총지급수수료'],
    expectedValues: { 계약건수: 4, 총보험료: 105970, 총지급수수료: 5264 },
    category: 'contract',
  },
  {
    question: '메리츠화재 계약 건',
    expectedFields: ['보험사'],
    expectedValues: { 계약건수: 4 },
    category: 'contract',
  },

  // MDRT queries
  {
    question: 'MDRT 총수입 알려줘',
    expectedFields: ['총수입'],
    expectedValues: { 총수입: 1368110 },
    category: 'mdrt',
  },
  {
    question: '올해 실적 어때?',
    expectedFields: ['총수입'],
    expectedValues: { 총수입: 1368110 },
    category: 'mdrt',
  },
];

interface TestResult {
  query: string;
  category: string;
  route: string;
  response: string;
  expectedValues: Record<string, number | string>;
  foundValues: Record<string, number | string | null>;
  matches: boolean;
  discrepancies: string[];
  processingTimeMs: number;
}

async function run() {
  const { queryRouterService } = await import('@/lib/services/query-router.service');
  const { queryUnderstandingService } = await import('@/lib/services/query-understanding.service');
  const { enhancedRAGService } = await import('@/lib/services/enhanced-rag.service');
  const { db } = await import('@/lib/db');
  const { employees } = await import('@/lib/db/schema/employees');
  const { eq } = await import('drizzle-orm');

  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║   RAG vs ACTUAL DATA COMPARISON TEST                                         ║');
  console.log('║   Employee: J00307 정다운                                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // Get employee from database
  const employee = await db
    .select()
    .from(employees)
    .where(eq(employees.employeeId, 'J00307'))
    .limit(1);

  if (employee.length === 0) {
    console.log('\n❌ Employee J00307 not found in database');
    console.log('   Please ensure the employee exists before running this test.');
    process.exit(1);
  }

  const dbId = employee[0].id;
  const employeeNumber = employee[0].employeeId; // J00307
  const employeeName = employee[0].name;

  console.log(`\n✓ Found employee: ${employeeName} (Number: ${employeeNumber}, DB ID: ${dbId})`);
  console.log(`   Namespace: emp_${employeeNumber}`);
  console.log('\n' + '═'.repeat(80));
  console.log('ACTUAL DATA FROM EXCEL FILES');
  console.log('═'.repeat(80));
  console.log(JSON.stringify(ACTUAL_DATA, null, 2));

  console.log('\n' + '═'.repeat(80));
  console.log('RUNNING RAG QUERIES');
  console.log('═'.repeat(80));

  const results: TestResult[] = [];

  for (const testQuery of TEST_QUERIES) {
    console.log(`\n▶ Query: "${testQuery.question}"`);
    console.log('-'.repeat(60));

    const startTime = Date.now();

    try {
      // First get router decision
      const routerDecision = await queryRouterService.route(testQuery.question);
      console.log(`   Route: ${routerDecision.route} (confidence: ${routerDecision.confidence.toFixed(2)})`);

      let response = '';
      let foundValues: Record<string, number | string | null> = {};

      if (routerDecision.route === 'rag') {
        // Use enhanced RAG service with employee context
        // NOTE: namespace uses employeeNumber (J00307), not DB UUID
        try {
          const ragContext = {
            employeeId: dbId,
            organizationId: 'default',
            namespace: `emp_${employeeNumber}`,
            sessionId: `test_${Date.now()}`,
            clearanceLevel: 'advanced' as const,
          };

          const ragResponse = await enhancedRAGService.query(
            testQuery.question,
            ragContext
          );
          response = ragResponse.answer;
          console.log(`   RAG Response: ${response.substring(0, 200)}...`);
        } catch (ragError) {
          console.log(`   RAG Error: ${ragError}`);
          response = 'RAG Error';
        }
      } else if (routerDecision.route === 'instant') {
        response = routerDecision.response || 'No response';
        console.log(`   Instant Response: ${response.substring(0, 100)}...`);
      } else if (routerDecision.route === 'clarify') {
        response = routerDecision.clarifyQuestion || 'Need clarification';
        console.log(`   Clarify: ${response}`);
      } else {
        response = routerDecision.response || 'Fallback';
        console.log(`   Fallback: ${response}`);
      }

      // Extract values from response
      const discrepancies: string[] = [];

      for (const [field, expectedValue] of Object.entries(testQuery.expectedValues)) {
        // Try to find the value in the response
        const numericExpected = typeof expectedValue === 'number' ? expectedValue : parseInt(String(expectedValue));
        const formattedExpected = numericExpected.toLocaleString();
        const absFormatted = Math.abs(numericExpected).toLocaleString();

        // Check if value appears in response
        if (response.includes(String(numericExpected)) ||
            response.includes(formattedExpected) ||
            response.includes(absFormatted)) {
          foundValues[field] = numericExpected;
          console.log(`   ✓ ${field}: ${formattedExpected} (found)`);
        } else {
          foundValues[field] = null;
          discrepancies.push(`${field}: expected ${formattedExpected}, not found in response`);
          console.log(`   ✗ ${field}: ${formattedExpected} (NOT found)`);
        }
      }

      results.push({
        query: testQuery.question,
        category: testQuery.category,
        route: routerDecision.route,
        response: response.substring(0, 500),
        expectedValues: testQuery.expectedValues,
        foundValues,
        matches: discrepancies.length === 0,
        discrepancies,
        processingTimeMs: Date.now() - startTime,
      });
    } catch (error) {
      console.log(`   ERROR: ${error}`);
      results.push({
        query: testQuery.question,
        category: testQuery.category,
        route: 'error',
        response: String(error),
        expectedValues: testQuery.expectedValues,
        foundValues: {},
        matches: false,
        discrepancies: ['Query failed with error'],
        processingTimeMs: Date.now() - startTime,
      });
    }

    // Small delay between queries
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary report
  console.log('\n\n' + '═'.repeat(80));
  console.log('COMPARISON SUMMARY');
  console.log('═'.repeat(80));

  const passedTests = results.filter((r) => r.matches).length;
  const totalTests = results.length;

  console.log(`\nOverall Accuracy: ${passedTests}/${totalTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);

  // By category
  const categories = ['compensation', 'contract', 'mdrt'];
  for (const category of categories) {
    const categoryResults = results.filter((r) => r.category === category);
    const categoryPassed = categoryResults.filter((r) => r.matches).length;
    console.log(`\n${category.toUpperCase()}: ${categoryPassed}/${categoryResults.length}`);

    for (const result of categoryResults) {
      const status = result.matches ? '✓' : '✗';
      console.log(`  ${status} "${result.query}" (${result.route})`);
      if (!result.matches && result.discrepancies.length > 0) {
        for (const d of result.discrepancies) {
          console.log(`      - ${d}`);
        }
      }
    }
  }

  // List all discrepancies
  const failedTests = results.filter((r) => !r.matches);
  if (failedTests.length > 0) {
    console.log('\n' + '═'.repeat(80));
    console.log('DETAILED DISCREPANCIES');
    console.log('═'.repeat(80));

    for (const failed of failedTests) {
      console.log(`\n▶ "${failed.query}"`);
      console.log(`  Route: ${failed.route}`);
      console.log(`  Expected: ${JSON.stringify(failed.expectedValues)}`);
      console.log(`  Found: ${JSON.stringify(failed.foundValues)}`);
      console.log(`  Response excerpt: ${failed.response.substring(0, 200)}`);
    }
  }

  // Performance stats
  const avgTime = results.reduce((sum, r) => sum + r.processingTimeMs, 0) / results.length;
  console.log(`\n\nAverage processing time: ${avgTime.toFixed(0)}ms`);

  console.log('\n✅ Comparison test complete!\n');
}

run().catch(console.error);
