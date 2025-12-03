/**
 * Compensation Excel Processor
 *
 * Processes employee compensation Excel files with per-employee namespace isolation.
 * Ported from combined_excel_to_pinecone.py with rich metadata extraction.
 *
 * Key features:
 * - Employee-centric data structure (사번 as primary key)
 * - Per-employee namespace isolation (emp_{sabon})
 * - Structured Korean text for embeddings
 * - Financial aggregations and summaries
 */

import * as XLSX from 'xlsx';
import { BaseDocumentProcessor } from './base-processor';
import type {
  DocumentForProcessing,
  ProcessorOptions,
  ProcessorResult,
  ProcessedChunk,
  EmployeeVectorMetadata,
  NamespaceStrategy,
  ExtractedEntity,
} from './types';

// Excel MIME types
const EXCEL_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

// Sheet names from Python implementation
const SHEET_NAMES = {
  INDIVIDUAL_STATEMENT: '인별명세',     // Individual payment statement
  COMMISSION_BY_CONTRACT: '건별수수료', // Commission by contract
  OVERRIDE_BY_CONTRACT: '건별OR',       // Override by contract
  INFORCE_COMMISSION: '유지수수료',     // Inforce commission
  PROMOTION_OVERRIDE: '승진OR',         // Promotion override
  SAI: 'SAI',                           // SAI incentive
};

// Column mappings (mirroring Python)
const COLUMN_MAPPINGS = {
  SABON: '사번',
  EMPLOYEE_NAME: '사원명',
  JOB_TYPE: '직종',
  AFFILIATION: '소속',
  APPOINTMENT_DATE: '위촉일',
  FINAL_PAYMENT: '최종지급액',
  TOTAL_COMMISSION: '총_수수료',
  TOTAL_OVERRIDE: '총_OR',
  CONTRACT_COUNT: '계약건수',
  INSURANCE_COMPANY: '보험사',
  PRODUCT_NAME: '상품명',
  PREMIUM: '보험료',
  COMMISSION_AMOUNT: '수수료',
};

/**
 * Employee data structure matching Python's EmployeeDataStructure.
 */
interface EmployeeData {
  sabon: string;  // 사번 - Primary key
  profile: {
    name: string;          // 사원명
    jobType: string;       // 직종
    department: string;    // 소속
    appointmentDate?: string;  // 위촉일
  };
  financials: {
    finalPayment: number;     // 최종지급액
    totalCommission: number;  // 총 수수료
    totalOverride: number;    // 총 OR
  };
  commissionContracts: CommissionContract[];
  overrideRecords: OverrideRecord[];
  inforceCommissions: InforceCommission[];
  promotionOverrides: PromotionOverride[];
  saiIncentives: SaiIncentive[];
}

interface CommissionContract {
  insuranceCompany: string;
  productName: string;
  contractDate?: string;
  premium: number;
  commission: number;
}

interface OverrideRecord {
  insuranceCompany: string;
  productName: string;
  overrideAmount: number;
  subordinateName?: string;
}

interface InforceCommission {
  insuranceCompany: string;
  productName: string;
  amount: number;
}

interface PromotionOverride {
  amount: number;
  period?: string;
}

interface SaiIncentive {
  amount: number;
  category?: string;
}

/**
 * Compensation Excel processor with employee namespace isolation.
 * This processor creates one chunk per employee with comprehensive metadata.
 */
export class CompensationExcelProcessor extends BaseDocumentProcessor {
  readonly type = 'compensation_excel';
  readonly name = 'Compensation Excel Processor';
  readonly supportedMimeTypes = EXCEL_MIME_TYPES;
  readonly priority = 100; // High priority for compensation files

  /**
   * Check if this processor can handle the document.
   * Checks MIME type and optionally filename patterns.
   */
  canProcess(document: DocumentForProcessing): boolean {
    // Check MIME type
    if (!this.supportedMimeTypes.includes(document.mimeType)) {
      return false;
    }

    // Check for compensation-related filename patterns
    const fileName = document.originalFileName.toLowerCase();
    const compensationPatterns = [
      '급여',        // salary/payroll
      '수수료',      // commission (fee-based)
      '정산',        // settlement
      '커미션',      // commission (loan word) - MDRT files
      'mdrt',        // Million Dollar Round Table
      '총수입',      // total income
      'compensation',
      'payroll',
    ];

    return compensationPatterns.some((pattern) => fileName.includes(pattern));
  }

  /**
   * Process compensation Excel and generate employee-centric chunks.
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

    // Extract employee data from all sheets
    const employees = this.parseEmployeeData(workbook);

    // Generate chunks for each employee
    const chunks: ProcessedChunk[] = [];
    const entities: ExtractedEntity[] = [];
    let chunkIndex = 0;

    for (const [sabon, employee] of employees) {
      // Generate namespace for this employee
      const namespace = this.generateNamespace('employee', {
        organizationId: document.organizationId,
        employeeId: sabon,
      });

      // Generate structured embedding text
      const embeddingText = this.generateEmbeddingText(employee);

      // Create metadata
      const metadata: EmployeeVectorMetadata = {
        ...this.createBaseMetadata(document, options, chunkIndex, embeddingText, 'excel'),
        employeeId: sabon,
        employeeName: employee.profile.name,
        jobType: employee.profile.jobType,
        department: employee.profile.department,
        appointmentDate: employee.profile.appointmentDate,
        finalPayment: employee.financials.finalPayment,
        totalCommission: employee.financials.totalCommission,
        totalOverride: employee.financials.totalOverride,
        contractCount: employee.commissionContracts.length,
        clearanceLevel: 'advanced', // Compensation data is always sensitive
        metadataType: 'employee',
      };

      // Use helper to create properly-formed chunk
      const chunk = this.createProcessedChunk(
        embeddingText,
        embeddingText,
        metadata,
        namespace,
        document.id,
        chunkIndex,
        sabon
      );

      chunks.push(chunk);
      chunkIndex++;

      // Extract entities
      entities.push({
        type: 'employee',
        value: sabon,
        normalizedValue: employee.profile.name,
        confidence: 1.0,
      });
    }

    // Create aggregations
    const aggregations = this.calculateAggregations(employees);

    return this.createResult(
      chunks,
      startTime,
      fileSize,
      'employee',
      aggregations
    );
  }

  /**
   * Namespace strategy is always 'employee' for compensation data.
   */
  getNamespaceStrategy(
    _document: DocumentForProcessing,
    _options: ProcessorOptions
  ): NamespaceStrategy {
    return 'employee';
  }

  // ===========================================================================
  // Private Methods - Data Parsing
  // ===========================================================================

  /**
   * Parse employee data from all sheets in the workbook.
   */
  private parseEmployeeData(workbook: XLSX.WorkBook): Map<string, EmployeeData> {
    const employees = new Map<string, EmployeeData>();

    // Process individual statement sheet (인별명세)
    if (workbook.SheetNames.includes(SHEET_NAMES.INDIVIDUAL_STATEMENT)) {
      this.processIndividualStatements(
        workbook.Sheets[SHEET_NAMES.INDIVIDUAL_STATEMENT],
        employees
      );
    }

    // Process commission contracts (건별수수료)
    if (workbook.SheetNames.includes(SHEET_NAMES.COMMISSION_BY_CONTRACT)) {
      this.processCommissionContracts(
        workbook.Sheets[SHEET_NAMES.COMMISSION_BY_CONTRACT],
        employees
      );
    }

    // Process override records (건별OR)
    if (workbook.SheetNames.includes(SHEET_NAMES.OVERRIDE_BY_CONTRACT)) {
      this.processOverrideRecords(
        workbook.Sheets[SHEET_NAMES.OVERRIDE_BY_CONTRACT],
        employees
      );
    }

    // Process inforce commissions (유지수수료)
    if (workbook.SheetNames.includes(SHEET_NAMES.INFORCE_COMMISSION)) {
      this.processInforceCommissions(
        workbook.Sheets[SHEET_NAMES.INFORCE_COMMISSION],
        employees
      );
    }

    // Process promotion overrides (승진OR)
    if (workbook.SheetNames.includes(SHEET_NAMES.PROMOTION_OVERRIDE)) {
      this.processPromotionOverrides(
        workbook.Sheets[SHEET_NAMES.PROMOTION_OVERRIDE],
        employees
      );
    }

    // Process SAI incentives
    if (workbook.SheetNames.includes(SHEET_NAMES.SAI)) {
      this.processSaiIncentives(workbook.Sheets[SHEET_NAMES.SAI], employees);
    }

    return employees;
  }

  /**
   * Process individual statements sheet.
   */
  private processIndividualStatements(
    sheet: XLSX.WorkSheet,
    employees: Map<string, EmployeeData>
  ): void {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    for (const row of rows) {
      const sabon = String(row[COLUMN_MAPPINGS.SABON] || '').trim();
      if (!sabon) continue;

      const employee = this.getOrCreateEmployee(employees, sabon);

      // Update profile
      employee.profile.name = String(row[COLUMN_MAPPINGS.EMPLOYEE_NAME] || '');
      employee.profile.jobType = String(row[COLUMN_MAPPINGS.JOB_TYPE] || '');
      employee.profile.department = String(row[COLUMN_MAPPINGS.AFFILIATION] || '');
      employee.profile.appointmentDate = this.parseDate(
        row[COLUMN_MAPPINGS.APPOINTMENT_DATE]
      );

      // Update financials
      employee.financials.finalPayment = this.parseNumber(
        row[COLUMN_MAPPINGS.FINAL_PAYMENT]
      );
      employee.financials.totalCommission = this.parseNumber(
        row[COLUMN_MAPPINGS.TOTAL_COMMISSION]
      );
      employee.financials.totalOverride = this.parseNumber(
        row[COLUMN_MAPPINGS.TOTAL_OVERRIDE]
      );
    }
  }

  /**
   * Process commission contracts sheet.
   */
  private processCommissionContracts(
    sheet: XLSX.WorkSheet,
    employees: Map<string, EmployeeData>
  ): void {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    for (const row of rows) {
      const sabon = String(row[COLUMN_MAPPINGS.SABON] || '').trim();
      if (!sabon) continue;

      const employee = this.getOrCreateEmployee(employees, sabon);

      employee.commissionContracts.push({
        insuranceCompany: String(row[COLUMN_MAPPINGS.INSURANCE_COMPANY] || ''),
        productName: String(row[COLUMN_MAPPINGS.PRODUCT_NAME] || ''),
        premium: this.parseNumber(row[COLUMN_MAPPINGS.PREMIUM]),
        commission: this.parseNumber(row[COLUMN_MAPPINGS.COMMISSION_AMOUNT]),
      });
    }
  }

  /**
   * Process override records sheet.
   */
  private processOverrideRecords(
    sheet: XLSX.WorkSheet,
    employees: Map<string, EmployeeData>
  ): void {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    for (const row of rows) {
      const sabon = String(row[COLUMN_MAPPINGS.SABON] || '').trim();
      if (!sabon) continue;

      const employee = this.getOrCreateEmployee(employees, sabon);

      employee.overrideRecords.push({
        insuranceCompany: String(row[COLUMN_MAPPINGS.INSURANCE_COMPANY] || ''),
        productName: String(row[COLUMN_MAPPINGS.PRODUCT_NAME] || ''),
        overrideAmount: this.parseNumber(row['OR금액'] || row['오버라이드']),
        subordinateName: String(row['하위직원'] || row['소속직원'] || ''),
      });
    }
  }

  /**
   * Process inforce commissions sheet.
   */
  private processInforceCommissions(
    sheet: XLSX.WorkSheet,
    employees: Map<string, EmployeeData>
  ): void {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    for (const row of rows) {
      const sabon = String(row[COLUMN_MAPPINGS.SABON] || '').trim();
      if (!sabon) continue;

      const employee = this.getOrCreateEmployee(employees, sabon);

      employee.inforceCommissions.push({
        insuranceCompany: String(row[COLUMN_MAPPINGS.INSURANCE_COMPANY] || ''),
        productName: String(row[COLUMN_MAPPINGS.PRODUCT_NAME] || ''),
        amount: this.parseNumber(row['유지수수료'] || row['금액']),
      });
    }
  }

  /**
   * Process promotion overrides sheet.
   */
  private processPromotionOverrides(
    sheet: XLSX.WorkSheet,
    employees: Map<string, EmployeeData>
  ): void {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    for (const row of rows) {
      const sabon = String(row[COLUMN_MAPPINGS.SABON] || '').trim();
      if (!sabon) continue;

      const employee = this.getOrCreateEmployee(employees, sabon);

      employee.promotionOverrides.push({
        amount: this.parseNumber(row['승진OR'] || row['금액']),
        period: String(row['기간'] || ''),
      });
    }
  }

  /**
   * Process SAI incentives sheet.
   */
  private processSaiIncentives(
    sheet: XLSX.WorkSheet,
    employees: Map<string, EmployeeData>
  ): void {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    for (const row of rows) {
      const sabon = String(row[COLUMN_MAPPINGS.SABON] || '').trim();
      if (!sabon) continue;

      const employee = this.getOrCreateEmployee(employees, sabon);

      employee.saiIncentives.push({
        amount: this.parseNumber(row['SAI'] || row['금액']),
        category: String(row['구분'] || ''),
      });
    }
  }

  // ===========================================================================
  // Private Methods - Text Generation
  // ===========================================================================

  /**
   * Generate structured Korean text for embedding.
   * Mirrors Python's to_text_for_embedding() method.
   */
  private generateEmbeddingText(employee: EmployeeData): string {
    const parts: string[] = [];

    // Profile section
    parts.push(`사번: ${employee.sabon}`);
    parts.push(`사원명: ${employee.profile.name}`);
    parts.push(`직종: ${employee.profile.jobType}`);
    parts.push(`소속: ${employee.profile.department}`);
    if (employee.profile.appointmentDate) {
      parts.push(`위촉일: ${employee.profile.appointmentDate}`);
    }

    // Financial summary
    parts.push('\n## 재무 요약');
    parts.push(`최종지급액: ${this.formatKRW(employee.financials.finalPayment)}`);
    parts.push(`총 수수료: ${this.formatKRW(employee.financials.totalCommission)}`);
    parts.push(`총 오버라이드: ${this.formatKRW(employee.financials.totalOverride)}`);

    // Commission contracts
    if (employee.commissionContracts.length > 0) {
      parts.push(`\n## 수수료 계약: ${employee.commissionContracts.length}건`);
      const totalCommission = employee.commissionContracts.reduce(
        (sum, c) => sum + c.commission,
        0
      );
      parts.push(`총 수수료: ${this.formatKRW(totalCommission)}`);

      // Group by insurance company
      const byCompany = this.groupBy(
        employee.commissionContracts,
        (c) => c.insuranceCompany
      );
      parts.push('보험사별 계약:');
      for (const [company, contracts] of Object.entries(byCompany)) {
        const companyTotal = contracts.reduce((sum, c) => sum + c.commission, 0);
        parts.push(`  - ${company}: ${contracts.length}건, ${this.formatKRW(companyTotal)}`);
      }
    }

    // Override records
    if (employee.overrideRecords.length > 0) {
      parts.push(`\n## 오버라이드: ${employee.overrideRecords.length}건`);
      const totalOverride = employee.overrideRecords.reduce(
        (sum, r) => sum + r.overrideAmount,
        0
      );
      parts.push(`총 오버라이드: ${this.formatKRW(totalOverride)}`);
    }

    // Inforce commissions
    if (employee.inforceCommissions.length > 0) {
      parts.push(`\n## 유지수수료: ${employee.inforceCommissions.length}건`);
      const totalInforce = employee.inforceCommissions.reduce(
        (sum, c) => sum + c.amount,
        0
      );
      parts.push(`총 유지수수료: ${this.formatKRW(totalInforce)}`);
    }

    // Promotion overrides
    if (employee.promotionOverrides.length > 0) {
      const totalPromotion = employee.promotionOverrides.reduce(
        (sum, p) => sum + p.amount,
        0
      );
      parts.push(`\n## 승진 오버라이드: ${this.formatKRW(totalPromotion)}`);
    }

    // SAI incentives
    if (employee.saiIncentives.length > 0) {
      const totalSai = employee.saiIncentives.reduce((sum, s) => sum + s.amount, 0);
      parts.push(`\n## SAI 인센티브: ${this.formatKRW(totalSai)}`);
    }

    return parts.join('\n');
  }

  // ===========================================================================
  // Private Methods - Utilities
  // ===========================================================================

  /**
   * Get or create an employee record.
   */
  private getOrCreateEmployee(
    employees: Map<string, EmployeeData>,
    sabon: string
  ): EmployeeData {
    if (!employees.has(sabon)) {
      employees.set(sabon, {
        sabon,
        profile: {
          name: '',
          jobType: '',
          department: '',
        },
        financials: {
          finalPayment: 0,
          totalCommission: 0,
          totalOverride: 0,
        },
        commissionContracts: [],
        overrideRecords: [],
        inforceCommissions: [],
        promotionOverrides: [],
        saiIncentives: [],
      });
    }
    return employees.get(sabon)!;
  }

  /**
   * Parse a number from various formats.
   */
  private parseNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[,원\s]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }

  /**
   * Parse a date from various formats.
   */
  private parseDate(value: unknown): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') {
      // Excel serial date
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    return undefined;
  }

  /**
   * Group array by key function.
   */
  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce(
      (acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, T[]>
    );
  }

  /**
   * Calculate aggregations across all employees.
   */
  private calculateAggregations(
    employees: Map<string, EmployeeData>
  ): Record<string, unknown> {
    let totalEmployees = 0;
    let totalPayment = 0;
    let totalCommission = 0;
    let totalOverride = 0;
    let totalContracts = 0;

    for (const employee of employees.values()) {
      totalEmployees++;
      totalPayment += employee.financials.finalPayment;
      totalCommission += employee.financials.totalCommission;
      totalOverride += employee.financials.totalOverride;
      totalContracts += employee.commissionContracts.length;
    }

    return {
      totalEmployees,
      totalPayment,
      totalCommission,
      totalOverride,
      totalContracts,
      averagePayment: totalEmployees > 0 ? totalPayment / totalEmployees : 0,
      averageContracts: totalEmployees > 0 ? totalContracts / totalEmployees : 0,
    };
  }
}

/**
 * Singleton instance for export.
 */
export const compensationExcelProcessor = new CompensationExcelProcessor();
