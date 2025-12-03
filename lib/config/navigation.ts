import {
  House,
  Users,
  FolderOpen,
  FileText,
  Robot,
  Gear,
  ChartBar,
  ClockCounterClockwise,
  Tag,
  FileXls,
  Shield,
  Database,
  Key,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';

export interface NavItem {
  title: string;
  href: string;
  icon: Icon;
  permission?: string;
  badge?: string | number;
  children?: NavItem[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    items: [
      {
        title: '대시보드',
        href: '/dashboard',
        icon: House,
      },
    ],
  },
  {
    title: '직원 관리',
    items: [
      {
        title: '직원 목록',
        href: '/employees',
        icon: Users,
        permission: 'employees.read',
      },
      {
        title: '인증 코드',
        href: '/verification-codes',
        icon: Key,
        permission: 'employees.read',
      },
    ],
  },
  {
    title: '문서 관리',
    items: [
      {
        title: '카테고리',
        href: '/categories',
        icon: Tag,
        permission: 'categories.read',
      },
      {
        title: '템플릿',
        href: '/templates',
        icon: FileXls,
        permission: 'templates.read',
      },
      {
        title: '문서 업로드',
        href: '/documents/upload',
        icon: FolderOpen,
        permission: 'documents.create',
      },
      {
        title: '문서 목록',
        href: '/documents',
        icon: FileText,
        permission: 'documents.read',
      },
    ],
  },
  {
    title: 'RAG 시스템',
    items: [
      {
        title: 'AI 채팅',
        href: '/chat',
        icon: Robot,
        permission: 'rag.query',
      },
      {
        title: '벡터 탐색기',
        href: '/vectors',
        icon: Database,
        permission: 'rag.viewLineage',
      },
      {
        title: '데이터 계보',
        href: '/lineage',
        icon: ClockCounterClockwise,
        permission: 'rag.viewLineage',
      },
    ],
  },
  {
    title: '시스템',
    items: [
      {
        title: '분석',
        href: '/analytics',
        icon: ChartBar,
        permission: 'admin.viewAuditLogs',
      },
      {
        title: '설정',
        href: '/settings',
        icon: Gear,
        permission: 'admin.manageSettings',
      },
      {
        title: '보안',
        href: '/security',
        icon: Shield,
        permission: 'admin.manageUsers',
      },
    ],
  },
];
