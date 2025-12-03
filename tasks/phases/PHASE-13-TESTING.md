# Phase 13: Testing & Deployment

**Duration**: 4 days
**Dependencies**: All previous phases complete
**Deliverables**: Complete test suite, CI/CD pipeline, deployment configuration

---

## Task 13.1: Unit Tests Setup

### 13.1.1 Vitest Configuration

**File**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'tests',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/types.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
```

### 13.1.2 Test Setup File

**File**: `tests/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  }),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
```

### 13.1.3 Example Service Test

**File**: `tests/services/employee.service.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { employeeService } from '@/lib/services/employee.service';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      employees: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
  },
}));

describe('EmployeeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new employee', async () => {
      const mockEmployee = {
        id: '123',
        name: '홍길동',
        employeeNumber: 'EMP001',
      };

      vi.mocked(db.query.employees.findFirst).mockResolvedValue(null);
      vi.mocked(db.insert).mockImplementation(() => ({
        values: () => ({
          returning: () => Promise.resolve([mockEmployee]),
        }),
      }) as any);

      const result = await employeeService.create({
        organizationId: 'org-123',
        employeeNumber: 'EMP001',
        name: '홍길동',
      });

      expect(result).toEqual(mockEmployee);
    });

    it('should throw error for duplicate employee number', async () => {
      vi.mocked(db.query.employees.findFirst).mockResolvedValue({
        id: 'existing',
        employeeNumber: 'EMP001',
      } as any);

      await expect(
        employeeService.create({
          organizationId: 'org-123',
          employeeNumber: 'EMP001',
          name: '홍길동',
        })
      ).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should return employee by ID', async () => {
      const mockEmployee = {
        id: '123',
        name: '홍길동',
      };

      vi.mocked(db.query.employees.findFirst).mockResolvedValue(mockEmployee as any);

      const result = await employeeService.getById('123');

      expect(result).toEqual(mockEmployee);
    });

    it('should throw error if employee not found', async () => {
      vi.mocked(db.query.employees.findFirst).mockResolvedValue(null);

      await expect(employeeService.getById('invalid-id')).rejects.toThrow();
    });
  });
});
```

### 13.1.4 Example Component Test

**File**: `tests/components/stat-card.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/admin/stat-card';

describe('StatCard', () => {
  it('renders title and value', () => {
    render(<StatCard title="Total Users" value={100} />);

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <StatCard
        title="Total Users"
        value={100}
        description="Active users"
      />
    );

    expect(screen.getByText('Active users')).toBeInTheDocument();
  });

  it('renders positive trend indicator', () => {
    render(
      <StatCard
        title="Revenue"
        value="$1000"
        trend={{ value: 10, isPositive: true }}
      />
    );

    expect(screen.getByText('10%')).toBeInTheDocument();
  });

  it('renders negative trend indicator', () => {
    render(
      <StatCard
        title="Errors"
        value={5}
        trend={{ value: 20, isPositive: false }}
      />
    );

    expect(screen.getByText('20%')).toBeInTheDocument();
  });
});
```

### Tests for 13.1
- [ ] Vitest runs successfully
- [ ] Service tests pass
- [ ] Component tests pass
- [ ] Coverage reports generated

---

## Task 13.2: Integration Tests

### 13.2.1 API Route Tests

**File**: `tests/api/employees.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/employees/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: () => Promise.resolve({
        data: { user: { id: 'user-123' } },
      }),
    },
  }),
}));

vi.mock('@/lib/services/employee.service', () => ({
  employeeService: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

describe('Employees API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/employees', () => {
    it('should return employees list', async () => {
      const { employeeService } = await import('@/lib/services/employee.service');
      vi.mocked(employeeService.list).mockResolvedValue({
        data: [{ id: '1', name: '홍길동' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const request = new Request(
        'http://localhost:3000/api/employees?organizationId=org-123',
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });

    it('should return 400 without organization ID', async () => {
      const request = new Request('http://localhost:3000/api/employees', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/employees', () => {
    it('should create a new employee', async () => {
      const { employeeService } = await import('@/lib/services/employee.service');
      vi.mocked(employeeService.create).mockResolvedValue({
        id: 'new-1',
        name: '홍길동',
        employeeNumber: 'EMP001',
      } as any);

      const request = new Request('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org-123',
          employeeNumber: 'EMP001',
          name: '홍길동',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('홍길동');
    });
  });
});
```

### 13.2.2 MSW Handlers

**File**: `tests/mocks/handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth handlers
  http.get('/api/auth/profile', () => {
    return HttpResponse.json({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'org_admin',
      organizationId: 'org-123',
      permissions: {
        documents: { create: true, read: true, update: true, delete: true },
        employees: { create: true, read: true, update: true, delete: true },
      },
    });
  }),

  // Employees handlers
  http.get('/api/employees', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');

    return HttpResponse.json({
      data: [
        { id: '1', name: '김철수', employeeNumber: 'EMP001' },
        { id: '2', name: '이영희', employeeNumber: 'EMP002' },
      ],
      pagination: { page, limit: 10, total: 2, totalPages: 1 },
    });
  }),

  http.post('/api/employees', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        id: 'new-1',
        ...body,
      },
      { status: 201 }
    );
  }),

  // Categories handlers
  http.get('/api/categories', () => {
    return HttpResponse.json([
      { id: '1', name: '인사/급여', slug: 'hr-payroll' },
      { id: '2', name: '계약/법무', slug: 'contracts' },
    ]);
  }),

  // Chat handlers
  http.post('/api/chat', () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode('{"type":"context","data":[]}\n'));
        controller.enqueue(encoder.encode('{"type":"chunk","data":"안녕"}\n'));
        controller.enqueue(encoder.encode('{"type":"chunk","data":"하세요"}\n'));
        controller.enqueue(encoder.encode('{"type":"done","data":null}\n'));
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }),
];
```

### Tests for 13.2
- [ ] API route tests pass
- [ ] MSW handlers work
- [ ] Error scenarios tested

---

## Task 13.3: E2E Tests with Playwright

### 13.3.1 Playwright Configuration

**File**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
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
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 13.3.2 E2E Test Examples

**File**: `e2e/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    await expect(page.getByLabel('이메일')).toBeVisible();
    await expect(page.getByLabel('비밀번호')).toBeVisible();
  });

  test('should show validation errors', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: '로그인' }).click();

    // Should show validation errors
    await expect(page.getByText('이메일')).toBeVisible();
  });

  test('should redirect to dashboard after login', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('이메일').fill('test@example.com');
    await page.getByLabel('비밀번호').fill('password123');
    await page.getByRole('button', { name: '로그인' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });
});
```

**File**: `e2e/employees.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Employee Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('이메일').fill('admin@example.com');
    await page.getByLabel('비밀번호').fill('password123');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL(/dashboard/);
  });

  test('should display employee list', async ({ page }) => {
    await page.goto('/employees');

    await expect(page.getByRole('heading', { name: '직원 관리' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should navigate to add employee page', async ({ page }) => {
    await page.goto('/employees');

    await page.getByRole('link', { name: '직원 추가' }).click();

    await expect(page).toHaveURL(/employees\/new/);
    await expect(page.getByLabel('사번')).toBeVisible();
    await expect(page.getByLabel('이름')).toBeVisible();
  });

  test('should create new employee', async ({ page }) => {
    await page.goto('/employees/new');

    await page.getByLabel('사번').fill('EMP999');
    await page.getByLabel('이름').fill('테스트 직원');
    await page.getByLabel('이메일').fill('test999@example.com');
    await page.getByRole('button', { name: '추가' }).click();

    // Should redirect to list
    await expect(page).toHaveURL(/employees$/);
  });

  test('should search employees', async ({ page }) => {
    await page.goto('/employees');

    await page.getByPlaceholder('이름, 사번').fill('홍길동');
    await page.waitForTimeout(500); // Debounce

    // Table should be filtered
    await expect(page.getByRole('row')).toHaveCount(2); // Header + 1 result
  });
});
```

### Tests for 13.3
- [ ] Auth flow E2E
- [ ] Employee CRUD E2E
- [ ] Document upload E2E
- [ ] Chat flow E2E

---

## Task 13.4: CI/CD Pipeline

### 13.4.1 GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, unit-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

### 13.4.2 Vercel Deployment Configuration

**File**: `vercel.json`

```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["icn1"],
  "env": {
    "NEXT_PUBLIC_APP_URL": "@app_url"
  }
}
```

### Tests for 13.4
- [ ] CI pipeline runs
- [ ] All checks pass
- [ ] Build succeeds
- [ ] Deployment works

---

## Task 13.5: Pre-Deployment Checklist

### 13.5.1 Environment Variables Checklist

```markdown
## Required Environment Variables

### Supabase
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] DATABASE_URL

### Pinecone
- [ ] PINECONE_API_KEY
- [ ] PINECONE_INDEX_NAME
- [ ] PINECONE_ENVIRONMENT

### OpenAI
- [ ] OPENAI_API_KEY

### Inngest
- [ ] INNGEST_EVENT_KEY
- [ ] INNGEST_SIGNING_KEY

### App
- [ ] NEXT_PUBLIC_APP_URL
- [ ] NEXT_PUBLIC_APP_ENV
```

### 13.5.2 Security Checklist

```markdown
## Security Checklist

### Authentication
- [ ] All routes require authentication
- [ ] Session tokens properly secured
- [ ] Password policies enforced
- [ ] Rate limiting implemented

### Authorization
- [ ] RBAC implemented correctly
- [ ] Permission checks on all endpoints
- [ ] Namespace isolation verified

### Data Protection
- [ ] Sensitive data encrypted
- [ ] PII handling compliant
- [ ] Audit logging enabled

### API Security
- [ ] CORS configured correctly
- [ ] Input validation on all endpoints
- [ ] SQL injection prevented
- [ ] XSS prevention in place
```

### 13.5.3 Performance Checklist

```markdown
## Performance Checklist

### Frontend
- [ ] Images optimized
- [ ] Code splitting working
- [ ] Lazy loading implemented
- [ ] Bundle size acceptable

### Backend
- [ ] Database queries optimized
- [ ] Caching implemented
- [ ] Connection pooling configured
- [ ] Background jobs processing

### Infrastructure
- [ ] CDN configured
- [ ] Edge functions working
- [ ] Monitoring in place
- [ ] Error tracking enabled
```

---

## Phase Completion Checklist

- [ ] Unit tests complete (>80% coverage)
- [ ] Integration tests complete
- [ ] E2E tests complete
- [ ] CI/CD pipeline working
- [ ] Vercel deployment configured
- [ ] Environment variables set
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Ready for production

---

## Post-Launch Tasks

- [ ] Monitor error rates
- [ ] Track performance metrics
- [ ] Gather user feedback
- [ ] Plan next iteration
