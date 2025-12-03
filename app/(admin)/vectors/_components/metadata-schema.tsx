'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Code, Database, User, FileText, ChartBar } from '@phosphor-icons/react';

interface MetadataField {
  field: string;
  type: string;
  description: string;
  example?: unknown;
  frequency: number;
}

interface ActualField {
  field: string;
  frequency: number;
  example?: unknown;
}

interface MetadataSchemaProps {
  schemas: Record<string, MetadataField[]> | null;
  actualFields: ActualField[];
  isLoading: boolean;
}

const schemaConfig: Record<string, { label: string; shortLabel: string; icon: typeof Database }> = {
  base: { label: '기본 스키마', shortLabel: '기본', icon: Database },
  employee: { label: '직원 스키마', shortLabel: '직원', icon: User },
  mdrt: { label: 'MDRT 스키마', shortLabel: 'MDRT', icon: ChartBar },
  contract: { label: '계약 스키마', shortLabel: '계약', icon: FileText },
  generic: { label: '일반 스키마', shortLabel: '일반', icon: Code },
};

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="secondary" className="text-xs">
      {type}
    </Badge>
  );
}

export function MetadataSchema({ schemas, actualFields, isLoading }: MetadataSchemaProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-10 w-full animate-pulse rounded bg-muted mb-4" />
          <div className="h-[300px] animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!schemas) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          스키마 정보를 불러올 수 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base sm:text-lg">메타데이터 스키마</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Pinecone에 저장되는 벡터 메타데이터의 구조를 확인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="base" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            {Object.entries(schemaConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger key={key} value={key} className="gap-1.5">
                  <Icon size={14} weight="duotone" />
                  {config.shortLabel}
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="actual" className="gap-1.5">
              <ChartBar size={14} weight="duotone" />
              실제
            </TabsTrigger>
          </TabsList>

          {Object.entries(schemas).map(([schemaKey, fields]) => (
            <TabsContent key={schemaKey} value={schemaKey}>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">필드명</TableHead>
                        <TableHead className="min-w-[80px]">타입</TableHead>
                        <TableHead className="min-w-[200px]">설명</TableHead>
                        <TableHead className="min-w-[120px] text-right">사용률</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field) => (
                        <TableRow key={field.field}>
                          <TableCell className="font-mono text-xs sm:text-sm">{field.field}</TableCell>
                          <TableCell>
                            <TypeBadge type={field.type} />
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-muted-foreground whitespace-normal">
                            {field.description}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Progress value={field.frequency} className="w-12 sm:w-16 h-2" />
                              <span className="text-xs text-muted-foreground w-8 sm:w-10">
                                {field.frequency}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </TabsContent>
          ))}

          <TabsContent value="actual">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">필드명</TableHead>
                      <TableHead className="min-w-[120px] text-right">사용률</TableHead>
                      <TableHead className="min-w-[200px]">예시 값</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actualFields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          실제 사용 데이터가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      actualFields.map((field) => (
                        <TableRow key={field.field}>
                          <TableCell className="font-mono text-xs sm:text-sm">{field.field}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Progress value={field.frequency} className="w-12 sm:w-16 h-2" />
                              <span className="text-xs text-muted-foreground w-8 sm:w-10">
                                {field.frequency}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] sm:max-w-[300px] truncate block">
                              {field.example !== undefined
                                ? typeof field.example === 'object'
                                  ? JSON.stringify(field.example)
                                  : String(field.example)
                                : '-'}
                            </code>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
