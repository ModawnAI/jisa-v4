'use client';

import { useEffect, useState } from 'react';
import { Robot, Eye, FloppyDisk, ArrowCounterClockwise } from '@phosphor-icons/react';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import type { ChatSettings } from '@/lib/db/schema/chat-settings';

interface PreviewResult {
  formatted: string;
  lineCount: number;
  maxActualWidth: number;
}

export default function ChatSettingsPage() {
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewText, setPreviewText] = useState('');

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/chat-settings');
      const data = await res.json();

      if (data.success) {
        setSettings(data.data);
        setPreviewText(data.data.welcomeMessage);
      } else {
        toast.error(data.error?.message || '설정을 불러오는 데 실패했습니다.');
      }
    } catch {
      toast.error('설정을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch('/api/chat-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (data.success) {
        setSettings(data.data);
        toast.success('설정이 저장되었습니다.');
      } else {
        toast.error(data.error?.message || '저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!previewText) return;

    try {
      const res = await fetch('/api/chat-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: previewText,
          maxWidth: settings?.maxLineWidth || 22,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPreview(data.data);
      }
    } catch {
      toast.error('미리보기 생성에 실패했습니다.');
    }
  };

  const updateSettings = (key: keyof ChatSettings, value: unknown) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">불러오는 중...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">설정을 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="채팅 설정"
        description="AI 에이전트 이름, 환영 메시지, 서명 등을 설정합니다."
      >
        <Button onClick={handleSave} disabled={saving}>
          <FloppyDisk className="mr-2 h-4 w-4" />
          {saving ? '저장 중...' : '저장'}
        </Button>
      </PageHeader>

      <Tabs defaultValue="identity" className="space-y-6">
        <TabsList>
          <TabsTrigger value="identity">에이전트 설정</TabsTrigger>
          <TabsTrigger value="messages">메시지 설정</TabsTrigger>
          <TabsTrigger value="formatting">포맷 설정</TabsTrigger>
          <TabsTrigger value="errors">오류 메시지</TabsTrigger>
          <TabsTrigger value="preview">미리보기</TabsTrigger>
        </TabsList>

        {/* Agent Identity */}
        <TabsContent value="identity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Robot className="h-5 w-5" />
                AI 에이전트 정보
              </CardTitle>
              <CardDescription>
                챗봇의 이름과 이모지를 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">에이전트 이름</Label>
                  <Input
                    id="agent-name"
                    value={settings.agentName}
                    onChange={(e) => updateSettings('agentName', e.target.value)}
                    placeholder="지사앱 AI"
                  />
                  <p className="text-sm text-muted-foreground">
                    사용자에게 표시되는 AI 이름입니다.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-emoji">에이전트 이모지</Label>
                  <Input
                    id="agent-emoji"
                    value={settings.agentEmoji || ''}
                    onChange={(e) => updateSettings('agentEmoji', e.target.value)}
                    placeholder="🤖"
                    maxLength={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    이름 앞에 표시될 이모지입니다.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">미리보기</p>
                <p className="mt-2 text-lg">
                  {settings.useEmojis && settings.agentEmoji} {settings.agentName}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages */}
        <TabsContent value="messages">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>환영 메시지</CardTitle>
                <CardDescription>
                  새로운 사용자에게 표시되는 첫 메시지입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.welcomeMessage}
                  onChange={(e) => updateSettings('welcomeMessage', e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  줄바꿈과 이모지를 사용할 수 있습니다. 22자 이내로 작성하세요.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>헤더 템플릿</CardTitle>
                <CardDescription>
                  모든 응답 앞에 추가되는 텍스트입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="header-enabled">헤더 사용</Label>
                  <Switch
                    id="header-enabled"
                    checked={settings.headerEnabled}
                    onCheckedChange={(v) => updateSettings('headerEnabled', v)}
                  />
                </div>
                {settings.headerEnabled && (
                  <Textarea
                    value={settings.headerTemplate || ''}
                    onChange={(e) => updateSettings('headerTemplate', e.target.value)}
                    rows={3}
                    className="font-mono text-sm"
                    placeholder="[지사앱 AI] 🤖"
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>서명 (푸터)</CardTitle>
                <CardDescription>
                  모든 응답 끝에 추가되는 텍스트입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signature-enabled">서명 사용</Label>
                  <Switch
                    id="signature-enabled"
                    checked={settings.signatureEnabled}
                    onCheckedChange={(v) => updateSettings('signatureEnabled', v)}
                  />
                </div>
                {settings.signatureEnabled && (
                  <Textarea
                    value={settings.signature || ''}
                    onChange={(e) => updateSettings('signature', e.target.value)}
                    rows={3}
                    className="font-mono text-sm"
                    placeholder="- 지사앱 AI 드림 💼"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Formatting */}
        <TabsContent value="formatting">
          <Card>
            <CardHeader>
              <CardTitle>응답 포맷 설정</CardTitle>
              <CardDescription>
                카카오톡 메시지 표시 형식을 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>최대 줄 너비</Label>
                    <p className="text-sm text-muted-foreground">
                      한글 기준 {settings.maxLineWidth}자
                    </p>
                  </div>
                  <span className="font-mono text-lg">{settings.maxLineWidth}</span>
                </div>
                <Slider
                  value={[settings.maxLineWidth]}
                  onValueChange={([v]) => updateSettings('maxLineWidth', v)}
                  min={10}
                  max={40}
                  step={1}
                />
                <p className="text-sm text-muted-foreground">
                  카카오톡에서 보기 좋은 너비는 20-25자입니다.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>이모지 사용</Label>
                  <p className="text-sm text-muted-foreground">
                    응답에 이모지를 포함합니다.
                  </p>
                </div>
                <Switch
                  checked={settings.useEmojis}
                  onCheckedChange={(v) => updateSettings('useEmojis', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>들여쓰기 사용</Label>
                  <p className="text-sm text-muted-foreground">
                    계층 구조에 들여쓰기를 적용합니다.
                  </p>
                </div>
                <Switch
                  checked={settings.useIndentation}
                  onCheckedChange={(v) => updateSettings('useIndentation', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Error Messages */}
        <TabsContent value="errors">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>일반 오류 메시지</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.errorGeneric}
                  onChange={(e) => updateSettings('errorGeneric', e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>미등록 사용자 메시지</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.errorNotRegistered}
                  onChange={(e) => updateSettings('errorNotRegistered', e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>검색 결과 없음 메시지</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.errorNoResults}
                  onChange={(e) => updateSettings('errorNoResults', e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>요청 제한 메시지</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.rateLimitMessage || ''}
                  onChange={(e) => updateSettings('rateLimitMessage', e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Preview */}
        <TabsContent value="preview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>입력</CardTitle>
                <CardDescription>
                  포맷팅할 텍스트를 입력하세요. 마크다운이 제거됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                  placeholder="**마크다운** 텍스트나 일반 텍스트를 입력하세요..."
                />
                <div className="flex gap-2">
                  <Button onClick={handlePreview}>
                    <Eye className="mr-2 h-4 w-4" />
                    미리보기
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPreviewText(settings.welcomeMessage)}
                  >
                    <ArrowCounterClockwise className="mr-2 h-4 w-4" />
                    환영 메시지로 복원
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>미리보기 결과</CardTitle>
                <CardDescription>
                  카카오톡에서 표시될 형태입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {preview ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {preview.formatted}
                      </pre>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>줄 수: {preview.lineCount}</span>
                      <span>최대 너비: {preview.maxActualWidth}자</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center text-muted-foreground">
                    미리보기 버튼을 클릭하세요
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
