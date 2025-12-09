/**
 * MDRT Calculation Test Suite
 *
 * Tests for MDRT (Million Dollar Round Table) qualification calculations:
 * - MDRT eligibility determination
 * - COT (Court of the Table) calculations
 * - TOT (Top of the Table) calculations
 * - Gap analysis (달성률, 부족금액)
 * - Achievement projections
 */

import type { TestSuite } from '../types';

export const mdrtCalculationSuite: TestSuite = {
  id: 'mdrt-calculation',
  name: 'MDRT Calculation Tests',
  description:
    'Tests for MDRT qualification calculations and gap analysis',
  category: 'mdrt_calculation',
  testCases: [
    // =========================================================================
    // MDRT ELIGIBILITY CHECKS
    // =========================================================================
    {
      id: 'MDRT001',
      category: 'mdrt_calculation',
      difficulty: 'medium',
      name: 'MDRT eligibility - Commission basis',
      description: 'Check if employee meets MDRT commission requirement',
      query: 'J00134 MDRT 커미션 기준 달성했어?',
      queryVariants: [
        'J00134 MDRT 됐어?',
        'J00134 MDRT 자격 있어?',
        '134 MDRT 충족?',
      ],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'boolean',
        expected: false, // Will be set from ground truth comparison
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00134].commission.total',
        transform: 'compareToMdrt',
      },
      metadata: {
        notes: 'MDRT 2026 commission requirement: 122,455,000원',
      },
    },
    {
      id: 'MDRT002',
      category: 'mdrt_calculation',
      difficulty: 'medium',
      name: 'MDRT eligibility - Income basis',
      description: 'Check if employee meets MDRT income requirement',
      query: 'J00307 MDRT 총수입 기준 충족해?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'boolean',
        expected: false,
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00307].totalIncome.total',
        transform: 'compareToMdrtIncome',
      },
      metadata: {
        notes: 'MDRT 2026 income requirement: 244,910,000원',
      },
    },
    {
      id: 'MDRT003',
      category: 'mdrt_calculation',
      difficulty: 'easy',
      name: 'Simple MDRT status query',
      description: 'Check MDRT status with simple query',
      query: '나 MDRT 되나?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['달성', '미달', '충족', '부족', 'MDRT'],
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00134]',
      },
    },

    // =========================================================================
    // MDRT GAP ANALYSIS
    // =========================================================================
    {
      id: 'MDRT010',
      category: 'mdrt_calculation',
      difficulty: 'hard',
      name: 'MDRT gap calculation - Commission',
      description: 'Calculate remaining amount needed for MDRT (commission)',
      query: 'J00134 MDRT 커미션 얼마 더 필요해?',
      queryVariants: [
        'J00134 MDRT 부족금액',
        '134 MDRT 얼마 모자라?',
        'J00134 MDRT 남은 금액',
      ],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.05,
        formula: 'MDRT_REQUIREMENT - employee.commission.total',
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00134].commission.total',
        transform: 'mdrtGap',
      },
    },
    {
      id: 'MDRT011',
      category: 'mdrt_calculation',
      difficulty: 'hard',
      name: 'MDRT gap calculation - Income',
      description: 'Calculate remaining amount needed for MDRT (income)',
      query: 'J00307 MDRT 총수입 기준 부족금액 알려줘',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.05,
        formula: 'MDRT_INCOME_REQUIREMENT - employee.totalIncome.total',
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00307].totalIncome.total',
        transform: 'mdrtIncomeGap',
      },
    },
    {
      id: 'MDRT012',
      category: 'mdrt_calculation',
      difficulty: 'medium',
      name: 'MDRT achievement rate',
      description: 'Calculate MDRT achievement percentage',
      query: 'J00134 MDRT 달성률 몇 퍼센트야?',
      queryVariants: ['J00134 MDRT 몇 % 달성?', '134 MDRT 진척률'],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.05,
        formula: '(employee.commission.total / MDRT_REQUIREMENT) * 100',
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00134].commission.total',
        transform: 'mdrtRate',
      },
    },

    // =========================================================================
    // COT CALCULATIONS
    // =========================================================================
    {
      id: 'MDRT020',
      category: 'mdrt_calculation',
      difficulty: 'hard',
      name: 'COT eligibility check',
      description: 'Check if employee meets COT (3x MDRT) requirement',
      query: 'J00134 COT 자격 있어?',
      queryVariants: ['J00134 COT 되나?', '134 COT 충족?'],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'boolean',
        expected: false,
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00134].commission.total',
        transform: 'compareToCot',
      },
      metadata: {
        notes: 'COT requirement: 367,365,000원 (3x MDRT)',
      },
    },
    {
      id: 'MDRT021',
      category: 'mdrt_calculation',
      difficulty: 'hard',
      name: 'COT gap calculation',
      description: 'Calculate remaining amount for COT',
      query: 'J00307 COT 얼마 더 필요해?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.05,
        formula: 'COT_REQUIREMENT - employee.commission.total',
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00307].commission.total',
        transform: 'cotGap',
      },
    },
    {
      id: 'MDRT022',
      category: 'mdrt_calculation',
      difficulty: 'medium',
      name: 'COT achievement rate',
      description: 'Calculate COT achievement percentage',
      query: 'J00134 COT 달성률?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.05,
        formula: '(employee.commission.total / COT_REQUIREMENT) * 100',
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00134].commission.total',
        transform: 'cotRate',
      },
    },

    // =========================================================================
    // TOT CALCULATIONS
    // =========================================================================
    {
      id: 'MDRT030',
      category: 'mdrt_calculation',
      difficulty: 'hard',
      name: 'TOT eligibility check',
      description: 'Check if employee meets TOT (6x MDRT) requirement',
      query: 'J00134 TOT 자격 가능해?',
      queryVariants: ['J00134 TOT 되나?', 'J00134 탑오브더테이블'],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'boolean',
        expected: false,
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00134].commission.total',
        transform: 'compareToTot',
      },
      metadata: {
        notes: 'TOT requirement: 734,730,000원 (6x MDRT)',
      },
    },
    {
      id: 'MDRT031',
      category: 'mdrt_calculation',
      difficulty: 'expert',
      name: 'TOT gap calculation',
      description: 'Calculate remaining amount for TOT',
      query: 'J00307 TOT까지 얼마나 남았어?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.05,
        formula: 'TOT_REQUIREMENT - employee.commission.total',
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00307].commission.total',
        transform: 'totGap',
      },
    },

    // =========================================================================
    // COMPARATIVE MDRT ANALYSIS
    // =========================================================================
    {
      id: 'MDRT040',
      category: 'mdrt_calculation',
      difficulty: 'expert',
      name: 'Best path to MDRT',
      description: 'Determine whether commission or income path is closer',
      query: 'J00134 MDRT 달성하려면 커미션이 나아 총수입이 나아?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['커미션', '총수입'],
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00134]',
        transform: 'bestMdrtPath',
      },
    },
    {
      id: 'MDRT041',
      category: 'mdrt_calculation',
      difficulty: 'expert',
      name: 'MDRT projection',
      description: 'Project if MDRT can be achieved by year end',
      query: 'J00307 이번 달 추세로 연말까지 MDRT 가능해?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['가능', '어려', '달성', '예상'],
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00307]',
        transform: 'projectMdrt',
      },
    },

    // =========================================================================
    // MDRT STANDARDS LOOKUP
    // =========================================================================
    {
      id: 'MDRT050',
      category: 'mdrt_calculation',
      difficulty: 'easy',
      name: 'MDRT requirement lookup',
      description: 'Look up MDRT commission requirement',
      query: 'MDRT 커미션 기준이 얼마야?',
      queryVariants: ['MDRT 요건', 'MDRT 자격 금액', '2026년 MDRT 기준'],
      expectedAnswer: {
        type: 'numeric',
        expected: 122455000,
        tolerance: 0.01,
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'mdrtStandards.requirements.commission',
      },
    },
    {
      id: 'MDRT051',
      category: 'mdrt_calculation',
      difficulty: 'easy',
      name: 'MDRT income requirement lookup',
      description: 'Look up MDRT income requirement',
      query: 'MDRT 총수입 기준은?',
      expectedAnswer: {
        type: 'numeric',
        expected: 244910000,
        tolerance: 0.01,
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'mdrtStandards.requirements.income',
      },
    },
    {
      id: 'MDRT052',
      category: 'mdrt_calculation',
      difficulty: 'easy',
      name: 'COT requirement lookup',
      description: 'Look up COT commission requirement',
      query: 'COT 기준 금액 알려줘',
      expectedAnswer: {
        type: 'numeric',
        expected: 367365000,
        tolerance: 0.01,
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'mdrtStandards.cot.commission',
      },
    },
    {
      id: 'MDRT053',
      category: 'mdrt_calculation',
      difficulty: 'easy',
      name: 'TOT requirement lookup',
      description: 'Look up TOT commission requirement',
      query: 'TOT 커미션 기준은?',
      expectedAnswer: {
        type: 'numeric',
        expected: 734730000,
        tolerance: 0.01,
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'mdrtStandards.tot.commission',
      },
    },

    // =========================================================================
    // INFORMAL/CASUAL MDRT QUERIES
    // =========================================================================
    {
      id: 'MDRT060',
      category: 'mdrt_calculation',
      difficulty: 'medium',
      name: 'Informal MDRT query',
      description: 'Handle casual MDRT query',
      query: '나 MDRT 될까?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['MDRT', '달성', '부족', '필요'],
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00134]',
      },
    },
    {
      id: 'MDRT061',
      category: 'mdrt_calculation',
      difficulty: 'medium',
      name: 'Very informal MDRT gap query',
      description: 'Handle very casual query style',
      query: 'MDRT 얼마 모자라',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00134].commission.total',
        transform: 'mdrtGap',
      },
    },

    // =========================================================================
    // 보장성금액 MDRT CALCULATIONS
    // =========================================================================
    {
      id: 'MDRT070',
      category: 'mdrt_calculation',
      difficulty: 'expert',
      name: 'MDRT 보장성금액 contribution',
      description: 'Calculate how 보장성금액 contributes to MDRT',
      query: 'J00134 보장성금액이 MDRT 달성에 얼마나 기여해?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].commission.保障性금액',
      },
    },
    {
      id: 'MDRT071',
      category: 'mdrt_calculation',
      difficulty: 'expert',
      name: 'MDRT with 보장성금액 only',
      description: 'Check if 보장성금액 alone meets MDRT',
      query: 'J00307 보장성금액만으로 MDRT 될 수 있어?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'boolean',
        expected: false,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307].commission.保障性금액',
      },
    },
  ],
};
