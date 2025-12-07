'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Check, CaretUpDown, User, X, Flask } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  department: string | null;
  position: string | null;
  clearanceLevel: string;
}

export function EmployeeSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const currentEmployeeId = searchParams.get('employeeId');

  // Fetch employees on mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Set selected employee when URL changes
  useEffect(() => {
    if (currentEmployeeId && employees.length > 0) {
      const emp = employees.find(e => e.id === currentEmployeeId);
      setSelectedEmployee(emp || null);
    } else {
      setSelectedEmployee(null);
    }
  }, [currentEmployeeId, employees]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees?limit=100&isActive=true');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (employee: Employee | null) => {
    setSelectedEmployee(employee);
    setOpen(false);

    const params = new URLSearchParams(searchParams);
    if (employee) {
      params.set('employeeId', employee.id);
    } else {
      params.delete('employeeId');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearSelection = () => {
    handleSelect(null);
  };

  return (
    <div className="flex items-center gap-2">
      {selectedEmployee && (
        <Badge variant="secondary" className="gap-1 pr-1">
          <Flask className="h-3 w-3" />
          <span className="font-medium">테스트 모드</span>
          <span className="text-muted-foreground">|</span>
          <span>{selectedEmployee.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 ml-1 hover:bg-destructive/20"
            onClick={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
          >
            <User className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            {selectedEmployee ? (
              <span className="truncate">{selectedEmployee.name}</span>
            ) : (
              <span className="text-muted-foreground">직원 선택...</span>
            )}
            <CaretUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="end">
          <Command>
            <CommandInput placeholder="직원 검색..." />
            <CommandList>
              <CommandEmpty>
                {loading ? '불러오는 중...' : '검색 결과가 없습니다.'}
              </CommandEmpty>
              <CommandGroup heading="직원 목록">
                {/* Clear selection option */}
                <CommandItem
                  value="__clear__"
                  onSelect={() => handleSelect(null)}
                  className="text-muted-foreground"
                >
                  <X className="mr-2 h-4 w-4" />
                  선택 해제 (일반 모드)
                </CommandItem>

                {employees.map((employee) => (
                  <CommandItem
                    key={employee.id}
                    value={`${employee.name} ${employee.employeeId} ${employee.department || ''}`}
                    onSelect={() => handleSelect(employee)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedEmployee?.id === employee.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{employee.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {employee.employeeId}
                        {employee.department && ` · ${employee.department}`}
                        {employee.position && ` · ${employee.position}`}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
