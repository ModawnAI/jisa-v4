/**
 * Employee Lookup Test Suite
 *
 * Tests for retrieving individual employee data including:
 * - Basic employee information (name, job type, branch)
 * - Commission data
 * - Total income data
 * - Self-contract data
 */

import type { TestSuite } from '../types';

export const employeeLookupSuite: TestSuite = {
  id: 'employee-lookup',
  name: 'Employee Lookup Tests',
  description:
    'Tests for retrieving individual employee data accurately from RAG system',
  category: 'employee_lookup',
  testCases: [
    // =========================================================================
    // BASIC EMPLOYEE INFORMATION
    // =========================================================================
    {
      id: 'EL001',
      category: 'employee_lookup',
      difficulty: 'easy',
      name: 'Basic employee name lookup',
      description: 'Retrieve employee name by employee ID (사번)',
      query: 'J00134 직원 이름이 뭐야?',
      queryVariants: [
        'J00134 누구야?',
        'J00134번 직원 알려줘',
        '사번 J00134 이름',
      ],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAll: ['J00134'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].name',
      },
    },
    {
      id: 'EL002',
      category: 'employee_lookup',
      difficulty: 'easy',
      name: 'Employee job type lookup',
      description: 'Retrieve employee job type',
      query: 'J00307 직급이 뭐야?',
      queryVariants: ['J00307 무슨 직급?', 'J00307 포지션 알려줘'],
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['LP', 'SM', 'AM', '사업본부장', '직급', 'J00307', '찾을 수 없', '없'], // Job types or acknowledgment
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307].jobType',
      },
    },
    {
      id: 'EL003',
      category: 'employee_lookup',
      difficulty: 'easy',
      name: 'Employee branch lookup',
      description: 'Retrieve employee branch information',
      query: 'J00001 소속 지점이 어디야?',
      queryVariants: ['J00001 어느 지점?', 'J00001 소속'],
      context: {
        employeeNumber: 'J00001',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00001].branch',
      },
    },
    {
      id: 'EL004',
      category: 'employee_lookup',
      difficulty: 'easy',
      name: 'Employee office lookup',
      description: 'Retrieve employee office information',
      query: 'J00134 근무처가 어디야?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].office',
      },
    },

    // =========================================================================
    // COMMISSION DATA LOOKUPS
    // =========================================================================
    {
      id: 'EL010',
      category: 'employee_lookup',
      difficulty: 'medium',
      name: 'Total commission lookup',
      description: 'Retrieve total commission amount for an employee',
      query: 'J00134 총 커미션 얼마야?',
      queryVariants: [
        'J00134 수수료 총액',
        'J00134 커미션 합계',
        'J00134 올해 수수료',
      ],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['커미션', '수수료', 'J00134', '확인', '원', '₩', '45,272,186', '45272186'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].commission.total',
      },
    },
    {
      id: 'EL011',
      category: 'employee_lookup',
      difficulty: 'medium',
      name: 'Commission 보장성금액 lookup',
      description: 'Retrieve commission 보장성금액 for an employee',
      query: 'J00307 커미션 보장성금액 얼마야?',
      queryVariants: ['J00307 보장성 수수료', 'J00307 보장성금액'],
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['보장성', '커미션', 'J00307', '0', '없'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307].commission.保障性금액',
      },
    },

    // =========================================================================
    // TOTAL INCOME DATA LOOKUPS
    // =========================================================================
    {
      id: 'EL020',
      category: 'employee_lookup',
      difficulty: 'medium',
      name: 'Total income lookup',
      description: 'Retrieve total income for an employee',
      query: 'J00134 총수입 얼마야?',
      queryVariants: ['J00134 수입', 'J00134 income', 'J00134 총수입금액'],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['총수입', '수입', 'J00134', '원', '₩'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].totalIncome.total',
      },
    },
    {
      id: 'EL021',
      category: 'employee_lookup',
      difficulty: 'medium',
      name: '신계약수입 lookup',
      description: 'Retrieve 신계약수입 for an employee',
      query: 'J00134 신계약수입 알려줘',
      queryVariants: ['J00134 신계약 수입', 'J00134 new contract income'],
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
        path: 'employees[sabon=J00134].totalIncome.신계약수입',
      },
    },
    {
      id: 'EL022',
      category: 'employee_lookup',
      difficulty: 'medium',
      name: 'Total income 보장성금액 lookup',
      description: 'Retrieve 총수입 보장성금액 for an employee',
      query: 'J00307 총수입 중 보장성금액은?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['보장성', '총수입', 'J00307', '0', '없'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307].totalIncome.보장성금액',
      },
    },

    // =========================================================================
    // SELF-CONTRACT DATA LOOKUPS
    // =========================================================================
    {
      id: 'EL030',
      category: 'employee_lookup',
      difficulty: 'hard',
      name: 'Self-contract commission lookup',
      description: 'Retrieve self-contract commission data',
      query: 'J00134 자기계약 커미션 얼마야?',
      queryVariants: ['J00134 자기계약 수수료', 'J00134 본인계약 커미션'],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['자기계약', '커미션', 'J00134', '0', '없', '본인계약'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].selfContract.commission.total',
      },
    },
    {
      id: 'EL031',
      category: 'employee_lookup',
      difficulty: 'hard',
      name: 'Self-contract total income lookup',
      description: 'Retrieve self-contract total income data',
      query: 'J00307 자기계약 총수입은?',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['자기계약', '총수입', 'J00307', '211,566', '211566'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307].selfContract.totalIncome.total',
      },
    },

    // =========================================================================
    // MULTIPLE FIELD QUERIES
    // =========================================================================
    {
      id: 'EL040',
      category: 'employee_lookup',
      difficulty: 'medium',
      name: 'Multiple fields - Commission and Income',
      description: 'Query for both commission and income in one query',
      query: 'J00134 커미션이랑 총수입 둘 다 알려줘',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAll: ['커미션', '총수입'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134]',
      },
    },
    {
      id: 'EL041',
      category: 'employee_lookup',
      difficulty: 'hard',
      name: 'Complete employee profile',
      description: 'Query for complete employee information',
      query: 'J00307 프로필 전체 알려줘 - 이름, 직급, 지점, 커미션, 총수입',
      context: {
        employeeNumber: 'J00307',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['이름', '직급', '지점', '커미션', '총수입'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00307]',
      },
    },

    // =========================================================================
    // INFORMAL/CASUAL QUERIES
    // =========================================================================
    {
      id: 'EL050',
      category: 'employee_lookup',
      difficulty: 'medium',
      name: 'Informal commission query',
      description: 'Handle informal/casual Korean query style',
      query: '134 수수료 ㅇㅇ',
      queryVariants: [
        'J00134 얼마 벌어?',
        '134번 수입 알려줘',
        'J134 돈 얼마야',
      ],
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['수수료', '커미션', 'J00134', '45,272,186', '45272186', '원', '₩'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].commission.total',
      },
    },
    {
      id: 'EL051',
      category: 'employee_lookup',
      difficulty: 'medium',
      name: 'Colloquial income query',
      description: 'Handle colloquial Korean query',
      query: '내 수입 얼마지?',
      queryVariants: ['나 돈 얼마 벌었어?', '내 총수입?'],
      context: {
        employeeNumber: 'J00134',
        employeeId: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['수입', '총수입', 'J00134', '원', '₩'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].totalIncome.total',
      },
    },

    // =========================================================================
    // EDGE CASES
    // =========================================================================
    {
      id: 'EL060',
      category: 'employee_lookup',
      difficulty: 'hard',
      name: 'Non-existent employee',
      description: 'Handle query for non-existent employee',
      query: 'J99999 커미션 얼마야?',
      context: {
        employeeNumber: 'J99999',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['없', '찾을 수 없', '데이터 없', '조회되지 않', '확인', '어떤', '정확한', '알려주', 'J99999'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J99999]',
      },
    },
    {
      id: 'EL061',
      category: 'employee_lookup',
      difficulty: 'hard',
      name: 'Partial employee ID',
      description: 'Handle query with partial employee ID',
      query: '134번 커미션',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['커미션', '수수료', 'J00134', '45,272,186', '45272186', '원', '₩'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].commission.total',
      },
    },
    {
      id: 'EL062',
      category: 'employee_lookup',
      difficulty: 'expert',
      name: 'Ambiguous employee reference',
      description: 'Handle ambiguous query that needs clarification',
      query: '홍길동 커미션 얼마야?',
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['여러', '확인', '사번', '어떤', '홍길동', '커미션', '수수료', '원', '₩'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees',
      },
    },

    // =========================================================================
    // COMPARATIVE SELF-LOOKUPS
    // =========================================================================
    {
      id: 'EL070',
      category: 'employee_lookup',
      difficulty: 'medium',
      name: 'My data vs team average',
      description: 'Compare own data to team context',
      query: '내 커미션이 팀 평균보다 높아?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'boolean',
        expected: true,
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].commission.total',
      },
    },
    {
      id: 'EL071',
      category: 'employee_lookup',
      difficulty: 'hard',
      name: 'My ranking query',
      description: 'Query for own ranking among employees',
      query: '내 커미션 순위가 몇 등이야?',
      context: {
        employeeNumber: 'J00134',
      },
      expectedAnswer: {
        type: 'text_contains',
        expected: [],
        containsAny: ['등', '위', '순위', '번째', 'rank', '커미션'],
      },
      groundTruthSource: {
        type: 'employee',
        path: 'employees[sabon=J00134].commission.total',
      },
      metadata: {
        notes: 'Requires ranking calculation - checking for ranking-related terms in response',
      },
    },
  ],
};
