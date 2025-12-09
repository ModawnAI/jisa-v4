/**
 * Ranking Test Suite
 *
 * Tests for ranking and leaderboard queries:
 * - Top performers (Top N)
 * - Bottom performers
 * - Ranking by various metrics
 * - Percentile calculations
 */

import type { TestSuite } from '../types';

export const rankingSuite: TestSuite = {
  id: 'ranking',
  name: 'Ranking Tests',
  description: 'Tests for ranking queries and leaderboard functionality',
  category: 'ranking',
  testCases: [
    // =========================================================================
    // TOP PERFORMERS
    // =========================================================================
    {
      id: 'RNK001',
      category: 'ranking',
      difficulty: 'medium',
      name: 'Top 1 commission',
      description: 'Find employee with highest commission',
      query: '커미션 1등이 누구야?',
      queryVariants: ['커미션 가장 높은 사람', '수수료 1위', '최고 실적자'],
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findTop1Commission',
      },
    },
    {
      id: 'RNK002',
      category: 'ranking',
      difficulty: 'medium',
      name: 'Top 3 commission',
      description: 'Find top 3 employees by commission',
      query: '커미션 상위 3명 누구야?',
      queryVariants: ['커미션 탑3', '수수료 1,2,3등'],
      expectedAnswer: {
        type: 'list',
        expected: [],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findTop3Commission',
      },
    },
    {
      id: 'RNK003',
      category: 'ranking',
      difficulty: 'hard',
      name: 'Top 5 with amounts',
      description: 'Find top 5 with commission amounts',
      query: '커미션 상위 5명이랑 금액 알려줘',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J', '원'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findTop5WithAmounts',
      },
    },
    {
      id: 'RNK004',
      category: 'ranking',
      difficulty: 'medium',
      name: 'Top income earner',
      description: 'Find employee with highest total income',
      query: '총수입 1등은?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findTop1Income',
      },
    },
    {
      id: 'RNK005',
      category: 'ranking',
      difficulty: 'hard',
      name: 'Top 10 performers',
      description: 'Find top 10 by commission',
      query: '커미션 상위 10명 리스트',
      expectedAnswer: {
        type: 'list',
        expected: [],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findTop10Commission',
      },
    },

    // =========================================================================
    // BOTTOM PERFORMERS
    // =========================================================================
    {
      id: 'RNK010',
      category: 'ranking',
      difficulty: 'medium',
      name: 'Bottom 1 commission',
      description: 'Find employee with lowest commission',
      query: '커미션 가장 낮은 사람은?',
      queryVariants: ['수수료 꼴찌', '실적 최하위'],
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findBottom1Commission',
      },
    },
    {
      id: 'RNK011',
      category: 'ranking',
      difficulty: 'hard',
      name: 'Bottom 5 performers',
      description: 'Find bottom 5 by commission',
      query: '커미션 하위 5명 알려줘',
      expectedAnswer: {
        type: 'list',
        expected: [],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findBottom5Commission',
      },
    },

    // =========================================================================
    // RANKING BY JOB TYPE
    // =========================================================================
    {
      id: 'RNK020',
      category: 'ranking',
      difficulty: 'hard',
      name: 'Top LP by commission',
      description: 'Find top LP performer',
      query: 'LP 중에서 커미션 1등은?',
      queryVariants: ['LP 실적 1위', 'LP 최고 실적자'],
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findTopLPCommission',
      },
    },
    {
      id: 'RNK021',
      category: 'ranking',
      difficulty: 'hard',
      name: 'Top AM by commission',
      description: 'Find top AM performer',
      query: 'AM 중 커미션 1등?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findTopAMCommission',
      },
    },
    {
      id: 'RNK022',
      category: 'ranking',
      difficulty: 'hard',
      name: 'Top 3 SM by income',
      description: 'Find top 3 SM by total income',
      query: 'SM 총수입 상위 3명은?',
      expectedAnswer: {
        type: 'list',
        expected: [],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findTop3SMIncome',
      },
    },

    // =========================================================================
    // INDIVIDUAL RANKING LOOKUP
    // =========================================================================
    {
      id: 'RNK030',
      category: 'ranking',
      difficulty: 'medium',
      name: 'My overall rank',
      description: 'Get own overall ranking',
      query: '내 커미션 순위가 몇 등이야?',
      queryVariants: ['나 몇 등?', '내 순위'],
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
        transform: 'findEmployeeRank',
      },
    },
    {
      id: 'RNK031',
      category: 'ranking',
      difficulty: 'hard',
      name: 'Specific employee rank',
      description: 'Get ranking for specific employee',
      query: 'J00307 커미션 순위 몇 등?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.5,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findEmployeeRank',
      },
    },
    {
      id: 'RNK032',
      category: 'ranking',
      difficulty: 'hard',
      name: 'Rank within job type',
      description: 'Get ranking within own job type',
      query: '같은 직급 내에서 내 순위는?',
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
        transform: 'findRankWithinJobType',
      },
    },

    // =========================================================================
    // PERCENTILE CALCULATIONS
    // =========================================================================
    {
      id: 'RNK040',
      category: 'ranking',
      difficulty: 'expert',
      name: 'Percentile ranking',
      description: 'Get percentile ranking for employee',
      query: '내가 상위 몇 %야?',
      queryVariants: ['나 상위 퍼센트', '내 백분위'],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'calculation',
        expected: 0,
        tolerance: 0.1,
        formula: '(rank / total) * 100',
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'calculatePercentile',
      },
    },
    {
      id: 'RNK041',
      category: 'ranking',
      difficulty: 'expert',
      name: 'Top 10% threshold',
      description: 'Find minimum commission for top 10%',
      query: '상위 10% 되려면 커미션 얼마 이상이어야 해?',
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.1,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findTop10Threshold',
      },
    },
    {
      id: 'RNK042',
      category: 'ranking',
      difficulty: 'expert',
      name: 'Quartile classification',
      description: 'Determine which quartile employee belongs to',
      query: 'J00134 실적이 상위 몇 분위야?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['1분위', '2분위', '3분위', '4분위', '상위', '하위'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findQuartile',
      },
    },

    // =========================================================================
    // MDRT RANKING
    // =========================================================================
    {
      id: 'RNK050',
      category: 'ranking',
      difficulty: 'hard',
      name: 'MDRT achievement ranking',
      description: 'Rank employees by MDRT achievement rate',
      query: 'MDRT 달성률 순위 상위 5명은?',
      expectedAnswer: {
        type: 'list',
        expected: [],
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees',
        transform: 'rankByMdrtRate',
      },
    },
    {
      id: 'RNK051',
      category: 'ranking',
      difficulty: 'hard',
      name: 'My MDRT ranking',
      description: 'Get own MDRT ranking among employees',
      query: 'MDRT 달성률 기준 내 순위는?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'numeric',
        expected: 0,
        tolerance: 0.5,
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees',
        transform: 'findMdrtRank',
      },
    },
    {
      id: 'RNK052',
      category: 'ranking',
      difficulty: 'expert',
      name: 'Closest to MDRT',
      description: 'Find who is closest to reaching MDRT',
      query: 'MDRT에 가장 가까운 사람은?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J'],
      },
      groundTruthSource: {
        type: 'mdrt',
        path: 'employees',
        transform: 'findClosestToMdrt',
      },
    },

    // =========================================================================
    // SPECIFIC METRIC RANKINGS
    // =========================================================================
    {
      id: 'RNK060',
      category: 'ranking',
      difficulty: 'hard',
      name: 'Top by 보장성금액',
      description: 'Rank by 보장성금액',
      query: '보장성금액 상위 3명은?',
      expectedAnswer: {
        type: 'list',
        expected: [],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findTop3보장성',
      },
    },
    {
      id: 'RNK061',
      category: 'ranking',
      difficulty: 'expert',
      name: 'Top by 신계약수입',
      description: 'Rank by 신계약수입',
      query: '신계약수입 1등은?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findTop1신계약',
      },
    },
    {
      id: 'RNK062',
      category: 'ranking',
      difficulty: 'expert',
      name: 'Lowest self contract ratio',
      description: 'Find employee with lowest self contract ratio',
      query: '자기계약 비율 가장 낮은 사람은?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findLowestSelfContractRatio',
      },
    },

    // =========================================================================
    // MONTHLY RANKINGS
    // =========================================================================
    {
      id: 'RNK070',
      category: 'ranking',
      difficulty: 'hard',
      name: 'Top performer specific month',
      description: 'Find top performer for specific month',
      query: '3월 커미션 1등은 누구야?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findTopInMonth',
      },
    },
    {
      id: 'RNK071',
      category: 'ranking',
      difficulty: 'expert',
      name: 'Most improved month over month',
      description: 'Find who improved most between months',
      query: '2월 대비 3월에 가장 많이 성장한 사람은?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findMostImproved',
      },
    },

    // =========================================================================
    // INFORMAL RANKING QUERIES
    // =========================================================================
    {
      id: 'RNK080',
      category: 'ranking',
      difficulty: 'medium',
      name: 'Casual top query',
      description: 'Handle casual top performer query',
      query: '누가 제일 잘해?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['J', '1등', '최고'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'findTop1Commission',
      },
    },
    {
      id: 'RNK081',
      category: 'ranking',
      difficulty: 'medium',
      name: 'Casual ranking query',
      description: 'Handle casual rank query',
      query: '나 얼마나 잘하고 있어?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['등', '위', '순위', '%'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
        transform: 'describePerformance',
      },
    },
  ],
};
