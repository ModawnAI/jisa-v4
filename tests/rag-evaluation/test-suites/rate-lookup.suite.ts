/**
 * Rate Lookup Test Suite
 *
 * Tests for insurance commission rate and policy lookups:
 * - Commission rate by insurance company
 * - Commission rate by product
 * - Rate comparisons between companies
 * - Policy and product information
 */

import type { TestSuite } from '../types';

export const rateLookupSuite: TestSuite = {
  id: 'rate-lookup',
  name: 'Rate & Policy Lookup Tests',
  description:
    'Tests for insurance commission rate and policy information retrieval',
  category: 'rate_lookup',
  testCases: [
    // =========================================================================
    // COMPANY RATE LOOKUPS
    // =========================================================================
    {
      id: 'RATE001',
      category: 'rate_lookup',
      difficulty: 'medium',
      name: 'KB라이프 commission rate lookup',
      description: 'Look up commission rates for KB라이프',
      query: 'KB라이프 수수료율 알려줘',
      queryVariants: ['KB라이프 커미션율', 'KB라이프 수수료 얼마?'],
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['KB라이프', '%', '수수료율'],
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
        transform: 'filterByCompany',
      },
    },
    {
      id: 'RATE002',
      category: 'rate_lookup',
      difficulty: 'medium',
      name: 'Insurance company first year rate',
      description: 'Look up first year commission rate',
      query: 'KB라이프 1년차 수수료율은?',
      queryVariants: ['KB라이프 첫해 수수료', 'KB라이프 초년도 커미션'],
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates[company=KB라이프].rates.firstYear',
      },
    },
    {
      id: 'RATE003',
      category: 'rate_lookup',
      difficulty: 'hard',
      name: 'Multi-year rate lookup',
      description: 'Look up rates for multiple years',
      query: 'KB라이프 1년차, 2년차 13회차, 이후 수수료율 각각 알려줘',
      expectedAnswer: {
        type: 'json',
        expected: {},
        requiredFields: ['firstYear', 'secondYear13', 'subsequent'],
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates[company=KB라이프].rates',
      },
    },

    // =========================================================================
    // PRODUCT RATE LOOKUPS
    // =========================================================================
    {
      id: 'RATE010',
      category: 'rate_lookup',
      difficulty: 'medium',
      name: 'Specific product rate',
      description: 'Look up rate for specific product',
      query: 'KB라이프 종신보험 수수료율 얼마야?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['%', '수수료율', '종신'],
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
        transform: 'filterByProduct',
      },
    },
    {
      id: 'RATE011',
      category: 'rate_lookup',
      difficulty: 'hard',
      name: 'Product list by company',
      description: 'List all products for a company',
      query: 'KB라이프 상품 리스트 알려줘',
      expectedAnswer: {
        type: 'list',
        expected: [],
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
        transform: 'listProductsByCompany',
      },
    },
    {
      id: 'RATE012',
      category: 'rate_lookup',
      difficulty: 'hard',
      name: 'Product with highest rate',
      description: 'Find product with highest commission rate',
      query: '수수료율 가장 높은 상품은?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['%'],
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
        transform: 'findHighestRate',
      },
    },

    // =========================================================================
    // PAYMENT PERIOD LOOKUPS
    // =========================================================================
    {
      id: 'RATE020',
      category: 'rate_lookup',
      difficulty: 'hard',
      name: 'Rate by payment period',
      description: 'Look up rate by payment period',
      query: 'KB라이프 20년납 수수료율은?',
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
        transform: 'filterByPaymentPeriod',
      },
    },
    {
      id: 'RATE021',
      category: 'rate_lookup',
      difficulty: 'expert',
      name: 'Compare rates by payment period',
      description: 'Compare rates across payment periods',
      query: '10년납이랑 20년납 수수료율 차이가 얼마나 나?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['%', '차이', '높', '낮'],
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
        transform: 'comparePaymentPeriods',
      },
    },

    // =========================================================================
    // COMPANY COMPARISONS
    // =========================================================================
    {
      id: 'RATE030',
      category: 'rate_lookup',
      difficulty: 'hard',
      name: 'Compare company rates',
      description: 'Compare rates between insurance companies',
      query: 'KB라이프랑 삼성생명 중 수수료율 뭐가 더 높아?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['KB', '삼성', '높', '낮'],
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
        transform: 'compareCompanies',
      },
    },
    {
      id: 'RATE031',
      category: 'rate_lookup',
      difficulty: 'expert',
      name: 'Rank companies by rate',
      description: 'Rank insurance companies by commission rate',
      query: '보험사별 수수료율 순위 알려줘',
      expectedAnswer: {
        type: 'list',
        expected: [],
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
        transform: 'rankCompaniesByRate',
      },
    },

    // =========================================================================
    // COMPENSATION DETAIL LOOKUPS
    // =========================================================================
    {
      id: 'RATE040',
      category: 'rate_lookup',
      difficulty: 'medium',
      name: 'Employee compensation detail',
      description: 'Look up detailed compensation for employee',
      query: 'J00134 9월 건별 수수료 내역 알려줘',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['보험사', '증권', '수수료'],
      },
      groundTruthSource: {
        type: 'compensation',
        path: 'compensationDetails[sabon=J00134]',
      },
    },
    {
      id: 'RATE041',
      category: 'rate_lookup',
      difficulty: 'hard',
      name: 'Transaction count lookup',
      description: 'Count transactions for employee',
      query: 'J00134 9월에 몇 건 했어?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'compensation',
        path: 'compensationDetails[sabon=J00134].transactions',
        transform: 'count',
      },
    },
    {
      id: 'RATE042',
      category: 'rate_lookup',
      difficulty: 'hard',
      name: 'Insurance company breakdown',
      description: 'Get breakdown by insurance company',
      query: 'J00134 보험사별 수수료 내역은?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'json',
        expected: {},
      },
      groundTruthSource: {
        type: 'compensation',
        path: 'compensationDetails[sabon=J00134].transactions',
        transform: 'groupByInsuranceCompany',
      },
    },

    // =========================================================================
    // POLICY STATUS LOOKUPS
    // =========================================================================
    {
      id: 'RATE050',
      category: 'rate_lookup',
      difficulty: 'hard',
      name: 'Policy status lookup',
      description: 'Look up policy status by policy number',
      query: '증권번호 12345678 상태가 어때?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['유지', '해지', '실효', '상태'],
      },
      groundTruthSource: {
        type: 'compensation',
        path: 'compensationDetails',
        transform: 'findPolicyByNumber',
      },
    },
    {
      id: 'RATE051',
      category: 'rate_lookup',
      difficulty: 'expert',
      name: 'Payment round status',
      description: 'Look up commission by payment round',
      query: 'J00134 1회차 수수료 합계는?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'compensation',
        path: 'compensationDetails[sabon=J00134].transactions',
        transform: 'filterByPaymentRound',
      },
    },

    // =========================================================================
    // FC COMMISSION FILE LOOKUPS
    // =========================================================================
    {
      id: 'RATE060',
      category: 'rate_lookup',
      difficulty: 'medium',
      name: '11월 수수료율 조회',
      description: 'Look up November commission rates',
      query: '11월 HO&F 수수료율 파일에서 KB라이프 정보 알려줘',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['KB라이프', '%', '수수료'],
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
      },
    },
    {
      id: 'RATE061',
      category: 'rate_lookup',
      difficulty: 'hard',
      name: '생보 손보 비교',
      description: 'Compare 생보 and 손보 rates',
      query: '생보랑 손보 수수료율 차이 있어?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['생보', '손보', '차이', '%'],
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
        transform: 'compare생손보',
      },
    },

    // =========================================================================
    // PREMIUM CALCULATIONS
    // =========================================================================
    {
      id: 'RATE070',
      category: 'rate_lookup',
      difficulty: 'expert',
      name: 'Calculate commission from premium',
      description: 'Calculate expected commission from premium',
      query: 'KB라이프 종신보험 보험료 100만원이면 수수료 얼마?',
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
        formula: 'premium * rate / 100',
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
        transform: 'calculateCommission',
      },
    },
    {
      id: 'RATE071',
      category: 'rate_lookup',
      difficulty: 'expert',
      name: 'Reverse calculate premium',
      description: 'Calculate premium needed for target commission',
      query: '수수료 500만원 받으려면 KB라이프 얼마짜리 계약해야 해?',
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
        formula: 'targetCommission / rate * 100',
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
        transform: 'calculateRequiredPremium',
      },
    },

    // =========================================================================
    // INFORMAL RATE QUERIES
    // =========================================================================
    {
      id: 'RATE080',
      category: 'rate_lookup',
      difficulty: 'medium',
      name: 'Casual rate query',
      description: 'Handle casual rate inquiry',
      query: 'KB 수수료 얼마야?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['KB', '%', '수수료'],
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
      },
    },
    {
      id: 'RATE081',
      category: 'rate_lookup',
      difficulty: 'medium',
      name: 'Best rate query',
      description: 'Handle query for best rates',
      query: '어디가 수수료 제일 좋아?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['%', '높', '좋'],
      },
      groundTruthSource: {
        type: 'rate',
        path: 'commissionRates',
        transform: 'findHighestRate',
      },
    },
  ],
};
