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
  namespace: string;
  documentId?: string;
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
                  {context.documentId && (
                    <Link
                      href={`/documents/${context.documentId}`}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      문서 보기
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
