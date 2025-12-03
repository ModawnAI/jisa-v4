'use client';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { GearSix } from '@phosphor-icons/react';

interface ChatSettingsValue {
  includeOrganization: boolean;
  includePersonal: boolean;
  topK: number;
  temperature: number;
}

interface ChatSettingsProps {
  settings: ChatSettingsValue;
  onSettingsChange: (settings: ChatSettingsValue) => void;
}

export function ChatSettings({ settings, onSettingsChange }: ChatSettingsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <GearSix className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h4 className="font-medium">채팅 설정</h4>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="includeOrg" className="text-sm">
                전사 문서 포함
              </Label>
              <Switch
                id="includeOrg"
                checked={settings.includeOrganization}
                onCheckedChange={(checked) =>
                  onSettingsChange({ ...settings, includeOrganization: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="includePersonal" className="text-sm">
                개인 문서 포함
              </Label>
              <Switch
                id="includePersonal"
                checked={settings.includePersonal}
                onCheckedChange={(checked) =>
                  onSettingsChange({ ...settings, includePersonal: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">참조 문서 수</Label>
                <span className="text-sm text-muted-foreground">{settings.topK}</span>
              </div>
              <Slider
                value={[settings.topK]}
                onValueChange={(values: number[]) =>
                  onSettingsChange({ ...settings, topK: values[0] })
                }
                min={1}
                max={20}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">창의성 (Temperature)</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.temperature.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[settings.temperature]}
                onValueChange={(values: number[]) =>
                  onSettingsChange({ ...settings, temperature: values[0] })
                }
                min={0}
                max={1}
                step={0.1}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
