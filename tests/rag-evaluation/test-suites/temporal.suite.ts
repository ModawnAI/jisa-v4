/**
 * Temporal Test Suite
 *
 * Tests for time-based queries:
 * - Monthly data retrieval
 * - Month-over-month (MoM) comparisons
 * - Quarter-over-quarter (QoQ) comparisons
 * - Year-to-date (YTD) calculations
 * - Trend analysis
 */

import type { TestSuite } from '../types';

export const temporalSuite: TestSuite = {
  id: 'temporal',
  name: 'Temporal Tests',
  description: 'Tests for time-based queries and period comparisons',
  category: 'temporal',
  testCases: [
    // =========================================================================
    // MONTHLY DATA RETRIEVAL
    // =========================================================================
    {
      id: 'TMP001',
      category: 'temporal',
      difficulty: 'medium',
      name: 'Specific month commission',
      description: 'Get commission for specific month',
      query: 'J00134 1월 커미션 얼마야?',
      queryVariants: ['J00134 1월 수수료', '134번 1월 실적'],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].monthlyData.1월.commission',
      },
    },
    {
      id: 'TMP002',
      category: 'temporal',
      difficulty: 'medium',
      name: 'Specific month income',
      description: 'Get total income for specific month',
      query: 'J00307 3월 총수입은?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307].monthlyData.3월.totalIncome',
      },
    },
    {
      id: 'TMP003',
      category: 'temporal',
      difficulty: 'medium',
      name: 'Specific month 보장성금액',
      description: 'Get 보장성금액 for specific month',
      query: 'J00134 5월 보장성금액 얼마야?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].monthlyData.5월.보장성금액',
      },
    },
    {
      id: 'TMP004',
      category: 'temporal',
      difficulty: 'medium',
      name: 'Specific month 신계약수입',
      description: 'Get 신계약수입 for specific month',
      query: 'J00307 2월 신계약수입은?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307].monthlyData.2월.신계약수입',
      },
    },

    // =========================================================================
    // MONTH-OVER-MONTH COMPARISONS
    // =========================================================================
    {
      id: 'TMP010',
      category: 'temporal',
      difficulty: 'hard',
      name: 'MoM commission comparison',
      description: 'Compare commission between two months',
      query: 'J00134 1월이랑 2월 커미션 뭐가 더 높아?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['1월', '2월', '높', '낮', '더'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].monthlyData',
        transform: 'compareMoM',
      },
    },
    {
      id: 'TMP011',
      category: 'temporal',
      difficulty: 'hard',
      name: 'MoM growth calculation',
      description: 'Calculate month-over-month growth',
      query: 'J00134 2월 커미션이 1월보다 얼마나 늘었어?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
        formula: 'month2.commission - month1.commission',
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].monthlyData',
        transform: 'momGrowth',
      },
    },
    {
      id: 'TMP012',
      category: 'temporal',
      difficulty: 'hard',
      name: 'MoM growth percentage',
      description: 'Calculate month-over-month growth percentage',
      query: 'J00307 3월 커미션이 2월 대비 몇 % 변했어?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
        formula: '((month3 - month2) / month2) * 100',
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307].monthlyData',
        transform: 'momGrowthPercent',
      },
    },

    // =========================================================================
    // QUARTERLY ANALYSIS
    // =========================================================================
    {
      id: 'TMP020',
      category: 'temporal',
      difficulty: 'hard',
      name: 'Q1 commission total',
      description: 'Calculate Q1 (1-3월) total commission',
      query: 'J00134 1분기 커미션 합계는?',
      queryVariants: ['J00134 Q1 수수료', '134 1분기 실적'],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.05,
        formula: 'month1 + month2 + month3',
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].monthlyData',
        transform: 'sumQ1',
      },
    },
    {
      id: 'TMP021',
      category: 'temporal',
      difficulty: 'hard',
      name: 'Q2 commission total',
      description: 'Calculate Q2 (4-6월) total commission',
      query: 'J00307 2분기 커미션 합계?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.05,
        formula: 'month4 + month5 + month6',
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307].monthlyData',
        transform: 'sumQ2',
      },
    },
    {
      id: 'TMP022',
      category: 'temporal',
      difficulty: 'expert',
      name: 'QoQ comparison',
      description: 'Compare quarter-over-quarter performance',
      query: 'J00134 2분기가 1분기보다 실적 좋아?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'boolean',
        expected: false,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].monthlyData',
        transform: 'compareQoQ',
      },
    },
    {
      id: 'TMP023',
      category: 'temporal',
      difficulty: 'expert',
      name: 'QoQ growth percentage',
      description: 'Calculate quarter-over-quarter growth',
      query: 'J00307 2분기가 1분기 대비 몇 % 성장?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
        formula: '((Q2 - Q1) / Q1) * 100',
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307].monthlyData',
        transform: 'qoqGrowth',
      },
    },

    // =========================================================================
    // BEST/WORST MONTH ANALYSIS
    // =========================================================================
    {
      id: 'TMP030',
      category: 'temporal',
      difficulty: 'hard',
      name: 'Best month identification',
      description: 'Find best performing month for employee',
      query: 'J00134 가장 실적 좋은 달은?',
      queryVariants: ['J00134 최고 실적 월', '134 베스트 월'],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].monthlyData',
        transform: 'findBestMonth',
      },
    },
    {
      id: 'TMP031',
      category: 'temporal',
      difficulty: 'hard',
      name: 'Worst month identification',
      description: 'Find worst performing month for employee',
      query: 'J00307 실적 가장 안 좋은 달은?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307].monthlyData',
        transform: 'findWorstMonth',
      },
    },
    {
      id: 'TMP032',
      category: 'temporal',
      difficulty: 'expert',
      name: 'Best and worst with amounts',
      description: 'Get best and worst months with amounts',
      query: 'J00134 최고 실적 달이랑 최저 실적 달, 각각 금액까지 알려줘',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['월', '원'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].monthlyData',
        transform: 'bestWorstWithAmounts',
      },
    },

    // =========================================================================
    // TREND ANALYSIS
    // =========================================================================
    {
      id: 'TMP040',
      category: 'temporal',
      difficulty: 'expert',
      name: 'Performance trend',
      description: 'Analyze performance trend over time',
      query: 'J00134 실적 추세가 어때? 올라가? 내려가?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['상승', '하락', '증가', '감소', '올라', '내려', '유지'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].monthlyData',
        transform: 'analyzeTrend',
      },
    },
    {
      id: 'TMP041',
      category: 'temporal',
      difficulty: 'expert',
      name: 'Growth streak',
      description: 'Find consecutive months of growth',
      query: 'J00307 연속 성장한 달이 있어?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['연속', '월', '성장', '없'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307].monthlyData',
        transform: 'findGrowthStreak',
      },
    },

    // =========================================================================
    // YEAR-TO-DATE
    // =========================================================================
    {
      id: 'TMP050',
      category: 'temporal',
      difficulty: 'medium',
      name: 'YTD commission',
      description: 'Get year-to-date commission total',
      query: 'J00134 올해 누적 커미션은?',
      queryVariants: ['J00134 YTD 수수료', '134 연간 누적'],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.05,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].commission.total',
      },
    },
    {
      id: 'TMP051',
      category: 'temporal',
      difficulty: 'hard',
      name: 'YTD vs MDRT progress',
      description: 'Calculate YTD progress towards MDRT',
      query: '올해 지금까지 MDRT 달성률은?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00134].commission.total',
        transform: 'ytdMdrtProgress',
      },
    },

    // =========================================================================
    // MONTHLY AVERAGE
    // =========================================================================
    {
      id: 'TMP060',
      category: 'temporal',
      difficulty: 'hard',
      name: 'Monthly average commission',
      description: 'Calculate average monthly commission',
      query: 'J00134 월평균 커미션은?',
      queryVariants: ['J00134 평균 월 수수료', '134 한 달 평균'],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
        formula: 'total / months',
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].monthlyData',
        transform: 'avgMonthlyCommission',
      },
    },
    {
      id: 'TMP061',
      category: 'temporal',
      difficulty: 'expert',
      name: 'Monthly average needed for MDRT',
      description: 'Calculate required monthly average to reach MDRT',
      query: 'J00307 MDRT 달성하려면 남은 달에 월평균 얼마 해야 해?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
        formula: '(MDRT_REQUIREMENT - current) / remainingMonths',
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees[sabon=J00307]',
        transform: 'requiredMonthlyForMdrt',
      },
    },

    // =========================================================================
    // PERIOD-SPECIFIC QUERIES
    // =========================================================================
    {
      id: 'TMP070',
      category: 'temporal',
      difficulty: 'medium',
      name: 'Specific period lookup - 202509',
      description: 'Look up data for specific period code',
      query: '202509 마감 데이터에서 J00134 커미션은?',
      context: {
        employeeNumber: 'J00134',
        period: '202509',
      },
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'compensation',
        path: 'compensationDetails[sabon=J00134].commissionTotal',
      },
    },

    // =========================================================================
    // INFORMAL TEMPORAL QUERIES
    // =========================================================================
    {
      id: 'TMP080',
      category: 'temporal',
      difficulty: 'medium',
      name: 'Casual month query',
      description: 'Handle casual temporal query',
      query: '지난달 얼마 벌었어?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].monthlyData',
        transform: 'lastMonthCommission',
      },
    },
    {
      id: 'TMP081',
      category: 'temporal',
      difficulty: 'medium',
      name: 'Recent performance query',
      description: 'Handle recent performance query',
      query: '최근 3개월 실적 어때?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['월', '커미션', '총수입'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].monthlyData',
        transform: 'recent3Months',
      },
    },
  ],
};
