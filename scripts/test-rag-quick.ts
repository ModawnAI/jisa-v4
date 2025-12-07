/**
 * Quick RAG Test Script
 * Tests the enhanced RAG with J00307 employee
 */

// MUST configure dotenv before any other imports
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TEST_QUERIES = [
  '내 MDRT 진행 상황 알려줘',  // No period → should NOT have period filter
  '11월 커미션 얼마야?',       // "11월" → period should be "202511"
  '총 수입 얼마야?',           // No period → should NOT have period filter
];

async function runTest() {
  // Dynamic import after dotenv is configured
  const { enhancedRAGService } = await import('../lib/services/enhanced-rag.service');
  type EnhancedRAGContext = Parameters<typeof enhancedRAGService.query>[1];

  console.log('=== Quick RAG Test ===\n');

  const context: EnhancedRAGContext = {
    employeeId: 'J00307',
    employeeNumber: 'J00307', // 사번 for Pinecone filtering
    organizationId: 'default',
    namespace: 'emp_J00307',
    clearanceLevel: 'standard',
  };

  for (const query of TEST_QUERIES) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Query: "${query}"`);
    console.log('─'.repeat(60));

    try {
      const result = await enhancedRAGService.query(query, context);

      console.log(`\nIntent: ${result.intent.intent} (${result.intent.template})`);
      console.log(`Confidence: ${result.intent.confidence}`);
      console.log(`Filters: ${JSON.stringify(result.intent.filters)}`);
      console.log(`Results: ${result.searchResults.length} vectors found`);

      if (result.searchResults.length > 0) {
        console.log(`Top Score: ${result.searchResults[0].score.toFixed(4)}`);
        console.log(`Top ID: ${result.searchResults[0].id}`);
      }

      console.log(`\nAnswer (first 500 chars):`);
      console.log(result.answer.substring(0, 500) + (result.answer.length > 500 ? '...' : ''));

      console.log(`\nTiming: ${result.processingBreakdown.totalMs}ms total`);
      console.log(`  - Query Understanding: ${result.processingBreakdown.queryUnderstandingMs}ms`);
      console.log(`  - Search: ${result.processingBreakdown.searchMs}ms`);
      console.log(`  - Generation: ${result.processingBreakdown.generationMs}ms`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
    }
  }

  console.log('\n=== Test Complete ===');
}

runTest().catch(console.error);
