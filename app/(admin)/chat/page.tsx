'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatMessages } from './_components/chat-messages';
import { ChatInput } from './_components/chat-input';
import { ChatSettings } from './_components/chat-settings';
import { ContextPanel } from './_components/context-panel';
import { Card } from '@/components/ui/card';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contexts?: Array<{
    id: string;
    content: string;
    score: number;
    namespace: string;
    documentId?: string;
  }>;
  timestamp: Date;
}

interface Settings {
  includeOrganization: boolean;
  includePersonal: boolean;
  topK: number;
  temperature: number;
}

function ChatPageContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    includeOrganization: true,
    includePersonal: true,
    topK: 10,
    temperature: 0.7,
  });
  const [selectedContext, setSelectedContext] = useState<Message['contexts'] | null>(null);

  const searchParams = useSearchParams();
  const employeeId = searchParams.get('employeeId');
  const categoryId = searchParams.get('categoryId');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!content.trim()) return;

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
          employeeId: employeeId || undefined,
          categoryId: categoryId || undefined,
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
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI 채팅</h1>
            <p className="text-muted-foreground">
              {employeeId
                ? '직원 전용 문서와 전사 공통 문서를 기반으로 답변합니다.'
                : '전사 공통 문서를 기반으로 답변합니다.'}
            </p>
          </div>
          <ChatSettings settings={settings} onSettingsChange={setSettings} />
        </div>

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
            disabled={false}
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

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">로딩중...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
