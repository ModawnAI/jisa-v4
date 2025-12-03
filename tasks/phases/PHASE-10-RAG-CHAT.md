# Phase 10: RAG Chat System

**Duration**: 4 days
**Dependencies**: Phase 9 complete
**Deliverables**: Complete RAG chat with streaming, context management, data lineage

---

## Task 10.1: Chat Service

### 10.1.1 RAG Chat Service

**File**: `lib/services/rag-chat.service.ts`

```typescript
import OpenAI from 'openai';
import { pineconeService } from './pinecone.service';
import { namespaceService } from './namespace.service';
import { db } from '@/lib/db';
import { dataLineage } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatContext {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  namespace: string;
}

export interface ChatOptions {
  organizationId: string;
  employeeId?: string;
  includeOrganization?: boolean;
  includePersonal?: boolean;
  topK?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  message: string;
  contexts: ChatContext[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class RAGChatService {
  private readonly systemPrompt = `당신은 회사의 내부 문서와 데이터를 기반으로 질문에 답변하는 AI 어시스턴트입니다.

주어진 컨텍스트 정보를 기반으로 정확하고 도움이 되는 답변을 제공하세요.

규칙:
1. 컨텍스트에 있는 정보만 사용하여 답변하세요.
2. 컨텍스트에 정보가 없으면 "제공된 정보에서 관련 내용을 찾을 수 없습니다"라고 답변하세요.
3. 답변은 한국어로 작성하세요.
4. 가능한 구체적이고 명확하게 답변하세요.
5. 필요한 경우 관련 세부 정보를 포함하세요.`;

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
    const contextText = this.formatContext(contexts);
    const systemMessage = `${this.systemPrompt}\n\n## 관련 컨텍스트:\n${contextText}`;

    // Generate response
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemMessage },
        ...messages,
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
    });

    return {
      message: response.choices[0]?.message?.content || '',
      contexts,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Generate RAG response (streaming)
   */
  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions
  ): AsyncGenerator<{ type: 'context' | 'chunk' | 'done'; data: any }> {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    if (!lastUserMessage) {
      throw new Error('사용자 메시지가 필요합니다.');
    }

    // Get relevant context first
    const contexts = await this.retrieveContext(lastUserMessage.content, options);

    // Yield contexts
    yield { type: 'context', data: contexts };

    // Build prompt with context
    const contextText = this.formatContext(contexts);
    const systemMessage = `${this.systemPrompt}\n\n## 관련 컨텍스트:\n${contextText}`;

    // Stream response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemMessage },
        ...messages,
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { type: 'chunk', data: content };
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
    const namespaces = await namespaceService.getQueryNamespaces(
      '', // userId not needed for namespace lookup
      options.organizationId,
      {
        includeOrganization: options.includeOrganization ?? true,
        includePersonal: options.includePersonal ?? true,
        employeeId: options.employeeId,
      }
    );

    if (namespaces.length === 0) {
      return [];
    }

    const results = await pineconeService.queryMultiple(namespaces, query, {
      topK: options.topK || 10,
      includeMetadata: true,
    });

    // Merge and deduplicate
    const allResults = results
      .flatMap((r) =>
        r.results.map((result) => ({
          id: result.id,
          content: '', // Will be filled from lineage
          score: result.score,
          metadata: result.metadata || {},
          namespace: r.namespace,
        }))
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, options.topK || 10);

    // Fetch original content from lineage
    if (allResults.length > 0) {
      const vectorIds = allResults.map((r) => r.id);
      const lineageRecords = await db.query.dataLineage.findMany({
        where: inArray(dataLineage.vectorId, vectorIds),
      });

      const lineageMap = new Map(lineageRecords.map((r) => [r.vectorId, r]));

      for (const result of allResults) {
        const lineage = lineageMap.get(result.id);
        if (lineage) {
          result.content = lineage.embeddedContent;
        }
      }
    }

    return allResults;
  }

  /**
   * Format context for prompt
   */
  private formatContext(contexts: ChatContext[]): string {
    if (contexts.length === 0) {
      return '(관련 컨텍스트 없음)';
    }

    return contexts
      .map((ctx, i) => `[${i + 1}] (점수: ${ctx.score.toFixed(3)})\n${ctx.content}`)
      .join('\n\n');
  }
}

export const ragChatService = new RAGChatService();
```

### Tests for 10.1
- [ ] Chat without streaming
- [ ] Chat with streaming
- [ ] Context retrieval
- [ ] Context formatting

---

## Task 10.2: Chat API Routes

### 10.2.1 Chat API

**File**: `app/api/chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ragChatService } from '@/lib/services/rag-chat.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  organizationId: z.string().uuid(),
  employeeId: z.string().uuid().optional(),
  includeOrganization: z.boolean().default(true),
  includePersonal: z.boolean().default(true),
  stream: z.boolean().default(true),
  topK: z.number().min(1).max(20).default(10),
  temperature: z.number().min(0).max(2).default(0.7),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validated = chatSchema.parse(body);

  if (validated.stream) {
    // Streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of ragChatService.chatStream(
            validated.messages,
            {
              organizationId: validated.organizationId,
              employeeId: validated.employeeId,
              includeOrganization: validated.includeOrganization,
              includePersonal: validated.includePersonal,
              topK: validated.topK,
              temperature: validated.temperature,
            }
          )) {
            const data = JSON.stringify(chunk) + '\n';
            controller.enqueue(encoder.encode(data));
          }
        } catch (error: any) {
          const errorChunk = JSON.stringify({
            type: 'error',
            data: error.message,
          }) + '\n';
          controller.enqueue(encoder.encode(errorChunk));
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } else {
    // Non-streaming response
    const response = await ragChatService.chat(validated.messages, {
      organizationId: validated.organizationId,
      employeeId: validated.employeeId,
      includeOrganization: validated.includeOrganization,
      includePersonal: validated.includePersonal,
      topK: validated.topK,
      temperature: validated.temperature,
    });

    return NextResponse.json(response);
  }
});
```

### Tests for 10.2
- [ ] Streaming response
- [ ] Non-streaming response
- [ ] Error handling

---

## Task 10.3: Chat UI Components

### 10.3.1 Chat Page

**File**: `app/(admin)/chat/page.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/provider';
import { PageHeader } from '@/components/admin/page-header';
import { ChatMessages } from './_components/chat-messages';
import { ChatInput } from './_components/chat-input';
import { ChatSettings } from './_components/chat-settings';
import { ContextPanel } from './_components/context-panel';
import { Card } from '@/components/ui/card';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contexts?: any[];
  timestamp: Date;
}

interface ChatSettings {
  includeOrganization: boolean;
  includePersonal: boolean;
  topK: number;
  temperature: number;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>({
    includeOrganization: true,
    includePersonal: true,
    topK: 10,
    temperature: 0.7,
  });
  const [selectedContext, setSelectedContext] = useState<any[] | null>(null);

  const { user } = useAuth();
  const searchParams = useSearchParams();
  const employeeId = searchParams.get('employeeId') || user?.employeeId;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!content.trim() || !user?.organizationId) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          organizationId: user.organizationId,
          employeeId,
          ...settings,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const chunk = JSON.parse(line);

            if (chunk.type === 'context') {
              assistantMessage = { ...assistantMessage, contexts: chunk.data };
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMessage.id ? assistantMessage : m))
              );
            } else if (chunk.type === 'chunk') {
              assistantMessage = {
                ...assistantMessage,
                content: assistantMessage.content + chunk.data,
              };
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMessage.id ? assistantMessage : m))
              );
            } else if (chunk.type === 'error') {
              throw new Error(chunk.data);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `오류가 발생했습니다: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setSelectedContext(null);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        <PageHeader
          title="AI 채팅"
          description={
            employeeId
              ? '직원 전용 문서와 전사 공통 문서를 기반으로 답변합니다.'
              : '전사 공통 문서를 기반으로 답변합니다.'
          }
        >
          <ChatSettings settings={settings} onSettingsChange={setSettings} />
        </PageHeader>

        <Card className="flex flex-1 flex-col overflow-hidden">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            onContextClick={setSelectedContext}
          />
          <div ref={messagesEndRef} />
          <ChatInput
            onSend={handleSend}
            onClear={handleClear}
            isLoading={isLoading}
            disabled={!user?.organizationId}
          />
        </Card>
      </div>

      {/* Context Panel */}
      {selectedContext && (
        <ContextPanel
          contexts={selectedContext}
          onClose={() => setSelectedContext(null)}
        />
      )}
    </div>
  );
}
```

### 10.3.2 Chat Messages Component

**File**: `app/(admin)/chat/_components/chat-messages.tsx`

```typescript
'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Robot, User, Info } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contexts?: any[];
  timestamp: Date;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  onContextClick: (contexts: any[]) => void;
}

export function ChatMessages({
  messages,
  isLoading,
  onContextClick,
}: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <Robot className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">AI 어시스턴트</h3>
          <p className="text-muted-foreground">
            회사 문서를 기반으로 질문에 답변해 드립니다.
            <br />
            궁금한 점을 입력해 주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex gap-3',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {message.role === 'assistant' && (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Robot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          )}

          <div
            className={cn(
              'max-w-[80%] rounded-lg px-4 py-2',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            )}
          >
            {message.role === 'assistant' ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            ) : (
              <p>{message.content}</p>
            )}

            {message.role === 'assistant' && message.contexts && message.contexts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 -ml-2"
                onClick={() => onContextClick(message.contexts!)}
              >
                <Info className="mr-1 h-4 w-4" />
                {message.contexts.length}개 참조 문서 보기
              </Button>
            )}
          </div>

          {message.role === 'user' && (
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Robot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="bg-muted rounded-lg px-4 py-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 10.3.3 Chat Input Component

**File**: `app/(admin)/chat/_components/chat-input.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PaperPlaneRight, Trash } from '@phosphor-icons/react';

interface ChatInputProps {
  onSend: (content: string) => void;
  onClear: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export function ChatInput({ onSend, onClear, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className="border-t p-4">
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="질문을 입력하세요... (Shift+Enter로 줄바꿈)"
          className="min-h-[44px] max-h-[200px] resize-none"
          disabled={disabled || isLoading}
          rows={1}
        />
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading || disabled}
            size="icon"
          >
            <PaperPlaneRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={onClear}
            variant="outline"
            size="icon"
            disabled={isLoading}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 10.3.4 Context Panel Component

**File**: `app/(admin)/chat/_components/context-panel.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, FileText, ArrowSquareOut } from '@phosphor-icons/react';
import Link from 'next/link';

interface Context {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  namespace: string;
}

interface ContextPanelProps {
  contexts: Context[];
  onClose: () => void;
}

export function ContextPanel({ contexts, onClose }: ContextPanelProps) {
  return (
    <Card className="w-96 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">참조 문서</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="space-y-3 p-4">
            {contexts.map((context, index) => (
              <div
                key={context.id}
                className="rounded-lg border p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">문서 {index + 1}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {(context.score * 100).toFixed(1)}%
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-4">
                  {context.content}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>네임스페이스: {context.namespace}</span>
                  {context.metadata?.documentId && (
                    <Link
                      href={`/lineage?vectorId=${context.id}`}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      계보 보기
                      <ArrowSquareOut className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

### Tests for 10.3
- [ ] Chat page rendering
- [ ] Message streaming
- [ ] Context panel display
- [ ] Input handling

---

## Phase Completion Checklist

- [ ] RAG chat service
- [ ] Streaming support
- [ ] Context retrieval
- [ ] Chat API route
- [ ] Chat UI components
- [ ] Message display
- [ ] Context panel
- [ ] Settings panel
- [ ] All tests passing

---

## Next Phase

→ [Phase 11: Data Lineage & Conflicts](./PHASE-11-LINEAGE.md)
