# Component Library Reference

> shadcn/ui (new-york style) + Radix UI + Phosphor Icons

---

## 1. Setup

### 1.1 Installation Commands

```bash
# Initialize shadcn/ui with new-york style
npx shadcn@latest init

# Select options:
# - Style: new-york
# - Base color: Neutral
# - CSS variables: Yes

# Install core components
npx shadcn@latest add button card input label form select
npx shadcn@latest add dialog sheet dropdown-menu
npx shadcn@latest add table data-table
npx shadcn@latest add toast sonner
npx shadcn@latest add tabs accordion
npx shadcn@latest add avatar badge separator
npx shadcn@latest add skeleton spinner
npx shadcn@latest add sidebar
```

### 1.2 Phosphor Icons Setup

```bash
npm install @phosphor-icons/react
```

```tsx
// Usage
import { House, User, FileText, ChartBar } from '@phosphor-icons/react';

<House size={24} weight="regular" />
<User size={24} weight="fill" />
```

### 1.3 Icon Weights

| Weight | Usage |
|--------|-------|
| `thin` | Decorative, large displays |
| `light` | Secondary icons |
| `regular` | Default, most UI icons |
| `bold` | Emphasis, active states |
| `fill` | Active nav items, selected |
| `duotone` | Marketing, illustrations |

---

## 2. Core Components

### 2.1 Button

```tsx
import { Button } from '@/components/ui/button';

// Variants
<Button variant="default">저장</Button>
<Button variant="secondary">취소</Button>
<Button variant="destructive">삭제</Button>
<Button variant="outline">편집</Button>
<Button variant="ghost">더보기</Button>
<Button variant="link">자세히 보기</Button>

// Sizes
<Button size="default">기본</Button>
<Button size="sm">작은</Button>
<Button size="lg">큰</Button>
<Button size="icon"><Plus /></Button>

// States
<Button disabled>비활성화</Button>
<Button isLoading>로딩 중...</Button>

// With Icon
<Button>
  <Plus className="mr-2 h-4 w-4" />
  추가하기
</Button>
```

### 2.2 Card

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>카드 제목</CardTitle>
    <CardDescription>카드 설명</CardDescription>
  </CardHeader>
  <CardContent>
    <p>카드 내용</p>
  </CardContent>
  <CardFooter>
    <Button>확인</Button>
  </CardFooter>
</Card>
```

### 2.3 Form Components

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

// Input with Label
<div className="space-y-2">
  <Label htmlFor="name">이름</Label>
  <Input id="name" placeholder="이름을 입력하세요" />
</div>

// Select
<Select>
  <SelectTrigger>
    <SelectValue placeholder="선택하세요" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">옵션 1</SelectItem>
    <SelectItem value="option2">옵션 2</SelectItem>
  </SelectContent>
</Select>

// Checkbox
<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">약관에 동의합니다</Label>
</div>

// Switch
<div className="flex items-center space-x-2">
  <Switch id="active" />
  <Label htmlFor="active">활성화</Label>
</div>
```

### 2.4 React Hook Form Integration

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const formSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일을 입력하세요'),
});

type FormData = z.infer<typeof formSchema>;

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  function onSubmit(data: FormData) {
    console.log(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름</FormLabel>
              <FormControl>
                <Input placeholder="홍길동" {...field} />
              </FormControl>
              <FormDescription>
                실명을 입력해주세요
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">저장</Button>
      </form>
    </Form>
  );
}
```

---

## 3. Dialog & Sheet

### 3.1 Dialog (Modal)

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>다이얼로그 열기</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>직원 추가</DialogTitle>
      <DialogDescription>
        새 직원 정보를 입력하세요
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* Form content */}
    </div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">취소</Button>
      </DialogClose>
      <Button type="submit">저장</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 3.2 Sheet (Slide-out Panel)

```tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';

<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">세부 정보</Button>
  </SheetTrigger>
  <SheetContent side="right" className="w-[400px] sm:w-[540px]">
    <SheetHeader>
      <SheetTitle>직원 상세</SheetTitle>
      <SheetDescription>
        직원의 상세 정보를 확인하세요
      </SheetDescription>
    </SheetHeader>
    <div className="py-4">
      {/* Detail content */}
    </div>
    <SheetFooter>
      <Button>수정</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

---

## 4. Data Display

### 4.1 Data Table

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

<Table>
  <TableCaption>직원 목록</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[100px]">사번</TableHead>
      <TableHead>이름</TableHead>
      <TableHead>부서</TableHead>
      <TableHead className="text-right">급여</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {employees.map((emp) => (
      <TableRow key={emp.id}>
        <TableCell className="font-medium">{emp.employeeId}</TableCell>
        <TableCell>{emp.name}</TableCell>
        <TableCell>{emp.department}</TableCell>
        <TableCell className="text-right">
          {formatCurrency(emp.salary)}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 4.2 TanStack Table (Advanced)

```tsx
// See PHASE-04-EMPLOYEES.md for complete implementation
import { useReactTable, getCoreRowModel, ... } from '@tanstack/react-table';
```

### 4.3 Badge

```tsx
import { Badge } from '@/components/ui/badge';

<Badge>기본</Badge>
<Badge variant="secondary">보조</Badge>
<Badge variant="destructive">위험</Badge>
<Badge variant="outline">테두리</Badge>

// Custom variants (add to badge.tsx)
<Badge variant="success">완료</Badge>
<Badge variant="warning">대기중</Badge>
```

### 4.4 Avatar

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

<Avatar>
  <AvatarImage src="/avatars/01.png" alt="@username" />
  <AvatarFallback>홍길</AvatarFallback>
</Avatar>

// Sizes (custom utility)
<Avatar className="h-8 w-8">  {/* Small */}
<Avatar className="h-10 w-10"> {/* Default */}
<Avatar className="h-12 w-12"> {/* Large */}
```

---

## 5. Navigation

### 5.1 Sidebar (App Sidebar)

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { House, Users, FileText, ChartBar, Gear } from '@phosphor-icons/react';

const navItems = [
  { title: '대시보드', url: '/admin', icon: House },
  { title: '직원 관리', url: '/admin/employees', icon: Users },
  { title: '문서 관리', url: '/admin/documents', icon: FileText },
  { title: '분석', url: '/admin/analytics', icon: ChartBar },
  { title: '설정', url: '/admin/settings', icon: Gear },
];

function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="font-bold text-lg">ContractorHub</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {/* User menu */}
      </SidebarFooter>
    </Sidebar>
  );
}

// Layout usage
function AdminLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
```

### 5.2 Dropdown Menu

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost">
      <DotsThree />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>작업</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>수정</DropdownMenuItem>
    <DropdownMenuItem>복제</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">
      삭제
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 5.3 Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="info" className="w-full">
  <TabsList>
    <TabsTrigger value="info">기본 정보</TabsTrigger>
    <TabsTrigger value="documents">문서</TabsTrigger>
    <TabsTrigger value="history">히스토리</TabsTrigger>
  </TabsList>
  <TabsContent value="info">
    <Card>기본 정보 내용</Card>
  </TabsContent>
  <TabsContent value="documents">
    <Card>문서 목록</Card>
  </TabsContent>
  <TabsContent value="history">
    <Card>히스토리</Card>
  </TabsContent>
</Tabs>
```

---

## 6. Feedback

### 6.1 Toast (Sonner)

```tsx
// Setup in layout
import { Toaster } from '@/components/ui/sonner';

<Toaster />

// Usage
import { toast } from 'sonner';

// Success
toast.success('저장되었습니다');

// Error
toast.error('오류가 발생했습니다');

// With description
toast.success('저장 완료', {
  description: '변경사항이 저장되었습니다',
});

// With action
toast('문서가 삭제됩니다', {
  action: {
    label: '취소',
    onClick: () => console.log('취소됨'),
  },
});

// Promise toast
toast.promise(saveData(), {
  loading: '저장 중...',
  success: '저장되었습니다',
  error: '저장 실패',
});
```

### 6.2 Alert Dialog (Confirmation)

```tsx
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

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">삭제</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
      <AlertDialogDescription>
        이 작업은 되돌릴 수 없습니다. 모든 데이터가 영구적으로 삭제됩니다.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        삭제
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 6.3 Skeleton

```tsx
import { Skeleton } from '@/components/ui/skeleton';

// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-[125px] w-full" />
  </CardContent>
</Card>

// Table row skeleton
<TableRow>
  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
</TableRow>
```

---

## 7. Custom Components

### 7.1 Page Header

```tsx
// components/page-header.tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Usage
<PageHeader
  title="직원 관리"
  description="직원 정보를 관리합니다"
  action={<Button>직원 추가</Button>}
/>
```

### 7.2 Empty State

```tsx
// components/empty-state.tsx
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 mb-4 max-w-sm">
        {description}
      </p>
      {action}
    </div>
  );
}

// Usage
<EmptyState
  icon={<FileText size={24} />}
  title="문서가 없습니다"
  description="첫 번째 문서를 업로드하여 시작하세요"
  action={<Button>문서 업로드</Button>}
/>
```

### 7.3 Stats Card

```tsx
// components/stats-card.tsx
interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, description, icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p className={cn(
            "text-xs mt-1",
            trend.isPositive ? "text-[#00b87a]" : "text-destructive"
          )}>
            {trend.isPositive ? '+' : ''}{trend.value}% 전월 대비
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### 7.4 File Upload Zone

```tsx
// components/file-upload.tsx
import { Upload } from '@phosphor-icons/react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
}

export function FileUpload({ onUpload, accept, maxSize }: FileUploadProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    accept,
    maxSize,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      )}
    >
      <input {...getInputProps()} />
      <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
      <p className="text-sm font-medium">
        파일을 드래그하거나 클릭하여 업로드
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Excel, PDF, Word 파일 지원
      </p>
    </div>
  );
}
```

---

## 8. Phosphor Icons Reference

### 8.1 Common Icons

| Icon | Import | Usage |
|------|--------|-------|
| `House` | `@phosphor-icons/react` | Dashboard, home |
| `Users` | `@phosphor-icons/react` | Employees, team |
| `FileText` | `@phosphor-icons/react` | Documents |
| `Folder` | `@phosphor-icons/react` | Categories |
| `ChartBar` | `@phosphor-icons/react` | Analytics |
| `Gear` | `@phosphor-icons/react` | Settings |
| `MagnifyingGlass` | `@phosphor-icons/react` | Search |
| `Plus` | `@phosphor-icons/react` | Add |
| `Pencil` | `@phosphor-icons/react` | Edit |
| `Trash` | `@phosphor-icons/react` | Delete |
| `Eye` | `@phosphor-icons/react` | View |
| `Download` | `@phosphor-icons/react` | Download |
| `Upload` | `@phosphor-icons/react` | Upload |
| `Check` | `@phosphor-icons/react` | Success |
| `X` | `@phosphor-icons/react` | Close, error |
| `Warning` | `@phosphor-icons/react` | Warning |
| `Info` | `@phosphor-icons/react` | Info |
| `CaretDown` | `@phosphor-icons/react` | Dropdown |
| `CaretRight` | `@phosphor-icons/react` | Expand |
| `DotsThree` | `@phosphor-icons/react` | More options |
| `SignOut` | `@phosphor-icons/react` | Logout |
| `User` | `@phosphor-icons/react` | Profile |

### 8.2 Icon Sizing

```tsx
// Small (16px) - inline with text
<Check size={16} />

// Default (20px) - buttons, nav
<House size={20} />

// Medium (24px) - cards, empty states
<FileText size={24} />

// Large (32px) - feature sections
<ChartBar size={32} />

// Extra Large (48px) - empty states, heroes
<Upload size={48} />
```

---

## 9. Layout Patterns

### 9.1 Admin Page Layout

```tsx
export default function EmployeesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="직원 관리"
        description="직원 정보를 조회하고 관리합니다"
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            직원 추가
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input placeholder="검색..." className="max-w-sm" />
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={employees} />
        </CardContent>
      </Card>
    </div>
  );
}
```

### 9.2 Form Page Layout

```tsx
export default function EmployeeFormPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="직원 추가"
        description="새 직원 정보를 입력하세요"
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Form fields */}
              <div className="flex justify-end gap-4">
                <Button variant="outline" type="button">취소</Button>
                <Button type="submit">저장</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 9.3 Detail Page Layout

```tsx
export default function EmployeeDetailPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="김영희"
        description="E001 | 영업부"
        action={
          <div className="flex gap-2">
            <Button variant="outline">수정</Button>
            <Button variant="destructive">삭제</Button>
          </div>
        }
      />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">기본 정보</TabsTrigger>
          <TabsTrigger value="documents">문서</TabsTrigger>
          <TabsTrigger value="history">히스토리</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Info grid */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs */}
      </Tabs>
    </div>
  );
}
```

---

## 10. Component Checklist

### Required shadcn/ui Components

- [x] Button
- [x] Card
- [x] Input
- [x] Label
- [x] Select
- [x] Checkbox
- [x] Switch
- [x] Textarea
- [x] Form (react-hook-form)
- [x] Dialog
- [x] Sheet
- [x] AlertDialog
- [x] DropdownMenu
- [x] Table
- [x] Tabs
- [x] Badge
- [x] Avatar
- [x] Skeleton
- [x] Separator
- [x] Sidebar
- [x] Toast (Sonner)

### Custom Components to Build

- [ ] PageHeader
- [ ] EmptyState
- [ ] StatsCard
- [ ] FileUpload
- [ ] DataTable (with TanStack)
- [ ] SearchInput
- [ ] DateRangePicker
- [ ] StatusBadge
- [ ] ConfirmDialog
- [ ] LoadingButton
