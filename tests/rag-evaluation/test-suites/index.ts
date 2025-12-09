/**
 * Test Suites Index
 *
 * Export all test suites for RAG evaluation
 */

export { employeeLookupSuite } from './employee-lookup.suite';
export { mdrtCalculationSuite } from './mdrt-calculation.suite';
export { comparisonSuite } from './comparison.suite';
export { aggregationSuite } from './aggregation.suite';
export { temporalSuite } from './temporal.suite';
export { rankingSuite } from './ranking.suite';
export { rateLookupSuite } from './rate-lookup.suite';

import type { TestSuite } from '../types';
import { employeeLookupSuite } from './employee-lookup.suite';
import { mdrtCalculationSuite } from './mdrt-calculation.suite';
import { comparisonSuite } from './comparison.suite';
import { aggregationSuite } from './aggregation.suite';
import { temporalSuite } from './temporal.suite';
import { rankingSuite } from './ranking.suite';
import { rateLookupSuite } from './rate-lookup.suite';

/**
 * All test suites combined
 */
export const allTestSuites: TestSuite[] = [
  employeeLookupSuite,
  mdrtCalculationSuite,
  comparisonSuite,
  aggregationSuite,
  temporalSuite,
  rankingSuite,
  rateLookupSuite,
];

/**
 * Get test suites by category
 */
export function getTestSuitesByCategory(
  categories: string[]
): TestSuite[] {
  return allTestSuites.filter((suite) =>
    categories.includes(suite.category)
  );
}

/**
 * Get total test count across all suites
 */
export function getTotalTestCount(): number {
  return allTestSuites.reduce(
    (total, suite) => total + suite.testCases.length,
    0
  );
}

/**
 * Get test counts by category
 */
export function getTestCountsByCategory(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const suite of allTestSuites) {
    counts[suite.category] = suite.testCases.length;
  }
  return counts;
}

/**
 * Get test counts by difficulty
 */
export function getTestCountsByDifficulty(): Record<string, number> {
  const counts: Record<string, number> = { easy: 0, medium: 0, hard: 0, expert: 0 };
  for (const suite of allTestSuites) {
    for (const testCase of suite.testCases) {
      counts[testCase.difficulty]++;
    }
  }
  return counts;
}

/**
 * Print test suite summary
 */
export function printTestSuiteSummary(): void {
  console.log('\n📊 RAG EVALUATION TEST SUITES SUMMARY');
  console.log('═'.repeat(50));
  console.log(`\nTotal Test Suites: ${allTestSuites.length}`);
  console.log(`Total Test Cases: ${getTotalTestCount()}`);

  console.log('\nBy Category:');
  const categoryCounts = getTestCountsByCategory();
  for (const [category, count] of Object.entries(categoryCounts)) {
    console.log(`  ${category}: ${count} tests`);
  }

  console.log('\nBy Difficulty:');
  const difficultyCounts = getTestCountsByDifficulty();
  for (const [difficulty, count] of Object.entries(difficultyCounts)) {
    console.log(`  ${difficulty}: ${count} tests`);
  }

  console.log('\n' + '═'.repeat(50));
}
