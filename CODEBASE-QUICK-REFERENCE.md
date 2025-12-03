# ContractorHub - Quick Reference Guide

## Project at a Glance

**Status**: ~75% Complete | **Type**: Full-Stack RAG + Document Management + KakaoTalk Bot
**Stack**: Next.js 16 + React 19 + Drizzle ORM + Supabase + Pinecone + Gemini

---

## What's Working ✅

### Core Features
- **Document Management**: Upload, process, retrieve documents
- **Employee Management**: CRUD, clearance levels, hierarchy
- **RAG Chat**: AI-powered answers with source documents
- **Vector Database**: Pinecone integration with dual namespaces
- **Data Processing**: 3 specialized processors (MDRT, Compensation, PDF)
- **Conflict Detection**: Identify duplicate/mismatched documents
- **Lineage Tracking**: Document transformation history

### User Interface
- 23 complete pages (dashboard, admin panels, chat, analytics)
- Modern UI with Shadcn/UI + Tailwind v4
- Responsive design with collapsible sidebar
- Streaming chat with real-time context

### Backend Infrastructure
- 11 database tables (normalized schema)
- 30+ API endpoints
- 15+ service classes
- Inngest background jobs
- Supabase auth & storage

---

## What's Incomplete ⚠️

### Critical Missing
1. **KakaoTalk Bot Handler** - No webhook for incoming messages
2. **Activity Tracking** - UI built, no backend events
3. **Analytics Charts** - Placeholder text, no visualization
4. **Settings Persistence** - UI exists, not connected to API

### Partial Implementation
- Analytics dashboard (60% - needs charts & real logs)
- Employee activity tab (50% - backend missing)
- Chat history per employee (80% - needs API)
- Notification system (20% - UI only)

---

## Key Files to Know

### Entry Points
```
app/page.tsx                 → Root redirect
app/(auth)/login/           → Login page
app/(admin)/layout.tsx      → Admin shell with sidebar
app/(admin)/dashboard/      → Main dashboard
app/api/                    → All API routes
```

### Critical Services
```
lib/services/rag-chat.service.ts       → RAG pipeline
lib/services/pinecone.service.ts       → Vector ops
lib/services/document-processors/      → File processing
lib/inngest/functions/document-process.ts → Background jobs
```

### Database
```
lib/db/schema/               → All table definitions
lib/db/index.ts              → Drizzle client
```

---

## Architecture Overview

### Data Flow: Upload → Process → Chat
```
User Upload File
    ↓ (Supabase Storage)
Document Record Created
    ↓ (Inngest Event)
Select Best Processor
    ↓
Extract Text → Chunk → Embed
    ↓
Store Chunks (DB) + Vectors (Pinecone)
    ↓
User Asks Question
    ↓ (OpenAI Embedding)
Vector Search (Pinecone)
    ↓ (Gemini LLM)
Generate Answer with Context
```

### Namespace Strategy
- **Organization**: `org_{organizationId}` - Company-wide documents
- **Employee**: `emp_{employeeId}` - Employee-specific documents
- **Filtering**: Clearance levels (basic/standard/advanced)

---

## Quick Task Guide

### To Add a New Feature
1. Create page in `app/(admin)/[feature]/page.tsx`
2. Build components in `components/[feature]/`
3. Create service in `lib/services/[feature].service.ts`
4. Add API route in `app/api/[feature]/route.ts`
5. Add to sidebar navigation in `lib/config/navigation.ts`

### To Add Database Table
1. Create schema file in `lib/db/schema/[table].ts`
2. Export from `lib/db/schema/index.ts`
3. Run: `npm run db:generate` then `npm run db:migrate`

### To Add Document Processor
1. Extend `BaseProcessor` in `lib/services/document-processors/base-processor.ts`
2. Register in `lib/services/document-processors/index.ts`
3. Add to processor registry with priority

### To Fix a TODO
Search for `// TODO:` in codebase:
- `employee-documents.tsx` - Wire document fetching API
- `employee-activity.tsx` - Wire activity tracking API
- `conflict-table.tsx` - Get actual user ID from auth
- `lineage-table.tsx` - Open detail view
- `category.service.ts` - Check document dependencies
- `template.service.ts` - Check template dependencies

---

## Common Commands

```bash
# Development
npm run dev                  # Start dev server (port 3000)

# Database
npm run db:generate         # Generate migration from schema
npm run db:migrate          # Apply migrations
npm run db:push             # Direct push (dev only)
npm run db:studio           # Open Drizzle Studio

# Quality
npm run lint                # Run ESLint
npm run typecheck           # TypeScript check
npm run test                # Run tests

# Production
npm run build               # Build for production
```

---

## Environment Variables Required

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX_NAME=

# OpenAI
OPENAI_API_KEY=

# Google Gemini
GEMINI_API_KEY=

# Inngest
INNGEST_SIGNING_KEY=
INNGEST_EVENT_KEY=
```

---

## Useful Endpoints to Test

```bash
# Login
POST /api/auth/callback

# Documents
GET /api/documents
POST /api/documents (multipart/form-data with file)
GET /api/documents/[id]

# Chat
POST /api/chat
{
  "messages": [{"role": "user", "content": "..."}],
  "includeOrganization": true,
  "includePersonal": true,
  "topK": 10,
  "temperature": 0.7,
  "stream": true
}

# Vector Search
POST /api/vectors/search
{
  "query": "search term",
  "topK": 5,
  "minScore": 0.5
}

# Conflicts
GET /api/conflicts
GET /api/conflicts/statistics
```

---

## Key Statistics

| Metric | Count |
|--------|-------|
| Pages | 23 |
| Components | 43+ |
| API Routes | 30+ |
| Services | 15+ |
| Database Tables | 11 |
| Document Processors | 3 |
| Lines of Code | ~5,000+ |

---

## Known Issues

1. **Analytics Dashboard** - Shows placeholder "차트 데이터 준비 중..."
2. **Activity Tab** - Employee activity not populated
3. **Chat History** - Not showing in employee detail
4. **Settings** - Form fields not connected to backend
5. **KakaoTalk** - No webhook handler implemented

---

## Next Steps to 100%

### Phase 1 (Critical)
- [ ] Implement KakaoTalk webhook handler
- [ ] Complete activity tracking system
- [ ] Wire up chat history API

### Phase 2 (Important)
- [ ] Add chart library & visualization
- [ ] Implement settings persistence
- [ ] Real audit logging

### Phase 3 (Polish)
- [ ] Unit test coverage
- [ ] Notification system
- [ ] Auto-conflict resolution
- [ ] Full-text search

---

## Support Reference

- **Database**: Supabase project ID: yuuqflpiojcocchjrpeo
- **Vector DB**: Pinecone index (3072 dimensions)
- **LLM**: Google Gemini 2.0 Flash
- **Auth**: Supabase Auth with email/password
- **Login**: asdf@asdf.com / asdfasdfasdf (for testing)

---

**Last Updated**: December 3, 2025
**For Detailed Analysis**: See CODEBASE-INVENTORY.md
