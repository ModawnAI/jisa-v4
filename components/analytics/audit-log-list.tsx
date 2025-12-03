'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListBullets, ChatCircle, FileText, User } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface AuditLogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: Date;
  type: 'query' | 'document' | 'user';
}

interface AuditLogListProps {
  entries: AuditLogEntry[];
}

const TYPE_CONFIG = {
  query: {
    icon: ChatCircle,
    variant: 'secondary' as const,
    label: '질문',
  },
  document: {
    icon: FileText,
    variant: 'outline' as const,
    label: '문서',
  },
  user: {
    icon: User,
    variant: 'default' as const,
    label: '사용자',
  },
};

export function AuditLogList({ entries }: AuditLogListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListBullets className="h-5 w-5" />
          감사 로그
        </CardTitle>
        <CardDescription>시스템 활동 내역을 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length > 0 ? (
          <div className="space-y-4">
            {entries.map((entry, index) => {
              const config = TYPE_CONFIG[entry.type];
              const Icon = config.icon;
              const timeAgo = formatDistanceToNow(new Date(entry.timestamp), {
                addSuffix: true,
                locale: ko,
              });

              return (
                <div
                  key={entry.id}
                  className={`flex items-start gap-3 ${
                    index < entries.length - 1 ? 'border-b pb-3' : ''
                  }`}
                >
                  <div className="mt-0.5 rounded-full bg-muted p-1.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{entry.action}</p>
                      <Badge variant={config.variant} className="text-xs">
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {entry.details}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            <p>최근 활동이 없습니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
