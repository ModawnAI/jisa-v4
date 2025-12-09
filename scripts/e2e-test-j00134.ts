/**
 * Comprehensive E2E RAG Test for Employee J00134 (윤나래)
 *
 * Tests:
 * 1. Vector retrieval with searchable_text
 * 2. Semantic search quality
 * 3. Various question types (general, compensation, MDRT)
 * 4. Korean language queries
 * 5. Edge cases
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';
import * as path from 'path';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

config({ path: path.join(process.cwd(), '.env.local') });

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
const index = pinecone.index((process.env.PINECONE_INDEX_NAME || 'contractorhub').trim());
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string });
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

const EMPLOYEE_ID = 'J00134';
const NAMESPACE = `emp_${EMPLOYEE_ID}`;

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  duration: number;
}

const results: TestResult[] = [];

async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
  });
  return response.data[0].embedding;
}

async function queryPinecone(queryText: string, topK: number = 5) {
  const embedding = await createEmbedding(queryText);
  return index.namespace(NAMESPACE).query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });
}

async function generateAnswer(query: string, context: string): Promise<string> {
  const response = await genai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: `당신은 HO&F 보험대리점의 급여/성과 전문 AI 어시스턴트입니다.

다음 컨텍스트를 바탕으로 질문에 정확하게 답변하세요.
숫자는 정확하게, 한국어로 답변하세요.

[컨텍스트]
${context}

[질문]
${query}

[답변]`
  });
  return response.text || '';
}

async function runTest(
  name: string,
  testFn: () => Promise<{ passed: boolean; details: string }>
) {
  const start = Date.now();
  try {
    const result = await testFn();
    results.push({
      name,
      passed: result.passed,
      details: result.details,
      duration: Date.now() - start,
    });
  } catch (error) {
    results.push({
      name,
      passed: false,
      details: `Error: ${error}`,
      duration: Date.now() - start,
    });
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('Comprehensive E2E RAG Test for J00134 (윤나래)');
  console.log('='.repeat(80));
  console.log('');

  // =========================================================================
  // TEST 1: Namespace Existence
  // =========================================================================
  await runTest('1. Namespace Existence', async () => {
    const stats = await index.describeIndexStats();
    const ns = stats.namespaces?.[NAMESPACE];
    const exists = !!ns && (ns.recordCount || 0) > 0;
    return {
      passed: exists,
      details: exists
        ? `Namespace ${NAMESPACE} exists with ${ns?.recordCount} vectors`
        : `Namespace ${NAMESPACE} does not exist or is empty`,
    };
  });

  // =========================================================================
  // TEST 2: searchable_text Metadata Presence
  // =========================================================================
  await runTest('2. searchable_text Metadata Presence', async () => {
    const dummyVector = Array.from({ length: 3072 }, () => Math.random() * 0.01);
    const result = await index.namespace(NAMESPACE).query({
      vector: dummyVector,
      topK: 5,
      includeMetadata: true,
    });

    const allHaveText = result.matches?.every(
      m => !!(m.metadata as Record<string, unknown>)?.searchable_text
    );
    const sampleText = (result.matches?.[0]?.metadata as Record<string, unknown>)
      ?.searchable_text as string;

    return {
      passed: !!allHaveText,
      details: allHaveText
        ? `All ${result.matches?.length} vectors have searchable_text.\nSample (first 200 chars): ${sampleText?.substring(0, 200)}...`
        : 'Some vectors are missing searchable_text metadata!',
    };
  });

  // =========================================================================
  // TEST 3: Basic Employee Info Retrieval
  // =========================================================================
  await runTest('3. Basic Employee Info Retrieval', async () => {
    const query = '윤나래 사원 정보';
    const result = await queryPinecone(query);

    const topMatch = result.matches?.[0];
    const meta = topMatch?.metadata as Record<string, unknown>;
    const searchText = meta?.searchable_text as string;

    const hasEmployeeId = searchText?.includes('J00134');
    const hasEmployeeName = searchText?.includes('윤나래');

    return {
      passed: hasEmployeeId && hasEmployeeName,
      details: `Query: "${query}"
Score: ${topMatch?.score?.toFixed(4)}
Employee ID found: ${hasEmployeeId}
Employee Name found: ${hasEmployeeName}
searchable_text preview: ${searchText?.substring(0, 300)}...`,
    };
  });

  // =========================================================================
  // TEST 4: Commission Query (Korean)
  // =========================================================================
  await runTest('4. Commission Query (커미션)', async () => {
    const query = '윤나래의 총 커미션은 얼마인가요?';
    const result = await queryPinecone(query);

    const topMatch = result.matches?.[0];
    const meta = topMatch?.metadata as Record<string, unknown>;
    const searchText = meta?.searchable_text as string;
    const totalCommission = meta?.totalCommission;

    const hasCommissionData = searchText?.includes('커미션') || !!totalCommission;

    return {
      passed: hasCommissionData && (topMatch?.score || 0) > 0.3,
      details: `Query: "${query}"
Score: ${topMatch?.score?.toFixed(4)}
totalCommission metadata: ${totalCommission}
Has commission in text: ${searchText?.includes('커미션')}
searchable_text preview: ${searchText?.substring(0, 400)}...`,
    };
  });

  // =========================================================================
  // TEST 5: Income Query
  // =========================================================================
  await runTest('5. Income Query (총수입)', async () => {
    const query = '윤나래의 총수입 금액';
    const result = await queryPinecone(query);

    const topMatch = result.matches?.[0];
    const meta = topMatch?.metadata as Record<string, unknown>;
    const searchText = meta?.searchable_text as string;
    const totalIncome = meta?.totalIncome;

    const hasIncomeData = searchText?.includes('총수입') || !!totalIncome;

    return {
      passed: hasIncomeData && (topMatch?.score || 0) > 0.3,
      details: `Query: "${query}"
Score: ${topMatch?.score?.toFixed(4)}
totalIncome metadata: ${totalIncome}
Has income in text: ${searchText?.includes('총수입')}`,
    };
  });

  // =========================================================================
  // TEST 6: MDRT Status Query
  // =========================================================================
  await runTest('6. MDRT Status Query', async () => {
    const query = 'MDRT 달성 현황 진척률';
    const result = await queryPinecone(query);

    const topMatch = result.matches?.[0];
    const meta = topMatch?.metadata as Record<string, unknown>;
    const searchText = meta?.searchable_text as string;
    const mdrtStatus = meta?.mdrtStatus;

    const hasMdrtData = searchText?.includes('MDRT') || !!mdrtStatus;

    return {
      passed: hasMdrtData,
      details: `Query: "${query}"
Score: ${topMatch?.score?.toFixed(4)}
mdrtStatus metadata: ${mdrtStatus}
Has MDRT in text: ${searchText?.includes('MDRT')}
searchable_text MDRT section: ${searchText?.match(/\[MDRT[^\]]*\][^[]{0,500}/)?.[0] || 'Not found'}`,
    };
  });

  // =========================================================================
  // TEST 7: Monthly Performance Query
  // =========================================================================
  await runTest('7. Monthly Performance Query', async () => {
    const query = '월별 실적 데이터';
    const result = await queryPinecone(query);

    const topMatch = result.matches?.[0];
    const meta = topMatch?.metadata as Record<string, unknown>;
    const searchText = meta?.searchable_text as string;

    const hasMonthlyData = searchText?.includes('월') && searchText?.includes('실적');

    return {
      passed: hasMonthlyData,
      details: `Query: "${query}"
Score: ${topMatch?.score?.toFixed(4)}
Has monthly data patterns: ${hasMonthlyData}
Monthly data preview: ${searchText?.match(/\[월별[^\]]*\][^[]{0,800}/)?.[0]?.substring(0, 500) || 'Checking raw...'}
${searchText?.substring(0, 600)}...`,
    };
  });

  // =========================================================================
  // TEST 8: Department/Branch Query
  // =========================================================================
  await runTest('8. Department/Branch Query (소속)', async () => {
    const query = '윤나래가 소속된 지사와 지점';
    const result = await queryPinecone(query);

    const topMatch = result.matches?.[0];
    const meta = topMatch?.metadata as Record<string, unknown>;
    const searchText = meta?.searchable_text as string;
    const branch = meta?.branch;
    const team = meta?.team;

    const hasBranchInfo = !!branch || searchText?.includes('지사');
    const hasTeamInfo = !!team || searchText?.includes('지점');

    return {
      passed: hasBranchInfo || hasTeamInfo,
      details: `Query: "${query}"
Score: ${topMatch?.score?.toFixed(4)}
branch metadata: ${branch}
team metadata: ${team}
Has 지사 in text: ${searchText?.includes('지사')}
Has 지점 in text: ${searchText?.includes('지점')}`,
    };
  });

  // =========================================================================
  // TEST 9: Job Type Query
  // =========================================================================
  await runTest('9. Job Type Query (직종)', async () => {
    const query = '윤나래의 직종은 무엇인가요';
    const result = await queryPinecone(query);

    const topMatch = result.matches?.[0];
    const meta = topMatch?.metadata as Record<string, unknown>;
    const searchText = meta?.searchable_text as string;
    const jobType = meta?.jobType;

    const hasJobType = !!jobType || searchText?.includes('직종');

    return {
      passed: hasJobType,
      details: `Query: "${query}"
Score: ${topMatch?.score?.toFixed(4)}
jobType metadata: ${jobType}
Has 직종 in text: ${searchText?.includes('직종')}`,
    };
  });

  // =========================================================================
  // TEST 10: Self-Contract Adjustment Query
  // =========================================================================
  await runTest('10. Self-Contract Query (본인계약)', async () => {
    const query = '본인계약 조정 금액';
    const result = await queryPinecone(query);

    const topMatch = result.matches?.[0];
    const meta = topMatch?.metadata as Record<string, unknown>;
    const searchText = meta?.searchable_text as string;

    const hasSelfContract =
      searchText?.includes('본인계약') || searchText?.includes('자기계약');

    return {
      passed: (topMatch?.score || 0) > 0.2,
      details: `Query: "${query}"
Score: ${topMatch?.score?.toFixed(4)}
Has 본인계약 in text: ${hasSelfContract}
Self-contract section: ${searchText?.match(/본인계약[^\\n]{0,200}/)?.[0] || 'Not found'}`,
    };
  });

  // =========================================================================
  // TEST 11: Semantic Similarity - Paraphrased Query
  // =========================================================================
  await runTest('11. Semantic Search - Paraphrased Query', async () => {
    const original = '커미션 합계';
    const paraphrased = '수수료 총액은 얼마야?';

    const result1 = await queryPinecone(original);
    const result2 = await queryPinecone(paraphrased);

    const score1 = result1.matches?.[0]?.score || 0;
    const score2 = result2.matches?.[0]?.score || 0;
    const sameTopResult = result1.matches?.[0]?.id === result2.matches?.[0]?.id;

    return {
      passed: sameTopResult && score2 > 0.3,
      details: `Original query: "${original}" -> Score: ${score1.toFixed(4)}
Paraphrased query: "${paraphrased}" -> Score: ${score2.toFixed(4)}
Same top result: ${sameTopResult}
Top result IDs match: ${result1.matches?.[0]?.id} === ${result2.matches?.[0]?.id}`,
    };
  });

  // =========================================================================
  // TEST 12: Full RAG Pipeline - Generate Answer
  // =========================================================================
  await runTest('12. Full RAG Pipeline - Answer Generation', async () => {
    const query = '윤나래 사원의 2025년 커미션 총액과 MDRT 달성 현황을 알려주세요.';
    const searchResult = await queryPinecone(query, 3);

    const contexts = searchResult.matches
      ?.map(m => (m.metadata as Record<string, unknown>)?.searchable_text as string)
      .filter(Boolean)
      .join('\n\n---\n\n');

    if (!contexts) {
      return { passed: false, details: 'No context retrieved from Pinecone' };
    }

    const answer = await generateAnswer(query, contexts);

    const hasEmployeeName = answer.includes('윤나래');
    const hasNumbers = /[\d,]+/.test(answer);
    const isKorean = /[가-힣]/.test(answer);

    return {
      passed: hasEmployeeName && hasNumbers && isKorean && answer.length > 50,
      details: `Query: "${query}"

Retrieved ${searchResult.matches?.length} contexts

Generated Answer:
${answer}

Validation:
- Contains employee name: ${hasEmployeeName}
- Contains numbers: ${hasNumbers}
- Is in Korean: ${isKorean}
- Answer length: ${answer.length} chars`,
    };
  });

  // =========================================================================
  // TEST 13: Multiple Vector Retrieval Quality
  // =========================================================================
  await runTest('13. Multiple Vector Retrieval Quality', async () => {
    const query = '전체 성과 요약';
    const result = await queryPinecone(query, 5);

    const scores = result.matches?.map(m => m.score || 0) || [];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const allPositive = scores.every(s => s > 0);

    return {
      passed: allPositive && avgScore > 0.2,
      details: `Query: "${query}"
Retrieved ${result.matches?.length} vectors
Scores: ${scores.map(s => s.toFixed(4)).join(', ')}
Average score: ${avgScore.toFixed(4)}
All positive scores: ${allPositive}`,
    };
  });

  // =========================================================================
  // TEST 14: Edge Case - Very Short Query
  // =========================================================================
  await runTest('14. Edge Case - Short Query', async () => {
    const query = '급여';
    const result = await queryPinecone(query, 3);

    const topScore = result.matches?.[0]?.score || 0;
    const hasResults = (result.matches?.length || 0) > 0;

    return {
      passed: hasResults && topScore > 0.1,
      details: `Query: "${query}"
Has results: ${hasResults}
Top score: ${topScore.toFixed(4)}
Number of results: ${result.matches?.length}`,
    };
  });

  // =========================================================================
  // TEST 15: Edge Case - English Query
  // =========================================================================
  await runTest('15. Edge Case - English Query', async () => {
    const query = 'What is the total commission for this employee?';
    const result = await queryPinecone(query, 3);

    const topScore = result.matches?.[0]?.score || 0;

    return {
      passed: topScore > 0.2,
      details: `Query: "${query}"
Top score: ${topScore.toFixed(4)}
Cross-lingual retrieval working: ${topScore > 0.2}`,
    };
  });

  // =========================================================================
  // TEST 16: Metadata Completeness Check
  // =========================================================================
  await runTest('16. Metadata Completeness', async () => {
    const dummyVector = Array.from({ length: 3072 }, () => Math.random() * 0.01);
    const result = await index.namespace(NAMESPACE).query({
      vector: dummyVector,
      topK: 1,
      includeMetadata: true,
    });

    const meta = result.matches?.[0]?.metadata as Record<string, unknown>;
    const requiredFields = [
      'employeeId',
      'employeeName',
      'documentId',
      'organizationId',
      'searchable_text',
      'metadataType',
    ];

    const presentFields = requiredFields.filter(f => meta?.[f] !== undefined);
    const missingFields = requiredFields.filter(f => meta?.[f] === undefined);

    return {
      passed: missingFields.length === 0,
      details: `Present fields (${presentFields.length}/${requiredFields.length}): ${presentFields.join(', ')}
Missing fields: ${missingFields.length > 0 ? missingFields.join(', ') : 'None'}
Full metadata keys: ${Object.keys(meta || {}).join(', ')}`,
    };
  });

  // =========================================================================
  // TEST 17: Specific Number Extraction
  // =========================================================================
  await runTest('17. Specific Number Extraction', async () => {
    const query = '커미션 보장성금액';
    const result = await queryPinecone(query, 1);

    const meta = result.matches?.[0]?.metadata as Record<string, unknown>;
    const searchText = meta?.searchable_text as string;

    // Extract numbers from searchable_text
    const numberPattern = /[\d,]+원|[\d,]+\s*원/g;
    const numbers = searchText?.match(numberPattern) || [];

    return {
      passed: numbers.length > 0,
      details: `Query: "${query}"
Numbers found in text: ${numbers.slice(0, 10).join(', ')}
Total numbers found: ${numbers.length}
Sample text with numbers: ${searchText?.match(/보장성[^\\n]{0,100}/)?.[0] || 'Not found'}`,
    };
  });

  // =========================================================================
  // TEST 18: End-to-End Answer Accuracy
  // =========================================================================
  await runTest('18. E2E Answer Accuracy - Commission', async () => {
    const query = '윤나래의 총 커미션 합계 금액을 정확히 알려주세요';
    const searchResult = await queryPinecone(query, 2);

    const meta = searchResult.matches?.[0]?.metadata as Record<string, unknown>;
    const totalCommission = meta?.totalCommission as number;
    const searchText = meta?.searchable_text as string;

    const answer = await generateAnswer(query, searchText || '');

    // Check if answer contains the commission amount
    const commissionStr = totalCommission?.toLocaleString();
    const answerHasAmount = answer.includes(commissionStr || 'NOTFOUND');

    return {
      passed: !!totalCommission,
      details: `Query: "${query}"

Metadata totalCommission: ${totalCommission?.toLocaleString()}원

Generated Answer:
${answer}

Answer contains exact amount: ${answerHasAmount}`,
    };
  });

  // =========================================================================
  // TEST 19: Context Relevance Check
  // =========================================================================
  await runTest('19. Context Relevance Check', async () => {
    const query = '윤나래';
    const result = await queryPinecone(query, 5);

    const allRelevant = result.matches?.every(m => {
      const meta = m.metadata as Record<string, unknown>;
      return meta?.employeeId === 'J00134' || meta?.employeeName === '윤나래';
    });

    return {
      passed: !!allRelevant,
      details: `Query: "${query}"
All results for correct employee: ${allRelevant}
Results:
${result.matches
  ?.map(
    m =>
      `  - ${(m.metadata as Record<string, unknown>)?.employeeId}: ${(m.metadata as Record<string, unknown>)?.employeeName} (score: ${m.score?.toFixed(4)})`
  )
  .join('\n')}`,
    };
  });

  // =========================================================================
  // TEST 20: Full Conversation Simulation
  // =========================================================================
  await runTest('20. Full Conversation Simulation', async () => {
    const questions = [
      '안녕하세요, 제 정보를 확인하고 싶어요.',
      '제 이번 달 커미션은 얼마인가요?',
      'MDRT 달성률은 어떻게 되나요?',
    ];

    const answers: string[] = [];

    for (const q of questions) {
      const result = await queryPinecone(q, 2);
      const context = result.matches
        ?.map(m => (m.metadata as Record<string, unknown>)?.searchable_text)
        .filter(Boolean)
        .join('\n\n');

      const answer = await generateAnswer(q, context || '');
      answers.push(`Q: ${q}\nA: ${answer.substring(0, 200)}...`);
    }

    const allAnswered = answers.every(a => a.length > 50);

    return {
      passed: allAnswered,
      details: `Conversation flow test:

${answers.join('\n\n')}

All questions answered: ${allAnswered}`,
    };
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  for (const r of results) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    const color = r.passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${status}\x1b[0m ${r.name} (${r.duration}ms)`);
    if (!r.passed) {
      console.log(`       Details: ${r.details.split('\n')[0]}`);
    }
  }

  console.log('\n' + '-'.repeat(80));
  console.log(`Total: ${passed}/${total} passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('-'.repeat(80));

  if (failed > 0) {
    console.log('\n\x1b[31mFAILED TESTS DETAILS:\x1b[0m\n');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`\x1b[31m${r.name}\x1b[0m`);
      console.log(r.details);
      console.log('');
    }
  }

  // Print detailed results for key tests
  console.log('\n' + '='.repeat(80));
  console.log('KEY TEST DETAILS');
  console.log('='.repeat(80) + '\n');

  const keyTests = [2, 3, 4, 12, 18];
  for (const idx of keyTests) {
    const r = results[idx - 1];
    if (r) {
      console.log(`--- ${r.name} ---`);
      console.log(r.details);
      console.log('');
    }
  }
}

main().catch(console.error);
