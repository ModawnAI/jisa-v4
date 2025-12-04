import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/lib/services/employee.service';
import { excelParser } from '@/lib/utils/excel-parser';
import { z } from 'zod';

// Schema for a single employee row
const employeeRowSchema = z.object({
  employeeId: z.string().min(1, '사번은 필수입니다'),
  name: z.string().min(1, '이름은 필수입니다'),
  email: z.string().email('유효한 이메일 형식이 아닙니다').optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  clearanceLevel: z.enum(['basic', 'standard', 'advanced']).optional().nullable(),
  hireDate: z.string().optional().nullable(),
});

type EmployeeRow = z.infer<typeof employeeRowSchema>;

interface ImportResult {
  success: boolean;
  row: number;
  employeeId: string;
  name: string;
  error?: string;
}

// Column mapping from Korean headers to field names
const COLUMN_MAPPING: Record<string, keyof EmployeeRow> = {
  '사번': 'employeeId',
  '사번 (필수)': 'employeeId',
  'employee_id': 'employeeId',
  'employeeid': 'employeeId',

  '이름': 'name',
  '이름 (필수)': 'name',
  '성명': 'name',
  'name': 'name',

  '이메일': 'email',
  'email': 'email',

  '연락처': 'phone',
  '전화번호': 'phone',
  'phone': 'phone',

  '부서': 'department',
  'department': 'department',

  '직급': 'position',
  '직위': 'position',
  'position': 'position',

  '권한등급': 'clearanceLevel',
  '권한': 'clearanceLevel',
  'clearance': 'clearanceLevel',
  'clearancelevel': 'clearanceLevel',

  '입사일': 'hireDate',
  'hiredate': 'hireDate',
  'hire_date': 'hireDate',
};

/**
 * POST /api/employees/bulk
 *
 * Bulk import employees from Excel/CSV file
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const skipDuplicates = formData.get('skipDuplicates') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FILE', message: '파일을 선택해주세요.' } },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Excel(.xlsx) 또는 CSV 파일만 지원합니다.' } },
        { status: 400 }
      );
    }

    // Parse file
    const parseResult = await excelParser.parse(file);

    if (parseResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'EMPTY_FILE', message: '파일에 데이터가 없습니다.' } },
        { status: 400 }
      );
    }

    // Map parsed rows to employee data
    const employees: (EmployeeRow & { originalRow: number })[] = [];
    const parseErrors: { row: number; errors: string[] }[] = [];

    for (let i = 0; i < parseResult.rows.length; i++) {
      const rawRow = parseResult.rows[i];
      const rowNumber = i + 2; // Account for header row (1-indexed)

      // Map columns using the header mapping
      const mappedRow: Record<string, unknown> = {};

      for (const [header, value] of Object.entries(rawRow)) {
        const normalizedHeader = header.toLowerCase().trim();
        const fieldName = COLUMN_MAPPING[header] || COLUMN_MAPPING[normalizedHeader];

        if (fieldName) {
          mappedRow[fieldName] = value;
        }
      }

      // Validate the mapped row
      const validationResult = employeeRowSchema.safeParse(mappedRow);

      if (!validationResult.success) {
        const errors = validationResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
        parseErrors.push({ row: rowNumber, errors });
        continue;
      }

      employees.push({
        ...validationResult.data,
        originalRow: rowNumber,
      });
    }

    // Process employees
    const results: ImportResult[] = [];
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const emp of employees) {
      try {
        // Check for duplicate
        const existing = await employeeService.getByEmployeeId(emp.employeeId);

        if (existing) {
          if (skipDuplicates) {
            skipCount++;
            results.push({
              success: false,
              row: emp.originalRow,
              employeeId: emp.employeeId,
              name: emp.name,
              error: '이미 존재하는 사번입니다 (건너뜀)',
            });
            continue;
          } else {
            errorCount++;
            results.push({
              success: false,
              row: emp.originalRow,
              employeeId: emp.employeeId,
              name: emp.name,
              error: '이미 존재하는 사번입니다',
            });
            continue;
          }
        }

        // Create employee
        await employeeService.create({
          employeeId: emp.employeeId,
          name: emp.name,
          email: emp.email || undefined,
          phone: emp.phone || undefined,
          department: emp.department || undefined,
          position: emp.position || undefined,
          clearanceLevel: emp.clearanceLevel || 'basic',
          hireDate: emp.hireDate ? new Date(emp.hireDate) : undefined,
        });

        successCount++;
        results.push({
          success: true,
          row: emp.originalRow,
          employeeId: emp.employeeId,
          name: emp.name,
        });
      } catch (error) {
        errorCount++;
        results.push({
          success: false,
          row: emp.originalRow,
          employeeId: emp.employeeId,
          name: emp.name,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: parseResult.rows.length,
        success: successCount,
        skipped: skipCount,
        errors: errorCount + parseErrors.length,
        results,
        parseErrors,
      },
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'IMPORT_FAILED',
          message: error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.'
        }
      },
      { status: 500 }
    );
  }
}
