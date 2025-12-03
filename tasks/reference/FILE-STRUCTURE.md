# File Structure Reference

Complete project directory structure for JISA App.

---

## Root Directory Structure

```
jisa-app/
├── app/                          # Next.js App Router
├── components/                   # React components
├── lib/                          # Utilities and services
├── db/                           # Database (Drizzle ORM)
├── types/                        # TypeScript type definitions
├── hooks/                        # Custom React hooks
├── stores/                       # Zustand state stores
├── public/                       # Static assets
├── scripts/                      # Utility scripts
├── tasks/                        # Task documentation
├── .env.local                    # Environment variables
├── .env.example                  # Environment template
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── drizzle.config.ts             # Drizzle ORM configuration
├── components.json               # shadcn/ui configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

---

## App Router Structure

```
app/
├── layout.tsx                    # Root layout (providers, fonts)
├── page.tsx                      # Home page (redirect to /admin)
├── globals.css                   # Global styles (CSS variables)
├── not-found.tsx                 # 404 page
├── error.tsx                     # Error boundary
├── loading.tsx                   # Root loading state
│
├── (auth)/                       # Auth group (no shared layout)
│   ├── layout.tsx                # Auth layout (centered, minimal)
│   ├── login/
│   │   └── page.tsx              # 로그인 page
│   ├── signup/
│   │   └── page.tsx              # 회원가입 page
│   ├── forgot-password/
│   │   └── page.tsx              # 비밀번호 찾기 page
│   └── auth/
│       └── callback/
│           └── route.ts          # OAuth callback handler
│
├── admin/                        # Admin dashboard
│   ├── layout.tsx                # Admin layout (sidebar, header)
│   ├── page.tsx                  # Dashboard home
│   ├── loading.tsx               # Dashboard loading
│   │
│   ├── employees/                # 직원 관리
│   │   ├── page.tsx              # Employee list
│   │   ├── loading.tsx           # List loading
│   │   ├── new/
│   │   │   └── page.tsx          # Create employee
│   │   └── [id]/
│   │       ├── page.tsx          # Employee detail
│   │       └── edit/
│   │           └── page.tsx      # Edit employee
│   │
│   ├── documents/                # 문서 관리
│   │   ├── page.tsx              # Document list
│   │   ├── loading.tsx
│   │   ├── upload/
│   │   │   └── page.tsx          # Upload documents
│   │   └── [id]/
│   │       └── page.tsx          # Document detail
│   │
│   ├── categories/               # 카테고리 관리
│   │   ├── page.tsx              # Category list
│   │   └── loading.tsx
│   │
│   ├── templates/                # 템플릿 관리
│   │   ├── page.tsx              # Template list
│   │   ├── new/
│   │   │   └── page.tsx          # Create template
│   │   └── [id]/
│   │       └── page.tsx          # Template detail
│   │
│   ├── knowledge/                # 지식베이스
│   │   ├── page.tsx              # Knowledge overview
│   │   └── loading.tsx
│   │
│   ├── chat/                     # 채팅 테스트
│   │   └── page.tsx              # Chat interface
│   │
│   └── settings/                 # 설정
│       ├── page.tsx              # General settings
│       ├── organization/
│       │   └── page.tsx          # Organization settings
│       └── profile/
│           └── page.tsx          # User profile
│
├── employee/                     # Employee portal
│   ├── layout.tsx                # Employee layout
│   ├── page.tsx                  # Employee dashboard
│   └── chat/
│       └── page.tsx              # Employee chat
│
└── api/                          # API routes
    ├── health/
    │   └── route.ts              # Health check endpoint
    │
    ├── auth/
    │   ├── login/
    │   │   └── route.ts          # Login endpoint
    │   ├── logout/
    │   │   └── route.ts          # Logout endpoint
    │   └── me/
    │       └── route.ts          # Current user
    │
    ├── employees/
    │   ├── route.ts              # List/Create employees
    │   └── [id]/
    │       └── route.ts          # Get/Update/Delete employee
    │
    ├── documents/
    │   ├── route.ts              # List/Upload documents
    │   ├── [id]/
    │   │   └── route.ts          # Document operations
    │   └── upload/
    │       └── route.ts          # File upload handler
    │
    ├── categories/
    │   ├── route.ts              # List/Create categories
    │   └── [id]/
    │       └── route.ts          # Category operations
    │
    ├── templates/
    │   ├── route.ts              # List/Create templates
    │   └── [id]/
    │       └── route.ts          # Template operations
    │
    ├── knowledge/
    │   ├── route.ts              # Knowledge stats
    │   ├── search/
    │   │   └── route.ts          # Vector search
    │   └── sync/
    │       └── route.ts          # Sync to Pinecone
    │
    ├── chat/
    │   └── route.ts              # Chat endpoint (streaming)
    │
    ├── processing/
    │   ├── route.ts              # Processing batches
    │   └── [id]/
    │       ├── route.ts          # Batch operations
    │       └── rollback/
    │           └── route.ts      # Rollback batch
    │
    └── inngest/
        └── route.ts              # Inngest webhook handler
```

---

## Components Structure

```
components/
├── ui/                           # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── select.tsx
│   ├── sheet.tsx
│   ├── skeleton.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── textarea.tsx
│   ├── toast.tsx
│   ├── toaster.tsx
│   └── ... (all shadcn components)
│
├── layout/                       # Layout components
│   ├── admin-layout.tsx          # Admin dashboard layout
│   ├── auth-layout.tsx           # Authentication layout
│   ├── sidebar.tsx               # Admin sidebar navigation
│   ├── header.tsx                # Top header bar
│   ├── mobile-nav.tsx            # Mobile navigation
│   └── breadcrumbs.tsx           # Breadcrumb navigation
│
├── shared/                       # Shared/common components
│   ├── page-header.tsx           # Page title + actions
│   ├── empty-state.tsx           # Empty state placeholder
│   ├── loading-state.tsx         # Loading spinner/skeleton
│   ├── error-state.tsx           # Error display
│   ├── confirm-dialog.tsx        # Confirmation modal
│   ├── search-input.tsx          # Search with debounce
│   ├── pagination.tsx            # Table pagination
│   ├── stats-card.tsx            # Dashboard stat card
│   ├── file-upload.tsx           # File upload dropzone
│   ├── data-table.tsx            # Generic data table
│   └── badge-status.tsx          # Status badge
│
├── employees/                    # Employee-specific components
│   ├── employee-form.tsx         # Create/Edit form
│   ├── employee-card.tsx         # Employee summary card
│   ├── employee-list.tsx         # Employee table/list
│   ├── employee-detail.tsx       # Employee detail view
│   └── employee-actions.tsx      # Action buttons
│
├── documents/                    # Document-specific components
│   ├── document-upload.tsx       # Multi-file upload
│   ├── document-list.tsx         # Document table
│   ├── document-card.tsx         # Document summary
│   ├── document-preview.tsx      # Document preview modal
│   └── processing-status.tsx     # Processing progress
│
├── categories/                   # Category-specific components
│   ├── category-form.tsx         # Create/Edit form
│   ├── category-list.tsx         # Category table
│   ├── category-tree.tsx         # Hierarchical view
│   └── category-select.tsx       # Category dropdown
│
├── templates/                    # Template-specific components
│   ├── template-form.tsx         # Template editor
│   ├── template-list.tsx         # Template table
│   ├── template-preview.tsx      # Template preview
│   ├── column-mapper.tsx         # Excel column mapping
│   └── field-config.tsx          # Field configuration
│
├── knowledge/                    # Knowledge-specific components
│   ├── knowledge-stats.tsx       # Vector stats dashboard
│   ├── chunk-viewer.tsx          # View chunks
│   ├── namespace-list.tsx        # Namespace overview
│   └── sync-controls.tsx         # Sync actions
│
├── chat/                         # Chat components
│   ├── chat-container.tsx        # Main chat container
│   ├── chat-input.tsx            # Message input
│   ├── chat-message.tsx          # Message bubble
│   ├── chat-history.tsx          # Conversation history
│   ├── source-citation.tsx       # Source references
│   └── typing-indicator.tsx      # Typing animation
│
└── providers/                    # Context providers
    ├── theme-provider.tsx        # Dark/light mode
    ├── auth-provider.tsx         # Authentication context
    ├── query-provider.tsx        # React Query provider
    └── toast-provider.tsx        # Toast notifications
```

---

## Library Structure

```
lib/
├── supabase/                     # Supabase clients
│   ├── client.ts                 # Browser client
│   ├── server.ts                 # Server client
│   ├── middleware.ts             # Auth middleware
│   └── admin.ts                  # Service role client
│
├── pinecone/                     # Pinecone client
│   ├── client.ts                 # Pinecone instance
│   ├── embeddings.ts             # OpenAI embeddings
│   ├── namespaces.ts             # Namespace helpers
│   └── search.ts                 # Vector search
│
├── inngest/                      # Background jobs
│   ├── client.ts                 # Inngest client
│   └── functions/                # Job definitions
│       ├── process-document.ts   # Document processing
│       ├── sync-knowledge.ts     # Vector sync
│       ├── generate-embeddings.ts # Embedding generation
│       └── cleanup-orphans.ts    # Cleanup job
│
├── ai/                           # AI services
│   ├── gemini.ts                 # Google Gemini client
│   ├── openai.ts                 # OpenAI client
│   ├── prompts/                  # Prompt templates
│   │   ├── document-analysis.ts
│   │   ├── chat-system.ts
│   │   └── chunk-extraction.ts
│   └── rag/                      # RAG implementation
│       ├── retriever.ts          # Context retrieval
│       ├── generator.ts          # Response generation
│       └── reranker.ts           # Result reranking
│
├── processing/                   # Document processing
│   ├── excel-processor.ts        # Excel parsing
│   ├── pdf-processor.ts          # PDF parsing
│   ├── text-processor.ts         # Text extraction
│   ├── chunker.ts                # Text chunking
│   └── template-engine.ts        # Template application
│
├── services/                     # Business logic
│   ├── employee-service.ts       # Employee operations
│   ├── document-service.ts       # Document operations
│   ├── category-service.ts       # Category operations
│   ├── template-service.ts       # Template operations
│   ├── knowledge-service.ts      # Knowledge operations
│   ├── chat-service.ts           # Chat operations
│   └── processing-service.ts     # Batch processing
│
├── utils/                        # Utility functions
│   ├── format.ts                 # Number, date formatting
│   ├── validation.ts             # Validation helpers
│   ├── file.ts                   # File utilities
│   ├── string.ts                 # String utilities
│   └── error.ts                  # Error handling
│
├── api/                          # API utilities
│   ├── client.ts                 # Fetch wrapper
│   ├── response.ts               # Response helpers
│   └── errors.ts                 # Error codes
│
└── constants/                    # Constants
    ├── routes.ts                 # Route paths
    ├── messages.ts               # Korean messages
    └── config.ts                 # App configuration
```

---

## Database Structure

```
db/
├── index.ts                      # Drizzle client export
├── schema/                       # Schema definitions
│   ├── index.ts                  # Schema barrel export
│   ├── employees.ts              # employees table
│   ├── categories.ts             # categories table
│   ├── documents.ts              # documents table
│   ├── templates.ts              # templates table
│   ├── knowledge-chunks.ts       # knowledge_chunks table
│   ├── processing-batches.ts     # processing_batches table
│   ├── chat-sessions.ts          # chat_sessions table
│   ├── chat-messages.ts          # chat_messages table
│   └── enums.ts                  # Shared enums
├── relations.ts                  # Table relations
├── queries/                      # Query helpers
│   ├── employees.ts
│   ├── documents.ts
│   └── ...
└── migrations/                   # Generated migrations
    ├── 0000_initial.sql
    ├── 0001_add_templates.sql
    └── meta/
        └── _journal.json
```

---

## Types Structure

```
types/
├── index.ts                      # Type barrel export
├── database.ts                   # Drizzle inferred types
├── api.ts                        # API request/response types
├── auth.ts                       # Auth-related types
├── employee.ts                   # Employee types
├── document.ts                   # Document types
├── category.ts                   # Category types
├── template.ts                   # Template types
├── knowledge.ts                  # Knowledge/RAG types
├── chat.ts                       # Chat types
└── processing.ts                 # Processing types
```

---

## Hooks Structure

```
hooks/
├── use-auth.ts                   # Authentication hook
├── use-debounce.ts               # Debounce hook
├── use-local-storage.ts          # Local storage hook
├── use-media-query.ts            # Responsive hook
├── use-toast.ts                  # Toast notifications
│
├── api/                          # API hooks (React Query)
│   ├── use-employees.ts          # Employee queries/mutations
│   ├── use-documents.ts          # Document queries/mutations
│   ├── use-categories.ts         # Category queries/mutations
│   ├── use-templates.ts          # Template queries/mutations
│   ├── use-knowledge.ts          # Knowledge queries
│   └── use-chat.ts               # Chat hooks
│
└── form/                         # Form hooks
    ├── use-employee-form.ts      # Employee form logic
    ├── use-document-form.ts      # Document form logic
    └── use-template-form.ts      # Template form logic
```

---

## Stores Structure

```
stores/
├── auth-store.ts                 # Auth state (user, session)
├── ui-store.ts                   # UI state (sidebar, modals)
├── chat-store.ts                 # Chat state (messages, context)
└── filter-store.ts               # Filter/search state
```

---

## Public Assets

```
public/
├── favicon.ico                   # Favicon
├── logo.svg                      # App logo
├── logo-dark.svg                 # Dark mode logo
├── images/
│   ├── empty-state.svg           # Empty state illustration
│   └── error.svg                 # Error illustration
└── fonts/                        # Local fonts (if any)
```

---

## Scripts

```
scripts/
├── seed.ts                       # Database seeding
├── migrate.ts                    # Migration runner
├── generate-types.ts             # Generate TypeScript types
├── cleanup-vectors.ts            # Cleanup orphan vectors
└── export-data.ts                # Data export utility
```

---

## Configuration Files

### `next.config.ts`
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
```

### `tailwind.config.ts`
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-noto-sans-kr)", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

### `drizzle.config.ts`
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### `components.json`
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
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

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case | `employee-form.tsx` |
| Pages | `page.tsx` in folder | `app/admin/employees/page.tsx` |
| API Routes | `route.ts` in folder | `app/api/employees/route.ts` |
| Hooks | camelCase with `use-` | `use-employees.ts` |
| Utilities | kebab-case | `format.ts`, `validation.ts` |
| Types | kebab-case | `employee.ts`, `api.ts` |
| Stores | kebab-case with `-store` | `auth-store.ts` |
| Constants | kebab-case | `routes.ts`, `messages.ts` |
