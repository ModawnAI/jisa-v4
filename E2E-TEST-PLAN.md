# ContractorHub E2E Test Plan

## Overview

Comprehensive end-to-end testing plan for ContractorHub (계약자허브) - A KakaoTalk chatbot-based contractor compensation calculation and onboarding system.

**Test Framework**: Playwright + Vitest
**Test Coverage Target**: 100% of user-facing features
**Browser**: Chromium (primary)

---

## Test Architecture

```
e2e/
├── auth.setup.ts          # Authentication setup (runs first)
├── fixtures/              # Test fixtures and utilities
│   └── test-base.ts       # Extended test with common utilities
├── auth.spec.ts           # Authentication flow tests
├── navigation.spec.ts     # Navigation and routing tests
├── dashboard.spec.ts      # Dashboard page tests
├── employees.spec.ts      # Employee CRUD tests
├── categories.spec.ts     # Category CRUD tests
├── templates.spec.ts      # Template CRUD tests
├── documents.spec.ts      # Document management tests
├── chat.spec.ts           # AI Chat feature tests
├── lineage.spec.ts        # Data lineage tests
├── accessibility.spec.ts  # Accessibility tests
└── .auth/                 # Stored authentication state
    └── user.json
```

---

## Test Credentials

| Field | Value |
|-------|-------|
| Email | asdf@asdf.com |
| Password | asdfasdfasdf |

---

## Test Categories

### 1. Authentication Tests (`auth.spec.ts`)

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| AUTH-001 | Login with valid credentials | Critical | ⏳ |
| AUTH-002 | Login with invalid email | High | ⏳ |
| AUTH-003 | Login with invalid password | High | ⏳ |
| AUTH-004 | Login with empty fields | Medium | ⏳ |
| AUTH-005 | Redirect to dashboard after login | Critical | ⏳ |
| AUTH-006 | Redirect unauthenticated users to login | Critical | ⏳ |
| AUTH-007 | Logout functionality | High | ⏳ |
| AUTH-008 | Session persistence | High | ⏳ |

### 2. Navigation Tests (`navigation.spec.ts`)

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| NAV-001 | Sidebar renders all menu items | Critical | ⏳ |
| NAV-002 | Navigate to Dashboard | Critical | ⏳ |
| NAV-003 | Navigate to Employees | Critical | ⏳ |
| NAV-004 | Navigate to Categories | Critical | ⏳ |
| NAV-005 | Navigate to Templates | Critical | ⏳ |
| NAV-006 | Navigate to Document Upload | Critical | ⏳ |
| NAV-007 | Navigate to Documents List | Critical | ⏳ |
| NAV-008 | Navigate to AI Chat | Critical | ⏳ |
| NAV-009 | Navigate to Data Lineage | Critical | ⏳ |
| NAV-010 | Active menu item highlighting | Medium | ⏳ |
| NAV-011 | Mobile sidebar toggle | Medium | ⏳ |
| NAV-012 | Breadcrumb navigation | Low | ⏳ |

### 3. Dashboard Tests (`dashboard.spec.ts`)

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| DASH-001 | Dashboard page loads | Critical | ⏳ |
| DASH-002 | Statistics cards display | High | ⏳ |
| DASH-003 | Document trend chart renders | Medium | ⏳ |
| DASH-004 | Status breakdown chart renders | Medium | ⏳ |
| DASH-005 | Recent activity list | Medium | ⏳ |
| DASH-006 | Quick actions buttons | High | ⏳ |
| DASH-007 | Quick action: Upload Document | High | ⏳ |
| DASH-008 | Quick action: Add Employee | High | ⏳ |

### 4. Employee Tests (`employees.spec.ts`)

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| EMP-001 | Employee list page loads | Critical | ⏳ |
| EMP-002 | Employee table displays data | High | ⏳ |
| EMP-003 | Search employees by name | High | ⏳ |
| EMP-004 | Filter employees by department | Medium | ⏳ |
| EMP-005 | Filter employees by status | Medium | ⏳ |
| EMP-006 | Create new employee - form loads | High | ⏳ |
| EMP-007 | Create new employee - validation | High | ⏳ |
| EMP-008 | Create new employee - success | Critical | ⏳ |
| EMP-009 | View employee details | High | ⏳ |
| EMP-010 | Edit employee - form loads | High | ⏳ |
| EMP-011 | Edit employee - success | Critical | ⏳ |
| EMP-012 | Delete employee - confirmation | High | ⏳ |
| EMP-013 | Delete employee - success | Critical | ⏳ |
| EMP-014 | Pagination controls | Medium | ⏳ |
| EMP-015 | Sort by columns | Low | ⏳ |

### 5. Category Tests (`categories.spec.ts`)

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| CAT-001 | Category list page loads | Critical | ⏳ |
| CAT-002 | Category tree displays | High | ⏳ |
| CAT-003 | Expand/collapse categories | Medium | ⏳ |
| CAT-004 | Create new category - form loads | High | ⏳ |
| CAT-005 | Create new category - validation | High | ⏳ |
| CAT-006 | Create new category - success | Critical | ⏳ |
| CAT-007 | Create subcategory | High | ⏳ |
| CAT-008 | Edit category - form loads | High | ⏳ |
| CAT-009 | Edit category - success | Critical | ⏳ |
| CAT-010 | Delete category - confirmation | High | ⏳ |
| CAT-011 | Delete category - success | Critical | ⏳ |
| CAT-012 | Drag and drop reorder | Low | ⏳ |

### 6. Template Tests (`templates.spec.ts`)

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| TPL-001 | Template list page loads | Critical | ⏳ |
| TPL-002 | Template table displays data | High | ⏳ |
| TPL-003 | Create new template - form loads | High | ⏳ |
| TPL-004 | Create new template - validation | High | ⏳ |
| TPL-005 | Create new template - success | Critical | ⏳ |
| TPL-006 | View template details | High | ⏳ |
| TPL-007 | Edit template - form loads | High | ⏳ |
| TPL-008 | Edit template - success | Critical | ⏳ |
| TPL-009 | Delete template - confirmation | High | ⏳ |
| TPL-010 | Delete template - success | Critical | ⏳ |
| TPL-011 | Duplicate template | Medium | ⏳ |
| TPL-012 | Column mapping configuration | High | ⏳ |
| TPL-013 | Template version history | Medium | ⏳ |

### 7. Document Tests (`documents.spec.ts`)

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| DOC-001 | Document upload page loads | Critical | ⏳ |
| DOC-002 | Upload form validation | High | ⏳ |
| DOC-003 | File selection | High | ⏳ |
| DOC-004 | Category selection | High | ⏳ |
| DOC-005 | Template selection | High | ⏳ |
| DOC-006 | Document list page loads | Critical | ⏳ |
| DOC-007 | Document table displays data | High | ⏳ |
| DOC-008 | Filter by status | Medium | ⏳ |
| DOC-009 | Filter by category | Medium | ⏳ |
| DOC-010 | View document details | High | ⏳ |
| DOC-011 | Download document | High | ⏳ |
| DOC-012 | Delete document - confirmation | High | ⏳ |
| DOC-013 | Delete document - success | Critical | ⏳ |
| DOC-014 | Processing status indicator | Medium | ⏳ |

### 8. AI Chat Tests (`chat.spec.ts`)

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| CHAT-001 | Chat page loads | Critical | ⏳ |
| CHAT-002 | Chat input visible | High | ⏳ |
| CHAT-003 | Send message | Critical | ⏳ |
| CHAT-004 | Receive AI response | Critical | ⏳ |
| CHAT-005 | Message history display | High | ⏳ |
| CHAT-006 | Context panel toggle | Medium | ⏳ |
| CHAT-007 | Clear chat history | Medium | ⏳ |

### 9. Data Lineage Tests (`lineage.spec.ts`)

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| LIN-001 | Lineage page loads | Critical | ⏳ |
| LIN-002 | Lineage statistics display | High | ⏳ |
| LIN-003 | Lineage table renders | High | ⏳ |
| LIN-004 | Filter by source | Medium | ⏳ |
| LIN-005 | Trace data origin | High | ⏳ |

### 10. Accessibility Tests (`accessibility.spec.ts`)

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| A11Y-001 | Keyboard navigation | High | ⏳ |
| A11Y-002 | Focus indicators visible | High | ⏳ |
| A11Y-003 | Form labels associated | High | ⏳ |
| A11Y-004 | Color contrast | Medium | ⏳ |
| A11Y-005 | ARIA landmarks | Medium | ⏳ |

---

## Test Execution Commands

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run tests with UI
npx playwright test --ui

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run specific test by name
npx playwright test -g "AUTH-001"

# Generate HTML report
npx playwright show-report

# Debug mode
npx playwright test --debug
```

---

## Test Data Requirements

### Employee Test Data
```json
{
  "name": "테스트 직원",
  "email": "test.employee@example.com",
  "department": "개발팀",
  "position": "개발자",
  "phone": "010-1234-5678",
  "status": "active"
}
```

### Category Test Data
```json
{
  "name": "테스트 카테고리",
  "description": "테스트용 문서 카테고리",
  "clearanceLevel": "basic"
}
```

### Template Test Data
```json
{
  "name": "테스트 템플릿",
  "description": "테스트용 Excel 템플릿",
  "categoryId": "<dynamic>",
  "processingMode": "company"
}
```

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Test Pass Rate | ≥ 95% |
| Critical Tests Pass | 100% |
| High Priority Tests Pass | ≥ 98% |
| Test Execution Time | < 5 minutes |
| Flaky Test Rate | < 2% |

---

## Test Execution Results

**Execution Date**: 2025-12-03
**Duration**: 80.7 seconds
**Browser**: Chromium

### Summary

| Category | Total | Passed | Failed | Skipped |
|----------|-------|--------|--------|---------|
| Setup | 1 | 1 | 0 | 0 |
| Authentication | 8 | 7 | 1 | 0 |
| Navigation | 12 | 7 | 5 | 0 |
| Dashboard | 10 | 10 | 0 | 0 |
| Employees | 14 | 11 | 3 | 0 |
| Categories | 12 | 9 | 3 | 0 |
| Templates | 13 | 9 | 4 | 0 |
| Documents | 14 | 12 | 2 | 0 |
| AI Chat | 8 | 8 | 0 | 0 |
| Data Lineage | 6 | 5 | 1 | 0 |
| Accessibility | 14 | 9 | 5 | 0 |
| **TOTAL** | **111** | **87** | **24** | **0** |

### Pass Rate: **78.4%**

### Failed Tests Analysis

| Test ID | Test Case | Failure Reason |
|---------|-----------|----------------|
| AUTH-004 | Login with empty fields | Validation message selector mismatch |
| NAV-001 | Sidebar renders menu items | "직원" text selector ambiguous |
| NAV-003 | Navigate to Employees | Timeout - page load issue |
| NAV-007 | Navigate to Documents List | Timeout - page load issue |
| NAV-009 | Navigate to Data Lineage | Timeout - page load issue |
| NAV-010 | Active menu highlighting | Timeout - page load issue |
| EMP-001 | Employee list page loads | Heading text mismatch |
| EMP-002 | Employee table displays | Empty state selector issue |
| EMP-006 | Create employee form | Form field selector issue |
| CAT-002 | Category tree displays | Timeout waiting for tree |
| CAT-004 | Create category form | Label selector mismatch |
| CAT-008 | Edit category form | Navigation timeout |
| TPL-002 | Template table displays | Empty state selector issue |
| TPL-003 | Create template form | Label selector mismatch |
| TPL-005 | Create template success | Timeout on form submission |
| TPL-006 | View template details | Click action failed |
| TPL-007 | Edit template form | Navigation issue |
| DOC-002 | Upload form validation | Timeout on submit |
| DOC-003 | File selection area | Input/dropzone selector |
| DOC-007 | Document table displays | Empty state selector |
| LIN-003 | Lineage table renders | Empty state selector |
| A11Y-003 | Enter key activates | Login page selector timeout |
| A11Y-005 | Form labels associated | Login page navigation |
| A11Y-014 | Button accessible names | Button text empty |

### Root Causes

1. **Selector Issues (40%)**: Some selectors don't match actual DOM structure
2. **Timeout Issues (35%)**: Page navigation taking longer than expected
3. **Empty State Handling (15%)**: Tests not properly handling empty data scenarios
4. **Validation Messages (10%)**: Korean validation messages not matching selectors

### Recommendations

1. **Increase Timeouts**: Navigation timeout should be 60s for slow loads
2. **Update Selectors**: Use `data-testid` attributes for reliable selection
3. **Add Empty State Tests**: Handle scenarios with no data gracefully
4. **Add Test Data Setup**: Seed test data before running CRUD tests

---

## Notes

1. All tests run against `http://localhost:3000`
2. Authentication state is persisted in `e2e/.auth/user.json`
3. Tests use Korean locale for UI assertions
4. Database state should be reset before full test runs
5. Screenshots captured on failure in `playwright-report/`
