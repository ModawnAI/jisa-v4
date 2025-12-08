/**
 * RAG Validation Script for Public Documents
 *
 * Iterative feedback loop to validate RAG retrieval quality:
 * 1. Run test queries against public namespace
 * 2. Compare results with original document content
 * 3. Score relevance and accuracy
 * 4. Generate recommendations for data structure improvements
 *
 * Run: npx tsx scripts/validate-rag-public.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

import { createEmbedding } from '../lib/utils/embedding';

// Configuration
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX || 'jisa-v4';
const PUBLIC_NAMESPACE = 'public';
const DATA_DIR = path.join(process.cwd(), 'data', 'everyone');
const TOP_K = 5; // Number of results to retrieve per query

// Test queries - realistic questions users might ask
// Organized by expected doc_type for validation
const TEST_QUERIES = [
  // Commission rate queries (수수료율)
  {
    query: '11월 수수료율 얼마야?',
    expectedDocType: 'commission_rate',
    keywords: ['수수료', '11월', 'commission'],
    description: 'November commission rate inquiry',
  },
  {
    query: 'HO&F 지사 커미션 정보',
    expectedDocType: 'commission_rate',
    keywords: ['HO&F', '커미션', 'commission'],
    description: 'HO&F branch commission info',
  },
  {
    query: '생보 손보 통합 수수료',
    expectedDocType: 'commission_rate',
    keywords: ['생보', '손보', '수수료', '통합'],
    description: 'Life/non-life integrated commission',
  },
  {
    query: 'FC 커미션 예측 현황',
    expectedDocType: 'commission_rate',
    keywords: ['FC', '커미션', '예측'],
    description: 'FC commission forecast status',
  },
  // Schedule queries (일정/시간표)
  {
    query: 'KRS 교육 일정',
    expectedDocType: 'schedule',
    keywords: ['KRS', '교육', '일정', '시간표'],
    description: 'KRS training schedule',
  },
  {
    query: '일반직 시간표',
    expectedDocType: 'schedule',
    keywords: ['일반직', '시간표'],
    description: 'Regular employee schedule',
  },
  // Policy announcement queries (시책/공지)
  {
    query: '한화생명 시책 공지',
    expectedDocType: 'policy_announcement',
    keywords: ['한화생명', '시책', '공지'],
    description: 'Hanwha Life policy announcement',
  },
  {
    query: '11월 시책 안내',
    expectedDocType: 'policy_announcement',
    keywords: ['11월', '시책', '안내'],
    description: 'November policy guide',
  },
  // General queries
  {
    query: '2025년 12월 현황',
    expectedDocType: null, // Could match multiple
    keywords: ['2025', '12월', '현황'],
    description: 'December 2025 status',
  },
];

interface ValidationResult {
  query: string;
  description: string;
  expectedDocType: string | null;
  results: Array<{
    score: number;
    docType: string;
    content: string;
    metadata: Record<string, unknown>;
    keywordMatch: number; // Percentage of expected keywords found
    docTypeMatch: boolean;
  }>;
  avgScore: number;
  avgKeywordMatch: number;
  docTypeAccuracy: number;
  recommendations: string[];
}

interface OverallReport {
  timestamp: string;
  totalQueries: number;
  totalResults: number;
  avgRelevanceScore: number;
  avgKeywordMatch: number;
  docTypeAccuracy: number;
  docTypeBreakdown: Record<string, { count: number; avgScore: number }>;
  issues: string[];
  recommendations: string[];
  queryResults: ValidationResult[];
}

// Calculate keyword match percentage
function calculateKeywordMatch(
  content: string,
  keywords: string[]
): number {
  const lowerContent = content.toLowerCase();
  let matchCount = 0;

  for (const keyword of keywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  }

  return keywords.length > 0 ? (matchCount / keywords.length) * 100 : 0;
}

// Generate recommendations based on result analysis
function generateRecommendations(
  result: ValidationResult,
  queryConfig: (typeof TEST_QUERIES)[0]
): string[] {
  const recommendations: string[] = [];

  // Low relevance scores
  if (result.avgScore < 0.5) {
    recommendations.push(
      `Query "${result.query}" has low relevance (${(result.avgScore * 100).toFixed(1)}%). Consider improving embedding text structure or adding more context.`
    );
  }

  // Low keyword match
  if (result.avgKeywordMatch < 50) {
    recommendations.push(
      `Query "${result.query}" has low keyword match (${result.avgKeywordMatch.toFixed(1)}%). Keywords [${queryConfig.keywords.join(', ')}] not well represented in retrieved content.`
    );
  }

  // Wrong doc_type
  if (result.docTypeAccuracy < 50 && queryConfig.expectedDocType) {
    recommendations.push(
      `Query "${result.query}" expected doc_type "${queryConfig.expectedDocType}" but got different types. Consider improving doc_type detection or chunk metadata.`
    );
  }

  // No results
  if (result.results.length === 0) {
    recommendations.push(
      `Query "${result.query}" returned no results. Check if relevant documents are indexed in the public namespace.`
    );
  }

  return recommendations;
}

async function main() {
  console.log('='.repeat(80));
  console.log('RAG Validation Script - Public Documents');
  console.log('='.repeat(80));

  // Check Pinecone configuration
  if (!process.env.PINECONE_API_KEY) {
    console.error('PINECONE_API_KEY not set');
    process.exit(1);
  }

  // Initialize Pinecone
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.index(INDEX_NAME);

  console.log(`\nPinecone Index: ${INDEX_NAME}`);
  console.log(`Namespace: ${PUBLIC_NAMESPACE}`);

  // Check current stats
  const stats = await index.describeIndexStats();
  const vectorCount = stats.namespaces?.[PUBLIC_NAMESPACE]?.recordCount || 0;
  console.log(`Vectors in ${PUBLIC_NAMESPACE}: ${vectorCount}`);

  if (vectorCount === 0) {
    console.error('\nNo vectors found in public namespace. Run upload script first.');
    process.exit(1);
  }

  // Run validation
  console.log(`\nRunning ${TEST_QUERIES.length} test queries...\n`);

  const queryResults: ValidationResult[] = [];
  const docTypeStats: Record<string, { count: number; totalScore: number }> = {};

  for (const queryConfig of TEST_QUERIES) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Query: "${queryConfig.query}"`);
    console.log(`Description: ${queryConfig.description}`);
    console.log(`Expected doc_type: ${queryConfig.expectedDocType || 'any'}`);
    console.log('─'.repeat(60));

    // Generate embedding for query
    const embedding = await createEmbedding(queryConfig.query);

    // Query Pinecone
    const queryResponse = await index.namespace(PUBLIC_NAMESPACE).query({
      vector: embedding,
      topK: TOP_K,
      includeMetadata: true,
    });

    const results: ValidationResult['results'] = [];
    let docTypeMatchCount = 0;

    for (const match of queryResponse.matches || []) {
      const metadata = (match.metadata || {}) as Record<string, unknown>;
      const docType = (metadata.doc_type as string) || 'unknown';
      const content = (metadata.searchable_text as string) || (metadata.content as string) || '';

      const keywordMatch = calculateKeywordMatch(content, queryConfig.keywords);
      const docTypeMatch =
        !queryConfig.expectedDocType || docType === queryConfig.expectedDocType;

      if (docTypeMatch) docTypeMatchCount++;

      // Track doc_type stats
      if (!docTypeStats[docType]) {
        docTypeStats[docType] = { count: 0, totalScore: 0 };
      }
      docTypeStats[docType].count++;
      docTypeStats[docType].totalScore += match.score || 0;

      results.push({
        score: match.score || 0,
        docType,
        content: content.slice(0, 200) + (content.length > 200 ? '...' : ''),
        metadata,
        keywordMatch,
        docTypeMatch,
      });

      // Print result summary
      console.log(`  [${(match.score || 0).toFixed(3)}] doc_type: ${docType}`);
      console.log(`    Keywords: ${keywordMatch.toFixed(0)}% match`);
      console.log(`    Preview: ${content.slice(0, 100).replace(/\n/g, ' ')}...`);
    }

    const avgScore = results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0;
    const avgKeywordMatch = results.length > 0
      ? results.reduce((sum, r) => sum + r.keywordMatch, 0) / results.length
      : 0;
    const docTypeAccuracy = results.length > 0
      ? (docTypeMatchCount / results.length) * 100
      : 0;

    const validationResult: ValidationResult = {
      query: queryConfig.query,
      description: queryConfig.description,
      expectedDocType: queryConfig.expectedDocType,
      results,
      avgScore,
      avgKeywordMatch,
      docTypeAccuracy,
      recommendations: [],
    };

    validationResult.recommendations = generateRecommendations(
      validationResult,
      queryConfig
    );

    queryResults.push(validationResult);

    // Print summary for this query
    console.log(`\n  Summary:`);
    console.log(`    Avg Score: ${(avgScore * 100).toFixed(1)}%`);
    console.log(`    Keyword Match: ${avgKeywordMatch.toFixed(1)}%`);
    if (queryConfig.expectedDocType) {
      console.log(`    doc_type Accuracy: ${docTypeAccuracy.toFixed(1)}%`);
    }
    if (validationResult.recommendations.length > 0) {
      console.log(`    Issues: ${validationResult.recommendations.length}`);
    }
  }

  // Generate overall report
  const totalResults = queryResults.reduce((sum, r) => sum + r.results.length, 0);
  const overallAvgScore = totalResults > 0
    ? queryResults.reduce((sum, r) => sum + r.results.reduce((s, res) => s + res.score, 0), 0) / totalResults
    : 0;
  const overallKeywordMatch = queryResults.length > 0
    ? queryResults.reduce((sum, r) => sum + r.avgKeywordMatch, 0) / queryResults.length
    : 0;
  const overallDocTypeAccuracy = queryResults.filter(r => r.expectedDocType).length > 0
    ? queryResults
        .filter(r => r.expectedDocType)
        .reduce((sum, r) => sum + r.docTypeAccuracy, 0) /
      queryResults.filter(r => r.expectedDocType).length
    : 0;

  // Compile issues and recommendations
  const allRecommendations = queryResults.flatMap((r) => r.recommendations);
  const uniqueRecommendations = [...new Set(allRecommendations)];

  // Identify systemic issues
  const issues: string[] = [];
  if (overallAvgScore < 0.5) {
    issues.push('Overall relevance scores are low. Consider improving embedding text structure.');
  }
  if (overallKeywordMatch < 50) {
    issues.push('Overall keyword match is low. Important terms may not be well represented in chunks.');
  }
  if (overallDocTypeAccuracy < 70) {
    issues.push('doc_type detection accuracy is low. Review detection patterns and metadata.');
  }

  // Doc type breakdown
  const docTypeBreakdown: Record<string, { count: number; avgScore: number }> = {};
  for (const [docType, stats] of Object.entries(docTypeStats)) {
    docTypeBreakdown[docType] = {
      count: stats.count,
      avgScore: stats.count > 0 ? stats.totalScore / stats.count : 0,
    };
  }

  const report: OverallReport = {
    timestamp: new Date().toISOString(),
    totalQueries: TEST_QUERIES.length,
    totalResults,
    avgRelevanceScore: overallAvgScore,
    avgKeywordMatch: overallKeywordMatch,
    docTypeAccuracy: overallDocTypeAccuracy,
    docTypeBreakdown,
    issues,
    recommendations: uniqueRecommendations,
    queryResults,
  };

  // Print final report
  console.log('\n' + '='.repeat(80));
  console.log('VALIDATION REPORT');
  console.log('='.repeat(80));
  console.log(`\nTimestamp: ${report.timestamp}`);
  console.log(`Total Queries: ${report.totalQueries}`);
  console.log(`Total Results: ${report.totalResults}`);
  console.log(`\nOverall Metrics:`);
  console.log(`  Avg Relevance Score: ${(report.avgRelevanceScore * 100).toFixed(1)}%`);
  console.log(`  Avg Keyword Match: ${report.avgKeywordMatch.toFixed(1)}%`);
  console.log(`  doc_type Accuracy: ${report.docTypeAccuracy.toFixed(1)}%`);

  console.log(`\ndoc_type Breakdown:`);
  for (const [docType, stats] of Object.entries(report.docTypeBreakdown)) {
    console.log(`  ${docType}: ${stats.count} results, avg score ${(stats.avgScore * 100).toFixed(1)}%`);
  }

  if (report.issues.length > 0) {
    console.log(`\nSystemic Issues (${report.issues.length}):`);
    for (const issue of report.issues) {
      console.log(`  - ${issue}`);
    }
  }

  if (report.recommendations.length > 0) {
    console.log(`\nRecommendations (${report.recommendations.length}):`);
    for (const rec of report.recommendations) {
      console.log(`  - ${rec}`);
    }
  }

  // Save report to file
  const reportPath = path.join(process.cwd(), 'data', 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);

  // Exit code based on quality
  if (report.avgRelevanceScore < 0.3 || report.avgKeywordMatch < 30) {
    console.log('\nValidation FAILED - Quality below threshold');
    process.exit(1);
  } else if (report.avgRelevanceScore < 0.5 || report.avgKeywordMatch < 50) {
    console.log('\nValidation WARNING - Quality could be improved');
    process.exit(0);
  } else {
    console.log('\nValidation PASSED - Quality acceptable');
    process.exit(0);
  }
}

// Run
main().catch(console.error);
