import { Database, Bell, Key, Globe } from '@phosphor-icons/react/dist/ssr';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

function GeneralSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          일반 설정
        </CardTitle>
        <CardDescription>시스템 기본 설정을 관리합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">조직명</Label>
          <Input id="org-name" placeholder="조직명을 입력하세요" defaultValue="계약자허브" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">시간대</Label>
          <Input id="timezone" defaultValue="Asia/Seoul" disabled />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>다크 모드</Label>
            <p className="text-sm text-muted-foreground">어두운 테마를 사용합니다.</p>
          </div>
          <Switch />
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          알림 설정
        </CardTitle>
        <CardDescription>알림 및 이메일 설정을 관리합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>이메일 알림</Label>
            <p className="text-sm text-muted-foreground">중요 이벤트 시 이메일을 받습니다.</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>문서 처리 알림</Label>
            <p className="text-sm text-muted-foreground">문서 처리 완료 시 알림을 받습니다.</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>충돌 알림</Label>
            <p className="text-sm text-muted-foreground">문서 충돌 발생 시 알림을 받습니다.</p>
          </div>
          <Switch defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API 연동
        </CardTitle>
        <CardDescription>외부 서비스 연동을 관리합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>OpenAI API 상태</Label>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-muted-foreground">연결됨</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Pinecone API 상태</Label>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-muted-foreground">연결됨</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label>KakaoTalk API 상태</Label>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-sm text-muted-foreground">설정 필요</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DatabaseSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          데이터베이스
        </CardTitle>
        <CardDescription>데이터베이스 관련 설정입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>데이터베이스 상태</Label>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-muted-foreground">정상 작동 중</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            백업 생성
          </Button>
          <Button variant="outline" size="sm">
            마이그레이션 확인
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="설정"
        description="시스템 설정을 관리합니다."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <GeneralSettings />
        <NotificationSettings />
        <IntegrationSettings />
        <DatabaseSettings />
      </div>

      <div className="flex justify-end">
        <Button>설정 저장</Button>
      </div>
    </div>
  );
}
