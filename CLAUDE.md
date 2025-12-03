# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ContractorHub** (계약자허브) - A KakaoTalk chatbot-based contractor compensation calculation and onboarding system with RAG-powered document querying.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS v4 + Radix UI + shadcn/ui |
| Icons | Phosphor Icons (NOT lucide) |
| Font | Noto Sans KR |
| Database | Supabase PostgreSQL + Drizzle ORM |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Vector DB | Pinecone (3072 dimensions) |
| Embeddings | OpenAI text-embedding-3-large |
| LLM | Google Gemini (`@google/genai` - NOT `@google/generative-ai`) |
| Background Jobs | Inngest |
| Chat | KakaoTalk webhook API v2.0 |

## Common Commands

```bash
# Development
npm run dev               # Start dev server (Turbopack)

# Database
npm run db:generate       # Generate migration from schema changes
npm run db:migrate        # Apply migrations
npm run db:push           # Push schema directly (dev only)
npm run db:studio         # Open Drizzle Studio
npm run db:seed           # Seed database

# Quality
npm run lint              # Run ESLint
npm run typecheck         # TypeScript type check

# Build
npm run build             # Production build

# Tests
npm run test              # Run Vitest
npm run test:ui           # Vitest with UI
npm run test:coverage     # With coverage report
```

## Architecture

### Directory Structure

```
app/                      # Next.js App Router
├── (auth)/               # Auth routes (login, signup)
├── admin/                # Admin dashboard pages
│   ├── employees/        # 직원 관리
│   ├── categories/       # 카테고리 관리
│   ├── templates/        # 템플릿 관리
│   ├── documents/        # 문서 관리
│   └── analytics/        # 분석 대시보드
├── api/                  # API routes

components/
├── ui/                   # shadcn/ui components
├── layout/               # AdminLayout, Sidebar, Header
├── shared/               # DataTable, EmptyState, StatusBadge
└── [domain]/             # Domain-specific (employees/, documents/)

lib/
├── db/                   # Drizzle client + schema
│   └── schema/           # Table definitions
├── services/             # Business logic layer
├── pinecone/             # Vector DB client + search
├── inngest/              # Background job definitions
├── ai/                   # Gemini + OpenAI + RAG
└── utils/                # Utilities (cn, format, validation)

hooks/
├── api/                  # React Query hooks (use-employees.ts)
└── form/                 # Form logic hooks
```

### Key Architectural Patterns

**Dual Namespace Strategy (Pinecone)**
- Company documents → `org_{organization_id}` namespace
- Employee-specific → `emp_{employee_id}` namespace
- Clearance levels: `basic`, `standard`, `advanced`

**Document Processing Flow**
1. Upload → Supabase Storage
2. Inngest event triggers processing
3. Template-based Excel parsing
4. Chunking + OpenAI embedding (3072 dim)
5. Upsert to Pinecone with metadata
6. Data lineage tracking

**API Response Format**
```typescript
// Success
{ success: true, data: T, meta?: { page, pageSize, total } }
// Error
{ success: false, error: { code: string, message: string } }
```

## Coding Conventions

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case.tsx | `employee-form.tsx` |
| Pages | page.tsx | `app/admin/employees/page.tsx` |
| API Routes | route.ts | `app/api/employees/route.ts` |
| Services | kebab-case.service.ts | `employee.service.ts` |
| Hooks | use-feature.ts | `use-employees.ts` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE` |

### Import Order

1. React/Next.js
2. External libraries (zod, react-hook-form)
3. UI components (@/components/ui)
4. Domain components (@/components/employees)
5. Icons (@phosphor-icons/react)
6. Services (@/lib/services)
7. Utils (@/lib/utils)
8. Constants (@/lib/constants)
9. Types (always last)

### TypeScript

- Use `const` objects instead of enums
- Zod for runtime validation
- Infer types from Drizzle schema: `typeof employees.$inferSelect`

### Components

- Server Components by default
- `'use client'` only for interactivity
- Forms: react-hook-form + zod resolver
- Icons: Phosphor Icons (`size={16}` for buttons, `size={20}` for nav)

## Supabase Project

- **Project ID**: `yuuqflpiojcocchjrpeo`
- **Region**: `ap-northeast-2`

## Database Schema

Core tables: `employees`, `document_categories`, `document_types`, `document_templates`, `template_column_mappings`, `template_versions`, `documents`, `knowledge_chunks`, `processing_batches`, `data_lineage`, `document_conflicts`, `chat_sessions`, `chat_messages`, `users`

Key enums:
- `clearance_level`: basic | standard | advanced
- `processing_mode`: company | employee_split | employee_aggregate
- `document_status`: pending | processing | completed | failed | partial
- `conflict_status`: detected | reviewing | resolved_keep_existing | resolved_keep_new | resolved_merged | dismissed
- `conflict_type`: duplicate_content | version_mismatch | category_mismatch | metadata_conflict | employee_mismatch
- `user_role`: super_admin | org_admin | manager | employee | viewer

## Error Codes

API errors follow pattern: `DOMAIN_SPECIFIC_ERROR`
- Auth: `UNAUTHORIZED`, `FORBIDDEN`, `TOKEN_EXPIRED`
- Validation: `VALIDATION_ERROR`, `MISSING_FIELD`
- Resource: `NOT_FOUND`, `ALREADY_EXISTS`, `CONFLICT`
- Processing: `PROCESSING_FAILED`, `EMBEDDING_FAILED`

All error messages are in Korean.

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (Drizzle connection)
- `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`
- `OPENAI_API_KEY` (embeddings)
- `GEMINI_API_KEY` (Gemini LLM)
- `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`

## Important Rules

### Google Gemini Integration
- **ALWAYS use `@google/genai`** package (NOT `@google/generative-ai`)
- Use `GoogleGenAI` class from `@google/genai`
- API key env var: `GEMINI_API_KEY`
- Preferred model: `gemini-2.0-flash`

## Reference Documentation

Detailed implementation specs in `tasks/`:
- `tasks/standards/CONVENTIONS.md` - Full coding conventions
- `tasks/standards/UI-PATTERNS.md` - UI/UX patterns and components
- `tasks/reference/DATABASE-SCHEMA.md` - Complete Drizzle schema
- `tasks/reference/API-PATTERNS.md` - API route patterns
- `tasks/reference/FILE-STRUCTURE.md` - Full directory structure
- asdf@asdf.com and asdfasdfasdf are the credentials for login