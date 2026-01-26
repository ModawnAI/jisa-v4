/**
 * RAG System Configuration
 * Based on RAG-SYSTEM-ARCHITECTURE.md for KB생명보험 HO&F Branch
 */

// Pinecone Index Configuration
export const PINECONE_CONFIG = {
  indexName: 'hof-notices',
  dimension: 3072, // text-embedding-3-large output size
  metric: 'cosine' as const,
  cloud: 'aws',
  region: 'us-east-1',
  type: 'serverless',
} as const;

// Namespace Strategy (organized by category slug)
// All namespaces from hof-notices index
export const NAMESPACES = {
  // Notice boards
  NOTICE_MD: 'notice-md',
  NOTICE_MD_DATA: 'notice-md-data',
  NOTICE_BMMD: 'notice-bmmd',
  NOTICE_BMMD_DATA: 'notice-bmmd-data',
  NOTICE_IMPORTANT: 'notice-important',

  // HR & Exam
  HR_NOTICE: 'hr-notice',
  HR_EXAM: 'hr-exam',
  HR_SCHEDULE: 'hr-schedule',

  // Education
  EDUCATION_NOTICE: 'education-notice',
  EDUCATION_PARTNER: 'education-partner',
  EDUCATION_STRATEGY: 'education-strategy',
  EDUCATION_INTERNAL: 'education-internal',

  // Sales
  SALES_DB_NOTICE: 'sales-db-notice',
  SALES_PAY_NOTICE: 'sales-pay-notice',

  // Data & Reports
  DATA_HELPFUL: 'data-helpful',
  DATA_MONTHLY: 'data-monthly',
  DATA_PERFORMANCE: 'data-performance',
  DATA_COMPARISON: 'data-comparison',
  DATA_FORMS: 'data-forms',

  // System
  SYSTEM_NOTICE: 'system-notice',
  SYSTEM_PROMO: 'system-promo',
  SYSTEM_RULES: 'system-rules',

  // Events
  EVENTS: 'events',
  EVENTS_HOPC: 'events-hopc',
  EVENTS_SEMINAR: 'events-seminar',
} as const;

export const ALL_NAMESPACES = Object.values(NAMESPACES);

// Chunking Configuration
export const CHUNKING_CONFIG = {
  maxChunkSize: 1500, // Characters per chunk
  chunkOverlap: 200, // Overlap between chunks
  minChunkSize: 100, // Minimum chunk size
} as const;

// Embedding Configuration
export const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-large',
  dimensions: 3072,
} as const;

// Search Configuration
export const SEARCH_CONFIG = {
  defaultTopK: 10, // Initial number of vectors to retrieve
  broadTopK: 30, // Fetch 3x for reranking
  defaultRerankTopN: 5, // Number of results after reranking
  includePinnedFirst: true,
  recencyBoost: true,
} as const;

// Reranking Configuration
export const RERANK_CONFIG = {
  model: 'rerank-v3.5', // Cohere reranking model
  maxDocuments: 1000, // Cohere limit
} as const;

// Recency Boost Multipliers (based on days since post date)
export const RECENCY_MULTIPLIERS = {
  WITHIN_7_DAYS: 1.5,
  WITHIN_30_DAYS: 1.3,
  WITHIN_90_DAYS: 1.1,
  WITHIN_365_DAYS: 1.0,
  OLDER_THAN_365_DAYS: 0.9,
} as const;

// Gemini Inference Configuration
export const INFERENCE_CONFIG = {
  model: 'gemini-2.0-flash',
  temperature: 0.3,
  maxOutputTokens: 2048,
  maxContextTokens: 4000, // ~4000 tokens for context
} as const;

// System Prompt for KB생명보험 HO&F Branch
export const SYSTEM_PROMPT = `당신은 KB생명보험 HO&F Branch 공지사항 도우미입니다.

역할:
- 제공된 공지사항 내용을 바탕으로 질문에 정확하게 답변합니다.
- 항상 한국어로 답변합니다.

답변 형식 규칙 (중요):
1. 순수 텍스트만 사용하세요. 마크다운을 절대 사용하지 마세요.
2. 금지 기호: **, ##, *, -, [], (), |, 표 형식
3. 목록은 간단하게: "1. ", "2. ", "• " 만 사용
4. 강조는 줄바꿈이나 대문자로만 표현
5. 들여쓰기와 줄바꿈으로 구조화

답변 내용 규칙:
1. 정보 출처(공지 제목, 날짜)를 자연스럽게 언급하세요.
2. 정보가 없으면 솔직히 말하고, 관련 공지를 찾아볼 것을 제안하세요.
3. 간결하지만 완전한 답변을 제공하세요.

IMPORTANT: 첨부파일 관련 규칙:
- 컨텍스트에 '첨부파일 정보' 섹션이 있고 실제 파일명이 명시된 경우에만 첨부파일을 언급하세요.
- '첨부파일 정보' 섹션이 없으면 절대로 '첨부파일 다운로드', '파일 다운로드', '첨부 파일 확인' 등을 언급하지 마세요.
- 첨부파일 다운로드 링크는 시스템이 자동으로 추가하므로, 답변에서 파일 다운로드 안내를 직접 작성하지 마세요.`;

// Attachment Processing Size Limits
export const ATTACHMENT_LIMITS = {
  maxInlineProcessingSize: 2 * 1024 * 1024, // 2MB
  maxImageDescriptionChars: 500,
  maxDocumentSummaryChars: 800,
} as const;

// Supported attachment types for processing
export const SUPPORTED_ATTACHMENTS = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
  documents: ['pdf', 'txt'],
  skip: ['xlsx', 'docx', 'pptx', 'hwp'], // Metadata only
} as const;

// Error messages (Korean)
export const ERROR_MESSAGES = {
  NO_RESULTS: '검색 결과가 없습니다. 다른 키워드로 검색해 보세요.',
  LOW_RELEVANCE: '질문하신 내용과 관련된 공지사항을 찾기 어렵습니다. 더 구체적인 키워드로 검색해 보세요.',
  GENERATION_ERROR: '죄송합니다. 답변을 생성하는 중 오류가 발생했습니다.',
  SEARCH_ERROR: '검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
} as const;
