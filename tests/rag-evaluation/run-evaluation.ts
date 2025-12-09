#!/usr/bin/env npx ts-node
/**
 * RAG Evaluation Runner
 *
 * Main entry point for running RAG evaluation tests.
 * This script:
 * 1. Extracts ground truth from Excel files
 * 2. Loads test suites
 * 3. Runs tests against the RAG system
 * 4. Generates evaluation report
 *
 * Usage:
 *   npx ts-node tests/rag-evaluation/run-evaluation.ts [options]
 *
 * Options:
 *   --extract-only    Only extract ground truth, don't run tests
 *   --suite=<id>      Run specific test suite only
 *   --category=<cat>  Run tests for specific category
 *   --difficulty=<d>  Run tests of specific difficulty
 *   --v1             Use RAG V1 instead of V2
 *   --verbose         Enable verbose output
 *   --output=<path>   Custom output path for results
 */

// Load environment variables FIRST, before any other imports
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from project root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import * as fs from 'fs';
import { extractGroundTruth, saveGroundTruth } from './extract-ground-truth';
import { runEvaluation, loadGroundTruth } from './test-runner';
import {
  allTestSuites,
  getTestSuitesByCategory,
  printTestSuiteSummary,
  getTotalTestCount,
} from './test-suites';
import type {
  EvaluationConfig,
  TestCategory,
  TestDifficulty,
  TestSuite,
} from './types';

// Parse command line arguments
function parseArgs(): {
  extractOnly: boolean;
  suiteId?: string;
  category?: TestCategory;
  difficulty?: TestDifficulty;
  useV1: boolean;
  verbose: boolean;
  outputPath?: string;
} {
  const args = process.argv.slice(2);
  const result = {
    extractOnly: false,
    suiteId: undefined as string | undefined,
    category: undefined as TestCategory | undefined,
    difficulty: undefined as TestDifficulty | undefined,
    useV1: false,
    verbose: false,
    outputPath: undefined as string | undefined,
  };

  for (const arg of args) {
    if (arg === '--extract-only') {
      result.extractOnly = true;
    } else if (arg.startsWith('--suite=')) {
      result.suiteId = arg.split('=')[1];
    } else if (arg.startsWith('--category=')) {
      result.category = arg.split('=')[1] as TestCategory;
    } else if (arg.startsWith('--difficulty=')) {
      result.difficulty = arg.split('=')[1] as TestDifficulty;
    } else if (arg === '--v1') {
      result.useV1 = true;
    } else if (arg === '--verbose') {
      result.verbose = true;
    } else if (arg.startsWith('--output=')) {
      result.outputPath = arg.split('=')[1];
    }
  }

  return result;
}

/**
 * Main evaluation function
 */
async function main(): Promise<void> {
  const args = parseArgs();

  console.log('\n🚀 RAG EVALUATION SYSTEM');
  console.log('═'.repeat(60));

  // Step 1: Extract or load ground truth
  const groundTruthPath = path.join(
    process.cwd(),
    'tests/rag-evaluation/ground-truth.json'
  );

  let groundTruth;

  if (!fs.existsSync(groundTruthPath)) {
    console.log('\n📥 Extracting ground truth from Excel files...');
    await saveGroundTruth();
    groundTruth = loadGroundTruth(groundTruthPath);
  } else {
    console.log('\n📂 Loading existing ground truth...');
    groundTruth = loadGroundTruth(groundTruthPath);
    console.log(`   Extracted at: ${groundTruth.extractedAt}`);
    console.log(`   Employees: ${groundTruth.employees.length}`);
    console.log(`   Compensation Details: ${groundTruth.compensationDetails.length}`);
    console.log(`   Commission Rates: ${groundTruth.commissionRates.length}`);
  }

  if (args.extractOnly) {
    console.log('\n✅ Ground truth extraction complete. Exiting.');
    return;
  }

  // Step 2: Print test suite summary
  printTestSuiteSummary();

  // Step 3: Filter test suites based on arguments
  let testSuites: TestSuite[] = allTestSuites;

  if (args.suiteId) {
    testSuites = testSuites.filter((s) => s.id === args.suiteId);
    console.log(`\n🔍 Filtering by suite: ${args.suiteId}`);
  }

  if (args.category) {
    testSuites = testSuites.filter((s) => s.category === args.category);
    console.log(`\n🔍 Filtering by category: ${args.category}`);
  }

  if (args.difficulty) {
    // Filter test cases within suites by difficulty
    testSuites = testSuites.map((suite) => ({
      ...suite,
      testCases: suite.testCases.filter(
        (tc) => tc.difficulty === args.difficulty
      ),
    })).filter((suite) => suite.testCases.length > 0);
    console.log(`\n🔍 Filtering by difficulty: ${args.difficulty}`);
  }

  if (testSuites.length === 0) {
    console.log('\n⚠️ No test suites match the specified filters.');
    return;
  }

  // Count remaining tests
  const totalTests = testSuites.reduce(
    (sum, suite) => sum + suite.testCases.length,
    0
  );
  console.log(`\n📋 Running ${totalTests} tests across ${testSuites.length} suites`);

  // Step 4: Configure evaluation
  const config: Partial<EvaluationConfig> = {
    ragVersion: args.useV1 ? 'v1' : 'v2',
    verbose: args.verbose,
    saveResults: true,
    outputPath: args.outputPath || './tests/rag-evaluation/results',
  };

  // Step 5: Run evaluation
  console.log('\n🏃 Starting evaluation...\n');
  const startTime = Date.now();

  try {
    const report = await runEvaluation(testSuites, groundTruth, config);

    // Step 6: Print final summary
    console.log('\n\n' + '═'.repeat(60));
    console.log('📊 FINAL EVALUATION REPORT');
    console.log('═'.repeat(60));
    console.log(`\nReport ID: ${report.id}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    console.log(`\nRAG Configuration:`);
    console.log(`  Version: ${report.configuration.ragVersion}`);
    console.log(`  Reranking: ${report.configuration.useReranking}`);
    console.log(`  Embedding Model: ${report.configuration.embeddingModel}`);
    if (report.configuration.rerankModel) {
      console.log(`  Rerank Model: ${report.configuration.rerankModel}`);
    }

    console.log(`\n📈 Overall Results:`);
    console.log(`  Total Tests: ${report.overallSummary.totalTests}`);
    console.log(
      `  Passed: ${report.overallSummary.passed} (${(report.overallSummary.overallPassRate * 100).toFixed(1)}%)`
    );
    console.log(`  Failed: ${report.overallSummary.failed}`);
    console.log(`  Errors: ${report.overallSummary.errors}`);
    console.log(`  Skipped: ${report.overallSummary.skipped}`);

    // Print breakdown by category
    console.log(`\n📊 By Category:`);
    for (const [category, stats] of Object.entries(
      report.overallSummary.byCategory
    )) {
      if (stats) {
        console.log(
          `  ${category}: ${stats.passed}/${stats.total} (${(stats.passRate * 100).toFixed(1)}%)`
        );
      }
    }

    // Print breakdown by difficulty
    console.log(`\n📊 By Difficulty:`);
    for (const [difficulty, stats] of Object.entries(
      report.overallSummary.byDifficulty
    )) {
      if (stats) {
        console.log(
          `  ${difficulty}: ${stats.passed}/${stats.total} (${(stats.passRate * 100).toFixed(1)}%)`
        );
      }
    }

    // Identify problem areas
    console.log(`\n⚠️ Areas Needing Improvement:`);
    const problemAreas: string[] = [];
    for (const [category, stats] of Object.entries(
      report.overallSummary.byCategory
    )) {
      if (stats && stats.passRate < 0.7) {
        problemAreas.push(`  - ${category}: ${(stats.passRate * 100).toFixed(1)}% pass rate`);
      }
    }
    if (problemAreas.length > 0) {
      console.log(problemAreas.join('\n'));
    } else {
      console.log('  None - all categories above 70% pass rate');
    }

    console.log('\n' + '═'.repeat(60));

    // Exit with appropriate code
    const passRate = report.overallSummary.overallPassRate;
    if (passRate >= 0.9) {
      console.log('🎉 Excellent! RAG system performing well.');
      process.exit(0);
    } else if (passRate >= 0.7) {
      console.log('✅ Good performance, but room for improvement.');
      process.exit(0);
    } else if (passRate >= 0.5) {
      console.log('⚠️ Needs improvement. Review failed tests.');
      process.exit(1);
    } else {
      console.log('❌ Poor performance. Significant improvements needed.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Evaluation failed with error:', error);
    process.exit(2);
  }
}

// Run main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(2);
});
