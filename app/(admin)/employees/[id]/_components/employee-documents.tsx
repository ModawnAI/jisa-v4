'use client';

import { Card, CardContent } from '@/components/ui/card';
import { FileText } from '@phosphor-icons/react';

interface EmployeeDocumentsProps {
  employeeId: string;
}

export function EmployeeDocuments({ employeeId: _employeeId }: EmployeeDocumentsProps) {
  // TODO: Implement document fetching once document module is complete
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium">문서가 없습니다</h3>
        <p className="text-sm text-muted-foreground mt-1">
          이 직원과 연결된 문서가 없습니다.
        </p>
      </CardContent>
    </Card>
  );
}
