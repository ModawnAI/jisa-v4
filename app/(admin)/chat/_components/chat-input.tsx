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
