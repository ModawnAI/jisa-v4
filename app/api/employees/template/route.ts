import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

/**
 * GET /api/employees/template
 *
 * Download employee import template (Excel or CSV)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'xlsx';

  // Template headers with Korean labels
  const headers = [
    '사번 (필수)',
    '이름 (필수)',
    '이메일',
    '연락처',
    '부서',
    '직급',
    '권한등급',
    '입사일',
  ];

  // Example data rows
  const exampleRows = [
    ['EMP001', '홍길동', 'hong@example.com', '010-1234-5678', '개발팀', '과장', 'standard', '2024-01-15'],
    ['EMP002', '김철수', 'kim@example.com', '010-2345-6789', '영업팀', '대리', 'basic', '2024-03-01'],
    ['EMP003', '이영희', 'lee@example.com', '010-3456-7890', '인사팀', '부장', 'advanced', '2023-06-01'],
  ];

  // Instructions sheet data
  const instructions = [
    ['직원 일괄 등록 템플릿 안내'],
    [''],
    ['필수 항목:'],
    ['  - 사번: 고유한 직원 식별 번호 (예: EMP001, A12345)'],
    ['  - 이름: 직원 이름'],
    [''],
    ['선택 항목:'],
    ['  - 이메일: 유효한 이메일 주소'],
    ['  - 연락처: 전화번호'],
    ['  - 부서: 소속 부서명'],
    ['  - 직급: 직위/직급'],
    ['  - 권한등급: basic, standard, advanced 중 선택 (기본값: basic)'],
    ['  - 입사일: YYYY-MM-DD 형식 (예: 2024-01-15)'],
    [''],
    ['주의사항:'],
    ['  1. 첫 번째 행(헤더)은 수정하지 마세요'],
    ['  2. 예시 데이터는 삭제 후 실제 데이터를 입력하세요'],
    ['  3. 사번은 중복될 수 없습니다'],
    ['  4. 날짜 형식은 YYYY-MM-DD를 권장합니다'],
  ];

  if (format === 'csv') {
    // CSV format
    const csvRows = [headers, ...exampleRows];
    const csvContent = csvRows
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="employee_import_template.csv"',
      },
    });
  }

  // Excel format (default)
  const workbook = XLSX.utils.book_new();

  // Main data sheet
  const dataSheet = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);

  // Set column widths
  dataSheet['!cols'] = [
    { wch: 15 }, // 사번
    { wch: 12 }, // 이름
    { wch: 25 }, // 이메일
    { wch: 15 }, // 연락처
    { wch: 12 }, // 부서
    { wch: 10 }, // 직급
    { wch: 12 }, // 권한등급
    { wch: 12 }, // 입사일
  ];

  XLSX.utils.book_append_sheet(workbook, dataSheet, '직원목록');

  // Instructions sheet
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionsSheet['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, '안내');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employee_import_template.xlsx"',
    },
  });
}
