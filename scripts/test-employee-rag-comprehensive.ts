/**
 * Comprehensive Employee RAG Test
 *
 * Tests the RAG system end-to-end for employee J00134 (윤나래)
 * with various query types to verify searchable_text retrieval.
 *
 * Run: npx tsx scripts/test-employee-rag-comprehensive.ts
 */

import * as path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';

config({ path: path.join(process.cwd(), '.env.local') });

// Test configuration
const TEST_EMPLOYEE = {
  employeeId: 'J00134',
  employeeName: '윤나래',
  namespace: 'emp_J00134',
};

// Test queries - various types of employee-specific questions
const TEST_QUERIES = [
  // Commission/Salary queries
  { category: 'Commission', query: '내 수수료는 얼마야?' },
  { category: 'Commission', query: '이번 달 커미션은?' },
  { category: 'Commission', query: '총수입이 얼마인가요?' },
  { category: 'Commission', query: '연간 합계 커미션' },

  // MDRT Status queries
  { category: 'MDRT', query: 'MDRT 달성했어?' },
  { category: 'MDRT', query: 'MDRT 달성률이 어떻게 돼?' },
  { category: 'MDRT', query: 'MDRT까지 얼마나 부족해?' },

  // Monthly breakdown queries
  { category: 'Monthly', query: '월별 실적 알려줘' },
  { category: 'Monthly', query: '1월 수수료' },
  { category: 'Monthly', query: '11월 커미션은?' },

  // General info queries
  { category: 'Info', query: '내 정보 알려줘' },
  { category: 'Info', query: '지사와 지점이 어디야?' },
  { category: 'Info', query: '내 직종은?' },

  // AGI (Total Income) queries
  { category: 'AGI', query: '총수입 기준 실적은?' },
  { category: 'AGI', query: 'AGI 달성률이 어떻게 돼?' },

  // Self-contract queries
  { category: 'SelfContract', query: '자계약 수수료는?' },
  { category: 'SelfContract', query: '본인계약 포함 금액' },

  // Comparison queries
  { category: 'Status', query: '현재 실적이 어때?' },
  { category: 'Status', query: '목표 대비 얼마나 남았어?' },
];

// Lazy clients
let pinecone: Pinecone;
let genai: GoogleGenAI;

const INDEX_NAME = (
  process.env.PINECONE_INDEX_NAME ||
  process.env.PINECONE_INDEX ||
  'jisa-v4'
).trim();

async function createEmbedding(text: string): Promise<number[]> {
  const openai = await import('openai');
  const client = new openai.default({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 3072,
  });

  return response.data[0].embedding;
}

interface TestResult {
  category: string;
  query: string;
  matchCount: number;
  topScore: number;
  hasSearchableText: boolean;
  searchableTextPreview: string;
  answerPreview: string;
  durationMs: number;
  status: 'PASS' | 'FAIL' | 'WARN';
  failReason?: string;
}

async function testQuery(
  category: string,
  query: string
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Generate embedding
    const embedding = await createEmbedding(query);

    // Search with metadata filter
    const index = pinecone.index(INDEX_NAME);
    const results = await index.namespace(TEST_EMPLOYEE.namespace).query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
      filter: {
        employeeId: { $eq: TEST_EMPLOYEE.employeeId },
      },
    });

    const matches = results.matches || [];
    const topMatch = matches[0];
    const topScore = topMatch?.score ?? 0;

    // Check for searchable_text
    const searchableText =
      (topMatch?.metadata?.searchable_text as string) || '';
    const hasSearchableText = searchableText.length > 0;

    // Determine status
    let status: 'PASS' | 'FAIL' | 'WARN' = 'PASS';
    let failReason: string | undefined;

    if (matches.length === 0) {
      status = 'FAIL';
      failReason = 'No matches found';
    } else if (!hasSearchableText) {
      status = 'FAIL';
      failReason = 'searchable_text missing in metadata';
    } else if (topScore < 0.3) {
      status = 'WARN';
      failReason = `Low relevance score: ${topScore.toFixed(3)}`;
    }

    // Generate answer if we have good results
    let answerPreview = '';
    if (status === 'PASS' && hasSearchableText) {
      try {
        const context = formatContext(matches);
        const answer = await generateAnswer(query, context);
        answerPreview = answer.substring(0, 200) + '...';
      } catch (err) {
        answerPreview = `[Error generating answer: ${err}]`;
      }
    }

    return {
      category,
      query,
      matchCount: matches.length,
      topScore,
      hasSearchableText,
      searchableTextPreview: searchableText.substring(0, 150) + '...',
      answerPreview,
      durationMs: Date.now() - startTime,
      status,
      failReason,
    };
  } catch (error) {
    return {
      category,
      query,
      matchCount: 0,
      topScore: 0,
      hasSearchableText: false,
      searchableTextPreview: '',
      answerPreview: '',
      durationMs: Date.now() - startTime,
      status: 'FAIL',
      failReason: `Exception: ${error}`,
    };
  }
}

function formatContext(
  matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }>
): string {
  return matches
    .map((m, i) => {
      const text =
        (m.metadata?.searchable_text as string) ||
        (m.metadata?.text as string) ||
        '';
      return `## Document ${i + 1} (Score: ${m.score?.toFixed(3)})\n${text}`;
    })
    .join('\n\n');
}

async function generateAnswer(query: string, context: string): Promise<string> {
  const prompt = `당신은 보험 설계사 급여 도우미 AI입니다. ${TEST_EMPLOYEE.employeeName}님의 질문에 답변하세요.

사용자 질문: ${query}

검색된 정보:
${context}

간단하고 친절하게 답변하세요:`;

  const response = await genai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  return response.text || '';
}

async function main() {
  console.log('='.repeat(80));
  console.log('Comprehensive Employee RAG Test');
  console.log('='.repeat(80));
  console.log(`\nTarget Employee: ${TEST_EMPLOYEE.employeeName} (${TEST_EMPLOYEE.employeeId})`);
  console.log(`Namespace: ${TEST_EMPLOYEE.namespace}`);
  console.log(`Index: ${INDEX_NAME}`);
  console.log(`Total Test Queries: ${TEST_QUERIES.length}\n`);

  // Initialize clients
  pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  // Verify namespace exists
  const index = pinecone.index(INDEX_NAME);
  const stats = await index.describeIndexStats();
  const nsStats = stats.namespaces?.[TEST_EMPLOYEE.namespace];

  if (!nsStats || nsStats.recordCount === 0) {
    console.error(`ERROR: Namespace ${TEST_EMPLOYEE.namespace} has no vectors!`);
    console.error('Please run the re-upload script first.');
    process.exit(1);
  }

  console.log(`Vectors in namespace: ${nsStats.recordCount}\n`);

  // Run tests
  const results: TestResult[] = [];
  const delayMs = 500; // Rate limiting

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const { category, query } = TEST_QUERIES[i];
    process.stdout.write(`[${i + 1}/${TEST_QUERIES.length}] Testing: ${query.substring(0, 30)}...\r`);

    const result = await testQuery(category, query);
    results.push(result);

    if (i < TEST_QUERIES.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Print detailed results
  console.log('\n' + '='.repeat(80));
  console.log('DETAILED RESULTS');
  console.log('='.repeat(80));

  for (const result of results) {
    const statusIcon =
      result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';

    console.log(`\n${statusIcon} [${result.category}] ${result.query}`);
    console.log(`   Status: ${result.status}${result.failReason ? ` - ${result.failReason}` : ''}`);
    console.log(`   Matches: ${result.matchCount}, Top Score: ${result.topScore.toFixed(3)}`);
    console.log(`   Searchable Text: ${result.hasSearchableText ? 'YES' : 'NO'}`);

    if (result.hasSearchableText && result.status === 'PASS') {
      console.log(`   Context Preview: ${result.searchableTextPreview}`);
      console.log(`   Answer Preview: ${result.answerPreview}`);
    }

    console.log(`   Duration: ${result.durationMs}ms`);
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter((r) => r.status === 'PASS').length;
  const warned = results.filter((r) => r.status === 'WARN').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ PASSED: ${passed}`);
  console.log(`⚠️  WARNED: ${warned}`);
  console.log(`❌ FAILED: ${failed}`);

  // Group by category
  const categories = [...new Set(results.map((r) => r.category))];
  console.log('\nBy Category:');
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catPassed = catResults.filter((r) => r.status === 'PASS').length;
    console.log(`   ${cat}: ${catPassed}/${catResults.length} passed`);
  }

  // Average scores
  const avgTopScore =
    results.reduce((sum, r) => sum + r.topScore, 0) / results.length;
  const avgDuration =
    results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;

  console.log(`\nAverage Top Score: ${avgTopScore.toFixed(3)}`);
  console.log(`Average Duration: ${avgDuration.toFixed(0)}ms`);

  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Employee RAG is working correctly.');
  } else if (failed < results.length / 2) {
    console.log('⚠️  PARTIAL SUCCESS: Some tests failed, review results above.');
  } else {
    console.log('❌ CRITICAL FAILURE: Most tests failed. Check configuration.');
  }
  console.log('='.repeat(80));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
