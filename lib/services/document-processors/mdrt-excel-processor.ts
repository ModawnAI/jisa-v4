/**
 * MDRT Excel Processor with Gemini AI-Powered Schema Detection
 *
 * Uses gemini-3-pro-preview for intelligent column matching and format detection.
 * Handles MDRT (Million Dollar Round Table) performance tracking files with:
 * - Multi-tier headers (3 rows)
 * - Monthly column groups
 * - MDRT qualification calculation
 * - Per-employee namespace isolation
 */

import * as XLSX from 'xlsx';
import { GoogleGenAI } from '@google/genai';
import { BaseDocumentProcessor } from './base-processor';
import type {
  DocumentForProcessing,
  ProcessorOptions,
  ProcessorResult,
  ProcessedChunk,
  MdrtVectorMetadata,
  NamespaceStrategy,
  ExtractedEntity,
} from './types';

// Lazy Gemini client initialization
let genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return genAI;
}

// Excel MIME types
const EXCEL_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

// MDRT qualification thresholds (2025)
const MDRT_THRESHOLDS = {
  ON_PACE: 58_000_000,
  MDRT: 70_703_500,
  COT: 212_110_500,
  TOT: 424_221_000,
};

/**
 * Schema detected by Gemini for Excel parsing
 */
interface DetectedSchema {
  dataSheetName: string;
  headerRowIndex: number;
  dataStartRowIndex: number;
  columnMapping: {
    employeeId: number;
    employeeName: number;
    branch?: number;
    team?: number;
    jobType?: number;
    totalCommission?: number;
    lifeInsuranceCommission?: number;
    totalIncome?: number;
    newContractIncome?: number;
    lifeInsuranceIncome?: number;
    selfContractCommission?: number;
    selfContractIncome?: number;
  };
  monthlyColumns?: Array<{
    month: string;
    commissionCol: number;
    incomeCol: number;
  }>;
  fiscalYear?: string;
  quarter?: string;
}

/**
 * Employee data extracted from MDRT file
 */
interface MdrtEmployeeData {
  employeeId: string;
  employeeName: string;
  branch?: string;
  team?: string;
  jobType?: string;
  totalCommission: number;
  lifeInsuranceCommission: number;
  totalIncome: number;
  newContractIncome: number;
  lifeInsuranceIncome: number;
  selfContractCommission: number;
  selfContractIncome: number;
  monthlyData: Array<{
    month: string;
    commission: number;
    income: number;
  }>;
}

/**
 * MDRT Excel Processor with Gemini-powered schema detection.
 */
export class MdrtExcelProcessor extends BaseDocumentProcessor {
  readonly type = 'mdrt_excel';
  readonly name = 'MDRT Excel Processor (Gemini-Powered)';
  readonly supportedMimeTypes = EXCEL_MIME_TYPES;
  readonly priority = 150; // Higher than compensation processor

  /**
   * Check if this processor can handle the document.
   */
  canProcess(document: DocumentForProcessing): boolean {
    if (!this.supportedMimeTypes.includes(document.mimeType)) {
      return false;
    }

    const fileName = document.originalFileName.toLowerCase();
    const mdrtPatterns = ['mdrt', '커미션', '총수입', 'commission'];

    return mdrtPatterns.some((pattern) => fileName.includes(pattern));
  }

  /**
   * Process MDRT Excel with Gemini-powered schema detection.
   */
  async process(
    content: Buffer | string,
    document: DocumentForProcessing,
    options: ProcessorOptions
  ): Promise<ProcessorResult> {
    const startTime = Date.now();
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const fileSize = buffer.length;

    // Parse Excel workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Use Gemini to detect schema
    const schema = await this.detectSchemaWithGemini(workbook, document.originalFileName);

    // Extract employee data using detected schema
    const employees = this.extractEmployeeData(workbook, schema);

    // Extract fiscal year and quarter from filename
    const { fiscalYear, quarter } = this.extractPeriodFromFilename(document.originalFileName);

    // Generate chunks for each employee
    const chunks: ProcessedChunk[] = [];
    const entities: ExtractedEntity[] = [];
    let chunkIndex = 0;

    for (const employee of employees) {
      const namespace = this.generateNamespace('employee', {
        organizationId: document.organizationId,
        employeeId: employee.employeeId,
      });

      // Calculate MDRT status
      const mdrtStatus = this.calculateMdrtStatus(employee.totalCommission);
      const mdrtProgress = (employee.totalCommission / MDRT_THRESHOLDS.MDRT) * 100;

      // Generate embedding text
      const embeddingText = this.generateEmbeddingText(employee, mdrtStatus, mdrtProgress, fiscalYear, quarter);

      // Create metadata
      const metadata: MdrtVectorMetadata = {
        ...this.createBaseMetadata(document, options, chunkIndex, embeddingText, 'excel'),
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        branch: employee.branch,
        team: employee.team,
        jobType: employee.jobType,
        fiscalYear,
        quarter,
        totalCommission: employee.totalCommission,
        lifeInsuranceCommission: employee.lifeInsuranceCommission,
        totalIncome: employee.totalIncome,
        newContractIncome: employee.newContractIncome,
        lifeInsuranceIncome: employee.lifeInsuranceIncome,
        mdrtStatus,
        mdrtProgress: Math.round(mdrtProgress * 10) / 10,
        mdrtThreshold: MDRT_THRESHOLDS.MDRT,
        selfContractCommission: employee.selfContractCommission,
        selfContractIncome: employee.selfContractIncome,
        monthlyDataAvailable: employee.monthlyData.map((m) => m.month),
        clearanceLevel: 'advanced',
        metadataType: 'mdrt',
      };

      const chunk = this.createProcessedChunk(
        embeddingText,
        embeddingText,
        metadata,
        namespace,
        document.id,
        chunkIndex,
        employee.employeeId
      );

      chunks.push(chunk);
      chunkIndex++;

      entities.push({
        type: 'employee',
        value: employee.employeeId,
        normalizedValue: employee.employeeName,
        confidence: 1.0,
      });
    }

    // Calculate aggregations
    const aggregations = this.calculateAggregations(employees);

    return this.createResult(chunks, startTime, fileSize, 'employee', aggregations);
  }

  /**
   * Namespace strategy is always 'employee' for MDRT data.
   */
  getNamespaceStrategy(): NamespaceStrategy {
    return 'employee';
  }

  // ===========================================================================
  // Gemini-Powered Schema Detection
  // ===========================================================================

  /**
   * Use Gemini to analyze Excel structure and detect schema.
   */
  private async detectSchemaWithGemini(
    workbook: XLSX.WorkBook,
    filename: string
  ): Promise<DetectedSchema> {
    // Extract sample data from each sheet for Gemini analysis
    const sheetSamples: Record<string, string[][]> = {};

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      const maxRows = Math.min(range.e.r + 1, 25); // First 25 rows
      const maxCols = Math.min(range.e.c + 1, 20); // First 20 columns

      const sample: string[][] = [];
      for (let r = 0; r < maxRows; r++) {
        const row: string[] = [];
        for (let c = 0; c < maxCols; c++) {
          const cellAddr = XLSX.utils.encode_cell({ r, c });
          const cell = sheet[cellAddr];
          row.push(cell ? String(cell.v || '') : '');
        }
        sample.push(row);
      }
      sheetSamples[sheetName] = sample;
    }

    const prompt = `You are analyzing a Korean Excel file for MDRT (Million Dollar Round Table) performance tracking.

Filename: ${filename}

Sheet names and their first 25 rows (first 20 columns):
${Object.entries(sheetSamples).map(([name, rows]) =>
  `\n=== Sheet: "${name}" ===\n${rows.map((row, i) => `Row ${i + 1}: ${JSON.stringify(row)}`).join('\n')}`
).join('\n')}

Analyze this Excel structure and return a JSON object with:
1. dataSheetName: The sheet containing the main employee data (likely has most rows with employee IDs like J#####)
2. headerRowIndex: 0-based index of the row containing column headers (look for 사번, 사원이름/사원명, 직종, 커미션, 총수입, etc.)
3. dataStartRowIndex: 0-based index where actual data rows begin
4. columnMapping: Object mapping field names to 0-based column indices:
   - employeeId: column with 사번 (employee IDs like J00001)
   - employeeName: column with 사원이름 or 사원명
   - branch: column with 지사 (optional)
   - team: column with 지점 (optional)
   - jobType: column with 직종 (optional)
   - totalCommission: column with total commission (커미션 합계, A.커미션)
   - lifeInsuranceCommission: column with 보장성금액 under commission
   - totalIncome: column with 총수입 합계, B.총수입
   - newContractIncome: column with 신계약수입, B1.신계약수입
   - lifeInsuranceIncome: column with income 보장성금액, B2.보장성금액
5. fiscalYear: Detected fiscal year (from filename or headers)
6. quarter: Detected quarter (Q1-Q4 from filename)

Important: For multi-tier headers (like MDRT files with headers spanning rows 13-15), identify the row that contains the actual column names used for data access.

Return ONLY valid JSON, no explanation:`;

    try {
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      });

      const text = response.text || '';

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('Gemini did not return valid JSON, using fallback detection');
        return this.fallbackSchemaDetection(workbook);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.dataSheetName || parsed.columnMapping?.employeeId === undefined) {
        console.warn('Gemini schema incomplete, using fallback');
        return this.fallbackSchemaDetection(workbook);
      }

      return {
        dataSheetName: parsed.dataSheetName,
        headerRowIndex: parsed.headerRowIndex ?? 0,
        dataStartRowIndex: parsed.dataStartRowIndex ?? (parsed.headerRowIndex + 1),
        columnMapping: {
          employeeId: parsed.columnMapping.employeeId,
          employeeName: parsed.columnMapping.employeeName ?? parsed.columnMapping.employeeId + 1,
          branch: parsed.columnMapping.branch,
          team: parsed.columnMapping.team,
          jobType: parsed.columnMapping.jobType,
          totalCommission: parsed.columnMapping.totalCommission,
          lifeInsuranceCommission: parsed.columnMapping.lifeInsuranceCommission,
          totalIncome: parsed.columnMapping.totalIncome,
          newContractIncome: parsed.columnMapping.newContractIncome,
          lifeInsuranceIncome: parsed.columnMapping.lifeInsuranceIncome,
          selfContractCommission: parsed.columnMapping.selfContractCommission,
          selfContractIncome: parsed.columnMapping.selfContractIncome,
        },
        fiscalYear: parsed.fiscalYear,
        quarter: parsed.quarter,
      };
    } catch (error) {
      console.error('Gemini schema detection failed:', error);
      return this.fallbackSchemaDetection(workbook);
    }
  }

  /**
   * Fallback schema detection without Gemini.
   */
  private fallbackSchemaDetection(workbook: XLSX.WorkBook): DetectedSchema {
    // Find the sheet with most data rows
    let bestSheet = workbook.SheetNames[0];
    let maxRows = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      if (range.e.r > maxRows) {
        maxRows = range.e.r;
        bestSheet = sheetName;
      }
    }

    const sheet = workbook.Sheets[bestSheet];

    // Search for header row by looking for '사번' pattern
    let headerRow = 0;
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    for (let r = 0; r <= Math.min(range.e.r, 20); r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        if (cell && String(cell.v).includes('사번')) {
          headerRow = r;
          break;
        }
      }
      if (headerRow > 0) break;
    }

    // Find column indices
    const columnMapping: DetectedSchema['columnMapping'] = {
      employeeId: 3,  // Default position
      employeeName: 4,
    };

    for (let c = 0; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
      const value = cell ? String(cell.v).toLowerCase() : '';

      if (value.includes('사번')) columnMapping.employeeId = c;
      if (value.includes('사원이름') || value.includes('사원명')) columnMapping.employeeName = c;
      if (value.includes('지사')) columnMapping.branch = c;
      if (value.includes('지점')) columnMapping.team = c;
      if (value.includes('직종')) columnMapping.jobType = c;
      if (value.includes('커미션') && value.includes('합계')) columnMapping.totalCommission = c;
      if (value.includes('총수입') && value.includes('합계')) columnMapping.totalIncome = c;
    }

    return {
      dataSheetName: bestSheet,
      headerRowIndex: headerRow,
      dataStartRowIndex: headerRow + 1,
      columnMapping,
    };
  }

  // ===========================================================================
  // Data Extraction
  // ===========================================================================

  /**
   * Extract employee data using detected schema.
   */
  private extractEmployeeData(
    workbook: XLSX.WorkBook,
    schema: DetectedSchema
  ): MdrtEmployeeData[] {
    const sheet = workbook.Sheets[schema.dataSheetName];
    if (!sheet) return [];

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const employees: MdrtEmployeeData[] = [];
    const cm = schema.columnMapping;

    for (let r = schema.dataStartRowIndex; r <= range.e.r; r++) {
      const rawEmployeeId = this.getCellValue(sheet, r, cm.employeeId);
      const employeeId = rawEmployeeId != null ? String(rawEmployeeId) : '';

      // Skip rows without valid employee ID
      if (!employeeId || !employeeId.match(/^[A-Z]?\d+$/i)) continue;

      const employee: MdrtEmployeeData = {
        employeeId: employeeId.trim(),
        employeeName: String(this.getCellValue(sheet, r, cm.employeeName) || '').trim(),
        branch: cm.branch !== undefined ? String(this.getCellValue(sheet, r, cm.branch) || '') : undefined,
        team: cm.team !== undefined ? String(this.getCellValue(sheet, r, cm.team) || '') : undefined,
        jobType: cm.jobType !== undefined ? String(this.getCellValue(sheet, r, cm.jobType) || '') : undefined,
        totalCommission: this.parseNumber(this.getCellValue(sheet, r, cm.totalCommission)),
        lifeInsuranceCommission: this.parseNumber(this.getCellValue(sheet, r, cm.lifeInsuranceCommission)),
        totalIncome: this.parseNumber(this.getCellValue(sheet, r, cm.totalIncome)),
        newContractIncome: this.parseNumber(this.getCellValue(sheet, r, cm.newContractIncome)),
        lifeInsuranceIncome: this.parseNumber(this.getCellValue(sheet, r, cm.lifeInsuranceIncome)),
        selfContractCommission: this.parseNumber(this.getCellValue(sheet, r, cm.selfContractCommission)),
        selfContractIncome: this.parseNumber(this.getCellValue(sheet, r, cm.selfContractIncome)),
        monthlyData: [],
      };

      // Extract monthly data if available
      if (schema.monthlyColumns) {
        for (const monthCol of schema.monthlyColumns) {
          employee.monthlyData.push({
            month: monthCol.month,
            commission: this.parseNumber(this.getCellValue(sheet, r, monthCol.commissionCol)),
            income: this.parseNumber(this.getCellValue(sheet, r, monthCol.incomeCol)),
          });
        }
      }

      employees.push(employee);
    }

    return employees;
  }

  /**
   * Get cell value by row and column index.
   */
  private getCellValue(sheet: XLSX.WorkSheet, row: number, col?: number): unknown {
    if (col === undefined) return undefined;
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    return cell ? cell.v : undefined;
  }

  /**
   * Parse number from various formats.
   */
  private parseNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[,원\s]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }

  // ===========================================================================
  // MDRT Calculations
  // ===========================================================================

  /**
   * Calculate MDRT qualification status.
   */
  private calculateMdrtStatus(
    totalCommission: number
  ): 'none' | 'on-pace' | 'mdrt' | 'cot' | 'tot' {
    if (totalCommission >= MDRT_THRESHOLDS.TOT) return 'tot';
    if (totalCommission >= MDRT_THRESHOLDS.COT) return 'cot';
    if (totalCommission >= MDRT_THRESHOLDS.MDRT) return 'mdrt';
    if (totalCommission >= MDRT_THRESHOLDS.ON_PACE) return 'on-pace';
    return 'none';
  }

  /**
   * Extract fiscal year and quarter from filename.
   */
  private extractPeriodFromFilename(filename: string): { fiscalYear: string; quarter: string } {
    // Try to extract year (2024, 2025, etc.)
    const yearMatch = filename.match(/20\d{2}/);
    const fiscalYear = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();

    // Try to extract quarter
    const quarterMatch = filename.match(/(\d)분기|Q(\d)/i);
    const quarter = quarterMatch ? `Q${quarterMatch[1] || quarterMatch[2]}` : 'Q4';

    return { fiscalYear, quarter };
  }

  // ===========================================================================
  // Text Generation
  // ===========================================================================

  /**
   * Generate structured Korean text for embedding.
   */
  private generateEmbeddingText(
    employee: MdrtEmployeeData,
    mdrtStatus: string,
    mdrtProgress: number,
    fiscalYear: string,
    quarter: string
  ): string {
    const parts: string[] = [];

    parts.push(`MDRT 성과 보고서 - ${fiscalYear}년 ${quarter}`);
    parts.push('');
    parts.push('[사원 정보]');
    parts.push(`사번: ${employee.employeeId}`);
    parts.push(`사원명: ${employee.employeeName}`);
    if (employee.branch) parts.push(`지사: ${employee.branch}`);
    if (employee.team) parts.push(`지점: ${employee.team}`);
    if (employee.jobType) parts.push(`직종: ${employee.jobType}`);

    parts.push('');
    parts.push('[연간 성과 요약]');
    parts.push(`A. 커미션 합계: ${this.formatKRW(employee.totalCommission)}`);
    parts.push(`   - 보장성금액: ${this.formatKRW(employee.lifeInsuranceCommission)}`);
    parts.push(`B. 총수입 합계: ${this.formatKRW(employee.totalIncome)}`);
    parts.push(`   - 신계약수입: ${this.formatKRW(employee.newContractIncome)}`);
    parts.push(`   - 보장성금액: ${this.formatKRW(employee.lifeInsuranceIncome)}`);

    parts.push('');
    parts.push('[MDRT 자격 현황]');
    parts.push(`현재 FYC: ${this.formatKRW(employee.totalCommission)}`);
    parts.push(`MDRT 기준: ${this.formatKRW(MDRT_THRESHOLDS.MDRT)}`);
    parts.push(`달성률: ${mdrtProgress.toFixed(1)}%`);

    const statusText = {
      'none': '미달성',
      'on-pace': 'On-Pace (진행중)',
      'mdrt': 'MDRT 달성',
      'cot': 'COT 달성',
      'tot': 'TOT 달성',
    }[mdrtStatus] || '미달성';
    parts.push(`자격: ${statusText}`);

    if (employee.monthlyData.length > 0) {
      parts.push('');
      parts.push('[월별 커미션 추이]');
      const monthlyText = employee.monthlyData
        .filter((m) => m.commission > 0)
        .map((m) => `${m.month}: ${this.formatKRW(m.commission)}`)
        .join(' / ');
      if (monthlyText) parts.push(monthlyText);
    }

    if (employee.selfContractCommission > 0 || employee.selfContractIncome > 0) {
      parts.push('');
      parts.push('[자기계약 조정]');
      parts.push(`자기계약 커미션: ${this.formatKRW(employee.selfContractCommission)}`);
      parts.push(`자기계약 총수입: ${this.formatKRW(employee.selfContractIncome)}`);
    }

    return parts.join('\n');
  }

  // ===========================================================================
  // Aggregations
  // ===========================================================================

  /**
   * Calculate aggregations across all employees.
   */
  private calculateAggregations(
    employees: MdrtEmployeeData[]
  ): Record<string, unknown> {
    let totalCommission = 0;
    let totalIncome = 0;
    const statusCounts = { none: 0, 'on-pace': 0, mdrt: 0, cot: 0, tot: 0 };

    for (const emp of employees) {
      totalCommission += emp.totalCommission;
      totalIncome += emp.totalIncome;
      const status = this.calculateMdrtStatus(emp.totalCommission);
      statusCounts[status]++;
    }

    return {
      totalEmployees: employees.length,
      totalCommission,
      totalIncome,
      averageCommission: employees.length > 0 ? totalCommission / employees.length : 0,
      mdrtQualified: statusCounts.mdrt + statusCounts.cot + statusCounts.tot,
      cotQualified: statusCounts.cot + statusCounts.tot,
      totQualified: statusCounts.tot,
      onPace: statusCounts['on-pace'],
      statusBreakdown: statusCounts,
    };
  }
}

/**
 * Singleton instance for export.
 */
export const mdrtExcelProcessor = new MdrtExcelProcessor();
