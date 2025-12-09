/**
 * Comparison Test Suite
 *
 * Tests for comparing data between employees, time periods, and metrics:
 * - Employee vs employee comparisons
 * - Job type comparisons
 * - Branch/office comparisons
 * - Time period comparisons (MoM, QoQ, YoY)
 * - Metric comparisons (commission vs income)
 */

import type { TestSuite } from '../types';

export const comparisonSuite: TestSuite = {
  id: 'comparison',
  name: 'Comparison Tests',
  description: 'Tests for comparing data between entities and time periods',
  category: 'employee_comparison',
  testCases: [
    // =========================================================================
    // EMPLOYEE VS EMPLOYEE COMPARISONS
    // =========================================================================
    {
      id: 'CMP001',
      category: 'employee_comparison',
      difficulty: 'medium',
      name: 'Two employee commission comparison',
      description: 'Compare commission between two employees',
      query: 'J00134랑 J00307 누가 커미션 더 많아?',
      queryVariants: [
        'J00134 vs J00307 수수료 비교',
        '134번 307번 누가 더 벌어?',
      ],
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J00134', 'J00307', '높', '낮', '더'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'compareCommission',
      },
    },
    {
      id: 'CMP002',
      category: 'employee_comparison',
      difficulty: 'medium',
      name: 'Two employee income comparison',
      description: 'Compare total income between two employees',
      query: 'J00307이 J00001보다 총수입이 높아?',
      expectedAnswer: {
        type: 'boolean',
        expected: false,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'compareIncome',
      },
    },
    {
      id: 'CMP003',
      category: 'employee_comparison',
      difficulty: 'hard',
      name: 'Commission difference calculation',
      description: 'Calculate exact difference in commission',
      query: 'J00134랑 J00307 커미션 차이가 얼마야?',
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.05,
        formula: 'abs(emp1.commission.total - emp2.commission.total)',
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'commissionDifference',
      },
    },
    {
      id: 'CMP004',
      category: 'employee_comparison',
      difficulty: 'hard',
      name: 'Multiple employee comparison',
      description: 'Compare more than two employees',
      query: 'J00001, J00134, J00307 중에서 커미션 가장 높은 사람은?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J00001', 'J00134', 'J00307'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findHighestCommission',
      },
    },
    {
      id: 'CMP005',
      category: 'employee_comparison',
      difficulty: 'expert',
      name: 'Percentage difference comparison',
      description: 'Compare employees by percentage difference',
      query: 'J00307 커미션이 J00134보다 몇 % 높아?',
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
        formula: '((emp2.commission - emp1.commission) / emp1.commission) * 100',
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'percentageDifference',
      },
    },

    // =========================================================================
    // JOB TYPE COMPARISONS
    // =========================================================================
    {
      id: 'CMP010',
      category: 'employee_comparison',
      difficulty: 'medium',
      name: 'Job type average comparison',
      description: 'Compare average commission by job type',
      query: 'AM이랑 LP 누가 평균 커미션 높아?',
      queryVariants: ['AM vs LP 수수료 비교', 'AM LP 누가 더 벌어?'],
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['AM', 'LP', '높', '평균'],
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byJobType',
        transform: 'compareJobTypeAvg',
      },
    },
    {
      id: 'CMP011',
      category: 'employee_comparison',
      difficulty: 'hard',
      name: 'Job type total comparison',
      description: 'Compare total commission by job type',
      query: 'SM 전체 커미션이 LP 전체 커미션보다 많아?',
      expectedAnswer: {
        type: 'boolean',
        expected: false,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byJobType',
        transform: 'compareJobTypeTotal',
      },
    },
    {
      id: 'CMP012',
      category: 'employee_comparison',
      difficulty: 'hard',
      name: 'Job type count comparison',
      description: 'Compare number of employees by job type',
      query: 'LP 인원이 AM보다 많아?',
      expectedAnswer: {
        type: 'boolean',
        expected: false,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byJobType',
        transform: 'compareJobTypeCount',
      },
    },
    {
      id: 'CMP013',
      category: 'employee_comparison',
      difficulty: 'expert',
      name: 'All job types ranking',
      description: 'Rank all job types by average commission',
      query: '직급별 평균 커미션 순위 알려줘',
      expectedAnswer: {
        type: 'list',
        expected: ['사업본부장', 'AM', 'SM', 'LP'],
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byJobType',
        transform: 'rankJobTypes',
      },
    },

    // =========================================================================
    // SELF VS AVERAGE COMPARISONS
    // =========================================================================
    {
      id: 'CMP020',
      category: 'employee_comparison',
      difficulty: 'medium',
      name: 'Self vs company average',
      description: 'Compare own performance to company average',
      query: '내 커미션이 회사 평균보다 높아?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'boolean',
        expected: false,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations',
        transform: 'compareToAverage',
      },
    },
    {
      id: 'CMP021',
      category: 'employee_comparison',
      difficulty: 'hard',
      name: 'Self vs job type average',
      description: 'Compare own performance to job type average',
      query: '내 커미션이 같은 직급 평균보다 어때?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['높', '낮', '평균', '비슷'],
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations.byJobType',
        transform: 'compareToJobTypeAvg',
      },
    },
    {
      id: 'CMP022',
      category: 'employee_comparison',
      difficulty: 'hard',
      name: 'Difference from average',
      description: 'Calculate difference from company average',
      query: '내 커미션이 평균보다 얼마나 차이나?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations',
        transform: 'differenceFromAverage',
      },
    },

    // =========================================================================
    // METRIC COMPARISONS (Commission vs Income)
    // =========================================================================
    {
      id: 'CMP030',
      category: 'employee_comparison',
      difficulty: 'medium',
      name: 'Commission vs income ratio',
      description: 'Compare commission to total income for employee',
      query: 'J00134 커미션이 총수입의 몇 %야?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.05,
        formula: '(commission.total / totalIncome.total) * 100',
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134]',
        transform: 'commissionIncomeRatio',
      },
    },
    {
      id: 'CMP031',
      category: 'employee_comparison',
      difficulty: 'hard',
      name: '보장성금액 comparison',
      description: 'Compare 커미션 보장성 vs 총수입 보장성',
      query: 'J00307 커미션 보장성금액이 총수입 보장성금액보다 높아?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'boolean',
        expected: false,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307]',
        transform: 'compare보장성',
      },
    },

    // =========================================================================
    // BRANCH/OFFICE COMPARISONS
    // =========================================================================
    {
      id: 'CMP040',
      category: 'employee_comparison',
      difficulty: 'hard',
      name: 'Branch comparison',
      description: 'Compare performance between branches',
      query: '수도권지역 총 커미션이 가장 높은 지점은?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations',
        transform: 'compareBranches',
      },
    },
    {
      id: 'CMP041',
      category: 'employee_comparison',
      difficulty: 'expert',
      name: 'Branch average comparison',
      description: 'Compare average performance between branches',
      query: '지점별 평균 커미션 비교해줘',
      expectedAnswer: {
        type: 'json',
        expected: {},
        requiredFields: ['branch', 'avgCommission'],
      },
      groundTruthSource: {
        type: 'aggregation',
        path: 'aggregations',
        transform: 'branchAverages',
      },
    },

    // =========================================================================
    // RANKING COMPARISONS
    // =========================================================================
    {
      id: 'CMP050',
      category: 'employee_comparison',
      difficulty: 'hard',
      name: 'Ranking comparison',
      description: 'Compare ranking positions between employees',
      query: 'J00134랑 J00307 커미션 순위 누가 더 높아?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J00134', 'J00307', '위', '등', '순위'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'compareRankings',
      },
    },
    {
      id: 'CMP051',
      category: 'employee_comparison',
      difficulty: 'expert',
      name: 'My ranking in team',
      description: 'Get own ranking within job type',
      query: '내가 같은 직급 내에서 몇 등이야?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.5,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'rankWithinJobType',
      },
    },

    // =========================================================================
    // SELF CONTRACT COMPARISONS
    // =========================================================================
    {
      id: 'CMP060',
      category: 'employee_comparison',
      difficulty: 'expert',
      name: 'Self contract ratio comparison',
      description: 'Compare self contract ratio between employees',
      query: 'J00134랑 J00307 누가 자기계약 비율 높아?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J00134', 'J00307', '높', '자기계약'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'compareSelfContractRatio',
      },
    },
    {
      id: 'CMP061',
      category: 'employee_comparison',
      difficulty: 'hard',
      name: 'Self contract vs total',
      description: 'Compare self contract to total commission',
      query: 'J00134 자기계약이 전체 커미션의 몇 %야?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
        formula: '(selfContract.commission.total / commission.total) * 100',
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134]',
        transform: 'selfContractPercentage',
      },
    },

    // =========================================================================
    // MDRT PROGRESS COMPARISONS
    // =========================================================================
    {
      id: 'CMP070',
      category: 'employee_comparison',
      difficulty: 'expert',
      name: 'MDRT progress comparison',
      description: 'Compare MDRT achievement progress between employees',
      query: 'J00134랑 J00307 누가 MDRT에 더 가까워?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J00134', 'J00307', 'MDRT', '가까', '달성률'],
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees',
        transform: 'compareMdrtProgress',
      },
    },
    {
      id: 'CMP071',
      category: 'employee_comparison',
      difficulty: 'expert',
      name: 'MDRT achievement rate comparison',
      description: 'Compare MDRT achievement rates',
      query: 'J00001, J00134, J00307 MDRT 달성률 비교해줘',
      expectedAnswer: {
        type: 'list',
        expected: [],
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees',
        transform: 'compareMdrtRates',
      },
    },
  ],
};
