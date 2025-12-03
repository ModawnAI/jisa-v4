import { Shield, UserCircle, Key, LockKey, Warning, CheckCircle } from '@phosphor-icons/react/dist/ssr';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    name: '관리자',
    role: 'super_admin',
    status: 'active',
    lastLogin: '방금 전',
  },
  {
    id: '2',
    email: 'manager@example.com',
    name: '김매니저',
    role: 'manager',
    status: 'active',
    lastLogin: '2시간 전',
  },
  {
    id: '3',
    email: 'user@example.com',
    name: '이사원',
    role: 'employee',
    status: 'active',
    lastLogin: '1일 전',
  },
];

const roleLabels: Record<string, string> = {
  super_admin: '최고 관리자',
  org_admin: '조직 관리자',
  manager: '매니저',
  employee: '직원',
  viewer: '뷰어',
};

const roleBadgeVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  super_admin: 'default',
  org_admin: 'default',
  manager: 'secondary',
  employee: 'outline',
  viewer: 'outline',
};

function UserManagement() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              사용자 관리
            </CardTitle>
            <CardDescription>시스템 사용자와 권한을 관리합니다.</CardDescription>
          </div>
          <Button size="sm">사용자 추가</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>마지막 로그인</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={roleBadgeVariants[user.role] || 'outline'}>
                    {roleLabels[user.role] || user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm">활성</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.lastLogin}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    수정
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SecurityStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          보안 상태
        </CardTitle>
        <CardDescription>현재 시스템 보안 상태입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>SSL/TLS 암호화</span>
          </div>
          <Badge variant="outline" className="text-green-600">
            활성
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>2단계 인증</span>
          </div>
          <Badge variant="outline" className="text-green-600">
            활성
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Warning className="h-5 w-5 text-yellow-500" />
            <span>비밀번호 정책</span>
          </div>
          <Badge variant="outline" className="text-yellow-600">
            권장 설정 필요
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function AccessControl() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LockKey className="h-5 w-5" />
          접근 제어
        </CardTitle>
        <CardDescription>역할별 권한을 관리합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">최고 관리자</span>
            <span className="text-sm text-muted-foreground">모든 권한</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">조직 관리자</span>
            <span className="text-sm text-muted-foreground">조직 내 관리</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">매니저</span>
            <span className="text-sm text-muted-foreground">팀 관리 + 문서 처리</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">직원</span>
            <span className="text-sm text-muted-foreground">본인 정보 조회</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">뷰어</span>
            <span className="text-sm text-muted-foreground">읽기 전용</span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full">
          권한 설정 편집
        </Button>
      </CardContent>
    </Card>
  );
}

function ApiKeys() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API 키 관리
        </CardTitle>
        <CardDescription>API 접근 키를 관리합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">프로덕션 키</p>
              <p className="text-sm text-muted-foreground">sk-****...****abcd</p>
            </div>
            <Button variant="ghost" size="sm">
              복사
            </Button>
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">개발 키</p>
              <p className="text-sm text-muted-foreground">sk-dev-****...****efgh</p>
            </div>
            <Button variant="ghost" size="sm">
              복사
            </Button>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full">
          새 키 생성
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="보안"
        description="시스템 보안 및 사용자 권한을 관리합니다."
      />

      <UserManagement />

      <div className="grid gap-6 md:grid-cols-3">
        <SecurityStatus />
        <AccessControl />
        <ApiKeys />
      </div>
    </div>
  );
}
