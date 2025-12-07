/**
 * Comprehensive MDRT Excel Processor with Template Support
 *
 * Processes MDRT (Million Dollar Round Table) performance tracking files with:
 * - Full monthly data extraction (12 months)
 * - Both FYC (A.커미션) and AGI (B.총수입) based MDRT qualification
 * - Self-contract adjustments per MDRT rules
 * - Rich metadata for Pinecone embedding
 * - Per-employee namespace isolation
 *
 * Excel Structure (HO&F_MDRT_커미션,총수입 산출금액):
 * - Sheet: 'HO&F_25.01~' (main data)
 * - Sheet: 'MDRT기준(Rule)' (thresholds)
 * - Headers: Row 14 (month labels), Row 15 (A.커미션/B.총수입), Row 16 (sub-columns)
 * - Data starts: Row 17
 *
 * Column Structure:
 * - B: NO (순번)
 * - C: 지사 (branch)
 * - D: 지점 (team)
 * - E: 사번 (employee ID)
 * - F: 사원이름 (employee name)
 * - G: 직종 (job type)
 * - H: 커미션 합계 (A.커미션 annual total)
 * - I: 현금시책 포함 보장성금액
 * - J: 총수입 합계 (B.총수입 annual total)
 * - K: 현금시책 포함 B1.신계약수입
 * - L: 현금시책 포함 B2.보장성금액
 * - M onwards: Monthly blocks (5 columns per month × 12 months)
 * - Final columns: Self-contract data (C1, C2, D1, D2)
 */

import * as XLSX from 'xlsx';
import { createHash } from 'crypto';
import { BaseDocumentProcessor } from './base-processor';
import type {
  DocumentForProcessing,
  ProcessorOptions,
  ProcessorResult,
  ProcessedChunk,
  MdrtVectorMetadata,
  MdrtMonthlyData,
  MdrtThresholds,
  NamespaceStrategy,
  ExtractedEntity,
  PerformanceRecord,
  DetailedRecords,
  StructureDetectionResult,
} from './types';

// Excel MIME types
const EXCEL_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

// Default MDRT thresholds (2025/2026)
const DEFAULT_MDRT_THRESHOLDS: MdrtThresholds = {
  fyc: {
    onPace: 58_000_000,
    mdrt: 70_703_500,
    cot: 212_110_500,
    tot: 424_221_000,
  },
  agi: {
    onPace: 100_000_000,
    mdrt: 122_455_500,
    cot: 367_366_500,
    tot: 734_733_000,
  },
};

// Column mapping for the HO&F MDRT file structure
interface MdrtColumnMapping {
  no: number;                       // B (1)
  branch: number;                   // C (2)
  team: number;                     // D (3)
  employeeId: number;               // E (4)
  employeeName: number;             // F (5)
  jobType: number;                  // G (6)
  totalCommission: number;          // H (7) - A.커미션 합계
  commissionProtection: number;     // I (8) - 보장성금액
  totalIncome: number;              // J (9) - B.총수입 합계
  newContractIncome: number;        // K (10) - B1.신계약수입
  incomeProtection: number;         // L (11) - B2.보장성금액
  monthlyStartCol: number;          // M (12) - Start of monthly blocks
  selfContractCommissionTotal?: number;   // BU - C1.자기계약 전체금액
  selfContractCommissionIncluded?: number;// BV - C2.자기계약 포함금액
  selfContractIncomeTotal?: number;       // BW - D1.자기계약 전체금액
  selfContractIncomeIncluded?: number;    // BX - D2.자기계약 포함금액
}

// Default column mapping based on analysis
const DEFAULT_COLUMN_MAPPING: MdrtColumnMapping = {
  no: 1,
  branch: 2,
  team: 3,
  employeeId: 4,
  employeeName: 5,
  jobType: 6,
  totalCommission: 7,
  commissionProtection: 8,
  totalIncome: 9,
  newContractIncome: 10,
  incomeProtection: 11,
  monthlyStartCol: 12,
  selfContractCommissionTotal: 72,  // BU
  selfContractCommissionIncluded: 73, // BV
  selfContractIncomeTotal: 74,      // BW
  selfContractIncomeIncluded: 75,   // BX
};

// Monthly column offsets (relative to month start column)
const MONTHLY_COLUMN_OFFSETS = {
  commissionTotal: 0,       // A.커미션 합계
  commissionProtection: 1,  // A.커미션 보장성금액
  incomeTotal: 2,           // B.총수입 합계
  incomeNewContract: 3,     // B1.신계약수입
  incomeProtection: 4,      // B2.보장성금액
};

const COLUMNS_PER_MONTH = 5;
const TOTAL_MONTHS = 12;

/**
 * Employee data extracted from MDRT file
 */
interface MdrtEmployeeData {
  rowIndex: number;
  no: number;
  employeeId: string;
  employeeName: string;
  branch: string;
  team: string;
  jobType: string;

  // Annual totals
  totalCommission: number;
  commissionProtection: number;
  totalIncome: number;
  newContractIncome: number;
  incomeProtection: number;

  // Self-contract data
  selfContractCommissionTotal: number;
  selfContractCommissionIncluded: number;
  selfContractIncomeTotal: number;
  selfContractIncomeIncluded: number;

  // Monthly breakdown
  monthlyData: MdrtMonthlyData[];
}

/**
 * Comprehensive MDRT Excel Processor with template support
 */
export class MdrtComprehensiveProcessor extends BaseDocumentProcessor {
  readonly type = 'mdrt_comprehensive';
  readonly name = 'MDRT Comprehensive Excel Processor';
  readonly supportedMimeTypes = EXCEL_MIME_TYPES;
  readonly priority = 160; // Higher than existing MDRT processor

  private columnMapping: MdrtColumnMapping = DEFAULT_COLUMN_MAPPING;
  private thresholds: MdrtThresholds = DEFAULT_MDRT_THRESHOLDS;

  /**
   * Check if this processor can handle the document (basic MIME type check)
   */
  canProcess(document: DocumentForProcessing): boolean {
    return this.supportedMimeTypes.includes(document.mimeType);
  }

  /**
   * Detect if the file structure matches MDRT format.
   * Analyzes Excel structure for MDRT-specific markers:
   * - Sheet names containing "HO&F" or "MDRT기준"
   * - Header row with 사번, 사원이름, 지사, 지점
   * - Column E containing employee IDs matching ^[A-Z]?\d{4,6}$
   * - Rule sheet with MDRT thresholds
   */
  async detectStructure(
    buffer: Buffer,
    document: DocumentForProcessing
  ): Promise<StructureDetectionResult> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      const markers: string[] = [];
      let confidence = 0;

      // Check 1: Sheet names (30 points max)
      const hasHoFSheet = sheetNames.some(name =>
        name.toLowerCase().includes('ho&f') || name.includes('HO&F')
      );
      const hasRuleSheet = sheetNames.some(name =>
        name.includes('MDRT기준') || name.includes('Rule') || name.toLowerCase().includes('rule')
      );

      if (hasHoFSheet) {
        confidence += 20;
        markers.push('HO&F sheet found');
      }
      if (hasRuleSheet) {
        confidence += 10;
        markers.push('MDRT Rule sheet found');
      }

      // Check 2: Find and analyze data sheet structure (50 points max)
      const dataSheetName = this.findDataSheet(workbook);
      if (dataSheetName) {
        const sheet = workbook.Sheets[dataSheetName];
        markers.push(`Data sheet: ${dataSheetName}`);
        confidence += 10;

        // Check for header row structure (rows 14-16 typically)
        const headerMarkers = this.detectHeaderStructure(sheet);
        if (headerMarkers.hasEmployeeIdHeader) {
          confidence += 15;
          markers.push('Employee ID header (사번) found');
        }
        if (headerMarkers.hasCommissionHeader) {
          confidence += 10;
          markers.push('Commission header (커미션) found');
        }
        if (headerMarkers.hasIncomeHeader) {
          confidence += 10;
          markers.push('Income header (총수입) found');
        }
        if (headerMarkers.hasBranchHeader) {
          confidence += 5;
          markers.push('Branch header (지사) found');
        }

        // Check 3: Validate employee ID pattern in data rows (20 points)
        const employeeIdValidation = this.validateEmployeeIdColumn(sheet);
        if (employeeIdValidation.valid) {
          confidence += 20;
          markers.push(`Valid employee IDs found: ${employeeIdValidation.count} rows`);
        }
      }

      const matches = confidence >= 50;

      return {
        matches,
        confidence: Math.min(confidence, 100),
        reason: matches
          ? `MDRT Excel structure detected with ${confidence}% confidence`
          : `Structure does not match MDRT format (confidence: ${confidence}%)`,
        detectedSheets: sheetNames,
        markers,
      };
    } catch (error) {
      return {
        matches: false,
        confidence: 0,
        reason: `Failed to parse Excel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Detect header structure in the sheet
   */
  private detectHeaderStructure(sheet: XLSX.WorkSheet): {
    hasEmployeeIdHeader: boolean;
    hasCommissionHeader: boolean;
    hasIncomeHeader: boolean;
    hasBranchHeader: boolean;
  } {
    const result = {
      hasEmployeeIdHeader: false,
      hasCommissionHeader: false,
      hasIncomeHeader: false,
      hasBranchHeader: false,
    };

    // Scan rows 13-17 (typical header area) and columns A-L
    for (let row = 13; row <= 17; row++) {
      for (let col = 0; col <= 12; col++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
        if (!cell) continue;

        const value = String(cell.v || '').toLowerCase();

        if (value.includes('사번') || value === 'employeeid') {
          result.hasEmployeeIdHeader = true;
        }
        if (value.includes('커미션') || value.includes('commission')) {
          result.hasCommissionHeader = true;
        }
        if (value.includes('총수입') || value.includes('income')) {
          result.hasIncomeHeader = true;
        }
        if (value.includes('지사') || value.includes('branch')) {
          result.hasBranchHeader = true;
        }
      }
    }

    return result;
  }

  /**
   * Validate that column E contains employee IDs matching expected pattern
   */
  private validateEmployeeIdColumn(sheet: XLSX.WorkSheet): { valid: boolean; count: number } {
    let validCount = 0;
    const employeeIdPattern = /^[A-Za-z]?\d{4,6}$/;

    // Check rows 17-30 (first few data rows)
    for (let row = 17; row <= 30; row++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: 4 })]; // Column E (index 4)
      if (!cell) continue;

      const value = String(cell.v || '').trim();
      if (employeeIdPattern.test(value)) {
        validCount++;
      }
    }

    return {
      valid: validCount >= 3, // At least 3 valid employee IDs
      count: validCount,
    };
  }

  /**
   * Process MDRT Excel file
   */
  async process(
    content: Buffer | string,
    document: DocumentForProcessing,
    options: ProcessorOptions
  ): Promise<ProcessorResult> {
    const startTime = Date.now();
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const fileSize = buffer.length;

    console.log(`[MdrtComprehensive] Processing: ${document.originalFileName}`);

    // Parse Excel workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Extract MDRT thresholds from Rule sheet
    this.thresholds = this.extractThresholds(workbook);
    console.log('[MdrtComprehensive] Thresholds:', this.thresholds);

    // Find main data sheet
    const dataSheetName = this.findDataSheet(workbook);
    if (!dataSheetName) {
      throw new Error('Could not find MDRT data sheet');
    }
    console.log(`[MdrtComprehensive] Data sheet: ${dataSheetName}`);

    // Detect column mapping
    this.columnMapping = this.detectColumnMapping(workbook.Sheets[dataSheetName]);
    console.log('[MdrtComprehensive] Column mapping:', this.columnMapping);

    // Extract employee data
    const employees = this.extractEmployeeData(workbook.Sheets[dataSheetName]);
    console.log(`[MdrtComprehensive] Extracted ${employees.length} employees`);

    // Extract fiscal year and quarter from filename
    const { fiscalYear, quarter, reportMonth } = this.extractPeriodInfo(document.originalFileName);

    // Generate chunks for each employee
    const chunks: ProcessedChunk[] = [];
    const entities: ExtractedEntity[] = [];
    const performanceRecords: PerformanceRecord[] = [];
    let chunkIndex = 0;

    // Calculate rankings for all employees
    const rankings = this.calculateRankings(employees);

    for (const employee of employees) {
      const namespace = this.generateNamespace('employee', {
        organizationId: document.organizationId,
        employeeId: employee.employeeId,
      });

      // Calculate MDRT status for both FYC and AGI
      const fycStatus = this.calculateMdrtStatus(employee.totalCommission, 'fyc');
      const agiStatus = this.calculateMdrtStatus(employee.totalIncome, 'agi');

      // Determine combined status (higher qualification wins)
      const combinedStatus = this.getCombinedStatus(fycStatus.status, agiStatus.status);

      // Generate embedding text
      const embeddingText = this.generateEmbeddingText(
        employee,
        fycStatus,
        agiStatus,
        combinedStatus,
        fiscalYear,
        quarter,
        reportMonth,
        rankings.get(employee.employeeId)
      );

      // Create comprehensive metadata
      const metadata: MdrtVectorMetadata = {
        ...this.createBaseMetadata(document, options, chunkIndex, embeddingText, 'excel'),
        // Employee info
        employeeId: employee.employeeId,
        employeeNumber: employee.employeeId, // Alias for explicit naming (사번)
        employeeName: employee.employeeName,
        branch: employee.branch,
        team: employee.team,
        jobType: employee.jobType,
        // Period info
        fiscalYear,
        quarter,
        reportMonth,
        // CRITICAL: period in YYYYMM format for Pinecone filter consistency
        period: reportMonth ? reportMonth.replace('-', '') : '',
        // Commission (FYC)
        totalCommission: employee.totalCommission,
        totalCommissionWithIncentive: employee.commissionProtection,
        commissionProtectionAmount: employee.commissionProtection,
        lifeInsuranceCommission: employee.commissionProtection, // Legacy
        // Income (AGI)
        totalIncome: employee.totalIncome,
        totalIncomeWithIncentive: employee.incomeProtection,
        newContractIncome: employee.newContractIncome,
        incomeProtectionAmount: employee.incomeProtection,
        lifeInsuranceIncome: employee.incomeProtection, // Legacy
        // FYC MDRT status
        fycMdrtStatus: fycStatus.status,
        fycMdrtProgress: fycStatus.progress,
        fycMdrtThreshold: this.thresholds.fyc.mdrt,
        fycOnPaceThreshold: this.thresholds.fyc.onPace,
        fycCotThreshold: this.thresholds.fyc.cot,
        fycTotThreshold: this.thresholds.fyc.tot,
        fycAmountToMdrt: fycStatus.amountToMdrt,
        // AGI MDRT status
        agiMdrtStatus: agiStatus.status,
        agiMdrtProgress: agiStatus.progress,
        agiMdrtThreshold: this.thresholds.agi.mdrt,
        agiOnPaceThreshold: this.thresholds.agi.onPace,
        agiCotThreshold: this.thresholds.agi.cot,
        agiTotThreshold: this.thresholds.agi.tot,
        agiAmountToMdrt: agiStatus.amountToMdrt,
        // Combined status
        mdrtStatus: combinedStatus,
        mdrtProgress: Math.max(fycStatus.progress, agiStatus.progress),
        mdrtThreshold: this.thresholds.fyc.mdrt,
        // Self-contract
        selfContractCommissionTotal: employee.selfContractCommissionTotal,
        selfContractCommissionIncluded: employee.selfContractCommissionIncluded,
        selfContractIncomeTotal: employee.selfContractIncomeTotal,
        selfContractIncomeIncluded: employee.selfContractIncomeIncluded,
        selfContractCommission: employee.selfContractCommissionIncluded,
        selfContractIncome: employee.selfContractIncomeIncluded,
        selfContractDeduction:
          (employee.selfContractCommissionTotal - employee.selfContractCommissionIncluded) +
          (employee.selfContractIncomeTotal - employee.selfContractIncomeIncluded),
        // Monthly data
        monthlyDataAvailable: employee.monthlyData
          .filter(m => m.commissionTotal !== 0 || m.incomeTotal !== 0)
          .map(m => m.month),
        latestMonthWithData: this.getLatestMonthWithData(employee.monthlyData),
        monthlyCommissions: JSON.stringify(
          Object.fromEntries(employee.monthlyData.map(m => [m.month, m.commissionTotal]))
        ),
        monthlyIncomes: JSON.stringify(
          Object.fromEntries(employee.monthlyData.map(m => [m.month, m.incomeTotal]))
        ),
        // Ranking
        rankInBranch: rankings.get(employee.employeeId)?.branchRank,
        rankInOrganization: rankings.get(employee.employeeId)?.orgRank,
        percentileInOrganization: rankings.get(employee.employeeId)?.percentile,
        // Access control
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

      // Add entity
      entities.push({
        type: 'employee',
        value: employee.employeeId,
        normalizedValue: employee.employeeName,
        confidence: 1.0,
        sourceLocation: { row: employee.rowIndex },
      });

      // Create performance records for detailed storage
      performanceRecords.push({
        employeeId: employee.employeeId,
        period: reportMonth || `${fiscalYear}${quarter}`,
        performanceType: 'yearly',
        metricName: 'FYC_MDRT',
        metricValue: employee.totalCommission,
        targetValue: this.thresholds.fyc.mdrt,
        achievementRate: fycStatus.progress,
        rawData: {
          branch: employee.branch,
          team: employee.team,
          jobType: employee.jobType,
          fycStatus: fycStatus.status,
          agiStatus: agiStatus.status,
          monthlyData: employee.monthlyData,
          selfContract: {
            commissionTotal: employee.selfContractCommissionTotal,
            commissionIncluded: employee.selfContractCommissionIncluded,
            incomeTotal: employee.selfContractIncomeTotal,
            incomeIncluded: employee.selfContractIncomeIncluded,
          },
        },
      });
    }

    // Calculate aggregations
    const aggregations = this.calculateAggregations(employees);

    // Prepare detailed records
    const detailedRecords: DetailedRecords = {
      commissions: [],
      overrides: [],
      incentives: [],
      clawbacks: [],
      performance: performanceRecords,
      allowances: [],
    };

    return {
      chunks,
      namespaceStrategy: 'employee',
      aggregations,
      entities,
      detailedRecords,
      processingInfo: {
        processorType: this.type,
        processingTime: Date.now() - startTime,
        sourceFileSize: fileSize,
        totalChunks: chunks.length,
      },
    };
  }

  /**
   * Namespace strategy is 'employee' for MDRT data - each employee gets their own namespace.
   */
  getNamespaceStrategy(): NamespaceStrategy {
    return 'employee';
  }

  // ===========================================================================
  // Sheet Detection
  // ===========================================================================

  /**
   * Find the main data sheet
   */
  private findDataSheet(workbook: XLSX.WorkBook): string | null {
    // Priority: sheets with "HO&F" and date range (not "지사")
    for (const name of workbook.SheetNames) {
      if (name.includes('HO&F') && name.includes('~') && !name.includes('지사')) {
        return name;
      }
    }
    // Fallback: first sheet with most data rows
    let bestSheet = workbook.SheetNames[0];
    let maxRows = 0;
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet['!ref']) continue;
      const range = XLSX.utils.decode_range(sheet['!ref']);
      if (range.e.r > maxRows) {
        maxRows = range.e.r;
        bestSheet = name;
      }
    }
    return bestSheet;
  }

  // ===========================================================================
  // Threshold Extraction
  // ===========================================================================

  /**
   * Extract MDRT thresholds from Rule sheet
   */
  private extractThresholds(workbook: XLSX.WorkBook): MdrtThresholds {
    const ruleSheet = workbook.Sheets['MDRT기준(Rule)'];
    if (!ruleSheet) {
      console.log('[MdrtComprehensive] Rule sheet not found, using defaults');
      return DEFAULT_MDRT_THRESHOLDS;
    }

    try {
      // Based on analysis of Rule sheet (Range B1:H8):
      // Row 4: On-Pace thresholds (B4=FYC, G4=AGI)
      // Row 5: MDRT thresholds (B5=FYC, G5=AGI)
      // Row 6: COT thresholds (B6=FYC, G6=AGI)
      // Row 7: TOT thresholds (B7=FYC, G7=AGI)
      return {
        fyc: {
          onPace: this.getCellNumber(ruleSheet, 'B4') || DEFAULT_MDRT_THRESHOLDS.fyc.onPace,
          mdrt: this.getCellNumber(ruleSheet, 'B5') || DEFAULT_MDRT_THRESHOLDS.fyc.mdrt,
          cot: this.getCellNumber(ruleSheet, 'B6') || DEFAULT_MDRT_THRESHOLDS.fyc.cot,
          tot: this.getCellNumber(ruleSheet, 'B7') || DEFAULT_MDRT_THRESHOLDS.fyc.tot,
        },
        agi: {
          onPace: this.getCellNumber(ruleSheet, 'G4') || DEFAULT_MDRT_THRESHOLDS.agi.onPace,
          mdrt: this.getCellNumber(ruleSheet, 'G5') || DEFAULT_MDRT_THRESHOLDS.agi.mdrt,
          cot: this.getCellNumber(ruleSheet, 'G6') || DEFAULT_MDRT_THRESHOLDS.agi.cot,
          tot: this.getCellNumber(ruleSheet, 'G7') || DEFAULT_MDRT_THRESHOLDS.agi.tot,
        },
      };
    } catch (error) {
      console.warn('[MdrtComprehensive] Error extracting thresholds:', error);
      return DEFAULT_MDRT_THRESHOLDS;
    }
  }

  private getCellNumber(sheet: XLSX.WorkSheet, address: string): number {
    const cell = sheet[address];
    if (!cell) return 0;
    return typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v)) || 0;
  }

  // ===========================================================================
  // Column Detection
  // ===========================================================================

  /**
   * Detect column mapping from sheet structure
   */
  private detectColumnMapping(sheet: XLSX.WorkSheet): MdrtColumnMapping {
    const mapping = { ...DEFAULT_COLUMN_MAPPING };

    // Scan header rows (13-16) to detect columns
    for (let row = 13; row <= 16; row++) {
      for (let col = 0; col <= 80; col++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
        const value = cell ? String(cell.v).trim().toLowerCase() : '';

        if (value === '사번' || value === '사원번호') {
          mapping.employeeId = col;
        } else if (value.includes('사원이름') || value === '사원명') {
          mapping.employeeName = col;
        } else if (value === '지사') {
          mapping.branch = col;
        } else if (value === '지점') {
          mapping.team = col;
        } else if (value === '직종') {
          mapping.jobType = col;
        }
      }
    }

    // Detect self-contract columns by scanning for "자기계약"
    // Column structure: C1 (Commission Total), C2 (Commission Included), D1 (Income Total), D2 (Income Included)
    for (let col = 60; col <= 80; col++) {
      for (let row = 14; row <= 16; row++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
        const value = cell ? String(cell.v).trim() : '';

        // Check for explicit C1/C2/D1/D2 prefixes (most specific)
        if (value.includes('C1.') || value.includes('C1')) {
          mapping.selfContractCommissionTotal = col;
        } else if (value.includes('C2.') || value.includes('C2')) {
          mapping.selfContractCommissionIncluded = col;
        } else if (value.includes('D1.') || value.includes('D1')) {
          mapping.selfContractIncomeTotal = col;
        } else if (value.includes('D2.') || value.includes('D2')) {
          mapping.selfContractIncomeIncluded = col;
        }
      }
    }

    return mapping;
  }

  // ===========================================================================
  // Data Extraction
  // ===========================================================================

  /**
   * Extract employee data from sheet
   */
  private extractEmployeeData(sheet: XLSX.WorkSheet): MdrtEmployeeData[] {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const employees: MdrtEmployeeData[] = [];
    const cm = this.columnMapping;

    // Data starts at row 17 (index 16)
    const dataStartRow = 16;

    for (let row = dataStartRow; row <= range.e.r; row++) {
      const employeeId = this.getCellString(sheet, row, cm.employeeId);

      // Skip rows without valid employee ID (J##### pattern)
      if (!employeeId || !employeeId.match(/^[A-Z]?\d{4,6}$/i)) {
        continue;
      }

      const employee: MdrtEmployeeData = {
        rowIndex: row + 1,
        no: this.getCellNumberByIndex(sheet, row, cm.no),
        employeeId: employeeId.trim(),
        employeeName: this.getCellString(sheet, row, cm.employeeName),
        branch: this.getCellString(sheet, row, cm.branch),
        team: this.getCellString(sheet, row, cm.team),
        jobType: this.getCellString(sheet, row, cm.jobType),
        // Annual totals
        totalCommission: this.getCellNumberByIndex(sheet, row, cm.totalCommission),
        commissionProtection: this.getCellNumberByIndex(sheet, row, cm.commissionProtection),
        totalIncome: this.getCellNumberByIndex(sheet, row, cm.totalIncome),
        newContractIncome: this.getCellNumberByIndex(sheet, row, cm.newContractIncome),
        incomeProtection: this.getCellNumberByIndex(sheet, row, cm.incomeProtection),
        // Self-contract
        selfContractCommissionTotal: cm.selfContractCommissionTotal
          ? this.getCellNumberByIndex(sheet, row, cm.selfContractCommissionTotal)
          : 0,
        selfContractCommissionIncluded: cm.selfContractCommissionIncluded
          ? this.getCellNumberByIndex(sheet, row, cm.selfContractCommissionIncluded)
          : 0,
        selfContractIncomeTotal: cm.selfContractIncomeTotal
          ? this.getCellNumberByIndex(sheet, row, cm.selfContractIncomeTotal)
          : 0,
        selfContractIncomeIncluded: cm.selfContractIncomeIncluded
          ? this.getCellNumberByIndex(sheet, row, cm.selfContractIncomeIncluded)
          : 0,
        // Monthly data
        monthlyData: this.extractMonthlyData(sheet, row),
      };

      employees.push(employee);
    }

    return employees;
  }

  /**
   * Extract monthly data for an employee
   */
  private extractMonthlyData(sheet: XLSX.WorkSheet, row: number): MdrtMonthlyData[] {
    const monthlyData: MdrtMonthlyData[] = [];
    const startCol = this.columnMapping.monthlyStartCol;

    // Month labels mapping (from analysis)
    const monthLabels = [
      { month: '2025-01', paymentMonth: '1월 보수', performanceMonth: '24.12월 실적' },
      { month: '2025-02', paymentMonth: '2월 보수', performanceMonth: '25.1월 실적' },
      { month: '2025-03', paymentMonth: '3월 보수', performanceMonth: '25.2월 실적' },
      { month: '2025-04', paymentMonth: '4월보수', performanceMonth: '25.3월 실적' },
      { month: '2025-05', paymentMonth: '5월보수', performanceMonth: '25.4월 실적' },
      { month: '2025-06', paymentMonth: '6월보수', performanceMonth: '25.5월 실적' },
      { month: '2025-07', paymentMonth: '7월보수', performanceMonth: '25.6월 실적' },
      { month: '2025-08', paymentMonth: '8월보수', performanceMonth: '25.7월 실적' },
      { month: '2025-09', paymentMonth: '9월보수', performanceMonth: '25.8월 실적' },
      { month: '2025-10', paymentMonth: '10월보수', performanceMonth: '25.9월 실적' },
      { month: '2025-11', paymentMonth: '11월보수', performanceMonth: '25.10월 실적' },
      { month: '2025-12', paymentMonth: '12월보수', performanceMonth: '25.11월 실적' },
    ];

    for (let i = 0; i < TOTAL_MONTHS; i++) {
      const monthStartCol = startCol + i * COLUMNS_PER_MONTH;
      const label = monthLabels[i] || { month: `2025-${String(i + 1).padStart(2, '0')}`, paymentMonth: '', performanceMonth: '' };

      monthlyData.push({
        month: label.month,
        paymentMonth: label.paymentMonth,
        performanceMonth: label.performanceMonth,
        commissionTotal: this.getCellNumberByIndex(sheet, row, monthStartCol + MONTHLY_COLUMN_OFFSETS.commissionTotal),
        commissionProtection: this.getCellNumberByIndex(sheet, row, monthStartCol + MONTHLY_COLUMN_OFFSETS.commissionProtection),
        incomeTotal: this.getCellNumberByIndex(sheet, row, monthStartCol + MONTHLY_COLUMN_OFFSETS.incomeTotal),
        incomeNewContract: this.getCellNumberByIndex(sheet, row, monthStartCol + MONTHLY_COLUMN_OFFSETS.incomeNewContract),
        incomeProtection: this.getCellNumberByIndex(sheet, row, monthStartCol + MONTHLY_COLUMN_OFFSETS.incomeProtection),
      });
    }

    return monthlyData;
  }

  private getCellString(sheet: XLSX.WorkSheet, row: number, col: number): string {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    return cell ? String(cell.v || '').trim() : '';
  }

  private getCellNumberByIndex(sheet: XLSX.WorkSheet, row: number, col: number): number {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    if (!cell) return 0;
    const value = cell.v;
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
   * Calculate MDRT status for a given amount
   */
  private calculateMdrtStatus(
    amount: number,
    type: 'fyc' | 'agi'
  ): { status: 'none' | 'on-pace' | 'mdrt' | 'cot' | 'tot'; progress: number; amountToMdrt: number } {
    const thresholds = this.thresholds[type];
    const progress = (amount / thresholds.mdrt) * 100;
    const amountToMdrt = Math.max(0, thresholds.mdrt - amount);

    let status: 'none' | 'on-pace' | 'mdrt' | 'cot' | 'tot' = 'none';
    if (amount >= thresholds.tot) {
      status = 'tot';
    } else if (amount >= thresholds.cot) {
      status = 'cot';
    } else if (amount >= thresholds.mdrt) {
      status = 'mdrt';
    } else if (amount >= thresholds.onPace) {
      status = 'on-pace';
    }

    return {
      status,
      progress: Math.round(progress * 10) / 10,
      amountToMdrt,
    };
  }

  /**
   * Get combined status (higher qualification wins)
   */
  private getCombinedStatus(
    fycStatus: 'none' | 'on-pace' | 'mdrt' | 'cot' | 'tot',
    agiStatus: 'none' | 'on-pace' | 'mdrt' | 'cot' | 'tot'
  ): 'none' | 'on-pace' | 'mdrt' | 'cot' | 'tot' {
    const statusRank = { 'none': 0, 'on-pace': 1, 'mdrt': 2, 'cot': 3, 'tot': 4 };
    return statusRank[fycStatus] >= statusRank[agiStatus] ? fycStatus : agiStatus;
  }

  // ===========================================================================
  // Ranking Calculations
  // ===========================================================================

  /**
   * Calculate rankings for all employees
   */
  private calculateRankings(
    employees: MdrtEmployeeData[]
  ): Map<string, { branchRank: number; orgRank: number; percentile: number }> {
    const rankings = new Map<string, { branchRank: number; orgRank: number; percentile: number }>();

    // Sort by total commission descending for overall ranking
    const sortedByFyc = [...employees].sort((a, b) => b.totalCommission - a.totalCommission);
    const totalCount = sortedByFyc.length;

    // Group by branch for branch ranking
    const branchGroups = new Map<string, MdrtEmployeeData[]>();
    for (const emp of employees) {
      const group = branchGroups.get(emp.branch) || [];
      group.push(emp);
      branchGroups.set(emp.branch, group);
    }

    // Sort each branch group
    branchGroups.forEach((group) => {
      group.sort((a, b) => b.totalCommission - a.totalCommission);
    });

    // Calculate rankings
    for (let i = 0; i < sortedByFyc.length; i++) {
      const emp = sortedByFyc[i];
      const branchGroup = branchGroups.get(emp.branch) || [];
      const branchRank = branchGroup.findIndex(e => e.employeeId === emp.employeeId) + 1;

      rankings.set(emp.employeeId, {
        branchRank,
        orgRank: i + 1,
        percentile: Math.round(((totalCount - i) / totalCount) * 100),
      });
    }

    return rankings;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Get the latest month with data
   */
  private getLatestMonthWithData(monthlyData: MdrtMonthlyData[]): string {
    for (let i = monthlyData.length - 1; i >= 0; i--) {
      if (monthlyData[i].commissionTotal !== 0 || monthlyData[i].incomeTotal !== 0) {
        return monthlyData[i].month;
      }
    }
    return monthlyData[0]?.month || '';
  }

  /**
   * Extract fiscal year, quarter, and report month from filename
   */
  private extractPeriodInfo(filename: string): {
    fiscalYear: string;
    quarter: string;
    reportMonth: string;
  } {
    // Try to extract year (2024, 2025, etc.)
    const yearMatch = filename.match(/20\d{2}/);
    const fiscalYear = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();

    // Try to extract quarter
    const quarterMatch = filename.match(/(\d)분기|Q(\d)/i);
    const quarter = quarterMatch ? `Q${quarterMatch[1] || quarterMatch[2]}` : 'Q4';

    // Try to extract month from patterns like "251114" (YYMMDD)
    const dateMatch = filename.match(/(\d{2})(\d{2})(\d{2})/);
    let reportMonth = '';
    if (dateMatch) {
      const year = `20${dateMatch[1]}`;
      const month = dateMatch[2];
      reportMonth = `${year}-${month}`;
    }

    return { fiscalYear, quarter, reportMonth };
  }

  // ===========================================================================
  // Text Generation
  // ===========================================================================

  /**
   * Generate structured Korean text for embedding
   */
  private generateEmbeddingText(
    employee: MdrtEmployeeData,
    fycStatus: { status: string; progress: number; amountToMdrt: number },
    agiStatus: { status: string; progress: number; amountToMdrt: number },
    combinedStatus: string,
    fiscalYear: string,
    quarter: string,
    reportMonth: string,
    ranking?: { branchRank: number; orgRank: number; percentile: number }
  ): string {
    const parts: string[] = [];

    parts.push(`MDRT 성과 보고서 - ${fiscalYear}년 ${quarter}`);
    if (reportMonth) parts.push(`보고월: ${reportMonth}`);
    parts.push('');

    // Employee info section
    parts.push('[사원 정보]');
    parts.push(`사번: ${employee.employeeId}`);
    parts.push(`사원명: ${employee.employeeName}`);
    parts.push(`지사: ${employee.branch}`);
    parts.push(`지점: ${employee.team}`);
    parts.push(`직종: ${employee.jobType}`);

    // FYC (Commission) section
    parts.push('');
    parts.push('[A. 커미션 (FYC)]');
    parts.push(`연간 합계: ${this.formatKRW(employee.totalCommission)}`);
    parts.push(`보장성금액: ${this.formatKRW(employee.commissionProtection)}`);
    parts.push(`MDRT 달성률: ${fycStatus.progress.toFixed(1)}%`);
    parts.push(`FYC 자격: ${this.getStatusText(fycStatus.status)}`);
    if (fycStatus.amountToMdrt > 0) {
      parts.push(`MDRT까지: ${this.formatKRW(fycStatus.amountToMdrt)} 부족`);
    }

    // AGI (Income) section
    parts.push('');
    parts.push('[B. 총수입 (AGI)]');
    parts.push(`연간 합계: ${this.formatKRW(employee.totalIncome)}`);
    parts.push(`신계약수입: ${this.formatKRW(employee.newContractIncome)}`);
    parts.push(`보장성금액: ${this.formatKRW(employee.incomeProtection)}`);
    parts.push(`MDRT 달성률: ${agiStatus.progress.toFixed(1)}%`);
    parts.push(`AGI 자격: ${this.getStatusText(agiStatus.status)}`);
    if (agiStatus.amountToMdrt > 0) {
      parts.push(`MDRT까지: ${this.formatKRW(agiStatus.amountToMdrt)} 부족`);
    }

    // Combined status
    parts.push('');
    parts.push('[MDRT 자격 종합]');
    parts.push(`최종 자격: ${this.getStatusText(combinedStatus)}`);
    parts.push(`FYC 기준: ${this.formatKRW(this.thresholds.fyc.mdrt)}`);
    parts.push(`AGI 기준: ${this.formatKRW(this.thresholds.agi.mdrt)}`);

    // Self-contract section
    if (employee.selfContractCommissionTotal > 0 || employee.selfContractIncomeTotal > 0) {
      parts.push('');
      parts.push('[자기계약 조정]');
      parts.push(`커미션 전체: ${this.formatKRW(employee.selfContractCommissionTotal)}`);
      parts.push(`커미션 포함: ${this.formatKRW(employee.selfContractCommissionIncluded)}`);
      parts.push(`총수입 전체: ${this.formatKRW(employee.selfContractIncomeTotal)}`);
      parts.push(`총수입 포함: ${this.formatKRW(employee.selfContractIncomeIncluded)}`);
      const deduction =
        (employee.selfContractCommissionTotal - employee.selfContractCommissionIncluded) +
        (employee.selfContractIncomeTotal - employee.selfContractIncomeIncluded);
      if (deduction > 0) {
        parts.push(`5% 한도 초과 차감: ${this.formatKRW(deduction)}`);
      }
    }

    // Ranking section
    if (ranking) {
      parts.push('');
      parts.push('[순위 정보]');
      parts.push(`지사 내 순위: ${ranking.branchRank}위`);
      parts.push(`전체 순위: ${ranking.orgRank}위`);
      parts.push(`상위 퍼센타일: ${ranking.percentile}%`);
    }

    // Monthly breakdown
    const monthsWithData = employee.monthlyData.filter(
      m => m.commissionTotal !== 0 || m.incomeTotal !== 0
    );
    if (monthsWithData.length > 0) {
      parts.push('');
      parts.push('[월별 커미션 추이]');
      const monthlyText = monthsWithData
        .map(m => `${m.month.substring(5)}월: ${this.formatKRW(m.commissionTotal)}`)
        .join(' / ');
      parts.push(monthlyText);
    }

    return parts.join('\n');
  }

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'none': '미달성',
      'on-pace': 'On-Pace (진행중)',
      'mdrt': 'MDRT 달성',
      'cot': 'COT 달성',
      'tot': 'TOT 달성',
    };
    return statusMap[status] || '미달성';
  }

  // ===========================================================================
  // Aggregations
  // ===========================================================================

  /**
   * Calculate aggregations across all employees
   */
  private calculateAggregations(employees: MdrtEmployeeData[]): Record<string, unknown> {
    let totalCommission = 0;
    let totalIncome = 0;
    const statusCounts = { none: 0, 'on-pace': 0, mdrt: 0, cot: 0, tot: 0 };
    const branchStats = new Map<string, { count: number; commission: number; qualified: number }>();

    for (const emp of employees) {
      totalCommission += emp.totalCommission;
      totalIncome += emp.totalIncome;

      const status = this.calculateMdrtStatus(emp.totalCommission, 'fyc').status;
      statusCounts[status]++;

      // Branch stats
      const branch = branchStats.get(emp.branch) || { count: 0, commission: 0, qualified: 0 };
      branch.count++;
      branch.commission += emp.totalCommission;
      if (status !== 'none' && status !== 'on-pace') {
        branch.qualified++;
      }
      branchStats.set(emp.branch, branch);
    }

    const qualifiedCount = statusCounts.mdrt + statusCounts.cot + statusCounts.tot;

    return {
      totalEmployees: employees.length,
      totalCommission,
      totalIncome,
      averageCommission: employees.length > 0 ? Math.round(totalCommission / employees.length) : 0,
      averageIncome: employees.length > 0 ? Math.round(totalIncome / employees.length) : 0,
      mdrtQualified: qualifiedCount,
      cotQualified: statusCounts.cot + statusCounts.tot,
      totQualified: statusCounts.tot,
      onPace: statusCounts['on-pace'],
      notQualified: statusCounts.none,
      qualificationRate: employees.length > 0 ? Math.round((qualifiedCount / employees.length) * 100) : 0,
      statusBreakdown: statusCounts,
      thresholds: this.thresholds,
      branchStats: Object.fromEntries(branchStats),
    };
  }
}

/**
 * Singleton instance for export
 */
export const mdrtComprehensiveProcessor = new MdrtComprehensiveProcessor();
