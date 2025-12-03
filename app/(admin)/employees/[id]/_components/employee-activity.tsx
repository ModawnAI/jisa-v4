'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ClockCounterClockwise } from '@phosphor-icons/react';

interface EmployeeActivityProps {
  employeeId: string;
}

export function EmployeeActivity({ employeeId: _employeeId }: EmployeeActivityProps) {
  // TODO: Implement activity fetching once activity tracking is complete
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <ClockCounterClockwise className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium">활동 내역이 없습니다</h3>
        <p className="text-sm text-muted-foreground mt-1">
          아직 기록된 활동이 없습니다.
        </p>
      </CardContent>
    </Card>
  );
}
