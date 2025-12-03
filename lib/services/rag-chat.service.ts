import { GoogleGenAI } from '@google/genai';
import { pineconeService, SearchResult } from './pinecone.service';
import { namespaceService } from './namespace.service';
import { createEmbedding } from '@/lib/utils/embedding';
import { db } from '@/lib/db';
import { knowledgeChunks } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

// Lazy initialization of Gemini client
let genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return genAI;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatContext {
  id: string;
  content: string;
  score: number;
  namespace: string;
  documentId?: string;
  employeeId?: string;
  categorySlug?: string;
}

export interface ChatOptions {
  employeeId?: string;
  categoryId?: string;
  includeOrganization?: boolean;
  includePersonal?: boolean;
  topK?: number;
  minScore?: number;
  temperature?: number;
  maxTokens?: number;
  clearanceLevel?: 'basic' | 'standard' | 'advanced';
}

export interface ChatResponse {
  message: string;
  contexts: ChatContext[];
}

export interface StreamChunk {
  type: 'context' | 'chunk' | 'done' | 'error';
  data: ChatContext[] | string | null;
}

const SYSTEM_PROMPT = `당신은 회사의 내부 문서와 데이터를 기반으로 질문에 답변하는 AI 어시스턴트입니다.

주어진 컨텍스트 정보를 기반으로 정확하고 도움이 되는 답변을 제공하세요.

규칙:
1. 컨텍스트에 있는 정보만 사용하여 답변하세요.
2. 컨텍스트에 정보가 없으면 "제공된 정보에서 관련 내용을 찾을 수 없습니다"라고 답변하세요.
3. 답변은 한국어로 작성하세요.
4. 가능한 구체적이고 명확하게 답변하세요.
5. 필요한 경우 관련 세부 정보를 포함하세요.
6. 정보의 출처를 언급하지 마세요.`;

export class RAGChatService {
  /**
   * Generate RAG response (non-streaming)
   */
  async chat(
    messages: ChatMessage[],
    options: ChatOptions
  ): Promise<ChatResponse> {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    if (!lastUserMessage) {
      throw new Error('사용자 메시지가 필요합니다.');
    }

    // Get relevant context
    const contexts = await this.retrieveContext(lastUserMessage.content, options);

    // Build prompt with context
    const prompt = this.buildPrompt(messages, contexts);

    // Generate response using @google/genai
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 1024,
      },
    });

    const message = response.text || '';

    return {
      message,
      contexts,
    };
  }

  /**
   * Generate RAG response (streaming)
   */
  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions
  ): AsyncGenerator<StreamChunk> {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    if (!lastUserMessage) {
      throw new Error('사용자 메시지가 필요합니다.');
    }

    // Get relevant context first
    const contexts = await this.retrieveContext(lastUserMessage.content, options);

    // Yield contexts
    yield { type: 'context', data: contexts };

    // Build prompt with context
    const prompt = this.buildPrompt(messages, contexts);

    // Stream response using @google/genai
    const ai = getGenAI();
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 1024,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        yield { type: 'chunk', data: text };
      }
    }

    yield { type: 'done', data: null };
  }

  /**
   * Retrieve relevant context from Pinecone
   */
  private async retrieveContext(
    query: string,
    options: ChatOptions
  ): Promise<ChatContext[]> {
    const namespaces = await namespaceService.getQueryNamespaces({
      includeOrganization: options.includeOrganization ?? true,
      includePersonal: options.includePersonal ?? true,
      employeeId: options.employeeId,
      categoryId: options.categoryId,
    });

    if (namespaces.length === 0) {
      return [];
    }

    // Create embedding for the query
    const queryEmbedding = await createEmbedding(query);

    // Build filter for clearance level if specified
    const filter = options.clearanceLevel
      ? pineconeService.buildClearanceFilter(options.clearanceLevel)
      : undefined;

    // Search across all namespaces
    const resultsMap = await pineconeService.searchMultipleNamespaces(
      namespaces,
      queryEmbedding,
      {
        topK: options.topK ?? 10,
        filter,
        includeMetadata: true,
      }
    );

    // Merge results with namespace info
    const allResults: Array<SearchResult & { namespace: string }> = [];
    for (const [namespace, results] of resultsMap.entries()) {
      for (const result of results) {
        // Filter by minimum score
        if (result.score < (options.minScore ?? 0.5)) continue;
        allResults.push({ ...result, namespace });
      }
    }

    // Sort by score descending and take top K
    allResults.sort((a, b) => b.score - a.score);
    const topResults = allResults.slice(0, options.topK ?? 10);

    if (topResults.length === 0) {
      return [];
    }

    // Fetch content from database
    const pineconeIds = topResults.map((r) => r.id);
    const chunks = await db.query.knowledgeChunks.findMany({
      where: inArray(knowledgeChunks.pineconeId, pineconeIds),
      columns: {
        pineconeId: true,
        content: true,
        employeeId: true,
        categorySlug: true,
        documentId: true,
      },
    });

    const contentMap = new Map(
      chunks.map((c) => [c.pineconeId, c])
    );

    // Build context array with content
    const contexts: ChatContext[] = [];
    for (const result of topResults) {
      const chunk = contentMap.get(result.id);
      contexts.push({
        id: result.id,
        content: chunk?.content || '',
        score: result.score,
        namespace: result.namespace,
        documentId: chunk?.documentId || result.metadata?.documentId,
        employeeId: chunk?.employeeId || result.metadata?.employeeId,
        categorySlug: chunk?.categorySlug || result.metadata?.categoryId,
      });
    }

    return contexts;
  }

  /**
   * Build prompt with context and conversation history
   */
  private buildPrompt(messages: ChatMessage[], contexts: ChatContext[]): string {
    const contextText = this.formatContext(contexts);

    // Build conversation history
    const conversationHistory = messages
      .map((m) => {
        if (m.role === 'user') return `사용자: ${m.content}`;
        if (m.role === 'assistant') return `어시스턴트: ${m.content}`;
        return '';
      })
      .filter(Boolean)
      .join('\n\n');

    return `${SYSTEM_PROMPT}

## 관련 컨텍스트:
${contextText}

## 대화 내역:
${conversationHistory}

위 컨텍스트를 기반으로 마지막 사용자 질문에 답변해주세요.`;
  }

  /**
   * Format context for prompt
   */
  private formatContext(contexts: ChatContext[]): string {
    if (contexts.length === 0) {
      return '(관련 컨텍스트 없음)';
    }

    return contexts
      .map((ctx, i) => `[${i + 1}] (관련도: ${(ctx.score * 100).toFixed(1)}%)\n${ctx.content}`)
      .join('\n\n');
  }
}

export const ragChatService = new RAGChatService();
