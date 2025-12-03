'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChatCircle, User, Robot, CaretDown, CaretUp, Spinner } from '@phosphor-icons/react';
import { formatDate, formatRelative } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourceChunkIds?: string[];
  ragContext?: Record<string, unknown>;
  promptTokens?: number;
  completionTokens?: number;
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface ChatHistoryResponse {
  sessions: ChatSession[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface EmployeeChatHistoryProps {
  employeeId: string;
}

export function EmployeeChatHistory({ employeeId }: EmployeeChatHistoryProps) {
  const [data, setData] = useState<ChatHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchChatHistory() {
      try {
        setLoading(true);
        const res = await fetch(`/api/employees/${employeeId}/chats`);
        const result = await res.json();

        if (!result.success) {
          throw new Error(result.error?.message || '채팅 내역을 불러올 수 없습니다.');
        }

        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchChatHistory();
  }, [employeeId]);

  const toggleSession = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ChatCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="font-medium text-destructive">오류 발생</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.sessions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ChatCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium">채팅 내역이 없습니다</h3>
          <p className="text-sm text-muted-foreground mt-1">
            이 직원의 AI 채팅 내역이 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          총 {data.total}개의 채팅 세션
        </p>
        {data.hasMore && (
          <Button variant="outline" size="sm">
            더 보기
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {data.sessions.map((session) => (
          <Card key={session.id}>
            <Collapsible
              open={expandedSessions.has(session.id)}
              onOpenChange={() => toggleSession(session.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChatCircle className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {session.title || '무제 대화'}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatRelative(session.updatedAt)}
                          <span className="mx-1">-</span>
                          {session.messages.length}개 메시지
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {formatDate(session.createdAt)}
                      </Badge>
                      {expandedSessions.has(session.id) ? (
                        <CaretUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <CaretDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {session.summary && (
                    <p className="text-sm text-muted-foreground mb-4 italic">
                      {session.summary}
                    </p>
                  )}
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {session.messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? '' : ''}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-primary/10' : 'bg-muted'
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary" />
        ) : (
          <Robot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">
            {isUser ? '사용자' : 'AI 어시스턴트'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {message.promptTokens && message.completionTokens && (
            <Badge variant="outline" className="text-xs">
              {message.promptTokens + message.completionTokens} tokens
            </Badge>
          )}
        </div>
        <div
          className={`rounded-lg p-3 text-sm ${
            isUser ? 'bg-primary/5' : 'bg-muted'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.sourceChunkIds && message.sourceChunkIds.length > 0 && (
          <p className="text-xs text-muted-foreground">
            참조: {(message.sourceChunkIds as string[]).length}개 문서 청크
          </p>
        )}
      </div>
    </div>
  );
}
