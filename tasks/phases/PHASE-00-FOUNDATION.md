# Phase 0: Foundation (프로젝트 기반)

> 예상 기간: 1-2일
> 우선순위: [P0] 크리티컬

---

## 목표

새 프로젝트 초기화 및 개발 환경 구축

---

## 태스크 목록

### 0.1 프로젝트 초기화 [P0]

#### 0.1.1 Next.js 프로젝트 생성
```bash
# 새 디렉토리에서 시작 (또는 기존 jisa-app 정리)
pnpm create next-app@latest contractor-hub --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 또는 기존 프로젝트 클린업
rm -rf node_modules .next
pnpm install
```

**완료 조건:**
- [ ] Next.js 16 + React 19 설치 확인
- [ ] TypeScript 설정 완료
- [ ] Tailwind CSS v4 설정 완료
- [ ] App Router 구조 확인

#### 0.1.2 의존성 설치

```bash
# 핵심 의존성
pnpm add @supabase/supabase-js drizzle-orm postgres zod react-hook-form @hookform/resolvers

# UI 의존성
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-alert-dialog @radix-ui/react-popover @radix-ui/react-label @radix-ui/react-slot
pnpm add class-variance-authority clsx tailwind-merge tailwindcss-animate
pnpm add @phosphor-icons/react

# 유틸리티
pnpm add date-fns xlsx uuid nanoid

# Inngest
pnpm add inngest

# Pinecone & AI
pnpm add @pinecone-database/pinecone openai @google/generative-ai

# 개발 의존성
pnpm add -D drizzle-kit @types/uuid prettier eslint-config-prettier

# 테스트
pnpm add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @vitejs/plugin-react msw playwright @faker-js/faker
```

**완료 조건:**
- [ ] 모든 패키지 설치 완료
- [ ] 패키지 버전 충돌 없음
- [ ] `pnpm build` 성공

#### 0.1.3 shadcn/ui 초기화

```bash
# shadcn/ui 초기화
pnpm dlx shadcn@latest init

# 필수 컴포넌트 설치
pnpm dlx shadcn@latest add button input label form select textarea checkbox radio-group switch
pnpm dlx shadcn@latest add card dialog alert-dialog sheet popover dropdown-menu tooltip
pnpm dlx shadcn@latest add table tabs skeleton badge separator scroll-area
pnpm dlx shadcn@latest add toast sonner
```

**완료 조건:**
- [ ] `components.json` 생성 확인
- [ ] `components/ui/` 디렉토리 생성 확인
- [ ] 컴포넌트 임포트 테스트

---

### 0.2 폴더 구조 생성 [P0]

```bash
# 디렉토리 구조 생성
mkdir -p app/{admin,api,\(auth\)}
mkdir -p app/admin/{employees,categories,templates,documents,analytics}
mkdir -p app/api/{employees,categories,templates,documents,rag,kakao,inngest}

mkdir -p components/{ui,layout,shared,employees,categories,templates,documents}

mkdir -p lib/{db,services,pinecone,inngest,kakao,utils,constants,types,errors}
mkdir -p lib/db/{schema,migrations,seeds}
mkdir -p lib/inngest/functions

mkdir -p hooks
mkdir -p tests/{unit,integration,e2e}
mkdir -p public

# 핵심 파일 생성
touch lib/db/index.ts
touch lib/db/schema/index.ts
touch lib/utils/index.ts
touch lib/constants/index.ts
touch lib/types/index.ts
touch middleware.ts
```

**완료 조건:**
- [ ] 전체 디렉토리 구조 생성
- [ ] 핵심 파일 생성
- [ ] IDE에서 구조 확인

---

### 0.3 환경 변수 설정 [P0]

#### 0.3.1 `.env.local` 생성

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ysrudwzwnzxrrwjtpuoh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:password@db.ysrudwzwnzxrrwjtpuoh.supabase.co:5432/postgres

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=contractor-hub

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# KakaoTalk (추후 설정)
KAKAO_CHANNEL_ID=
KAKAO_API_KEY=
KAKAO_WEBHOOK_VERIFY_TOKEN=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# WebSocket (Fly.io - 추후 설정)
FLY_WEBSOCKET_URL=

# Sentry
SENTRY_DSN=

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

#### 0.3.2 환경 변수 타입 정의

```typescript
// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    DATABASE_URL: string;

    // Pinecone
    PINECONE_API_KEY: string;
    PINECONE_INDEX_NAME: string;

    // OpenAI
    OPENAI_API_KEY: string;

    // Google
    GOOGLE_GENERATIVE_AI_API_KEY: string;

    // Kakao
    KAKAO_CHANNEL_ID?: string;
    KAKAO_API_KEY?: string;
    KAKAO_WEBHOOK_VERIFY_TOKEN?: string;

    // Inngest
    INNGEST_EVENT_KEY?: string;
    INNGEST_SIGNING_KEY?: string;

    // Fly.io
    FLY_WEBSOCKET_URL?: string;

    // Sentry
    SENTRY_DSN?: string;

    // PostHog
    NEXT_PUBLIC_POSTHOG_KEY?: string;
    NEXT_PUBLIC_POSTHOG_HOST?: string;
  }
}
```

**완료 조건:**
- [ ] `.env.local` 생성 및 값 입력
- [ ] `.env.local.example` 생성 (값 없이)
- [ ] 환경 변수 타입 정의
- [ ] `.gitignore`에 `.env.local` 포함 확인

---

### 0.4 기본 설정 파일 [P1]

#### 0.4.1 Tailwind 설정 업데이트

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
        success: '#00b87a',
        warning: '#f7b928',
        info: '#1e9df1',
        chart: {
          '1': 'var(--chart-1)',
          '2': 'var(--chart-2)',
          '3': 'var(--chart-3)',
          '4': 'var(--chart-4)',
          '5': 'var(--chart-5)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        sans: ['var(--font-noto-sans-kr)', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
        mono: ['Menlo', 'monospace'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
```

#### 0.4.2 globals.css 업데이트

```css
/* app/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: #ffffff;
    --foreground: #0f1419;
    --card: #f7f8f8;
    --card-foreground: #0f1419;
    --popover: #ffffff;
    --popover-foreground: #0f1419;
    --primary: #1e9df1;
    --primary-foreground: #ffffff;
    --secondary: #0f1419;
    --secondary-foreground: #ffffff;
    --muted: #e5e5e6;
    --muted-foreground: #6b7280;
    --accent: #e3ecf6;
    --accent-foreground: #1e9df1;
    --destructive: #f4212e;
    --destructive-foreground: #ffffff;
    --border: #e1eaef;
    --input: #f7f9fa;
    --ring: #1da1f2;

    --sidebar: #f7f8f8;
    --sidebar-foreground: #0f1419;
    --sidebar-primary: #1e9df1;
    --sidebar-primary-foreground: #ffffff;
    --sidebar-accent: #e3ecf6;
    --sidebar-accent-foreground: #1e9df1;
    --sidebar-border: #e1e8ed;
    --sidebar-ring: #1da1f2;

    --chart-1: #1e9df1;
    --chart-2: #00b87a;
    --chart-3: #f7b928;
    --chart-4: #17bf63;
    --chart-5: #e0245e;

    --font-sans: 'Noto Sans KR', system-ui, sans-serif;
    --radius: 0.75rem;
    --radius-sm: 0.5rem;
    --radius-md: 0.625rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
  }

  .dark {
    --background: #000000;
    --foreground: #e7e9ea;
    --card: #17181c;
    --card-foreground: #d9d9d9;
    --popover: #000000;
    --popover-foreground: #e7e9ea;
    --primary: #1c9cf0;
    --primary-foreground: #ffffff;
    --secondary: #f0f3f4;
    --secondary-foreground: #0f1419;
    --muted: #181818;
    --muted-foreground: #72767a;
    --accent: #061622;
    --accent-foreground: #1c9cf0;
    --destructive: #f4212e;
    --destructive-foreground: #ffffff;
    --border: #242628;
    --input: #22303c;
    --ring: #1da1f2;

    --sidebar: #17181c;
    --sidebar-foreground: #d9d9d9;
    --sidebar-primary: #1da1f2;
    --sidebar-primary-foreground: #ffffff;
    --sidebar-accent: #061622;
    --sidebar-accent-foreground: #1c9cf0;
    --sidebar-border: #38444d;
    --sidebar-ring: #1da1f2;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-semibold tracking-tight;
  }
}
```

#### 0.4.3 components.json 업데이트

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "phosphor"
}
```

**완료 조건:**
- [ ] Tailwind 설정 완료
- [ ] CSS 변수 정의 완료
- [ ] Noto Sans KR 폰트 로드 확인
- [ ] 빌드 성공

---

### 0.5 유틸리티 함수 [P1]

#### 0.5.1 cn 유틸리티

```typescript
// lib/utils/index.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

#### 0.5.2 날짜 유틸리티

```typescript
// lib/utils/date.ts
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

export function formatDate(date: Date | string, formatStr = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: ko });
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'yyyy-MM-dd HH:mm');
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: ko });
}

export function formatPeriod(period: string): string {
  // "2025-02" -> "2025년 2월"
  const [year, month] = period.split('-');
  return `${year}년 ${parseInt(month)}월`;
}
```

#### 0.5.3 통화 유틸리티

```typescript
// lib/utils/currency.ts
const formatter = new Intl.NumberFormat('ko-KR');

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0원';
  return `${formatter.format(Math.round(value))}원`;
}

export function parseCurrency(value: string): number {
  if (!value) return 0;
  return parseInt(value.replace(/[^0-9-]/g, ''), 10) || 0;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
```

**완료 조건:**
- [ ] cn 유틸리티 작동 확인
- [ ] 날짜 유틸리티 테스트
- [ ] 통화 유틸리티 테스트

---

### 0.6 상수 정의 [P1]

#### 0.6.1 메인 상수 파일

```typescript
// lib/constants/index.ts

// === 권한 레벨 ===
export const CLEARANCE_LEVELS = {
  BASIC: 'basic',
  STANDARD: 'standard',
  ADVANCED: 'advanced',
} as const;

export type ClearanceLevel = typeof CLEARANCE_LEVELS[keyof typeof CLEARANCE_LEVELS];

export const CLEARANCE_LEVEL_CONFIG = {
  basic: {
    label: '기본',
    numeric: 1,
    namespaces: ['company_shared'],
    color: 'gray',
  },
  standard: {
    label: '표준',
    numeric: 2,
    namespaces: ['company_shared', 'company_standard'],
    color: 'blue',
  },
  advanced: {
    label: '고급',
    numeric: 3,
    namespaces: ['company_shared', 'company_standard', 'company_advanced'],
    color: 'purple',
  },
} as const;

// === 직원 상태 ===
export const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
} as const;

export type EmployeeStatus = typeof EMPLOYEE_STATUS[keyof typeof EMPLOYEE_STATUS];

// === 문서 처리 모드 ===
export const PROCESSING_MODES = {
  COMPANY: 'company',
  EMPLOYEE_SPLIT: 'employee_split',
  EMPLOYEE_AGGREGATE: 'employee_aggregate',
} as const;

export type ProcessingMode = typeof PROCESSING_MODES[keyof typeof PROCESSING_MODES];

// === 처리 상태 ===
export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back',
} as const;

export type ProcessingStatus = typeof PROCESSING_STATUS[keyof typeof PROCESSING_STATUS];

// === 파일 타입 ===
export const FILE_TYPES = {
  EXCEL: 'excel',
  CSV: 'csv',
  PDF: 'pdf',
  WORD: 'word',
} as const;

export type FileType = typeof FILE_TYPES[keyof typeof FILE_TYPES];

// === 네임스페이스 타입 ===
export const NAMESPACE_TYPES = {
  COMPANY: 'company',
  EMPLOYEE: 'employee',
} as const;

export type NamespaceType = typeof NAMESPACE_TYPES[keyof typeof NAMESPACE_TYPES];

// === 충돌 해결 방법 ===
export const CONFLICT_RESOLUTIONS = {
  REPLACE: 'replace',
  MERGE: 'merge',
  SKIP: 'skip',
} as const;

export type ConflictResolution = typeof CONFLICT_RESOLUTIONS[keyof typeof CONFLICT_RESOLUTIONS];

// === 제한 값 ===
export const LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_UPLOAD_FILES: 10,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  EMBEDDING_DIMENSIONS: 3072,
  MAX_TOKENS_CONTEXT: 8000,
} as const;
```

#### 0.6.2 라우트 상수

```typescript
// lib/constants/routes.ts

export const ROUTES = {
  // 인증
  LOGIN: '/login',
  LOGOUT: '/logout',

  // 관리자
  ADMIN: '/admin',
  ADMIN_EMPLOYEES: '/admin/employees',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_TEMPLATES: '/admin/templates',
  ADMIN_DOCUMENTS: '/admin/documents',
  ADMIN_ANALYTICS: '/admin/analytics',

  // API
  API_EMPLOYEES: '/api/employees',
  API_CATEGORIES: '/api/categories',
  API_TEMPLATES: '/api/templates',
  API_DOCUMENTS: '/api/documents',
  API_RAG: '/api/rag',
  API_KAKAO: '/api/kakao',
  API_INNGEST: '/api/inngest',
} as const;
```

**완료 조건:**
- [ ] 모든 상수 정의 완료
- [ ] 타입 익스포트 확인

---

### 0.7 기본 레이아웃 [P1]

#### 0.7.1 루트 레이아웃

```typescript
// app/layout.tsx
import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ContractorHub 관리자',
  description: '계약자 보상 및 온보딩 관리 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

**완료 조건:**
- [ ] 루트 레이아웃 설정
- [ ] 폰트 로드 확인
- [ ] Toaster 작동 확인

---

### 0.8 개발 환경 검증 [P0]

```bash
# 개발 서버 실행
pnpm dev

# 빌드 테스트
pnpm build

# 린트 검사
pnpm lint

# 타입 검사
pnpm tsc --noEmit
```

**완료 조건:**
- [ ] 개발 서버 정상 시작 (http://localhost:3000)
- [ ] 빌드 성공
- [ ] 린트 에러 없음
- [ ] 타입 에러 없음

---

## 체크리스트

### 필수 완료 항목
- [ ] Next.js 16 + React 19 프로젝트 초기화
- [ ] 모든 의존성 설치
- [ ] shadcn/ui 설정 및 컴포넌트 설치
- [ ] 폴더 구조 생성
- [ ] 환경 변수 설정
- [ ] Tailwind + CSS 변수 설정
- [ ] 유틸리티 함수 생성
- [ ] 상수 정의
- [ ] 개발 서버 정상 작동 확인

### 품질 확인
- [ ] `pnpm build` 성공
- [ ] `pnpm lint` 에러 없음
- [ ] TypeScript 에러 없음
- [ ] 콘솔 에러 없음

---

## 다음 단계

Phase 0 완료 후 → **Phase 1: Database** 진행
