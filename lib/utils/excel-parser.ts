import * as XLSX from 'xlsx';

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  required?: boolean;
  transform?: string;
}

export interface ParseOptions {
  sheetName?: string;
  sheetIndex?: number;
  headerRow?: number;
  startRow?: number;
  endRow?: number;
  columnMappings?: ColumnMapping[];
}

export interface ParseResult {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  errors: ParseError[];
  metadata: {
    sheetName: string;
    originalRowCount: number;
    parsedRowCount: number;
  };
}

export interface ParseError {
  row: number;
  column?: string;
  message: string;
  severity: 'error' | 'warning';
}

class ExcelParser {
  /**
   * Parse Excel file (Blob) and return structured data
   */
  async parse(blob: Blob, options: ParseOptions = {}): Promise<ParseResult> {
    const arrayBuffer = await blob.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false,
    });

    // Get sheet
    const sheetName = options.sheetName
      || workbook.SheetNames[options.sheetIndex ?? 0];

    if (!sheetName) {
      throw new Error('워크북에 시트가 없습니다.');
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`시트를 찾을 수 없습니다: ${sheetName}`);
    }

    // Convert sheet to JSON with headers
    const rawData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
    }) as unknown[][];

    if (rawData.length === 0) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        errors: [],
        metadata: {
          sheetName,
          originalRowCount: 0,
          parsedRowCount: 0,
        },
      };
    }

    // Extract headers (default row 0, configurable)
    const headerRowIndex = options.headerRow ?? 0;
    const headers = (rawData[headerRowIndex] as unknown[]).map((h, i) =>
      String(h ?? `Column_${i + 1}`)
    );

    // Extract data rows
    const startRow = options.startRow ?? headerRowIndex + 1;
    const endRow = options.endRow ?? rawData.length;
    const dataRows = rawData.slice(startRow, endRow);

    const errors: ParseError[] = [];
    const rows: Record<string, unknown>[] = [];

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const rawRow = dataRows[i] as unknown[];
      const row: Record<string, unknown> = {};
      const rowNumber = startRow + i + 1; // 1-indexed for user display

      // Map columns
      headers.forEach((header, colIndex) => {
        const value = rawRow[colIndex];

        if (options.columnMappings) {
          // Use mapping if provided
          const mapping = options.columnMappings.find(
            (m) => m.sourceColumn === header
          );

          if (mapping) {
            const transformedValue = this.transformValue(
              value,
              mapping,
              rowNumber,
              errors
            );
            row[mapping.targetField] = transformedValue;

            // Check required fields
            if (mapping.required && (transformedValue === null || transformedValue === '')) {
              errors.push({
                row: rowNumber,
                column: header,
                message: `필수 필드가 비어있습니다: ${header}`,
                severity: 'error',
              });
            }
          }
        } else {
          // Use header as field name (sanitized)
          const fieldName = this.sanitizeFieldName(header);
          row[fieldName] = this.autoTransformValue(value);
        }
      });

      // Skip empty rows
      const hasContent = Object.values(row).some(
        (v) => v !== null && v !== '' && v !== undefined
      );

      if (hasContent) {
        rows.push(row);
      }
    }

    return {
      headers,
      rows,
      totalRows: rows.length,
      errors,
      metadata: {
        sheetName,
        originalRowCount: rawData.length - 1, // Exclude header
        parsedRowCount: rows.length,
      },
    };
  }

  /**
   * Get sheet names from Excel file
   */
  async getSheetNames(blob: Blob): Promise<string[]> {
    const arrayBuffer = await blob.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    return workbook.SheetNames;
  }

  /**
   * Preview first N rows of Excel file
   */
  async preview(blob: Blob, maxRows = 10, options: ParseOptions = {}): Promise<ParseResult> {
    return this.parse(blob, {
      ...options,
      endRow: (options.startRow ?? 1) + maxRows,
    });
  }

  /**
   * Auto-detect column mappings from headers
   */
  detectColumnMappings(headers: string[]): ColumnMapping[] {
    const commonMappings: Record<string, { field: string; type: ColumnMapping['dataType'] }> = {
      // Korean column names
      '사번': { field: 'employeeNumber', type: 'string' },
      '직원번호': { field: 'employeeNumber', type: 'string' },
      '이름': { field: 'name', type: 'string' },
      '성명': { field: 'name', type: 'string' },
      '부서': { field: 'department', type: 'string' },
      '직급': { field: 'position', type: 'string' },
      '직위': { field: 'position', type: 'string' },
      '입사일': { field: 'hireDate', type: 'date' },
      '퇴사일': { field: 'terminationDate', type: 'date' },
      '급여': { field: 'salary', type: 'number' },
      '기본급': { field: 'baseSalary', type: 'number' },
      '수당': { field: 'allowance', type: 'number' },
      '공제': { field: 'deduction', type: 'number' },
      '지급액': { field: 'netPay', type: 'number' },
      '실수령액': { field: 'netPay', type: 'number' },
      '날짜': { field: 'date', type: 'date' },
      '기간': { field: 'period', type: 'string' },
      // English column names
      'employee_id': { field: 'employeeNumber', type: 'string' },
      'emp_no': { field: 'employeeNumber', type: 'string' },
      'name': { field: 'name', type: 'string' },
      'department': { field: 'department', type: 'string' },
      'salary': { field: 'salary', type: 'number' },
      'date': { field: 'date', type: 'date' },
    };

    return headers.map((header) => {
      const normalizedHeader = header.toLowerCase().trim();
      const mapping = commonMappings[header] || commonMappings[normalizedHeader];

      return {
        sourceColumn: header,
        targetField: mapping?.field || this.sanitizeFieldName(header),
        dataType: mapping?.type || 'string',
        required: false,
      };
    });
  }

  // ========== Private Helpers ==========

  private transformValue(
    value: unknown,
    mapping: ColumnMapping,
    rowNumber: number,
    errors: ParseError[]
  ): unknown {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    try {
      switch (mapping.dataType) {
        case 'number':
          const num = typeof value === 'number' ? value : Number(value);
          if (isNaN(num)) {
            errors.push({
              row: rowNumber,
              column: mapping.sourceColumn,
              message: `숫자로 변환할 수 없습니다: ${value}`,
              severity: 'warning',
            });
            return null;
          }
          return num;

        case 'date':
          if (value instanceof Date) {
            return value.toISOString();
          }
          const date = new Date(value as string);
          if (isNaN(date.getTime())) {
            errors.push({
              row: rowNumber,
              column: mapping.sourceColumn,
              message: `날짜로 변환할 수 없습니다: ${value}`,
              severity: 'warning',
            });
            return null;
          }
          return date.toISOString();

        case 'boolean':
          if (typeof value === 'boolean') return value;
          const strVal = String(value).toLowerCase();
          return strVal === 'true' || strVal === 'yes' || strVal === '1' || strVal === 'y';

        case 'string':
        default:
          return String(value).trim();
      }
    } catch {
      errors.push({
        row: rowNumber,
        column: mapping.sourceColumn,
        message: `값 변환 중 오류: ${value}`,
        severity: 'error',
      });
      return null;
    }
  }

  private autoTransformValue(value: unknown): unknown {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Numbers
    if (typeof value === 'number') {
      return value;
    }

    // Booleans
    if (typeof value === 'boolean') {
      return value;
    }

    // Strings - trim whitespace
    return String(value).trim();
  }

  private sanitizeFieldName(header: string): string {
    return header
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9가-힣]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}

export const excelParser = new ExcelParser();
