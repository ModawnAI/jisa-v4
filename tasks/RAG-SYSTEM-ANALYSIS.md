# RAG System Deep Analysis & Implementation Plan

> Created: 2024-12-06
> Status: Implementation In Progress

---

## 1. Current Architecture Overview

### Three-Tier RAG Services

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Entry Points                                 │
├──────────────────┬──────────────────────┬───────────────────────────┤
│  Admin Chat API  │  KakaoTalk Webhook   │  (Future: Web Chat)       │
│  /api/chat       │  /api/kakao          │                           │
└────────┬─────────┴──────────┬───────────┴───────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌────────────────────┐
│ ragChatService  │  │ employeeRagService │
│ (Simple RAG)    │  │ (Employee RAG)     │
└────────┬────────┘  └─────────┬──────────┘
         │                     │
         │                     ▼
         │           ┌────────────────────┐
         │           │ enhancedRAGService │
         │           │ (Intent-Aware RAG) │
         │           └─────────┬──────────┘
         │                     │
         ▼                     ▼
┌─────────────────────────────────────────┐
│           pineconeService               │
│    (Vector DB + Namespace Isolation)    │
└─────────────────────────────────────────┘
```

### Current Flow (Enhanced RAG Pipeline)

```
User Query (Informal Korean)
        │
        ▼
┌───────────────────────────────────────┐
│ 1. Query Understanding (Gemini Flash) │
│    - Parse intent type                │
│    - Extract entities (employee,      │
│      period, template type)           │
│    - Identify calculation type        │
│    - Confidence scoring               │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 2. Embedding Generation (OpenAI)      │
│    - text-embedding-3-large           │
│    - 3072 dimensions                  │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 3. Pinecone Search                    │
│    - Namespace selection              │
│    - Metadata filtering               │
│    - Clearance-based access control   │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 4. Calculation Engine (if needed)     │
│    - MDRT gap, period_diff, sum, etc. │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 5. Response Generation (Gemini)       │
│    - Context injection                │
│    - Calculation results              │
│    - Personalized response            │
└───────────────────────────────────────┘
```

---

## 2. Namespace Strategy

### Current Implementation

| Namespace Type | Format | Purpose | Access |
|---------------|--------|---------|--------|
| Organization | `org_{categoryId}` | Company-wide docs | All employees in org |
| Employee | `emp_{employeeId}` | Personal compensation data | Single employee only |
| Public | `public` | Schedules, FAQs, general info | Everyone |

### Document Processing Flow

```
Document Upload
     │
     ▼
lib/inngest/functions/document-process.ts
  └─► isPublic: document.category?.isPublic || false
           │
           ▼
lib/services/document-processors/base-processor.ts
  └─► getNamespaceStrategy() → 'public' | 'employee' | 'organization'
           │
           ▼
  └─► generateNamespace() → 'public' | 'emp_{id}' | 'org_{id}'
```

### Query Time Namespace Selection

```
lib/services/namespace.service.ts:
  getQueryNamespaces({
    includePublic: true,      // Always included by default
    includePersonal: true,    // emp_{employeeId}
    includeOrganization: true // org_{categoryId}
  })
```

### Security Layers

1. **Infrastructure Layer**: Pinecone namespace isolation
2. **Query Layer**: Metadata filtering (`clearanceLevel`, `employeeId`)
3. **Application Layer**: Result validation (paranoid check)

---

## 3. Identified Gaps

### Gap 1: No Pre-Query Clarification System
- Query immediately goes to full RAG pipeline regardless of ambiguity
- Low confidence (< 0.5) only affects response generation, not flow control
- No mechanism to ask clarifying questions before expensive vector search
- Wasted compute on ambiguous queries

### Gap 2: Static Schema Awareness
- Schemas are hardcoded in `DEFAULT_RAG_SCHEMAS`
- New document templates don't automatically inform the prompt
- No awareness of what data actually exists in namespaces

### Gap 3: Intent Confidence Not Actionable
- 0.3 confidence still goes through full RAG
- No threshold-based routing to clarification flow
- Confidence is informational only, not actionable

### Gap 4: No Quick Response Path
- All queries go through full pipeline (~1000ms minimum)
- Simple greetings waste expensive LLM/vector calls

---

## 4. Implementation Plan

### Phase 1: Foundation (P0 - Query Router)

#### 4.1 Intent Thresholds Configuration
- File: `lib/ai/intent-thresholds.ts`
- Define confidence thresholds for routing decisions
- Export utility function for route determination

#### 4.2 Query Router Service
- File: `lib/services/query-router.service.ts`
- Stage 0: Quick classification (regex/keyword matching)
- Route to: instant | clarify | rag | fallback
- Track processing time per stage

### Phase 2: Clarification System (P1)

#### 4.3 Conversation State Service
- File: `lib/services/conversation-state.service.ts`
- In-memory state management (later: Redis)
- Track pending clarifications
- Merge user responses with partial intents

#### 4.4 Clarification Builder
- File: `lib/ai/clarification-builder.ts`
- Generate contextual follow-up questions
- Korean-language clarification templates

### Phase 3: Dynamic Schemas (P2)

#### 4.5 Schema Registry Service
- File: `lib/services/schema-registry.service.ts`
- Discover schemas from Pinecone metadata
- Cache with TTL
- Inform prompt building dynamically

#### 4.6 Enhanced Prompt Builder
- Update: `lib/ai/prompts/query-understanding.ts`
- Integrate with schema registry
- Include data availability hints

### Phase 4: Integration (P3-P4)

#### 4.7 Namespace Search Strategy
- File: `lib/services/namespace-strategy.service.ts`
- Priority-based namespace search
- Weight results by namespace relevance

#### 4.8 RAG Metrics Service
- File: `lib/services/rag-metrics.service.ts`
- Track latency, quality, routing metrics
- Database table for analytics

#### 4.9 Integration Updates
- Update: `lib/services/kakao/employee-rag.service.ts`
- Update: `lib/services/enhanced-rag.service.ts`
- Update: `app/api/chat/route.ts`

---

## 5. New Architecture (Target State)

```
User Query
     │
     ▼
┌────────────────────────────────────────┐
│ Stage 0: Quick Classification (50ms)   │
│ ─────────────────────────────────────  │
│ • Greeting detection (regex/keyword)   │
│ • Simple FAQ lookup (exact match)      │
│ • Immediate response candidates        │
└────────────────┬───────────────────────┘
                 │
      ┌──────────┴──────────┐
      │ Quick Match Found?  │
      └──────────┬──────────┘
          Yes    │    No
           │     │     │
           ▼     │     ▼
    ┌──────────┐ │ ┌────────────────────────────────┐
    │ Respond  │ │ │ Stage 1: Intent Understanding  │
    │ Instant  │ │ │ ────────────────────────────── │
    └──────────┘ │ │ • Gemini Flash parsing         │
                 │ │ • Confidence scoring           │
                 │ │ • Entity extraction            │
                 │ └────────────────┬───────────────┘
                 │                  │
                 │       ┌──────────┴──────────┐
                 │       │ Confidence > 0.6?   │
                 │       └──────────┬──────────┘
                 │            Yes   │   No
                 │             │    │    │
                 │             ▼    │    ▼
                 │    ┌───────────┐ │ ┌────────────────────┐
                 │    │ Stage 2:  │ │ │ Clarification Flow │
                 │    │ Deep RAG  │ │ │ ────────────────── │
                 │    └───────────┘ │ │ • Ask follow-up    │
                 │                  │ │ • Store state      │
                 │                  │ │ • Wait for reply   │
                 │                  │ └────────────────────┘
                 │                  │
                 └──────────────────┘
```

---

## 6. Files to Create/Modify

### New Files
- [ ] `lib/ai/intent-thresholds.ts`
- [ ] `lib/ai/clarification-builder.ts`
- [ ] `lib/services/query-router.service.ts`
- [ ] `lib/services/conversation-state.service.ts`
- [ ] `lib/services/schema-registry.service.ts`
- [ ] `lib/services/namespace-strategy.service.ts`
- [ ] `lib/services/rag-metrics.service.ts`
- [ ] `lib/db/schema/rag-metrics.ts`

### Modified Files
- [ ] `lib/ai/prompts/query-understanding.ts`
- [ ] `lib/services/kakao/employee-rag.service.ts`
- [ ] `lib/services/enhanced-rag.service.ts`
- [ ] `app/api/chat/route.ts`

---

## 7. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Avg response time (simple queries) | ~1000ms | <100ms |
| Avg response time (complex queries) | ~1500ms | ~1200ms |
| Clarification rate | 0% | 15-20% |
| Intent accuracy | ~70% | >85% |
| Instant response rate | 0% | 20-30% |

---

## 8. Implementation Progress

### Status Legend
- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked

### Progress Tracker

| Task | Status | Notes |
|------|--------|-------|
| Intent Thresholds | ⬜ | |
| Query Router Service | ⬜ | |
| Conversation State Service | ⬜ | |
| Clarification Builder | ⬜ | |
| Schema Registry Service | ⬜ | |
| Namespace Strategy Service | ⬜ | |
| RAG Metrics Service | ⬜ | |
| Enhanced Prompt Builder | ⬜ | |
| Employee RAG Integration | ⬜ | |
| Enhanced RAG Integration | ⬜ | |
| Chat API Integration | ⬜ | |
| Testing & Validation | ⬜ | |
