# UI/UX 패턴 가이드

> ContractorHub의 일관된 사용자 인터페이스 가이드라인

---

## 1. 디자인 시스템

### 1.1 색상 팔레트 (CSS 변수)

```css
/* 라이트 모드 */
:root {
  --background: #ffffff;
  --foreground: #0f1419;
  --card: #f7f8f8;
  --card-foreground: #0f1419;
  --primary: #1e9df1;        /* 메인 액션 */
  --primary-foreground: #ffffff;
  --secondary: #0f1419;
  --secondary-foreground: #ffffff;
  --muted: #e5e5e6;
  --muted-foreground: #0f1419;
  --accent: #e3ecf6;
  --accent-foreground: #1e9df1;
  --destructive: #f4212e;    /* 삭제/에러 */
  --destructive-foreground: #ffffff;
  --border: #e1eaef;
  --input: #f7f9fa;
  --ring: #1da1f2;
}

/* 상태 색상 */
--success: #00b87a;           /* 성공 */
--warning: #f7b928;           /* 경고 */
--info: #1e9df1;              /* 정보 */
--error: #f4212e;             /* 에러 */
```

### 1.2 타이포그래피

```css
/* 폰트 패밀리 */
--font-sans: 'Noto Sans KR', system-ui, sans-serif;

/* 폰트 크기 */
text-xs: 0.75rem;    /* 12px - 캡션 */
text-sm: 0.875rem;   /* 14px - 본문 보조 */
text-base: 1rem;     /* 16px - 본문 기본 */
text-lg: 1.125rem;   /* 18px - 강조 */
text-xl: 1.25rem;    /* 20px - 소제목 */
text-2xl: 1.5rem;    /* 24px - 제목 */
text-3xl: 1.875rem;  /* 30px - 대제목 */

/* 폰트 굵기 */
font-normal: 400;
font-medium: 500;
font-semibold: 600;
font-bold: 700;
```

### 1.3 간격 (Spacing)

```css
/* 기본 단위: 4px */
space-1: 0.25rem;   /* 4px */
space-2: 0.5rem;    /* 8px */
space-3: 0.75rem;   /* 12px */
space-4: 1rem;      /* 16px */
space-5: 1.25rem;   /* 20px */
space-6: 1.5rem;    /* 24px */
space-8: 2rem;      /* 32px */
space-10: 2.5rem;   /* 40px */
space-12: 3rem;     /* 48px */
```

### 1.4 반경 (Border Radius)

```css
--radius: 1.3rem;            /* 기본 */
--radius-sm: calc(1.3rem - 4px);  /* 작은 요소 */
--radius-md: calc(1.3rem - 2px);  /* 중간 */
--radius-lg: 1.3rem;              /* 큰 요소 */
--radius-xl: calc(1.3rem + 4px);  /* 카드 */
```

---

## 2. 레이아웃 패턴

### 2.1 관리자 레이아웃

```
+------------------------------------------------------------------+
|  [로고]        ContractorHub 관리자                    [알림] [사용자] |
+------------------------------------------------------------------+
|         |                                                        |
|  사이드바  |                  메인 콘텐츠                            |
|         |                                                        |
|  -----  |  +----------------------------------------------------+  |
|  대시보드 |  |  페이지 제목                           [액션 버튼]  |  |
|  직원관리 |  +----------------------------------------------------+  |
|  카테고리 |  |                                                    |  |
|  템플릿  |  |  콘텐츠 영역                                        |  |
|  문서관리 |  |                                                    |  |
|  분석    |  |                                                    |  |
|         |  |                                                    |  |
|         |  +----------------------------------------------------+  |
+------------------------------------------------------------------+
```

```tsx
// components/layout/admin-layout.tsx
'use client';

import { useState } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <AdminHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex">
        {/* 사이드바 */}
        <AdminSidebar isOpen={sidebarOpen} />

        {/* 메인 콘텐츠 */}
        <main
          className={cn(
            'flex-1 p-6 transition-all duration-300',
            sidebarOpen ? 'ml-64' : 'ml-16'
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 2.2 페이지 헤더 패턴

```tsx
// components/shared/page-header.tsx
import { ArrowLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  backHref,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-6 border-b border-border">
      <div className="flex items-center gap-4">
        {backHref && (
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}>
              <ArrowLeft size={20} />
            </Link>
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

### 2.3 데이터 테이블 패턴

```tsx
// components/shared/data-table.tsx
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  MagnifyingGlass,
  CaretUp,
  CaretDown,
  FunnelSimple,
} from '@phosphor-icons/react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  isLoading?: boolean;
  emptyMessage?: string;
  actions?: (item: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchPlaceholder = '검색...',
  onSearch,
  onSort,
  sortKey,
  sortOrder,
  isLoading,
  emptyMessage = '데이터가 없습니다',
  actions,
}: DataTableProps<T>) {
  return (
    <div className="space-y-4">
      {/* 검색 바 */}
      {onSearch && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              placeholder={searchPlaceholder}
              className="pl-9"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <FunnelSimple size={16} />
          </Button>
        </div>
      )}

      {/* 테이블 */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={cn(
                    column.sortable && 'cursor-pointer hover:bg-muted',
                    column.className
                  )}
                  onClick={() =>
                    column.sortable &&
                    onSort?.(
                      String(column.key),
                      sortKey === column.key && sortOrder === 'asc' ? 'desc' : 'asc'
                    )
                  }
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && sortKey === column.key && (
                      sortOrder === 'asc' ? (
                        <CaretUp size={14} />
                      ) : (
                        <CaretDown size={14} />
                      )
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead className="w-[100px]">작업</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="h-24 text-center"
                >
                  <LoadingSpinner />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  {columns.map((column) => (
                    <TableCell key={String(column.key)} className={column.className}>
                      {column.render
                        ? column.render(item)
                        : String(item[column.key as keyof T] ?? '-')}
                    </TableCell>
                  ))}
                  {actions && <TableCell>{actions(item)}</TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

---

## 3. 컴포넌트 패턴

### 3.1 폼 필드 패턴

```tsx
// 일관된 폼 필드 스타일
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>
        필드 레이블
        {required && <span className="text-destructive ml-1">*</span>}
      </FormLabel>
      <FormControl>
        <div className="relative">
          <IconComponent
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input {...field} placeholder="플레이스홀더" className="pl-9" />
        </div>
      </FormControl>
      <FormDescription>도움말 텍스트</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

### 3.2 상태 배지 패턴

```tsx
// components/shared/status-badge.tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Status = 'active' | 'inactive' | 'pending' | 'error';

const STATUS_CONFIG = {
  active: {
    label: '활성',
    variant: 'default',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  inactive: {
    label: '비활성',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  },
  pending: {
    label: '대기',
    variant: 'outline',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  error: {
    label: '오류',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
} as const;

interface StatusBadgeProps {
  status: Status;
  customLabel?: string;
}

export function StatusBadge({ status, customLabel }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge className={cn('font-medium', config.className)}>
      {customLabel || config.label}
    </Badge>
  );
}
```

### 3.3 권한 레벨 배지

```tsx
// components/shared/clearance-badge.tsx
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Shield, ShieldWarning } from '@phosphor-icons/react';
import type { ClearanceLevel } from '@/lib/types/employee';

const CLEARANCE_CONFIG = {
  basic: {
    label: '기본',
    icon: Shield,
    className: 'bg-gray-100 text-gray-700',
  },
  standard: {
    label: '표준',
    icon: ShieldCheck,
    className: 'bg-blue-100 text-blue-700',
  },
  advanced: {
    label: '고급',
    icon: ShieldWarning,
    className: 'bg-purple-100 text-purple-700',
  },
} as const;

interface ClearanceBadgeProps {
  level: ClearanceLevel;
  showIcon?: boolean;
}

export function ClearanceBadge({ level, showIcon = true }: ClearanceBadgeProps) {
  const config = CLEARANCE_CONFIG[level];
  const Icon = config.icon;

  return (
    <Badge className={cn('font-medium', config.className)}>
      {showIcon && <Icon size={14} className="mr-1" />}
      {config.label}
    </Badge>
  );
}
```

### 3.4 확인 다이얼로그 패턴

```tsx
// components/shared/confirm-dialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Warning } from '@phosphor-icons/react';

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'default',
  onConfirm,
  isLoading,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {variant === 'destructive' && (
              <div className="p-2 rounded-full bg-destructive/10">
                <Warning size={24} className="text-destructive" />
              </div>
            )}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={variant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {isLoading ? '처리 중...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 3.5 로딩 상태 패턴

```tsx
// components/shared/loading-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2">
      {/* 헤더 */}
      <div className="flex gap-4 p-3 bg-muted/50 rounded-t-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* 행들 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-3 border-b">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 border border-border rounded-lg space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-4">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}
```

---

## 4. 아이콘 사용 (Phosphor Icons)

### 4.1 아이콘 임포트

```tsx
// lucide 대신 @phosphor-icons/react 사용
import {
  // 네비게이션
  House,
  Users,
  Folder,
  FileText,
  ChartBar,
  Gear,

  // 액션
  Plus,
  Pencil,
  Trash,
  MagnifyingGlass,
  FunnelSimple,
  ArrowLeft,
  ArrowRight,
  Check,
  X,

  // 상태
  CheckCircle,
  XCircle,
  Warning,
  Info,
  Spinner,

  // 기타
  CaretUp,
  CaretDown,
  DotsThreeVertical,
  Download,
  Upload,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react';
```

### 4.2 아이콘 크기 표준

```tsx
// 아이콘 크기 표준
size={14}  // 작은 인라인 아이콘 (배지, 라벨)
size={16}  // 기본 인라인 아이콘 (버튼 내)
size={20}  // 중간 아이콘 (네비게이션)
size={24}  // 큰 아이콘 (액션, 상태)
size={32}  // 특대 아이콘 (빈 상태)
```

### 4.3 아이콘 버튼 패턴

```tsx
// 아이콘만 있는 버튼
<Button variant="ghost" size="icon" aria-label="편집">
  <Pencil size={16} />
</Button>

// 아이콘 + 텍스트 버튼
<Button>
  <Plus size={16} className="mr-2" />
  직원 추가
</Button>
```

---

## 5. 반응형 고려사항

### 5.1 PC 최적화 (1280px+)

```tsx
// 관리자 화면은 PC 최적화 (최소 1280px)
// 테이블, 폼 등은 넓은 화면 기준으로 설계

// 사이드바: 고정 240px
// 메인 콘텐츠: 나머지 영역

// 테이블 컬럼: 여유있게 배치
// 폼: 2컬럼 레이아웃 활용
```

### 5.2 그리드 레이아웃

```tsx
// 대시보드 카드 그리드
<div className="grid grid-cols-4 gap-6">
  <StatsCard />
  <StatsCard />
  <StatsCard />
  <StatsCard />
</div>

// 2컬럼 폼 레이아웃
<div className="grid grid-cols-2 gap-6">
  <FormField />
  <FormField />
</div>

// 사이드 패널 레이아웃
<div className="grid grid-cols-[1fr_320px] gap-6">
  <MainContent />
  <SidePanel />
</div>
```

---

## 6. 토스트 알림 패턴

```tsx
// hooks/use-toast.ts 활용
import { useToast } from '@/hooks/use-toast';

function MyComponent() {
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: '저장 완료',
      description: '직원 정보가 저장되었습니다.',
      variant: 'default',
    });
  };

  const handleError = () => {
    toast({
      title: '저장 실패',
      description: '직원 정보 저장 중 오류가 발생했습니다.',
      variant: 'destructive',
    });
  };
}
```

---

## 7. 빈 상태 패턴

```tsx
// components/shared/empty-state.tsx
import { Folder, Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon = Folder,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Icon size={32} className="text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          <Plus size={16} className="mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

---

## 8. 카드 패턴

```tsx
// 통계 카드
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      전체 직원
    </CardTitle>
    <Users size={20} className="text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">128</div>
    <p className="text-xs text-muted-foreground mt-1">
      전월 대비 +12명
    </p>
  </CardContent>
</Card>

// 정보 카드
<Card>
  <CardHeader>
    <CardTitle>직원 정보</CardTitle>
    <CardDescription>기본 정보를 수정합니다</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 콘텐츠 */}
  </CardContent>
  <CardFooter className="flex justify-end gap-2">
    <Button variant="outline">취소</Button>
    <Button>저장</Button>
  </CardFooter>
</Card>
```

---

## 9. 접근성 (A11y)

### 9.1 필수 속성

```tsx
// 버튼에 aria-label
<Button variant="ghost" size="icon" aria-label="메뉴 열기">
  <List size={20} />
</Button>

// 폼 필드 연결
<Label htmlFor="email">이메일</Label>
<Input id="email" name="email" type="email" />

// 에러 메시지 연결
<Input
  id="email"
  aria-describedby="email-error"
  aria-invalid={!!error}
/>
<p id="email-error" className="text-destructive text-sm">
  {error}
</p>
```

### 9.2 포커스 관리

```tsx
// 모달 열릴 때 첫 입력으로 포커스
useEffect(() => {
  if (isOpen) {
    inputRef.current?.focus();
  }
}, [isOpen]);

// 키보드 네비게이션 지원
<div role="menu" onKeyDown={handleKeyDown}>
  <button role="menuitem">항목 1</button>
  <button role="menuitem">항목 2</button>
</div>
```
