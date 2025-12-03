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
  contexts?: Array<{
    id: string;
    content: string;
    score: number;
    namespace: string;
  }>;
  timestamp: Date;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  onContextClick: (contexts: Message['contexts']) => void;
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
                onClick={() => onContextClick(message.contexts)}
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
