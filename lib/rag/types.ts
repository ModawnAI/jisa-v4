/**
 * RAG System Types
 * Based on RAG-SYSTEM-ARCHITECTURE.md
 */

// Vector Record Structure (stored in Pinecone)
export interface VectorMetadata {
  // Identifiers
  postId: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;

  // Content
  title: string;
  excerpt: string; // First 200 chars of cleaned content

  // Timestamps (Unix ms, 0 = not set)
  createdAt: number;
  updatedAt: number;
  backdatedAt: number; // Parsed from content if available
  publishedAt: number;

  // Flags
  isPinned: boolean;
  isImportant: boolean;
  status: string;

  // Stats
  viewCount: number;
  attachmentCount: number;

  // Chunking info
  chunkIndex: number;
  totalChunks: number;

  // Attachments (JSON string)
  attachmentsJson: string;
  hasImages: boolean;
  hasDocuments: boolean;

  // Full searchable text for reranking
  searchable_text?: string;
}

// Pinecone search result match
export interface PineconeMatch {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

// Pinecone query result
export interface PineconeQueryResult {
  matches: PineconeMatch[];
  namespace?: string;
}

// Attachment info (parsed from attachmentsJson)
export interface AttachmentInfo {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  description?: string; // AI-generated description
}

// Search options (from API request)
export interface RAGSearchOptions {
  topK?: number; // Default: 10
  rerank?: boolean; // Default: true
  rerankTopN?: number; // Default: 5
  categoryFilter?: string[]; // Filter by category slugs
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  includeImportantOnly?: boolean;
  includePinnedFirst?: boolean; // Default: true
  recencyBoost?: boolean; // Default: true
  stream?: boolean; // Enable SSE streaming
}

// RAG Search Result (single post)
export interface RAGSearchResult {
  postId: string;
  title: string;
  content: string;
  category: string;
  categorySlug: string;
  score: number; // Original Pinecone score
  rerankScore?: number; // Cohere rerank score
  boostedScore?: number; // Score after recency boost
  metadata: VectorMetadata;
  attachments?: AttachmentInfo[];
  date?: string; // Formatted date string
}

// Full RAG Chat Response
export interface RAGChatResponse {
  query: string;
  answer: string;
  sources: RAGSearchResult[];
  latencyMs: number;
}

// Search-only response
export interface RAGSearchResponse {
  query: string;
  results: RAGSearchResult[];
  total: number;
  latencyMs: number;
}

// SSE Event types for streaming
export type SSEEventType =
  | 'searching'
  | 'context'
  | 'generating'
  | 'chunk'
  | 'done'
  | 'error';

export interface SSEEvent {
  type: SSEEventType;
  data?: unknown;
}

// Reranked result from Cohere
export interface RerankResult {
  id: string;
  score: number; // Original score
  rerankScore: number; // Cohere relevance score
  originalRank: number;
  newRank: number;
}

// Context item for Gemini prompt
export interface ContextItem {
  title: string;
  category: string;
  date: string;
  content: string;
  isPinned: boolean;
  isImportant: boolean;
  attachments?: AttachmentInfo[];
}

// Webhook payload (from Supabase trigger)
export interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

// Sync result
export interface SyncResult {
  success: boolean;
  postId?: string;
  chunksUpserted?: number;
  error?: string;
}

// Query stage metrics
export interface QueryMetrics {
  embeddingTimeMs: number;
  searchTimeMs: number;
  deduplicationTimeMs: number;
  rerankTimeMs: number;
  recencyBoostTimeMs: number;
  contextBuildTimeMs: number;
  inferenceTimeMs: number;
  totalTimeMs: number;
}
