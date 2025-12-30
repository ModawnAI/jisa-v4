# RAG System Architecture Documentation

## Overview

This document describes the complete RAG (Retrieval-Augmented Generation) system for KB생명보험 HO&F Branch notice board.

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Vector Database | Pinecone (Serverless) | Store and query embeddings |
| Embeddings | OpenAI `text-embedding-3-large` | Convert text to 3072-dim vectors |
| Reranking | Cohere `rerank-v3.5` | Re-score results by relevance |
| Inference | Google `gemini-flash-latest` | Generate responses |
| Attachment Processing | Google `gemini-flash-latest` | Describe images, summarize PDFs |
| Data Source | Supabase | Source of truth for posts |

---

## 1. Pinecone Index Configuration

### Index Specification

```typescript
{
  indexName: 'hof-notices',
  dimension: 3072,          // text-embedding-3-large output size
  metric: 'cosine',         // Similarity metric
  cloud: 'aws',
  region: 'us-east-1',
  type: 'serverless'
}
```

### Namespace Strategy

Posts are organized into **namespaces by category slug**:
- `notice-md` - MD notices
- `notice-bmmd` - BM/MD notices
- `hr-exam` - HR exam notices
- `sales-db-notice` - Sales DB notices
- `general` - Default fallback

**Why namespaces?**
- Efficient filtering (query single namespace vs. all)
- Logical organization by content type
- Independent vector management per category

### Vector Record Structure

Each vector stored in Pinecone has:

```typescript
{
  id: string,              // Format: "{postId}_{chunkIndex}"
  values: number[],        // 3072-dimensional embedding
  metadata: {
    // Identifiers
    postId: string,
    categoryId: string,
    categoryName: string,
    categorySlug: string,

    // Content
    title: string,
    excerpt: string,       // First 200 chars of cleaned content

    // Timestamps (Unix ms, 0 = not set)
    createdAt: number,
    updatedAt: number,
    backdatedAt: number,   // Parsed from content if available
    publishedAt: number,

    // Flags
    isPinned: boolean,
    isImportant: boolean,
    status: string,

    // Stats
    viewCount: number,
    attachmentCount: number,

    // Chunking info
    chunkIndex: number,
    totalChunks: number,

    // Attachments (JSON string)
    attachmentsJson: string,
    hasImages: boolean,
    hasDocuments: boolean,
  }
}
```

---

## 2. Data Indexing Pipeline

### Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Supabase   │────▶│  Fetch Post  │────▶│ Parse & Clean   │
│  hof_posts  │     │  + Category  │     │ HTML Content    │
└─────────────┘     │  + Attachments│     └────────┬────────┘
                    └──────────────┘              │
                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Attachment Processing                       │
│  ┌─────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ Images  │──│ Gemini Flash    │──│ Description (500字) │  │
│  │ jpg/png │  │ Vision Analysis │  │                     │  │
│  └─────────┘  └─────────────────┘  └─────────────────────┘  │
│  ┌─────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ PDFs    │──│ Gemini Flash    │──│ Summary (800字)     │  │
│  │         │  │ Document Parse  │  │                     │  │
│  └─────────┘  └─────────────────┘  └─────────────────────┘  │
│  ┌─────────────┐                                             │
│  │ xlsx/docx   │────── Skip (metadata only) ─────────────── │
│  └─────────────┘                                             │
└─────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Text Chunking                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ fullText = title + cleanContent + attachmentText    │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Chunk into 1500-char segments with 200-char overlap │    │
│  │ (Sentence boundary aware)                           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                 OpenAI Embedding                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Model: text-embedding-3-large                       │    │
│  │ Dimensions: 3072                                    │    │
│  │ Batch Size: 100 texts per request                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Pinecone Upsert                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. Delete existing vectors for postId               │    │
│  │ 2. Upsert new vectors to category namespace         │    │
│  │ 3. Batch size: 100 vectors per request              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Chunking Configuration

```typescript
{
  maxChunkSize: 1500,    // Characters per chunk
  chunkOverlap: 200,     // Overlap between chunks
  minChunkSize: 100,     // Minimum chunk size
}
```

**Chunking Algorithm:**
1. If text ≤ maxChunkSize: return as single chunk
2. Otherwise, split at sentence boundaries (`.`, `?`, `!`, `\n`)
3. Ensure overlap between chunks for context continuity
4. Minimum advance: maxChunkSize - chunkOverlap

### Attachment Processing

| File Type | Processing | Output |
|-----------|------------|--------|
| jpg, png, gif, webp, bmp | Gemini Vision | Korean description (≤500 chars) |
| pdf, txt | Gemini Document | Korean summary (≤800 chars) |
| xlsx, docx, pptx, hwp | Skip | Metadata only |

**Size Limits:**
- Max inline processing: 2MB
- Files larger than 2MB: stored as metadata only

---

## 3. Inference Pipeline (Query → Response)

### Complete Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      USER QUERY                                   │
│  "12월 정착지원금 신청 방법이 어떻게 되나요?"                    │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 1: EMBEDDING GENERATION                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ OpenAI text-embedding-3-large                              │  │
│  │ Input: "12월 정착지원금 신청 방법이 어떻게 되나요?"        │  │
│  │ Output: [0.012, -0.034, 0.056, ...] (3072 dimensions)      │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 2: VECTOR SEARCH (Pinecone)                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Query Parameters:                                          │  │
│  │   - vector: [query embedding]                              │  │
│  │   - topK: 30 (fetch 3x for reranking)                     │  │
│  │   - includeMetadata: true                                  │  │
│  │   - filter: { categorySlug: {...} } (optional)            │  │
│  │                                                            │  │
│  │ Strategy:                                                  │  │
│  │   - If single category: query that namespace              │  │
│  │   - Otherwise: query ALL namespaces in parallel           │  │
│  │   - Merge and sort by cosine similarity score             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Output: Top 30 matches with similarity scores                    │
│  Example:                                                         │
│    [                                                              │
│      { id: "abc123_0", score: 0.89, metadata: {...} },           │
│      { id: "def456_0", score: 0.85, metadata: {...} },           │
│      ...                                                          │
│    ]                                                              │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 3: DEDUPLICATION                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Multiple chunks from same post → keep highest scoring      │  │
│  │ Group by postId, select max score per post                 │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 4: COHERE RERANKING                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Model: rerank-v3.5                                         │  │
│  │ Input:                                                     │  │
│  │   - query: "12월 정착지원금 신청 방법이 어떻게 되나요?"   │  │
│  │   - documents: ["{title}\n\n{content}", ...]              │  │
│  │   - topN: 5                                                │  │
│  │                                                            │  │
│  │ Output: relevanceScore for each document (0.0 - 1.0)       │  │
│  │ Reorders by semantic relevance, not just vector similarity │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 5: RECENCY BOOST                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Apply time-based multipliers to rerank scores:             │  │
│  │                                                            │  │
│  │   ≤ 7 days old   → score × 1.5                            │  │
│  │   ≤ 30 days old  → score × 1.3                            │  │
│  │   ≤ 90 days old  → score × 1.1                            │  │
│  │   ≤ 365 days old → score × 1.0                            │  │
│  │   > 365 days old → score × 0.9                            │  │
│  │                                                            │  │
│  │ Uses backdatedAt if available, else createdAt              │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 6: PRIORITY SORTING                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Final ordering:                                            │  │
│  │   1. Pinned posts (sorted by score)                        │  │
│  │   2. Important posts (sorted by score)                     │  │
│  │   3. Regular posts (sorted by score)                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Final Output: Top 5 most relevant posts                          │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 7: CONTEXT BUILDING                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ For each result, format as:                                │  │
│  │                                                            │  │
│  │   ---                                                      │  │
│  │   제목: [title]                                            │  │
│  │   카테고리: [category]                                     │  │
│  │   날짜: 2024. 12. 15.                                      │  │
│  │   (필독)(고정)                                              │  │
│  │                                                            │  │
│  │   내용:                                                    │  │
│  │   [excerpt/content]                                        │  │
│  │   ---                                                      │  │
│  │                                                            │  │
│  │ + Attachment context:                                      │  │
│  │   --- 첨부파일 정보 ---                                    │  │
│  │   [공지제목]                                               │  │
│  │   - 이미지: image.png                                      │  │
│  │     설명: 교육 일정표가 표시된 이미지...                   │  │
│  │   - 문서: guide.pdf                                        │  │
│  │     설명: 신청 절차 안내 문서...                           │  │
│  │                                                            │  │
│  │ Token limit: ~4000 tokens                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 8: GEMINI INFERENCE                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Model: gemini-flash-latest                                 │  │
│  │ Temperature: 0.3                                           │  │
│  │ Max Output Tokens: 2048                                    │  │
│  │                                                            │  │
│  │ System Prompt:                                             │  │
│  │   "You are a helpful assistant for KB생명보험 HO&F Branch  │  │
│  │    notice board. Your role is to answer questions based    │  │
│  │    on the provided notice content. Always respond in       │  │
│  │    Korean unless the user specifically asks for another    │  │
│  │    language. If the information is not available in the    │  │
│  │    provided context, say so clearly. When citing           │  │
│  │    information, mention the notice title and date when     │  │
│  │    relevant. If there are attachments mentioned, include   │  │
│  │    that information in your response. Be concise but       │  │
│  │    thorough in your responses."                            │  │
│  │                                                            │  │
│  │ User Prompt:                                               │  │
│  │   {system_prompt}                                          │  │
│  │                                                            │  │
│  │   아래는 관련 공지사항 내용입니다:                         │  │
│  │                                                            │  │
│  │   {context}                                                │  │
│  │   {attachment_context}                                     │  │
│  │                                                            │  │
│  │   ---                                                      │  │
│  │                                                            │  │
│  │   사용자 질문: {query}                                     │  │
│  │                                                            │  │
│  │   위 공지사항 내용을 바탕으로 질문에 답변해주세요.         │  │
│  │   답변에 사용한 공지사항의 제목을 인용해주세요.            │  │
│  │   첨부파일이 있는 경우 해당 정보도 포함해주세요.           │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  FINAL RESPONSE                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ {                                                          │  │
│  │   "query": "12월 정착지원금 신청 방법이 어떻게 되나요?",  │  │
│  │   "answer": "12월 정착지원금 신청에 대해 안내드립니다...", │  │
│  │   "sources": [                                             │  │
│  │     {                                                      │  │
│  │       "postId": "abc123",                                  │  │
│  │       "title": "[중요]2025.12월 정착지원금 신청 안내",    │  │
│  │       "content": "...",                                    │  │
│  │       "category": "MD 공지",                               │  │
│  │       "score": 0.95,                                       │  │
│  │       "rerankScore": 0.92,                                 │  │
│  │       "metadata": {...},                                   │  │
│  │       "attachments": [...]                                 │  │
│  │     },                                                     │  │
│  │     ...                                                    │  │
│  │   ],                                                       │  │
│  │   "latencyMs": 1234                                        │  │
│  │ }                                                          │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. API Endpoints

### POST /api/rag/chat

Full RAG pipeline with inference.

**Request:**
```typescript
{
  query: string,
  options?: {
    topK?: number,           // Default: 10
    rerank?: boolean,        // Default: true
    rerankTopN?: number,     // Default: 5
    categoryFilter?: string[], // Filter by category slugs
    dateFrom?: string,       // ISO date string
    dateTo?: string,         // ISO date string
    includeImportantOnly?: boolean,
    includePinnedFirst?: boolean, // Default: true
    recencyBoost?: boolean,  // Default: true
    stream?: boolean,        // Enable SSE streaming
  }
}
```

**Response:**
```typescript
{
  query: string,
  answer: string,
  sources: RAGSearchResult[],
  latencyMs: number
}
```

**Streaming Response (SSE):**
```
data: {"type": "searching"}
data: {"type": "context", "data": [...]}
data: {"type": "generating"}
data: {"type": "chunk", "data": "12월 정착지원금 신청에 대해"}
data: {"type": "chunk", "data": " 안내드립니다..."}
data: {"type": "done"}
```

### POST /api/rag/search

Search only (no inference).

**Request:**
```typescript
{
  query: string,
  options?: {
    topK?: number,
    rerank?: boolean,
    rerankTopN?: number,
    categoryFilter?: string[],
    dateFrom?: string,
    dateTo?: string,
    includeImportantOnly?: boolean,
    includePinnedFirst?: boolean,
    recencyBoost?: boolean,
  }
}
```

**Response:**
```typescript
{
  query: string,
  results: RAGSearchResult[],
  total: number,
  latencyMs: number
}
```

### POST /api/rag/webhook

Receives Supabase database webhook events for automatic sync.

**Payload (from Supabase trigger):**
```typescript
{
  type: 'INSERT' | 'UPDATE' | 'DELETE',
  table: 'hof_posts',
  record: {...} | null,
  old_record: {...} | null
}
```

---

## 5. Search Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| topK | 10 | Initial number of vectors to retrieve |
| rerank | true | Apply Cohere reranking |
| rerankTopN | 5 | Number of results after reranking |
| categoryFilter | null | Array of category slugs to filter |
| dateFrom/dateTo | null | Date range filter |
| includeImportantOnly | false | Only return important posts |
| includePinnedFirst | true | Prioritize pinned posts |
| recencyBoost | true | Apply time-based score boosting |

---

## 6. Cost Estimates

### Per Query (Typical)
| Service | Operation | Cost |
|---------|-----------|------|
| OpenAI | 1 embedding (3072-dim) | ~$0.00013 |
| Pinecone | Vector search | ~$0.000002 |
| Cohere | Rerank 30 docs | ~$0.0001 |
| Gemini | ~2000 tokens response | ~$0.0001 |
| **Total** | | **~$0.0004** |

### Per Sync (172 posts)
| Service | Operation | Cost |
|---------|-----------|------|
| OpenAI | ~200 embeddings | ~$0.026 |
| Pinecone | ~200 upserts | Free tier |
| Gemini | ~170 attachment analyses | ~$0.01 |
| **Total** | | **~$0.04** |

---

## 7. Environment Variables

```env
# Required
PINECONE_API_KEY=pcsk_...
OPENAI_API_KEY=sk-proj-...
COHERE_API_KEY=...
GEMINI_API_KEY=AIza...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional
RAG_WEBHOOK_SECRET=...  # Defaults to SUPABASE_SERVICE_ROLE_KEY
```

---

## 8. File Structure

```
src/lib/rag/
├── index.ts        # Main exports
├── config.ts       # Configuration constants
├── types.ts        # TypeScript interfaces
├── pinecone.ts     # Pinecone client & operations
├── embeddings.ts   # OpenAI embedding generation
├── parser.ts       # HTML cleaning, chunking
├── attachments.ts  # Gemini image/document processing
├── sync.ts         # Supabase → Pinecone sync
├── query.ts        # Search pipeline
├── rerank.ts       # Cohere reranking, score boosting
└── inference.ts    # Gemini response generation

src/app/api/rag/
├── chat/route.ts   # Full RAG endpoint
├── search/route.ts # Search-only endpoint
├── sync/route.ts   # Manual sync trigger
└── webhook/route.ts # Supabase webhook handler
```

---

## 9. Usage Examples

### Basic Chat Query
```typescript
const response = await fetch('/api/rag/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: '12월 정착지원금 신청 방법이 어떻게 되나요?'
  })
})
const { answer, sources } = await response.json()
```

### Streaming Chat
```typescript
const response = await fetch('/api/rag/chat', {
  method: 'POST',
  body: JSON.stringify({
    query: '변액보험 시험 일정 알려줘',
    options: { stream: true }
  })
})

const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value)
  const lines = chunk.split('\n\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6))
      if (event.type === 'chunk') {
        process.stdout.write(event.data)
      }
    }
  }
}
```

### Search with Filters
```typescript
const response = await fetch('/api/rag/search', {
  method: 'POST',
  body: JSON.stringify({
    query: 'MGR 컨퍼런스',
    options: {
      categoryFilter: ['notice-bmmd-data'],
      dateFrom: '2024-01-01',
      recencyBoost: true,
      rerankTopN: 3
    }
  })
})
```

### Programmatic Usage
```typescript
import { ragQuery, search } from '@/lib/rag'

// Full RAG with inference
const result = await ragQuery('정착지원금 신청 방법은?', {
  topK: 10,
  rerank: true,
  rerankTopN: 5,
  recencyBoost: true
})

console.log(result.answer)
console.log(result.sources)

// Search only
const searchResults = await search({
  query: '변액보험 시험',
  topK: 10,
  rerank: true
})
```
