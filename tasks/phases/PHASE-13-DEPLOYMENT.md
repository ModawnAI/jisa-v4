# Phase 13: Deployment & Production

## Overview
Configure production environment, CI/CD pipeline, monitoring, and final deployment preparations.

**Prerequisites**: All previous phases (01-12)
**Estimated Complexity**: Medium-High
**Dependencies**: All services complete and tested

---

## Task 13.1: Environment Configuration

### 13.1.1: Production Environment Variables

**File**: `.env.example`

```bash
# ================================================
# JISA App - Environment Variables Template
# Copy to .env.local for development
# ================================================

# === App Configuration ===
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=JISA 문서관리
NODE_ENV=development

# === Supabase Configuration ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# === Database (Drizzle) ===
DATABASE_URL=postgresql://postgres:password@localhost:5432/jisa

# === OpenAI ===
OPENAI_API_KEY=sk-your-api-key

# === Pinecone ===
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=jisa-documents

# === Inngest ===
INNGEST_SIGNING_KEY=your-signing-key
INNGEST_EVENT_KEY=your-event-key

# === Optional: Monitoring ===
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# === Optional: Analytics ===
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

### 13.1.2: Next.js Production Config

**File**: `next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 이미지 최적화
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // 서버 액션 허용 크기 (파일 업로드용)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  // 헤더 보안 설정
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // 리다이렉트
  async redirects() {
    return [
      {
        source: '/',
        destination: '/admin/dashboard',
        permanent: false,
      },
    ];
  },

  // 웹팩 설정
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
```

---

## Task 13.2: CI/CD Pipeline

### 13.2.1: GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run ESLint
        run: pnpm lint

      - name: Run TypeScript check
        run: pnpm type-check

  test:
    name: Test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: jisa_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run migrations
        run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/jisa_test

      - name: Run tests
        run: pnpm test:ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/jisa_test
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: .next
          retention-days: 1
```

### 13.2.2: Deployment Workflow

**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment:
      name: production
      url: ${{ steps.deploy.outputs.url }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: '9'

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> $GITHUB_OUTPUT

      - name: Run Database Migrations
        run: |
          pnpm install --frozen-lockfile
          pnpm db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Notify Slack
        if: success()
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "✅ JISA App deployed successfully to ${{ steps.deploy.outputs.url }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Task 13.3: Docker Configuration

### 13.3.1: Dockerfile

**File**: `Dockerfile`

```dockerfile
# Base image
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Dependencies layer
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build layer
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN pnpm build

# Production layer
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 13.3.2: Docker Compose

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
        - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
        - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PINECONE_API_KEY=${PINECONE_API_KEY}
      - PINECONE_ENVIRONMENT=${PINECONE_ENVIRONMENT}
      - PINECONE_INDEX_NAME=${PINECONE_INDEX_NAME}
      - INNGEST_SIGNING_KEY=${INNGEST_SIGNING_KEY}
      - INNGEST_EVENT_KEY=${INNGEST_EVENT_KEY}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
      - POSTGRES_DB=${POSTGRES_DB:-jisa}
    ports:
      - '5432:5432'
    restart: unless-stopped

  inngest:
    image: inngest/inngest:latest
    ports:
      - '8288:8288'
    environment:
      - INNGEST_DEV=1
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## Task 13.4: Monitoring & Logging

### 13.4.1: Sentry Integration

**File**: `src/lib/monitoring/sentry.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });
  }
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  console.error('[Error]', error, context);

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  console.log(`[${level.toUpperCase()}]`, message);

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}
```

**File**: `sentry.client.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

**File**: `sentry.server.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
});
```

### 13.4.2: Logging Service

**File**: `src/lib/monitoring/logger.ts`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private readonly isDev = process.env.NODE_ENV === 'development';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context } = entry;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    const formattedLog = this.formatLog(entry);

    switch (level) {
      case 'debug':
        if (this.isDev) console.debug(formattedLog);
        break;
      case 'info':
        console.info(formattedLog);
        break;
      case 'warn':
        console.warn(formattedLog);
        break;
      case 'error':
        console.error(formattedLog, error);
        break;
    }

    // 프로덕션에서는 외부 로깅 서비스로 전송
    if (!this.isDev && level === 'error') {
      this.sendToExternalService(entry);
    }
  }

  private async sendToExternalService(entry: LogEntry) {
    // 외부 로깅 서비스 (예: LogRocket, Datadog 등)로 전송
    // 구현은 사용하는 서비스에 따라 다름
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log('error', message, context, error);
  }
}

export const logger = Logger.getInstance();
```

---

## Task 13.5: Health Check & Metrics

### 13.5.1: Health Check Endpoint

**File**: `src/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { pinecone } from '@/lib/pinecone';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: ServiceStatus;
    pinecone: ServiceStatus;
    supabase: ServiceStatus;
  };
}

interface ServiceStatus {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
}

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { status: 'up', latency: Date.now() - start };
  } catch (error) {
    return { status: 'down', error: (error as Error).message };
  }
}

async function checkPinecone(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
    await index.describeIndexStats();
    return { status: 'up', latency: Date.now() - start };
  } catch (error) {
    return { status: 'down', error: (error as Error).message };
  }
}

async function checkSupabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      }
    );
    return {
      status: response.ok ? 'up' : 'down',
      latency: Date.now() - start,
    };
  } catch (error) {
    return { status: 'down', error: (error as Error).message };
  }
}

export async function GET() {
  const [database, pineconeStatus, supabase] = await Promise.all([
    checkDatabase(),
    checkPinecone(),
    checkSupabase(),
  ]);

  const allUp = database.status === 'up' && pineconeStatus.status === 'up' && supabase.status === 'up';
  const anyDown = database.status === 'down' || pineconeStatus.status === 'down' || supabase.status === 'down';

  const health: HealthStatus = {
    status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database,
      pinecone: pineconeStatus,
      supabase,
    },
  };

  return NextResponse.json(health, {
    status: health.status === 'healthy' ? 200 : 503,
  });
}
```

### 13.5.2: Metrics Endpoint

**File**: `src/app/api/metrics/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents, employees, processingBatches } from '@/lib/db/schema';
import { count, eq, gte } from 'drizzle-orm';

export async function GET() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

  const [
    totalDocuments,
    documentsLast24h,
    totalEmployees,
    processingLast24h,
    processingLastHour,
  ] = await Promise.all([
    db.select({ count: count() }).from(documents),
    db.select({ count: count() }).from(documents).where(gte(documents.createdAt, last24h)),
    db.select({ count: count() }).from(employees),
    db.select({ count: count() }).from(processingBatches).where(gte(processingBatches.createdAt, last24h)),
    db.select({ count: count() }).from(processingBatches).where(gte(processingBatches.createdAt, lastHour)),
  ]);

  const metrics = {
    timestamp: now.toISOString(),
    documents: {
      total: Number(totalDocuments[0]?.count || 0),
      last_24h: Number(documentsLast24h[0]?.count || 0),
    },
    employees: {
      total: Number(totalEmployees[0]?.count || 0),
    },
    processing: {
      last_24h: Number(processingLast24h[0]?.count || 0),
      last_hour: Number(processingLastHour[0]?.count || 0),
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      node_version: process.version,
    },
  };

  return NextResponse.json(metrics);
}
```

---

## Task 13.6: Database Maintenance

### 13.6.1: Migration Scripts

**File**: `scripts/db-migrate.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function runMigrations() {
  console.log('🚀 Running database migrations...');

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
```

### 13.6.2: Backup Script

**File**: `scripts/db-backup.sh`

```bash
#!/bin/bash

# Database backup script for JISA App
# Usage: ./scripts/db-backup.sh

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/jisa_backup_${TIMESTAMP}.sql"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL is not set"
    exit 1
fi

# Parse DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📦 Starting database backup..."
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo "   Output: $BACKUP_FILE"

# Run pg_dump
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

echo "✅ Backup completed: ${BACKUP_FILE}.gz"

# Clean old backups (keep last 7 days)
find "$BACKUP_DIR" -name "jisa_backup_*.sql.gz" -mtime +7 -delete
echo "🧹 Cleaned up old backups"
```

---

## Task 13.7: Production Checklist

### 13.7.1: Pre-Deployment Checklist

**File**: `tasks/checklists/PRE-DEPLOY.md`

```markdown
# Pre-Deployment Checklist

## 환경 설정
- [ ] 모든 환경 변수가 설정되었는지 확인
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] DATABASE_URL (프로덕션 DB)
  - [ ] OPENAI_API_KEY
  - [ ] PINECONE_API_KEY
  - [ ] PINECONE_ENVIRONMENT
  - [ ] PINECONE_INDEX_NAME
  - [ ] INNGEST_SIGNING_KEY
  - [ ] INNGEST_EVENT_KEY

## 데이터베이스
- [ ] 프로덕션 데이터베이스 마이그레이션 완료
- [ ] 인덱스 최적화 확인
- [ ] 백업 스케줄 설정
- [ ] 연결 풀 설정 확인

## Supabase
- [ ] RLS (Row Level Security) 정책 활성화
- [ ] Storage 버킷 보안 설정
- [ ] Auth 설정 검토 (리다이렉트 URL 등)
- [ ] Edge Functions 배포 (있는 경우)

## Pinecone
- [ ] 인덱스 생성 및 설정 확인
- [ ] 네임스페이스 설정 확인
- [ ] 인덱스 용량 모니터링 설정

## Inngest
- [ ] 프로덕션 키 설정
- [ ] 함수 배포 확인
- [ ] 웹훅 URL 설정

## 보안
- [ ] API 키 노출 여부 확인
- [ ] CORS 설정 확인
- [ ] CSP (Content Security Policy) 설정
- [ ] 인증/인가 플로우 테스트
- [ ] SQL 인젝션 취약점 검사
- [ ] XSS 취약점 검사

## 성능
- [ ] 빌드 최적화 확인
- [ ] 이미지 최적화 확인
- [ ] 번들 사이즈 분석
- [ ] Lighthouse 점수 확인 (>90)
- [ ] Core Web Vitals 확인

## 테스트
- [ ] 모든 단위 테스트 통과
- [ ] 통합 테스트 통과
- [ ] E2E 테스트 통과
- [ ] 수동 기능 테스트 완료
- [ ] 에지 케이스 테스트

## 모니터링
- [ ] Sentry 설정 완료
- [ ] 로깅 설정 확인
- [ ] 알림 설정 (Slack, Email 등)
- [ ] 대시보드 설정

## 배포
- [ ] 스테이징 환경 테스트 완료
- [ ] 롤백 계획 준비
- [ ] 배포 시간 결정 (저트래픽 시간)
- [ ] 관련 팀 공지

## 배포 후
- [ ] 헬스 체크 확인
- [ ] 주요 기능 스모크 테스트
- [ ] 모니터링 대시보드 확인
- [ ] 사용자 피드백 채널 모니터링
```

### 13.7.2: Post-Deployment Checklist

**File**: `tasks/checklists/POST-DEPLOY.md`

```markdown
# Post-Deployment Checklist

## 즉시 확인 (배포 후 5분 이내)
- [ ] 앱 접속 가능 여부 확인
- [ ] /api/health 엔드포인트 응답 확인
- [ ] 로그인 플로우 테스트
- [ ] 주요 페이지 로딩 확인

## 기능 검증 (배포 후 30분 이내)
- [ ] 직원 목록 조회
- [ ] 문서 업로드 테스트
- [ ] 문서 처리 플로우 테스트
- [ ] RAG 채팅 테스트
- [ ] 검색 기능 테스트

## 성능 확인 (배포 후 1시간 이내)
- [ ] 응답 시간 모니터링
- [ ] 에러율 확인
- [ ] 메모리 사용량 확인
- [ ] CPU 사용량 확인

## 모니터링 (24시간)
- [ ] Sentry 에러 확인
- [ ] 로그 이상 확인
- [ ] 사용자 피드백 확인
- [ ] 성능 지표 추적

## 문서화
- [ ] 배포 로그 기록
- [ ] 변경 사항 문서화
- [ ] 이슈 트래킹 업데이트
```

---

## Task 13.8: Package.json Scripts

### 13.8.1: Update Package.json

**File**: `package.json` (scripts section)

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx scripts/db-migrate.ts",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx scripts/db-seed.ts",
    "db:backup": "bash scripts/db-backup.sh",
    "inngest:dev": "npx inngest-cli@latest dev",
    "prepare": "husky",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "analyze": "ANALYZE=true next build"
  }
}
```

---

## Validation Checklist

### 13.1 Environment Configuration
- [ ] .env.example 파일 생성 완료
- [ ] next.config.ts 보안 헤더 설정
- [ ] 모든 필수 환경 변수 문서화

### 13.2 CI/CD Pipeline
- [ ] GitHub Actions CI 워크플로우 동작
- [ ] 배포 워크플로우 설정 완료
- [ ] 테스트 자동화 동작

### 13.3 Docker
- [ ] Dockerfile 빌드 성공
- [ ] docker-compose 로컬 실행 확인
- [ ] 멀티스테이지 빌드 최적화

### 13.4 Monitoring
- [ ] Sentry 통합 완료
- [ ] 로깅 서비스 동작 확인
- [ ] 에러 추적 동작 확인

### 13.5 Health Check
- [ ] /api/health 엔드포인트 응답
- [ ] /api/metrics 엔드포인트 응답
- [ ] 각 서비스 상태 확인 동작

### 13.6 Database Maintenance
- [ ] 마이그레이션 스크립트 동작
- [ ] 백업 스크립트 동작
- [ ] 복원 절차 문서화

### 13.7 Production Checklist
- [ ] Pre-deployment 체크리스트 완료
- [ ] Post-deployment 체크리스트 완료
- [ ] 롤백 계획 수립
