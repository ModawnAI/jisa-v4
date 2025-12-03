# 테스팅 전략 및 가이드라인

> ContractorHub의 품질 보증을 위한 테스트 가이드

---

## 1. 테스트 구조

```
/tests/
├── unit/                         # 단위 테스트
│   ├── lib/
│   │   ├── services/
│   │   │   ├── employee.service.test.ts
│   │   │   ├── category.service.test.ts
│   │   │   └── document.service.test.ts
│   │   ├── utils/
│   │   │   ├── currency.test.ts
│   │   │   ├── date.test.ts
│   │   │   └── validation.test.ts
│   │   └── pinecone/
│   │       ├── namespaces.test.ts
│   │       └── metadata.test.ts
│   └── components/
│       ├── shared/
│       │   ├── data-table.test.tsx
│       │   └── status-badge.test.tsx
│       └── employees/
│           └── employee-form.test.tsx
│
├── integration/                  # 통합 테스트
│   ├── api/
│   │   ├── employees.test.ts
│   │   ├── categories.test.ts
│   │   └── documents.test.ts
│   └── services/
│       ├── document-processing.test.ts
│       └── rag-query.test.ts
│
└── e2e/                          # E2E 테스트
    ├── auth.spec.ts
    ├── employees.spec.ts
    ├── documents.spec.ts
    └── fixtures/
        ├── sample-excel.xlsx
        └── test-data.json
```

---

## 2. 테스트 스택

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "msw": "^2.0.0",
    "playwright": "^1.40.0",
    "@faker-js/faker": "^8.0.0"
  }
}
```

---

## 3. 단위 테스트

### 3.1 서비스 테스트

```typescript
// tests/unit/lib/services/employee.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEmployee, getEmployees, updateEmployee, deleteEmployee } from '@/lib/services/employee.service';
import { db } from '@/lib/db';
import { employees } from '@/lib/db/schema';

// DB 모킹
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(),
          offset: vi.fn(),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

describe('EmployeeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEmployee', () => {
    it('유효한 입력으로 직원을 생성해야 함', async () => {
      const input = {
        employeeId: 'E001',
        name: '홍길동',
        phone: '010-1234-5678',
        clearanceLevel: 'basic' as const,
      };

      const mockEmployee = {
        id: 'uuid-1',
        ...input,
        email: null,
        status: 'active',
        ragEnabled: true,
        pineconeNamespace: 'employee_E001',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([mockEmployee]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as any).mockReturnValue({ values: mockValues });

      const result = await createEmployee(input);

      expect(db.insert).toHaveBeenCalledWith(employees);
      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
        employeeId: 'E001',
        name: '홍길동',
        pineconeNamespace: 'employee_E001',
        ragEnabled: true,
      }));
      expect(result).toEqual(mockEmployee);
    });

    it('중복 사번으로 에러를 발생시켜야 함', async () => {
      const input = {
        employeeId: 'E001',
        name: '홍길동',
        phone: '010-1234-5678',
      };

      const mockReturning = vi.fn().mockRejectedValue(new Error('duplicate key'));
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as any).mockReturnValue({ values: mockValues });

      await expect(createEmployee(input)).rejects.toThrow('duplicate key');
    });
  });

  describe('getEmployees', () => {
    it('페이지네이션과 함께 직원 목록을 반환해야 함', async () => {
      const mockEmployees = [
        { id: '1', employeeId: 'E001', name: '홍길동' },
        { id: '2', employeeId: 'E002', name: '김철수' },
      ];

      const mockLimit = vi.fn().mockReturnValue({ offset: vi.fn().mockResolvedValue(mockEmployees) });
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const result = await getEmployees({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockEmployees);
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(20);
    });

    it('검색어로 필터링해야 함', async () => {
      const mockEmployees = [
        { id: '1', employeeId: 'E001', name: '홍길동' },
      ];

      // 검색 로직 테스트
      const result = await getEmployees({ q: '홍길동' });

      expect(result.data).toBeDefined();
    });
  });
});
```

### 3.2 유틸리티 테스트

```typescript
// tests/unit/lib/utils/currency.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrency, calculateTotal } from '@/lib/utils/currency';

describe('Currency Utils', () => {
  describe('formatCurrency', () => {
    it('숫자를 한국 원화 형식으로 포맷해야 함', () => {
      expect(formatCurrency(1000000)).toBe('1,000,000원');
      expect(formatCurrency(0)).toBe('0원');
      expect(formatCurrency(-50000)).toBe('-50,000원');
    });

    it('소수점이 있는 경우 반올림해야 함', () => {
      expect(formatCurrency(1234.56)).toBe('1,235원');
      expect(formatCurrency(1234.44)).toBe('1,234원');
    });

    it('null/undefined를 0으로 처리해야 함', () => {
      expect(formatCurrency(null as any)).toBe('0원');
      expect(formatCurrency(undefined as any)).toBe('0원');
    });
  });

  describe('parseCurrency', () => {
    it('포맷된 문자열을 숫자로 파싱해야 함', () => {
      expect(parseCurrency('1,000,000원')).toBe(1000000);
      expect(parseCurrency('₩1,000,000')).toBe(1000000);
      expect(parseCurrency('1000000')).toBe(1000000);
    });

    it('빈 문자열은 0을 반환해야 함', () => {
      expect(parseCurrency('')).toBe(0);
    });
  });

  describe('calculateTotal', () => {
    it('보상 항목의 총액을 계산해야 함', () => {
      const items = {
        baseFee: 1000000,
        incentive: 200000,
        clawback: -50000,
      };

      expect(calculateTotal(items)).toBe(1150000);
    });

    it('누락된 항목은 0으로 처리해야 함', () => {
      const items = {
        baseFee: 1000000,
      };

      expect(calculateTotal(items as any)).toBe(1000000);
    });
  });
});
```

### 3.3 컴포넌트 테스트

```typescript
// tests/unit/components/employees/employee-form.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeeForm } from '@/components/employees/employee-form';

describe('EmployeeForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('폼 필드들을 렌더링해야 함', () => {
    render(
      <EmployeeForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText('사번')).toBeInTheDocument();
    expect(screen.getByLabelText('이름')).toBeInTheDocument();
    expect(screen.getByLabelText('이메일 (선택)')).toBeInTheDocument();
    expect(screen.getByLabelText('전화번호')).toBeInTheDocument();
  });

  it('유효성 검사 에러를 표시해야 함', async () => {
    const user = userEvent.setup();

    render(
      <EmployeeForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // 빈 폼 제출
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(screen.getByText('사번을 입력하세요')).toBeInTheDocument();
      expect(screen.getByText('이름을 입력하세요')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('유효한 데이터로 제출해야 함', async () => {
    const user = userEvent.setup();

    render(
      <EmployeeForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await user.type(screen.getByLabelText('사번'), 'E001');
    await user.type(screen.getByLabelText('이름'), '홍길동');
    await user.type(screen.getByLabelText('전화번호'), '010-1234-5678');

    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        employeeId: 'E001',
        name: '홍길동',
        phone: '010-1234-5678',
        clearanceLevel: 'basic',
      });
    });
  });

  it('초기값을 표시해야 함', () => {
    render(
      <EmployeeForm
        initialData={{
          employeeId: 'E001',
          name: '홍길동',
          phone: '010-1234-5678',
        }}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText('사번')).toHaveValue('E001');
    expect(screen.getByLabelText('이름')).toHaveValue('홍길동');
    expect(screen.getByLabelText('전화번호')).toHaveValue('010-1234-5678');
  });

  it('취소 버튼 클릭 시 onCancel을 호출해야 함', async () => {
    const user = userEvent.setup();

    render(
      <EmployeeForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('로딩 중 버튼을 비활성화해야 함', () => {
    render(
      <EmployeeForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByRole('button', { name: '저장 중...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
  });
});
```

---

## 4. 통합 테스트

### 4.1 API 통합 테스트

```typescript
// tests/integration/api/employees.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'http';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/employees/route';
import { db } from '@/lib/db';
import { employees } from '@/lib/db/schema';

describe('Employees API', () => {
  beforeEach(async () => {
    // 테스트 데이터 초기화
    await db.delete(employees);
  });

  describe('GET /api/employees', () => {
    it('빈 목록을 반환해야 함', async () => {
      const request = new NextRequest('http://localhost:3000/api/employees');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('직원 목록을 반환해야 함', async () => {
      // 테스트 데이터 삽입
      await db.insert(employees).values([
        {
          employeeId: 'E001',
          name: '홍길동',
          phone: '010-1234-5678',
          clearanceLevel: 'basic',
        },
        {
          employeeId: 'E002',
          name: '김철수',
          phone: '010-2345-6789',
          clearanceLevel: 'standard',
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/employees');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('페이지네이션을 적용해야 함', async () => {
      // 10명의 직원 삽입
      await db.insert(employees).values(
        Array.from({ length: 10 }, (_, i) => ({
          employeeId: `E00${i + 1}`,
          name: `직원 ${i + 1}`,
          phone: '010-1234-5678',
          clearanceLevel: 'basic',
        }))
      );

      const request = new NextRequest(
        'http://localhost:3000/api/employees?page=1&pageSize=5'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveLength(5);
      expect(data.meta.total).toBe(10);
      expect(data.meta.hasMore).toBe(true);
    });
  });

  describe('POST /api/employees', () => {
    it('직원을 생성해야 함', async () => {
      const request = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: 'E001',
          name: '홍길동',
          phone: '010-1234-5678',
          clearanceLevel: 'basic',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.employeeId).toBe('E001');
      expect(data.data.pineconeNamespace).toBe('employee_E001');
    });

    it('유효성 검사 실패 시 400을 반환해야 함', async () => {
      const request = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        body: JSON.stringify({
          // employeeId 누락
          name: '홍길동',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('중복 사번 시 409를 반환해야 함', async () => {
      // 먼저 직원 생성
      await db.insert(employees).values({
        employeeId: 'E001',
        name: '홍길동',
        phone: '010-1234-5678',
      });

      const request = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: 'E001',
          name: '다른이름',
          phone: '010-9999-9999',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(409);
    });
  });
});
```

### 4.2 문서 처리 통합 테스트

```typescript
// tests/integration/services/document-processing.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { processEmployeeSplit } from '@/inngest/functions/process-employee-split';
import { db } from '@/lib/db';
import { documents, employees, processingBatches } from '@/lib/db/schema';
import * as xlsx from 'xlsx';

// Pinecone 모킹
vi.mock('@/lib/pinecone/client', () => ({
  pinecone: {
    upsert: vi.fn().mockResolvedValue({ upsertedCount: 1 }),
    query: vi.fn().mockResolvedValue({ matches: [] }),
    deleteMany: vi.fn().mockResolvedValue({}),
  },
}));

describe('Document Processing - Employee Split', () => {
  beforeEach(async () => {
    // 테스트 직원 데이터 삽입
    await db.insert(employees).values([
      { employeeId: 'E001', name: '홍길동', phone: '010-1234-5678', clearanceLevel: 'basic' },
      { employeeId: 'E002', name: '김철수', phone: '010-2345-6789', clearanceLevel: 'standard' },
    ]);
  });

  afterEach(async () => {
    await db.delete(processingBatches);
    await db.delete(documents);
    await db.delete(employees);
    vi.clearAllMocks();
  });

  it('Excel 파일을 파싱하고 직원별로 분리해야 함', async () => {
    // 테스트 Excel 데이터 생성
    const workbook = xlsx.utils.book_new();
    const wsData = [
      ['사번', '사원명', '기본수수료', '시책', '환수'],
      ['E001', '홍길동', 1000000, 200000, 50000],
      ['E002', '김철수', 800000, 150000, 0],
    ];
    const worksheet = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // 문서 레코드 생성
    const [doc] = await db.insert(documents).values({
      name: 'test.xlsx',
      fileType: 'excel',
      status: 'pending',
    }).returning();

    // 처리 실행
    const result = await processEmployeeSplit({
      documentId: doc.id,
      templateId: 'template-1',
      period: '2025-02',
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].status).toBe('success');
    expect(result.results[1].status).toBe('success');
  });

  it('존재하지 않는 직원은 건너뛰어야 함', async () => {
    const wsData = [
      ['사번', '사원명', '기본수수료'],
      ['E001', '홍길동', 1000000],
      ['E999', '없는직원', 500000], // 존재하지 않는 직원
    ];

    // 처리 실행 후 결과 확인
    // E001은 success, E999는 skipped
  });
});
```

---

## 5. E2E 테스트 (Playwright)

### 5.1 설정

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 5.2 E2E 테스트

```typescript
// tests/e2e/employees.spec.ts
import { test, expect } from '@playwright/test';

test.describe('직원 관리', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  });

  test('직원 목록을 표시해야 함', async ({ page }) => {
    await page.goto('/admin/employees');

    await expect(page.getByRole('heading', { name: '직원 관리' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('새 직원을 추가할 수 있어야 함', async ({ page }) => {
    await page.goto('/admin/employees');

    // 추가 버튼 클릭
    await page.click('button:has-text("직원 추가")');

    // 폼 입력
    await page.fill('input[name="employeeId"]', 'E999');
    await page.fill('input[name="name"]', '테스트 직원');
    await page.fill('input[name="phone"]', '010-9999-9999');

    // 저장
    await page.click('button:has-text("저장")');

    // 성공 토스트 확인
    await expect(page.getByText('저장 완료')).toBeVisible();

    // 테이블에 새 직원 표시 확인
    await expect(page.getByText('E999')).toBeVisible();
    await expect(page.getByText('테스트 직원')).toBeVisible();
  });

  test('직원 정보를 수정할 수 있어야 함', async ({ page }) => {
    await page.goto('/admin/employees');

    // 첫 번째 직원의 편집 버튼 클릭
    await page.click('tr:first-child button[aria-label="편집"]');

    // 이름 수정
    await page.fill('input[name="name"]', '수정된 이름');

    // 저장
    await page.click('button:has-text("저장")');

    // 성공 확인
    await expect(page.getByText('수정 완료')).toBeVisible();
    await expect(page.getByText('수정된 이름')).toBeVisible();
  });

  test('직원을 삭제할 수 있어야 함', async ({ page }) => {
    await page.goto('/admin/employees');

    // 직원 수 확인
    const initialCount = await page.locator('tbody tr').count();

    // 첫 번째 직원의 삭제 버튼 클릭
    await page.click('tr:first-child button[aria-label="삭제"]');

    // 확인 다이얼로그
    await expect(page.getByText('정말 삭제하시겠습니까?')).toBeVisible();
    await page.click('button:has-text("삭제")');

    // 성공 확인
    await expect(page.getByText('삭제 완료')).toBeVisible();

    // 직원 수 감소 확인
    await expect(page.locator('tbody tr')).toHaveCount(initialCount - 1);
  });

  test('검색 기능이 동작해야 함', async ({ page }) => {
    await page.goto('/admin/employees');

    // 검색어 입력
    await page.fill('input[placeholder="검색..."]', '홍길동');

    // 검색 결과 확인
    await expect(page.getByText('홍길동')).toBeVisible();
    // 다른 직원은 보이지 않아야 함
    await expect(page.getByText('김철수')).not.toBeVisible();
  });
});
```

### 5.3 문서 업로드 E2E

```typescript
// tests/e2e/documents.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('문서 관리', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // 로그인 로직...
  });

  test('Excel 파일을 업로드하고 미리보기를 표시해야 함', async ({ page }) => {
    await page.goto('/admin/documents/upload');

    // 파일 업로드
    const filePath = path.join(__dirname, 'fixtures', 'sample-excel.xlsx');
    await page.setInputFiles('input[type="file"]', filePath);

    // 미리보기 확인
    await expect(page.getByText('파일 미리보기')).toBeVisible();
    await expect(page.getByText('사번')).toBeVisible();
    await expect(page.getByText('사원명')).toBeVisible();

    // 템플릿 선택
    await page.selectOption('select[name="templateId"]', 'monthly-report');

    // 컬럼 매핑 확인
    await expect(page.getByText('컬럼 매핑 상태')).toBeVisible();
  });

  test('충돌이 있는 경우 경고를 표시해야 함', async ({ page }) => {
    await page.goto('/admin/documents/upload');

    // 이미 처리된 기간의 파일 업로드
    const filePath = path.join(__dirname, 'fixtures', 'duplicate-period.xlsx');
    await page.setInputFiles('input[type="file"]', filePath);
    await page.fill('input[name="period"]', '2025-02');

    // 충돌 경고 확인
    await expect(page.getByText('충돌 감지됨')).toBeVisible();
    await expect(page.getByText('해결 방법 선택')).toBeVisible();
  });
});
```

---

## 6. 테스트 유틸리티

### 6.1 테스트 팩토리

```typescript
// tests/utils/factories.ts
import { faker } from '@faker-js/faker/locale/ko';
import type { Employee, CreateEmployeeInput } from '@/lib/types/employee';

export function createMockEmployee(overrides?: Partial<Employee>): Employee {
  return {
    id: faker.string.uuid(),
    employeeId: `E${faker.string.numeric(3)}`,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number('010-####-####'),
    clearanceLevel: 'basic',
    status: 'active',
    ragEnabled: true,
    pineconeNamespace: `employee_E${faker.string.numeric(3)}`,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

export function createMockEmployeeInput(
  overrides?: Partial<CreateEmployeeInput>
): CreateEmployeeInput {
  return {
    employeeId: `E${faker.string.numeric(3)}`,
    name: faker.person.fullName(),
    phone: faker.phone.number('010-####-####'),
    clearanceLevel: 'basic',
    ...overrides,
  };
}
```

### 6.2 MSW 핸들러

```typescript
// tests/utils/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // 직원 API
  http.get('/api/employees', () => {
    return HttpResponse.json({
      success: true,
      data: [
        createMockEmployee({ employeeId: 'E001', name: '홍길동' }),
        createMockEmployee({ employeeId: 'E002', name: '김철수' }),
      ],
      meta: { page: 1, pageSize: 20, total: 2, hasMore: false },
    });
  }),

  http.post('/api/employees', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: createMockEmployee(body as any),
    }, { status: 201 });
  }),

  // 카테고리 API
  http.get('/api/categories', () => {
    return HttpResponse.json({
      success: true,
      data: [],
    });
  }),
];
```

---

## 7. 테스트 커버리지 목표

| 영역 | 목표 | 측정 방법 |
|------|------|----------|
| 서비스 레이어 | 80% | 라인 커버리지 |
| API 라우트 | 70% | 라인 커버리지 |
| 유틸리티 함수 | 90% | 라인 커버리지 |
| 컴포넌트 | 60% | 브랜치 커버리지 |
| E2E | 핵심 플로우 100% | 시나리오 기반 |

---

## 8. CI/CD 테스트 파이프라인

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:unit
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm db:push
      - run: pnpm test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpx playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```
