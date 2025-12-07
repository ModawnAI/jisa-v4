/**
 * Comprehensive RAG Test for Employee J00307 (정다운)
 *
 * Tests the complete RAG pipeline against actual Excel data
 * Categories: Compensation, Contracts, MDRT, General, Edge Cases
 *
 * Run: npx tsx scripts/comprehensive-rag-test-j00307.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Verify environment
const requiredEnvVars = ['DATABASE_URL', 'PINECONE_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// =============================================================================
// ACTUAL DATA FROM EXCEL FILES (Ground Truth)
// =============================================================================
const ACTUAL_DATA = {
  employee: {
    사번: 'J00307',
    사원명: '정다운',
    마감월: '202509',
    소속: '윤나래(7)',
    소속경로: '수도권AL영업본부>송파성동AL영업단>성내1AL지점>윤나래(7)',
    직종: 'FC',
    위촉일: '2024-05-01',
  },
  compensation: {
    // 수수료 명세
    커미션계: -180653,
    FC커미션계: 5264,
    'FC계약모집 커미션Ⅱ': 5264,
    현금시책: 0,
    'FC계약유지 및 서비스 커미션Ⅱ': 0,
    오버라이드계: 0,
    'BM 오버라이드Ⅱ': 0,
    'MD 오버라이드Ⅱ': 0,
    '사업단장 오버라이드Ⅱ': 0,
    과세계: 0,
    공제계: 0,
    소득세: 0,
    주민세: 0,
    원천세: 0,
    최종지급액: -180653,
  },
  contracts: {
    총계약건수: 4,
    총보험료: 105970,
    총MFYC: 29094,
    총지급수수료: 5264,
    details: [
      {
        보험사: '메리츠화재',
        증권번호: '6AEBO3858',
        상품명: '(무)메리츠 내맘같은 암보험2404',
        계약자: '성소희',
        피보험자: '성소희',
        보험료: 26330,
        MFYC: 15798,
        지급수수료합계: 0,
        모집: 0,
        유지: 0,
        일반: 0,
      },
      {
        보험사: '메리츠화재',
        증권번호: '6ADEG54423',
        상품명: '무배당메리츠올인원통합보험(25.02)',
        계약자: '성소희',
        피보험자: '성정연',
        보험료: 26610,
        MFYC: 0,
        지급수수료합계: 1439,
        모집: 1439,
        유지: 0,
        일반: 0,
      },
      {
        보험사: '메리츠화재',
        증권번호: '6ADGN32577',
        상품명: '(무)메리츠 내맘같은 암보험2404',
        계약자: '전인경',
        피보험자: '전인경',
        보험료: 26420,
        MFYC: 6648,
        지급수수료합계: 2386,
        모집: 2386,
        유지: 0,
        일반: 0,
      },
      {
        보험사: '메리츠화재',
        증권번호: '6ADEG54423',
        상품명: '무배당메리츠올인원통합보험(25.02)',
        계약자: '성소희',
        피보험자: '성혜신',
        보험료: 26610,
        MFYC: 6648,
        지급수수료합계: 1439,
        모집: 1439,
        유지: 0,
        일반: 0,
      },
    ],
  },
  mdrt: {
    총수입: 1368110,
  },
  // Derived/calculated values
  derived: {
    환수금액: 185917, // 최종지급액 - FC커미션계 = -180653 - 5264 (approximate)
    환수비율: null, // Needs calculation
  },
};

// =============================================================================
// TEST SCENARIOS
// =============================================================================
interface TestCase {
  id: string;
  category: 'compensation' | 'contract' | 'mdrt' | 'general' | 'clarify' | 'edge_case';
  query: string;
  expectedFields: string[];
  expectedValues: Record<string, number | string | boolean>;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

const TEST_CASES: TestCase[] = [
  // ==========================================================================
  // COMPENSATION QUERIES (Critical)
  // ==========================================================================
  {
    id: 'COMP-001',
    category: 'compensation',
    query: '내 수수료 알려줘',
    expectedFields: ['커미션계', '최종지급액'],
    expectedValues: { 커미션계: -180653, 최종지급액: -180653 },
    description: 'Basic commission lookup',
    priority: 'critical',
  },
  {
    id: 'COMP-002',
    category: 'compensation',
    query: '이번 달 최종지급액은?',
    expectedFields: ['최종지급액'],
    expectedValues: { 최종지급액: -180653 },
    description: 'Final payment amount lookup',
    priority: 'critical',
  },
  {
    id: 'COMP-003',
    category: 'compensation',
    query: '9월 급여 얼마야?',
    expectedFields: ['최종지급액', '마감월'],
    expectedValues: { 최종지급액: -180653, 마감월: '202509' },
    description: 'Specific month payment lookup',
    priority: 'critical',
  },
  {
    id: 'COMP-004',
    category: 'compensation',
    query: '커미션 내역 알려줘',
    expectedFields: ['커미션계', 'FC커미션계'],
    expectedValues: { 커미션계: -180653, FC커미션계: 5264 },
    description: 'Commission breakdown',
    priority: 'high',
  },
  {
    id: 'COMP-005',
    category: 'compensation',
    query: 'FC커미션 얼마야?',
    expectedFields: ['FC커미션계'],
    expectedValues: { FC커미션계: 5264 },
    description: 'FC commission specific lookup',
    priority: 'high',
  },
  {
    id: 'COMP-006',
    category: 'compensation',
    query: '오버라이드 수입 얼마야?',
    expectedFields: ['오버라이드계'],
    expectedValues: { 오버라이드계: 0 },
    description: 'Override income lookup (expected 0)',
    priority: 'high',
  },
  {
    id: 'COMP-007',
    category: 'compensation',
    query: '환수금 얼마야?',
    expectedFields: ['환수금액'],
    expectedValues: { has_negative_payment: true }, // Indicates negative payment
    description: 'Clawback/recovery amount lookup',
    priority: 'critical',
  },
  {
    id: 'COMP-008',
    category: 'compensation',
    query: '소득세 얼마 냈어?',
    expectedFields: ['소득세'],
    expectedValues: { 소득세: 0 },
    description: 'Income tax lookup',
    priority: 'medium',
  },
  {
    id: 'COMP-009',
    category: 'compensation',
    query: '공제금 내역 알려줘',
    expectedFields: ['공제계', '소득세', '주민세'],
    expectedValues: { 공제계: 0, 소득세: 0, 주민세: 0 },
    description: 'Deduction breakdown',
    priority: 'medium',
  },
  {
    id: 'COMP-010',
    category: 'compensation',
    query: '왜 마이너스야?',
    expectedFields: ['최종지급액', '환수'],
    expectedValues: { has_negative_payment: true, mentions_recovery: true },
    description: 'Explanation for negative balance',
    priority: 'high',
  },

  // ==========================================================================
  // CONTRACT QUERIES (High)
  // ==========================================================================
  {
    id: 'CONT-001',
    category: 'contract',
    query: '내 계약 몇 개야?',
    expectedFields: ['계약건수'],
    expectedValues: { 계약건수: 4 },
    description: 'Contract count lookup',
    priority: 'critical',
  },
  {
    id: 'CONT-002',
    category: 'contract',
    query: '계약 내역 알려줘',
    expectedFields: ['계약건수', '총보험료', '총지급수수료'],
    expectedValues: { 계약건수: 4, 총보험료: 105970, 총지급수수료: 5264 },
    description: 'Contract summary lookup',
    priority: 'high',
  },
  {
    id: 'CONT-003',
    category: 'contract',
    query: '메리츠화재 계약 건',
    expectedFields: ['보험사', '계약건수'],
    expectedValues: { 보험사: '메리츠화재', 계약건수: 4 },
    description: 'Insurer-specific contract lookup',
    priority: 'high',
  },
  {
    id: 'CONT-004',
    category: 'contract',
    query: '총 보험료 얼마야?',
    expectedFields: ['총보험료'],
    expectedValues: { 총보험료: 105970 },
    description: 'Total premium lookup',
    priority: 'high',
  },
  {
    id: 'CONT-005',
    category: 'contract',
    query: 'MFYC 얼마야?',
    expectedFields: ['MFYC', '총MFYC'],
    expectedValues: { 총MFYC: 29094 },
    description: 'MFYC lookup',
    priority: 'high',
  },
  {
    id: 'CONT-006',
    category: 'contract',
    query: '성소희 계약 정보',
    expectedFields: ['계약자'],
    expectedValues: { has_customer_info: true },
    description: 'Customer-specific contract lookup',
    priority: 'medium',
  },
  {
    id: 'CONT-007',
    category: 'contract',
    query: '암보험 계약 몇 개야?',
    expectedFields: ['상품명'],
    expectedValues: { has_cancer_insurance: true },
    description: 'Product-specific contract lookup',
    priority: 'medium',
  },

  // ==========================================================================
  // MDRT QUERIES (High)
  // ==========================================================================
  {
    id: 'MDRT-001',
    category: 'mdrt',
    query: 'MDRT 총수입 알려줘',
    expectedFields: ['총수입'],
    expectedValues: { 총수입: 1368110 },
    description: 'MDRT total income lookup',
    priority: 'critical',
  },
  {
    id: 'MDRT-002',
    category: 'mdrt',
    query: '올해 실적 어때?',
    expectedFields: ['총수입', '실적'],
    expectedValues: { 총수입: 1368110 },
    description: 'Annual performance lookup',
    priority: 'high',
  },
  {
    id: 'MDRT-003',
    category: 'mdrt',
    query: 'MDRT 달성했어?',
    expectedFields: ['달성', '목표', '진행률'],
    expectedValues: { mentions_achievement_status: true },
    description: 'MDRT achievement status',
    priority: 'high',
  },
  {
    id: 'MDRT-004',
    category: 'mdrt',
    query: 'MDRT까지 얼마 남았어?',
    expectedFields: ['남은금액', '목표', '현재'],
    expectedValues: { mentions_gap: true },
    description: 'MDRT gap calculation',
    priority: 'high',
  },
  {
    id: 'MDRT-005',
    category: 'mdrt',
    query: 'FYC 얼마야?',
    expectedFields: ['FYC'],
    expectedValues: { has_fyc_value: true },
    description: 'FYC lookup',
    priority: 'medium',
  },

  // ==========================================================================
  // GENERAL QUERIES (Medium)
  // ==========================================================================
  {
    id: 'GEN-001',
    category: 'general',
    query: '내 정보 알려줘',
    expectedFields: ['사번', '사원명', '소속'],
    expectedValues: { 사번: 'J00307', 사원명: '정다운' },
    description: 'Employee info lookup',
    priority: 'medium',
  },
  {
    id: 'GEN-002',
    category: 'general',
    query: '언제 입사했어?',
    expectedFields: ['위촉일'],
    expectedValues: { 위촉일: '2024-05-01' },
    description: 'Join date lookup',
    priority: 'low',
  },
  {
    id: 'GEN-003',
    category: 'general',
    query: '내 소속 어디야?',
    expectedFields: ['소속', '소속경로'],
    expectedValues: { 소속: '윤나래' },
    description: 'Department lookup',
    priority: 'low',
  },

  // ==========================================================================
  // CLARIFICATION QUERIES (Edge Cases)
  // ==========================================================================
  {
    id: 'CLAR-001',
    category: 'clarify',
    query: '얼마야?',
    expectedFields: [],
    expectedValues: { needs_clarification: true },
    description: 'Ambiguous query - needs clarification',
    priority: 'medium',
  },
  {
    id: 'CLAR-002',
    category: 'clarify',
    query: '확인해줘',
    expectedFields: [],
    expectedValues: { needs_clarification: true },
    description: 'Vague request - needs clarification',
    priority: 'medium',
  },
  {
    id: 'CLAR-003',
    category: 'clarify',
    query: '수수료',
    expectedFields: [],
    expectedValues: { needs_clarification: true },
    description: 'Single keyword - needs clarification',
    priority: 'low',
  },

  // ==========================================================================
  // EDGE CASES (Various)
  // ==========================================================================
  {
    id: 'EDGE-001',
    category: 'edge_case',
    query: '안녕하세요',
    expectedFields: [],
    expectedValues: { is_greeting: true },
    description: 'Greeting - instant response',
    priority: 'medium',
  },
  {
    id: 'EDGE-002',
    category: 'edge_case',
    query: '주식 추천해줘',
    expectedFields: [],
    expectedValues: { is_out_of_scope: true },
    description: 'Out of scope query',
    priority: 'low',
  },
  {
    id: 'EDGE-003',
    category: 'edge_case',
    query: '지난달 대비 이번달 수수료 비교',
    expectedFields: ['비교', '변동'],
    expectedValues: { mentions_comparison: true },
    description: 'Period comparison query',
    priority: 'medium',
  },
  {
    id: 'EDGE-004',
    category: 'edge_case',
    query: '최종지급액이 마이너스인 이유가 뭐야?',
    expectedFields: ['최종지급액', '환수', '이유'],
    expectedValues: { explains_negative: true },
    description: 'Explanation query for negative balance',
    priority: 'high',
  },
];

// =============================================================================
// TEST RUNNER
// =============================================================================
interface TestResult {
  id: string;
  category: string;
  query: string;
  description: string;
  priority: string;
  route: string;
  routeConfidence: number;
  response: string;
  responseLength: number;
  processingTimeMs: number;
  expectedValues: Record<string, unknown>;
  foundValues: Record<string, unknown>;
  valueMatches: Record<string, boolean>;
  overallMatch: boolean;
  matchScore: number;
  issues: string[];
  searchResultsCount?: number;
  topSearchScore?: number;
  intent?: {
    type: string;
    template: string;
    confidence: number;
  };
}

async function runTests() {
  // Dynamic imports
  const { queryRouterService } = await import('@/lib/services/query-router.service');
  const { enhancedRAGService } = await import('@/lib/services/enhanced-rag.service');
  const { db } = await import('@/lib/db');
  const { employees } = await import('@/lib/db/schema/employees');
  const { eq } = await import('drizzle-orm');

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE RAG TEST SUITE - J00307 정다운                              ║');
  console.log('║     Testing Against Actual Excel Data                                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // Get employee from database
  console.log('\n📋 Looking up employee in database...');

  const employee = await db
    .select()
    .from(employees)
    .where(eq(employees.employeeId, 'J00307'))
    .limit(1);

  if (employee.length === 0) {
    console.log('❌ Employee J00307 not found in database');
    console.log('   Please ensure the employee exists before running this test.');
    process.exit(1);
  }

  const dbEmployee = employee[0];
  const namespace = `emp_${dbEmployee.employeeId}`;

  console.log(`✓ Found employee: ${dbEmployee.name} (${dbEmployee.employeeId})`);
  console.log(`   Database ID: ${dbEmployee.id}`);
  console.log(`   Namespace: ${namespace}`);

  // Print actual data summary
  console.log('\n' + '═'.repeat(80));
  console.log('GROUND TRUTH DATA (from Excel files)');
  console.log('═'.repeat(80));
  console.log(`   마감월: ${ACTUAL_DATA.employee.마감월}`);
  console.log(`   최종지급액: ${ACTUAL_DATA.compensation.최종지급액.toLocaleString()}원`);
  console.log(`   커미션계: ${ACTUAL_DATA.compensation.커미션계.toLocaleString()}원`);
  console.log(`   FC커미션계: ${ACTUAL_DATA.compensation.FC커미션계.toLocaleString()}원`);
  console.log(`   오버라이드계: ${ACTUAL_DATA.compensation.오버라이드계.toLocaleString()}원`);
  console.log(`   계약건수: ${ACTUAL_DATA.contracts.총계약건수}건`);
  console.log(`   총보험료: ${ACTUAL_DATA.contracts.총보험료.toLocaleString()}원`);
  console.log(`   MDRT 총수입: ${ACTUAL_DATA.mdrt.총수입.toLocaleString()}원`);

  console.log('\n' + '═'.repeat(80));
  console.log(`RUNNING ${TEST_CASES.length} TEST CASES`);
  console.log('═'.repeat(80));

  const results: TestResult[] = [];
  let passCount = 0;
  let failCount = 0;

  for (const testCase of TEST_CASES) {
    console.log(`\n[${'─'.repeat(76)}]`);
    console.log(`[${testCase.id}] ${testCase.description}`);
    console.log(`  Query: "${testCase.query}"`);
    console.log(`  Category: ${testCase.category}, Priority: ${testCase.priority}`);

    const startTime = Date.now();
    const issues: string[] = [];
    let response = '';
    let route = '';
    let routeConfidence = 0;
    let searchResultsCount = 0;
    let topSearchScore = 0;
    let intentInfo: { type: string; template: string; confidence: number } | undefined;

    try {
      // Step 1: Router decision
      const routerDecision = await queryRouterService.route(testCase.query);
      route = routerDecision.route;
      routeConfidence = routerDecision.confidence;

      console.log(`  Route: ${route} (confidence: ${routeConfidence.toFixed(2)})`);

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
        searchResultsCount = ragResponse.searchResults?.length || 0;
        topSearchScore = ragResponse.searchResults?.[0]?.score || 0;
        intentInfo = {
          type: ragResponse.intent?.intent || 'unknown',
          template: ragResponse.intent?.template || 'unknown',
          confidence: ragResponse.intent?.confidence || 0,
        };

        console.log(`  Intent: ${intentInfo.type} (${intentInfo.template}, ${(intentInfo.confidence * 100).toFixed(0)}%)`);
        console.log(`  Search: ${searchResultsCount} results, top score: ${topSearchScore.toFixed(3)}`);
      } else {
        response = routerDecision.response || 'Fallback response';
      }
    } catch (error) {
      response = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
      issues.push(`Query execution failed: ${error}`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`  Time: ${processingTime}ms`);

    // Response preview
    const responsePreview = response.substring(0, 150).replace(/\n/g, ' ');
    console.log(`  Response: ${responsePreview}${response.length > 150 ? '...' : ''}`);

    // Value matching
    const foundValues: Record<string, unknown> = {};
    const valueMatches: Record<string, boolean> = {};
    let matchCount = 0;
    let totalExpected = 0;

    for (const [field, expectedValue] of Object.entries(testCase.expectedValues)) {
      totalExpected++;

      // Handle boolean expectations
      if (typeof expectedValue === 'boolean') {
        let found = false;

        if (field === 'needs_clarification') {
          found = route === 'clarify' || response.includes('?') || response.includes('구체적');
        } else if (field === 'is_greeting') {
          found = route === 'instant';
        } else if (field === 'is_out_of_scope') {
          found = route === 'fallback' || response.includes('도움') || response.includes('범위');
        } else if (field === 'has_negative_payment') {
          found = response.includes('-') || response.includes('마이너스') || response.includes('환수');
        } else if (field === 'mentions_recovery') {
          found = response.includes('환수') || response.includes('회수');
        } else if (field === 'has_customer_info') {
          found = response.includes('성소희') || response.includes('전인경');
        } else if (field === 'has_cancer_insurance') {
          found = response.includes('암보험') || response.includes('암');
        } else if (field === 'mentions_achievement_status') {
          found = response.includes('달성') || response.includes('미달') || response.includes('%');
        } else if (field === 'mentions_gap') {
          found = response.includes('남') || response.includes('부족') || response.includes('필요');
        } else if (field === 'has_fyc_value') {
          found = response.includes('FYC') || /\d{2,}/.test(response);
        } else if (field === 'mentions_comparison') {
          found = response.includes('비교') || response.includes('증가') || response.includes('감소');
        } else if (field === 'explains_negative') {
          found = response.includes('환수') || response.includes('마이너스') || response.includes('이유');
        }

        foundValues[field] = found;
        valueMatches[field] = found === expectedValue;
        if (valueMatches[field]) matchCount++;
        console.log(`  ${valueMatches[field] ? '✓' : '✗'} ${field}: ${found} (expected: ${expectedValue})`);
        continue;
      }

      // Handle numeric expectations
      if (typeof expectedValue === 'number') {
        const absValue = Math.abs(expectedValue);
        const formattedValue = expectedValue.toLocaleString();
        const absFormattedValue = absValue.toLocaleString();

        // Check if value appears in response
        const valueInResponse =
          response.includes(String(expectedValue)) ||
          response.includes(formattedValue) ||
          response.includes(absFormattedValue) ||
          response.includes(String(absValue));

        foundValues[field] = valueInResponse ? expectedValue : null;
        valueMatches[field] = valueInResponse;
        if (valueMatches[field]) matchCount++;

        console.log(`  ${valueMatches[field] ? '✓' : '✗'} ${field}: ${formattedValue} (${valueMatches[field] ? 'found' : 'NOT found'})`);

        if (!valueInResponse) {
          issues.push(`Expected value ${field}=${formattedValue} not found in response`);
        }
        continue;
      }

      // Handle string expectations
      if (typeof expectedValue === 'string') {
        const found = response.includes(expectedValue);
        foundValues[field] = found ? expectedValue : null;
        valueMatches[field] = found;
        if (valueMatches[field]) matchCount++;
        console.log(`  ${valueMatches[field] ? '✓' : '✗'} ${field}: "${expectedValue}" (${found ? 'found' : 'NOT found'})`);

        if (!found) {
          issues.push(`Expected string "${field}=${expectedValue}" not found in response`);
        }
      }
    }

    const matchScore = totalExpected > 0 ? (matchCount / totalExpected) * 100 : 100;
    const overallMatch = matchScore >= 50; // Consider pass if >= 50% values match

    if (overallMatch) {
      passCount++;
      console.log(`  ✅ PASS (${matchScore.toFixed(0)}% match)`);
    } else {
      failCount++;
      console.log(`  ❌ FAIL (${matchScore.toFixed(0)}% match)`);
    }

    results.push({
      id: testCase.id,
      category: testCase.category,
      query: testCase.query,
      description: testCase.description,
      priority: testCase.priority,
      route,
      routeConfidence,
      response: response.substring(0, 1000),
      responseLength: response.length,
      processingTimeMs: processingTime,
      expectedValues: testCase.expectedValues,
      foundValues,
      valueMatches,
      overallMatch,
      matchScore,
      issues,
      searchResultsCount,
      topSearchScore,
      intent: intentInfo,
    });

    // Small delay between queries
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // ==========================================================================
  // SUMMARY REPORT
  // ==========================================================================
  console.log('\n\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                            TEST RESULTS SUMMARY                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  const totalTests = results.length;
  const passRate = ((passCount / totalTests) * 100).toFixed(1);

  console.log(`\n📊 OVERALL RESULTS: ${passCount}/${totalTests} PASSED (${passRate}%)`);
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ❌ Failed: ${failCount}`);

  // Results by category
  console.log('\n📂 RESULTS BY CATEGORY:');
  console.log('─'.repeat(60));

  const categories = ['compensation', 'contract', 'mdrt', 'general', 'clarify', 'edge_case'];
  for (const category of categories) {
    const categoryResults = results.filter((r) => r.category === category);
    if (categoryResults.length === 0) continue;

    const categoryPassed = categoryResults.filter((r) => r.overallMatch).length;
    const categoryRate = ((categoryPassed / categoryResults.length) * 100).toFixed(0);
    const emoji = categoryPassed === categoryResults.length ? '✅' : categoryPassed > 0 ? '⚠️' : '❌';

    console.log(`\n   ${emoji} ${category.toUpperCase()}: ${categoryPassed}/${categoryResults.length} (${categoryRate}%)`);

    for (const result of categoryResults) {
      const status = result.overallMatch ? '✓' : '✗';
      console.log(`      ${status} [${result.id}] ${result.query.substring(0, 40)}... (${result.matchScore.toFixed(0)}%)`);
    }
  }

  // Results by priority
  console.log('\n📊 RESULTS BY PRIORITY:');
  console.log('─'.repeat(60));

  const priorities = ['critical', 'high', 'medium', 'low'];
  for (const priority of priorities) {
    const priorityResults = results.filter((r) => r.priority === priority);
    if (priorityResults.length === 0) continue;

    const priorityPassed = priorityResults.filter((r) => r.overallMatch).length;
    const priorityRate = ((priorityPassed / priorityResults.length) * 100).toFixed(0);

    console.log(`   ${priority.toUpperCase()}: ${priorityPassed}/${priorityResults.length} (${priorityRate}%)`);
  }

  // Failed tests detail
  const failedTests = results.filter((r) => !r.overallMatch);
  if (failedTests.length > 0) {
    console.log('\n' + '═'.repeat(80));
    console.log('❌ FAILED TEST DETAILS');
    console.log('═'.repeat(80));

    for (const failed of failedTests) {
      console.log(`\n[${failed.id}] ${failed.description}`);
      console.log(`   Query: "${failed.query}"`);
      console.log(`   Route: ${failed.route} (${failed.routeConfidence.toFixed(2)})`);
      console.log(`   Match Score: ${failed.matchScore.toFixed(0)}%`);
      console.log(`   Expected: ${JSON.stringify(failed.expectedValues)}`);
      console.log(`   Found: ${JSON.stringify(failed.foundValues)}`);
      console.log(`   Response (preview): ${failed.response.substring(0, 200)}...`);
      if (failed.issues.length > 0) {
        console.log(`   Issues:`);
        for (const issue of failed.issues) {
          console.log(`     - ${issue}`);
        }
      }
    }
  }

  // Performance stats
  console.log('\n' + '═'.repeat(80));
  console.log('⏱️  PERFORMANCE STATISTICS');
  console.log('═'.repeat(80));

  const totalTime = results.reduce((sum, r) => sum + r.processingTimeMs, 0);
  const avgTime = totalTime / results.length;
  const minTime = Math.min(...results.map((r) => r.processingTimeMs));
  const maxTime = Math.max(...results.map((r) => r.processingTimeMs));

  console.log(`   Total Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`   Average Time: ${avgTime.toFixed(0)}ms`);
  console.log(`   Min Time: ${minTime}ms`);
  console.log(`   Max Time: ${maxTime}ms`);

  // Route distribution
  console.log('\n   Route Distribution:');
  const routeCount: Record<string, number> = {};
  for (const result of results) {
    routeCount[result.route] = (routeCount[result.route] || 0) + 1;
  }
  for (const [route, count] of Object.entries(routeCount)) {
    console.log(`     - ${route}: ${count} (${((count / results.length) * 100).toFixed(0)}%)`);
  }

  // Value accuracy for key metrics
  console.log('\n' + '═'.repeat(80));
  console.log('🎯 KEY VALUE ACCURACY');
  console.log('═'.repeat(80));

  const keyValues = [
    { name: '최종지급액', expected: -180653 },
    { name: '커미션계', expected: -180653 },
    { name: 'FC커미션계', expected: 5264 },
    { name: '계약건수', expected: 4 },
    { name: '총보험료', expected: 105970 },
    { name: 'MDRT 총수입', expected: 1368110 },
  ];

  for (const kv of keyValues) {
    const relevantResults = results.filter((r) =>
      Object.keys(r.expectedValues).some((k) => k.includes(kv.name.replace(' ', '')))
    );
    const matchedResults = relevantResults.filter((r) =>
      Object.entries(r.valueMatches).some(([k, v]) => k.includes(kv.name.replace(' ', '')) && v)
    );

    const accuracy = relevantResults.length > 0
      ? ((matchedResults.length / relevantResults.length) * 100).toFixed(0)
      : 'N/A';

    console.log(`   ${kv.name} (${kv.expected.toLocaleString()}원): ${accuracy}% accurate (${matchedResults.length}/${relevantResults.length})`);
  }

  console.log('\n\n✅ Comprehensive RAG test complete!\n');

  // Return results for programmatic use
  return {
    totalTests,
    passCount,
    failCount,
    passRate: parseFloat(passRate),
    results,
    summary: {
      byCategory: Object.fromEntries(
        categories.map((cat) => {
          const catResults = results.filter((r) => r.category === cat);
          return [cat, {
            total: catResults.length,
            passed: catResults.filter((r) => r.overallMatch).length,
          }];
        })
      ),
      byPriority: Object.fromEntries(
        priorities.map((pri) => {
          const priResults = results.filter((r) => r.priority === pri);
          return [pri, {
            total: priResults.length,
            passed: priResults.filter((r) => r.overallMatch).length,
          }];
        })
      ),
    },
  };
}

// Run tests
runTests().catch(console.error);
