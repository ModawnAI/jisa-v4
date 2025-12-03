# Phase 3: Admin Layout & Navigation

**Duration**: 2-3 days
**Dependencies**: Phase 2 complete
**Deliverables**: Complete admin shell with sidebar, header, breadcrumbs

---

## Task 3.1: Layout Structure

### 3.1.1 Admin Layout

**File**: `app/(admin)/layout.tsx`

```typescript
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminHeader } from '@/components/admin/header';
import { AuthProvider } from '@/lib/auth/provider';

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <AdminHeader />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
```

### 3.1.2 Loading State

**File**: `app/(admin)/loading.tsx`

```typescript
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Content skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>

      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
```

### Tests for 3.1
- [ ] Layout rendering test
- [ ] Auth redirect test
- [ ] Loading state test

---

## Task 3.2: Sidebar Component

### 3.2.1 Sidebar Navigation Config

**File**: `lib/config/navigation.ts`

```typescript
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
```

### 3.2.2 Sidebar Component

**File**: `components/admin/sidebar.tsx`

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/provider';
import { navigation, type NavItem } from '@/lib/config/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const filterByPermission = (item: NavItem): boolean => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">J</span>
            </div>
            <span className="font-semibold">지사앱</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', collapsed && 'mx-auto')}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <CaretRight className="h-4 w-4" />
          ) : (
            <CaretLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-2">
          <TooltipProvider delayDuration={0}>
            {navigation.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-2">
                {section.title && !collapsed && (
                  <div className="mb-1 px-3 py-2 text-xs font-medium text-muted-foreground">
                    {section.title}
                  </div>
                )}
                {section.items.filter(filterByPermission).map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isActive(item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            ))}
          </TooltipProvider>
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-2">
        {/* Version info or additional actions */}
      </div>
    </aside>
  );
}

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

function NavLink({ item, isActive, collapsed }: NavLinkProps) {
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" weight={isActive ? 'fill' : 'regular'} />
      {!collapsed && (
        <>
          <span className="flex-1">{item.title}</span>
          {item.badge && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">
          <p>{item.title}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}
```

### Tests for 3.2
- [ ] Sidebar rendering
- [ ] Collapsed state
- [ ] Permission filtering
- [ ] Active state detection

---

## Task 3.3: Header Component

### 3.3.1 Admin Header

**File**: `components/admin/header.tsx`

```typescript
'use client';

import { useAuth } from '@/lib/auth/provider';
import { Breadcrumbs } from './breadcrumbs';
import { UserMenu } from './user-menu';
import { NotificationBell } from './notification-bell';
import { SearchCommand } from './search-command';
import { ModeToggle } from '@/components/ui/mode-toggle';

export function AdminHeader() {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Left: Breadcrumbs */}
      <Breadcrumbs />

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <SearchCommand />
        <ModeToggle />
        <NotificationBell />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
```

### 3.3.2 Breadcrumbs

**File**: `components/admin/breadcrumbs.tsx`

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import { House, CaretRight } from '@phosphor-icons/react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const routeLabels: Record<string, string> = {
  dashboard: '대시보드',
  employees: '직원 관리',
  categories: '카테고리',
  templates: '템플릿',
  documents: '문서',
  upload: '업로드',
  chat: 'AI 채팅',
  lineage: '데이터 계보',
  analytics: '분석',
  settings: '설정',
  security: '보안',
  new: '새로 만들기',
  edit: '수정',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on dashboard
  if (segments.length <= 1 && segments[0] === 'dashboard') {
    return (
      <div className="flex items-center gap-2 text-lg font-semibold">
        <House className="h-5 w-5" />
        <span>대시보드</span>
      </div>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard" className="flex items-center gap-1">
              <House className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {segments.map((segment, index) => {
          const href = '/' + segments.slice(0, index + 1).join('/');
          const isLast = index === segments.length - 1;
          const label = routeLabels[segment] || segment;

          // Skip UUID segments (show as "상세")
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
          const displayLabel = isUuid ? '상세' : label;

          return (
            <Fragment key={segment}>
              <BreadcrumbSeparator>
                <CaretRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{displayLabel}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{displayLabel}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
```

### 3.3.3 User Menu

**File**: `components/admin/user-menu.tsx`

```typescript
'use client';

import { useAuth } from '@/lib/auth/provider';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Gear, SignOut, Question } from '@phosphor-icons/react';

interface UserMenuProps {
  user: {
    name?: string;
    email: string;
    avatarUrl?: string;
    role: string;
  } | null;
}

const roleLabels: Record<string, string> = {
  super_admin: '최고 관리자',
  org_admin: '조직 관리자',
  manager: '매니저',
  employee: '직원',
  viewer: '뷰어',
};

export function UserMenu({ user }: UserMenuProps) {
  const { signOut } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user.email[0].toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatarUrl} alt={user.name || user.email} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name || '사용자'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {roleLabels[user.role] || user.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/profile')}>
            <User className="mr-2 h-4 w-4" />
            <span>프로필</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Gear className="mr-2 h-4 w-4" />
            <span>설정</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open('/help', '_blank')}>
            <Question className="mr-2 h-4 w-4" />
            <span>도움말</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <SignOut className="mr-2 h-4 w-4" />
          <span>로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3.3.4 Search Command

**File**: `components/admin/search-command.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { MagnifyingGlass, Users, FileText, Tag, Robot } from '@phosphor-icons/react';
import { navigation } from '@/lib/config/navigation';

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-9 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <MagnifyingGlass className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">검색...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="검색어를 입력하세요..." />
        <CommandList>
          <CommandEmpty>결과가 없습니다.</CommandEmpty>

          <CommandGroup heading="빠른 이동">
            {navigation.flatMap((section) =>
              section.items.map((item) => (
                <CommandItem
                  key={item.href}
                  onSelect={() => handleSelect(item.href)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                </CommandItem>
              ))
            )}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="빠른 작업">
            <CommandItem onSelect={() => handleSelect('/employees/new')}>
              <Users className="mr-2 h-4 w-4" />
              <span>새 직원 추가</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/documents/upload')}>
              <FileText className="mr-2 h-4 w-4" />
              <span>문서 업로드</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/categories/new')}>
              <Tag className="mr-2 h-4 w-4" />
              <span>새 카테고리</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/chat')}>
              <Robot className="mr-2 h-4 w-4" />
              <span>AI 채팅 시작</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
```

### Tests for 3.3
- [ ] Header rendering
- [ ] Breadcrumbs path parsing
- [ ] User menu actions
- [ ] Search command keyboard shortcut

---

## Task 3.4: UI Components

### 3.4.1 Mode Toggle (Dark/Light)

**File**: `components/ui/mode-toggle.tsx`

```typescript
'use client';

import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ModeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">테마 변경</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          라이트
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          다크
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          시스템
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3.4.2 Notification Bell

**File**: `components/admin/notification-bell.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Bell } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: '문서 처리 완료',
      message: '급여명세서.xlsx 처리가 완료되었습니다.',
      time: '5분 전',
      read: false,
    },
    {
      id: '2',
      title: '새 직원 등록',
      message: '김철수 님이 시스템에 등록되었습니다.',
      time: '1시간 전',
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">알림</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <h4 className="font-medium">알림</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              모두 읽음
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              알림이 없습니다
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-muted/50 ${
                    !notification.read ? 'bg-muted/30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium">{notification.title}</p>
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {notification.time}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
```

### Tests for 3.4
- [ ] Mode toggle theme switching
- [ ] Notification bell badge
- [ ] Mark all read functionality

---

## Task 3.5: Page Header Component

### 3.5.1 Page Header

**File**: `components/admin/page-header.tsx`

```typescript
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex items-start justify-between', className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
```

### 3.5.2 Stat Card

**File**: `components/admin/stat-card.tsx`

```typescript
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendUp, TrendDown } from '@phosphor-icons/react/dist/ssr';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {trend && (
              <span
                className={cn(
                  'flex items-center',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? (
                  <TrendUp className="h-3 w-3" />
                ) : (
                  <TrendDown className="h-3 w-3" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Tests for 3.5
- [ ] Page header rendering
- [ ] Stat card with trends
- [ ] Icon display

---

## Phase Completion Checklist

- [ ] Admin layout with sidebar and header
- [ ] Collapsible sidebar working
- [ ] Breadcrumbs auto-generated
- [ ] User menu with sign out
- [ ] Search command (Cmd+K)
- [ ] Dark/light mode toggle
- [ ] Notification bell
- [ ] Page header component
- [ ] Stat card component
- [ ] All components responsive
- [ ] Permission-based nav filtering

---

## Next Phase

→ [Phase 4: Employee Management](./PHASE-04-EMPLOYEES.md)
