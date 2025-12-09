/**
 * Aggregation Test Suite
 *
 * Tests for aggregate calculations and summaries:
 * - Total calculations across all employees
 * - Group by calculations (job type, branch, office)
 * - Statistical measures (sum, avg, min, max, count)
 * - Distribution analysis
 */

import type { TestSuite } from '../types';

export const aggregationSuite: TestSuite = {
  id: 'aggregation',
  name: 'Aggregation Tests',
  description:
    'Tests for aggregate calculations and summary statistics',
  category: 'aggregation',
  testCases: [
    // =========================================================================
    // TOTAL CALCULATIONS
    // =========================================================================
    {
      id: 'AGG001',
      category: 'aggregation',
      difficulty: 'medium',
      name: 'Total employees count',
      description: 'Count total number of employees',
      query: '전체 직원 수가 몇 명이야?',
      queryVariants: ['직원 몇 명?', '총 인원', '전체 FC 수'],
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.01,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.totalEmployees',
      },
    },
    {
      id: 'AGG002',
      category: 'aggregation',
      difficulty: 'medium',
      name: 'Total commission sum',
      description: 'Sum of all commission across employees',
      query: '전체 커미션 합계가 얼마야?',
      queryVariants: ['회사 전체 수수료', '총 커미션', '전체 수수료 합계'],
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.totalCommission',
      },
    },
    {
      id: 'AGG003',
      category: 'aggregation',
      difficulty: 'medium',
      name: 'Total income sum',
      description: 'Sum of all total income across employees',
      query: '전체 총수입 합계는?',
      queryVariants: ['회사 전체 수입', '총 수입 합계'],
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.totalIncome',
      },
    },
    {
      id: 'AGG004',
      category: 'aggregation',
      difficulty: 'hard',
      name: 'Average commission calculation',
      description: 'Calculate average commission per employee',
      query: '평균 커미션이 얼마야?',
      queryVariants: ['커미션 평균', '1인당 평균 수수료'],
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.05,
        formula: 'totalCommission / totalEmployees',
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations',
        transform: 'calculateAvgCommission',
      },
    },
    {
      id: 'AGG005',
      category: 'aggregation',
      difficulty: 'hard',
      name: 'Average income calculation',
      description: 'Calculate average total income per employee',
      query: '1인당 평균 총수입은?',
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.05,
        formula: 'totalIncome / totalEmployees',
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations',
        transform: 'calculateAvgIncome',
      },
    },

    // =========================================================================
    // GROUP BY JOB TYPE
    // =========================================================================
    {
      id: 'AGG010',
      category: 'aggregation',
      difficulty: 'medium',
      name: 'Count by job type - LP',
      description: 'Count employees by specific job type',
      query: 'LP 몇 명이야?',
      queryVariants: ['LP 인원', 'LP 수', 'LP 직원 몇명?'],
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.01,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byJobType.LP.count',
      },
    },
    {
      id: 'AGG011',
      category: 'aggregation',
      difficulty: 'medium',
      name: 'Count by job type - AM',
      description: 'Count AM employees',
      query: 'AM이 몇 명?',
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.01,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byJobType.AM.count',
      },
    },
    {
      id: 'AGG012',
      category: 'aggregation',
      difficulty: 'medium',
      name: 'Count by job type - SM',
      description: 'Count SM employees',
      query: 'SM 인원수 알려줘',
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.01,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byJobType.SM.count',
      },
    },
    {
      id: 'AGG013',
      category: 'aggregation',
      difficulty: 'hard',
      name: 'Total commission by job type',
      description: 'Sum commission for specific job type',
      query: 'LP 전체 커미션 합계는?',
      queryVariants: ['LP 총 수수료', 'LP 커미션 총액'],
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byJobType.LP.totalCommission',
      },
    },
    {
      id: 'AGG014',
      category: 'aggregation',
      difficulty: 'hard',
      name: 'Average commission by job type',
      description: 'Calculate average commission for job type',
      query: 'AM 평균 커미션은?',
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byJobType.AM.avgCommission',
      },
    },
    {
      id: 'AGG015',
      category: 'aggregation',
      difficulty: 'expert',
      name: 'All job types breakdown',
      description: 'Get breakdown of all job types',
      query: '직급별 인원수랑 평균 커미션 알려줘',
      expectedAnswer: {
        type: 'json',
        expected: {},
        requiredFields: ['LP', 'AM', 'SM'],
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byJobType',
      },
    },

    // =========================================================================
    // MONTHLY AGGREGATIONS
    // =========================================================================
    {
      id: 'AGG020',
      category: 'aggregation',
      difficulty: 'medium',
      name: 'Monthly commission total - specific month',
      description: 'Get total commission for specific month',
      query: '1월 전체 커미션 합계는?',
      queryVariants: ['1월 커미션 총액', '1월 수수료 합계'],
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byMonth.1월.totalCommission',
      },
    },
    {
      id: 'AGG021',
      category: 'aggregation',
      difficulty: 'medium',
      name: 'Monthly income total',
      description: 'Get total income for specific month',
      query: '3월 전체 총수입은?',
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byMonth.3월.totalIncome',
      },
    },
    {
      id: 'AGG022',
      category: 'aggregation',
      difficulty: 'hard',
      name: 'Monthly breakdown',
      description: 'Get commission breakdown by all months',
      query: '월별 커미션 합계 알려줘',
      expectedAnswer: {
        type: 'json',
        expected: {},
        requiredFields: ['1월', '2월', '3월'],
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byMonth',
      },
    },
    {
      id: 'AGG023',
      category: 'aggregation',
      difficulty: 'expert',
      name: 'Highest commission month',
      description: 'Find month with highest total commission',
      query: '커미션 가장 높은 달은?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byMonth',
        transform: 'findHighestMonth',
      },
    },

    // =========================================================================
    // MDRT AGGREGATIONS
    // =========================================================================
    {
      id: 'AGG030',
      category: 'aggregation',
      difficulty: 'hard',
      name: 'MDRT eligible count',
      description: 'Count employees who meet MDRT requirements',
      query: 'MDRT 달성한 사람 몇 명이야?',
      queryVariants: ['MDRT 자격자 수', 'MDRT 충족 인원'],
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees',
        transform: 'countMdrtEligible',
      },
    },
    {
      id: 'AGG031',
      category: 'aggregation',
      difficulty: 'hard',
      name: 'COT eligible count',
      description: 'Count employees who meet COT requirements',
      query: 'COT 자격자 몇 명?',
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees',
        transform: 'countCotEligible',
      },
    },
    {
      id: 'AGG032',
      category: 'aggregation',
      difficulty: 'expert',
      name: 'MDRT eligibility by job type',
      description: 'Count MDRT eligible by job type',
      query: '직급별 MDRT 달성자 수 알려줘',
      expectedAnswer: {
        type: 'json',
        expected: {},
        requiredFields: ['LP', 'AM', 'SM'],
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees',
        transform: 'mdrtByJobType',
      },
    },
    {
      id: 'AGG033',
      category: 'aggregation',
      difficulty: 'expert',
      name: 'MDRT achievement rate company-wide',
      description: 'Calculate MDRT achievement rate for company',
      query: '회사 전체 MDRT 달성률은?',
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
        formula: '(mdrtEligible / totalEmployees) * 100',
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees',
        transform: 'companyMdrtRate',
      },
    },

    // =========================================================================
    // STATISTICAL AGGREGATIONS
    // =========================================================================
    {
      id: 'AGG040',
      category: 'aggregation',
      difficulty: 'hard',
      name: 'Maximum commission',
      description: 'Find highest commission among all employees',
      query: '가장 높은 커미션 금액은?',
      queryVariants: ['최고 커미션', '커미션 최대값'],
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'maxCommission',
      },
    },
    {
      id: 'AGG041',
      category: 'aggregation',
      difficulty: 'hard',
      name: 'Minimum commission',
      description: 'Find lowest commission among all employees',
      query: '가장 낮은 커미션은?',
      queryVariants: ['최저 커미션', '커미션 최소값'],
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'minCommission',
      },
    },
    {
      id: 'AGG042',
      category: 'aggregation',
      difficulty: 'expert',
      name: 'Commission range',
      description: 'Calculate range of commission values',
      query: '커미션 최고와 최저 차이는?',
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.05,
        formula: 'maxCommission - minCommission',
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'commissionRange',
      },
    },
    {
      id: 'AGG043',
      category: 'aggregation',
      difficulty: 'expert',
      name: 'Commission median',
      description: 'Calculate median commission',
      query: '커미션 중앙값은?',
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'medianCommission',
      },
    },

    // =========================================================================
    // 보장성금액 AGGREGATIONS
    // =========================================================================
    {
      id: 'AGG050',
      category: 'aggregation',
      difficulty: 'hard',
      name: 'Total 보장성금액',
      description: 'Sum of all 보장성금액 across employees',
      query: '전체 보장성금액 합계는?',
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'sum보장성',
      },
    },
    {
      id: 'AGG051',
      category: 'aggregation',
      difficulty: 'hard',
      name: 'Average 보장성금액',
      description: 'Average 보장성금액 per employee',
      query: '평균 보장성금액은?',
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'avg보장성',
      },
    },
    {
      id: 'AGG052',
      category: 'aggregation',
      difficulty: 'expert',
      name: '보장성금액 ratio company-wide',
      description: 'Calculate 보장성금액 ratio to total commission',
      query: '전체 보장성금액이 전체 커미션의 몇 %야?',
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
        formula: '(total보장성 / totalCommission) * 100',
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations',
        transform: 'company보장성Ratio',
      },
    },

    // =========================================================================
    // SELF CONTRACT AGGREGATIONS
    // =========================================================================
    {
      id: 'AGG060',
      category: 'aggregation',
      difficulty: 'expert',
      name: 'Total self contract',
      description: 'Sum of all self contract commissions',
      query: '전체 자기계약 커미션 합계는?',
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'sumSelfContract',
      },
    },
    {
      id: 'AGG061',
      category: 'aggregation',
      difficulty: 'expert',
      name: 'Self contract rate company-wide',
      description: 'Calculate company-wide self contract rate',
      query: '회사 전체 자기계약 비율은?',
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
        formula: '(totalSelfContract / totalCommission) * 100',
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'selfContractRate',
      },
    },

    // =========================================================================
    // INFORMAL AGGREGATION QUERIES
    // =========================================================================
    {
      id: 'AGG070',
      category: 'aggregation',
      difficulty: 'medium',
      name: 'Informal total query',
      description: 'Handle informal aggregate query',
      query: '다 합치면 얼마야?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['합계', '총', '전체'],
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.totalCommission',
      },
    },
    {
      id: 'AGG071',
      category: 'aggregation',
      difficulty: 'medium',
      name: 'Casual count query',
      description: 'Handle casual count query',
      query: '우리 몇 명?',
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.totalEmployees',
      },
    },
  ],
};
