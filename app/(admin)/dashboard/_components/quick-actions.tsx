import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  UserPlus,
  Upload,
  Chats,
  Tag,
  FileXls,
  Lightning,
} from '@phosphor-icons/react/dist/ssr';

const actions = [
  {
    title: '직원 추가',
    href: '/employees/new',
    icon: UserPlus,
    description: '새 직원을 등록합니다',
  },
  {
    title: '문서 업로드',
    href: '/documents/upload',
    icon: Upload,
    description: 'Excel 파일을 업로드합니다',
  },
  {
    title: 'AI 채팅',
    href: '/chat',
    icon: Chats,
    description: 'RAG 시스템과 대화합니다',
  },
  {
    title: '카테고리 관리',
    href: '/categories',
    icon: Tag,
    description: '카테고리를 관리합니다',
  },
  {
    title: '템플릿 관리',
    href: '/templates',
    icon: FileXls,
    description: 'Excel 템플릿을 관리합니다',
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightning className="h-5 w-5" />
          빠른 작업
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <Button
            key={action.href}
            variant="outline"
            className="w-full justify-start h-auto py-3"
            asChild
          >
            <Link href={action.href}>
              <action.icon className="mr-3 h-4 w-4 shrink-0" />
              <div className="text-left">
                <div className="font-medium">{action.title}</div>
                <div className="text-xs text-muted-foreground">
                  {action.description}
                </div>
              </div>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
