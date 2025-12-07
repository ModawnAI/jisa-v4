/**
 * Document Analyzer
 *
 * Analyzes unknown documents to discover structure, infer field types,
 * and detect semantic categories. This is the first step in the autonomous
 * processing pipeline.
 */

import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { ragTemplateSchemas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

import type {
  DocumentAnalysis,
  SheetAnalysis,
  ColumnAnalysis,
  ColumnType,
  SemanticCategory,
  TableAnalysis,
} from './types';

// =============================================================================
// Constants
// =============================================================================

/** Minimum rows for type inference */
const MIN_ROWS_FOR_INFERENCE = 5;

/** Maximum sample values to keep */
const MAX_SAMPLE_VALUES = 10;

/** Korean column name patterns for semantic detection */
const SEMANTIC_PATTERNS: Record<SemanticCategory, RegExp[]> = {
  employee_id: [
    /사번/i,
    /사원번호/i,
    /직원번호/i,
    /employee.?id/i,
    /emp.?no/i,
  ],
  employee_name: [
    /사원명/i,
    /사원이름/i,
    /성명/i,
    /이름/i,
    /name/i,
  ],
  department: [
    /소속/i,
    /부서/i,
    /지사/i,
    /지점/i,
    /팀/i,
    /조직/i,
    /department/i,
    /team/i,
  ],
  job_type: [
    /직종/i,
    /직급/i,
    /직책/i,
    /직위/i,
    /position/i,
    /title/i,
  ],
  date: [
    /일자/i,
    /날짜/i,
    /일시/i,
    /date/i,
    /timestamp/i,
  ],
  period: [
    /마감월/i,
    /보고월/i,
    /기간/i,
    /월/i,
    /분기/i,
    /년도/i,
    /회계연도/i,
    /period/i,
    /month/i,
    /quarter/i,
    /year/i,
  ],
  amount: [
    /금액/i,
    /원/i,
    /가격/i,
    /비용/i,
    /amount/i,
    /price/i,
    /cost/i,
  ],
  commission: [
    /수수료/i,
    /커미션/i,
    /보수/i,
    /commission/i,
    /fee/i,
    /FYC/i,
    /MFYC/i,
  ],
  income: [
    /수입/i,
    /소득/i,
    /급여/i,
    /지급/i,
    /지급액/i,
    /income/i,
    /salary/i,
    /payment/i,
    /AGI/i,
  ],
  fyc: [
    /FYC/i,
    /MFYC/i,
    /1차년도/i,
    /first.?year/i,
  ],
  count: [
    /건수/i,
    /개수/i,
    /수량/i,
    /횟수/i,
    /count/i,
    /quantity/i,
    /number/i,
  ],
  rate: [
    /율/i,
    /비율/i,
    /%/,
    /퍼센트/i,
    /rate/i,
    /percent/i,
    /ratio/i,
  ],
  status: [
    /상태/i,
    /진행/i,
    /여부/i,
    /status/i,
    /state/i,
  ],
  insurance_company: [
    /보험사/i,
    /보험회사/i,
    /회사명/i,
    /insurer/i,
    /company/i,
  ],
  product_name: [
    /상품명/i,
    /상품/i,
    /보험명/i,
    /product/i,
  ],
  contractor_name: [
    /계약자/i,
    /계약자명/i,
    /고객명/i,
    /contractor/i,
    /customer/i,
  ],
  policy_number: [
    /증권번호/i,
    /계약번호/i,
    /policy/i,
    /contract.?no/i,
  ],
  other: [],
};

/** Date format patterns */
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                    // YYYY-MM-DD
  /^\d{4}\/\d{2}\/\d{2}$/,                  // YYYY/MM/DD
  /^\d{2}-\d{2}-\d{4}$/,                    // DD-MM-YYYY
  /^\d{4}\.\d{2}\.\d{2}$/,                  // YYYY.MM.DD
  /^\d{4}년\s*\d{1,2}월\s*\d{1,2}일$/,       // YYYY년 MM월 DD일
  /^\d{2}\.\d{2}월$/,                       // YY.MM월 (performance month)
];

/** Period format patterns */
const PERIOD_PATTERNS = [
  /^\d{4}-\d{2}$/,                          // YYYY-MM
  /^\d{6}$/,                                // YYYYMM
  /^\d{4}년\s*\d{1,2}월$/,                   // YYYY년 MM월
  /^\d{1,2}월\s*보수$/,                      // MM월 보수
  /^Q[1-4]\s*\d{4}$/,                       // Q1 2025
  /^\d{4}\s*Q[1-4]$/,                       // 2025 Q1
];

/** Currency patterns (Korean Won) */
const CURRENCY_PATTERN = /^-?[\d,]+(?:원)?$/;

/** Percentage pattern */
const PERCENTAGE_PATTERN = /^-?\d+(?:\.\d+)?%$/;

/** Employee ID pattern */
const EMPLOYEE_ID_PATTERN = /^[A-Z]\d{5}$/;

// =============================================================================
// Document Analyzer Class
// =============================================================================

export class DocumentAnalyzer {
  /**
   * Analyze a document buffer and return structure analysis
   */
  async analyze(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<DocumentAnalysis> {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const documentType = this.detectDocumentType(mimeType, extension);

    const analysis: DocumentAnalysis = {
      documentType,
      fileInfo: {
        size: buffer.length,
        mimeType,
        fileName,
        extension,
      },
      structure: {},
      confidence: 0,
      rawSample: {},
      analyzedAt: new Date(),
    };

    switch (documentType) {
      case 'excel':
        await this.analyzeExcel(buffer, analysis);
        break;
      case 'csv':
        await this.analyzeCsv(buffer, analysis);
        break;
      case 'pdf':
        await this.analyzePdf(buffer, analysis);
        break;
      case 'json':
        await this.analyzeJson(buffer, analysis);
        break;
      default:
        analysis.confidence = 0.1;
    }

    // Try to match to existing schema
    await this.matchToExistingSchema(analysis);

    return analysis;
  }

  /**
   * Detect document type from MIME type and extension
   */
  private detectDocumentType(
    mimeType: string,
    extension: string
  ): DocumentAnalysis['documentType'] {
    // Check MIME type first
    if (
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return 'excel';
    }

    if (mimeType === 'text/csv' || mimeType === 'application/csv') {
      return 'csv';
    }

    if (mimeType === 'application/pdf') {
      return 'pdf';
    }

    if (mimeType === 'application/json') {
      return 'json';
    }

    // Fallback to extension
    switch (extension) {
      case 'xlsx':
      case 'xls':
      case 'xlsm':
        return 'excel';
      case 'csv':
        return 'csv';
      case 'pdf':
        return 'pdf';
      case 'json':
        return 'json';
      default:
        return 'unknown';
    }
  }

  /**
   * Analyze Excel document
   */
  private async analyzeExcel(
    buffer: Buffer,
    analysis: DocumentAnalysis
  ): Promise<void> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets: SheetAnalysis[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetAnalysis = this.analyzeExcelSheet(worksheet, sheetName);
      sheets.push(sheetAnalysis);
    }

    analysis.structure.sheets = sheets;

    // Calculate overall confidence based on sheet analysis
    const avgConfidence = sheets.reduce((sum, s) =>
      sum + (s.headers.length > 0 ? 0.8 : 0.3), 0) / sheets.length;
    analysis.confidence = avgConfidence;

    // Store raw sample from first sheet
    if (sheets.length > 0 && sheets[0].sampleRows.length > 0) {
      analysis.rawSample = sheets[0].sampleRows[0];
    }
  }

  /**
   * Analyze a single Excel sheet
   */
  private analyzeExcelSheet(
    worksheet: XLSX.WorkSheet,
    sheetName: string
  ): SheetAnalysis {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const rowCount = range.e.r - range.s.r + 1;
    const columnCount = range.e.c - range.s.c + 1;

    // Detect header row (first non-empty row with mostly strings)
    const headerRow = this.detectHeaderRow(worksheet, range);

    // Get headers
    const headers: ColumnAnalysis[] = [];
    const dataStartRow = headerRow + 1;

    for (let col = range.s.c; col <= range.e.c; col++) {
      const headerCell = worksheet[XLSX.utils.encode_cell({ r: headerRow, c: col })];
      const headerValue = headerCell?.v?.toString() || `Column_${col}`;

      // Analyze column data
      const columnData: unknown[] = [];
      for (let row = dataStartRow; row <= range.e.r && columnData.length < 100; row++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
        if (cell?.v !== undefined && cell?.v !== null && cell?.v !== '') {
          columnData.push(cell.v);
        }
      }

      const columnAnalysis = this.analyzeColumn(
        headerValue,
        col,
        columnData
      );
      headers.push(columnAnalysis);
    }

    // Extract sample rows
    const sampleRows: Record<string, unknown>[] = [];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    for (let i = dataStartRow; i < Math.min(dataStartRow + MAX_SAMPLE_VALUES, json.length); i++) {
      const row: Record<string, unknown> = {};
      const rowData = json[i] as unknown[];
      headers.forEach((header, idx) => {
        if (rowData && rowData[idx] !== undefined) {
          row[header.name] = rowData[idx];
        }
      });
      if (Object.keys(row).length > 0) {
        sampleRows.push(row);
      }
    }

    // Detect key columns (high uniqueness, ID-like)
    const keyColumns = headers
      .filter(h =>
        h.uniqueness > 0.9 &&
        (h.semanticCategory === 'employee_id' ||
          h.semanticCategory === 'policy_number' ||
          h.inferredType === 'id')
      )
      .map(h => h.name);

    // Detect structure markers
    const structureMarkers = this.detectStructureMarkers(sheetName, headers);

    return {
      name: sheetName,
      headerRow,
      headers,
      dataStartRow,
      rowCount,
      columnCount,
      keyColumns,
      foreignKeys: [], // TODO: Implement FK detection
      sampleRows,
      structureMarkers,
    };
  }

  /**
   * Detect the header row in a worksheet
   */
  private detectHeaderRow(
    worksheet: XLSX.WorkSheet,
    range: XLSX.Range
  ): number {
    // Look for the first row that has mostly text values
    for (let row = range.s.r; row <= Math.min(range.s.r + 10, range.e.r); row++) {
      let textCount = 0;
      let totalCount = 0;

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
        if (cell?.v !== undefined && cell?.v !== null && cell?.v !== '') {
          totalCount++;
          if (typeof cell.v === 'string') {
            textCount++;
          }
        }
      }

      // If more than 70% are text and we have at least 3 values, it's likely a header
      if (totalCount >= 3 && textCount / totalCount > 0.7) {
        return row;
      }
    }

    return 0; // Default to first row
  }

  /**
   * Analyze a single column
   */
  private analyzeColumn(
    headerName: string,
    index: number,
    data: unknown[]
  ): ColumnAnalysis {
    const normalizedName = this.normalizeColumnName(headerName);

    // Get sample values
    const sampleValues = data.slice(0, MAX_SAMPLE_VALUES);

    // Calculate uniqueness
    const uniqueValues = new Set(data.map(v => JSON.stringify(v)));
    const uniqueness = data.length > 0 ? uniqueValues.size / data.length : 0;

    // Infer type
    const { type, confidence: typeConfidence } = this.inferColumnType(data);

    // Detect semantic category
    const semanticCategory = this.detectSemanticCategory(headerName, data, type);

    // Calculate nullable
    const nullable = data.length < MIN_ROWS_FOR_INFERENCE ||
      data.some(v => v === null || v === undefined || v === '');

    // Calculate numeric stats if applicable
    let numericStats: ColumnAnalysis['numericStats'];
    if (['number', 'integer', 'decimal', 'currency'].includes(type)) {
      const numbers = data
        .map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')))
        .filter(n => !isNaN(n));

      if (numbers.length > 0) {
        numericStats = {
          min: Math.min(...numbers),
          max: Math.max(...numbers),
          avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
          sum: numbers.reduce((a, b) => a + b, 0),
        };
      }
    }

    return {
      name: headerName,
      normalizedName,
      index,
      inferredType: type,
      nullable,
      uniqueness,
      sampleValues,
      semanticCategory,
      typeConfidence,
      numericStats,
    };
  }

  /**
   * Normalize column name
   */
  private normalizeColumnName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_가-힣]/g, '')
      .substring(0, 64);
  }

  /**
   * Infer column type from data
   */
  private inferColumnType(data: unknown[]): { type: ColumnType; confidence: number } {
    if (data.length < MIN_ROWS_FOR_INFERENCE) {
      return { type: 'unknown', confidence: 0.3 };
    }

    const typeCounts: Record<ColumnType, number> = {
      string: 0,
      number: 0,
      integer: 0,
      decimal: 0,
      currency: 0,
      percentage: 0,
      date: 0,
      datetime: 0,
      boolean: 0,
      id: 0,
      mixed: 0,
      unknown: 0,
    };

    for (const value of data) {
      if (value === null || value === undefined || value === '') continue;

      const strValue = String(value).trim();

      // Check patterns in order of specificity
      if (EMPLOYEE_ID_PATTERN.test(strValue)) {
        typeCounts.id++;
      } else if (typeof value === 'boolean') {
        typeCounts.boolean++;
      } else if (PERCENTAGE_PATTERN.test(strValue)) {
        typeCounts.percentage++;
      } else if (CURRENCY_PATTERN.test(strValue)) {
        typeCounts.currency++;
      } else if (DATE_PATTERNS.some(p => p.test(strValue)) || value instanceof Date) {
        typeCounts.date++;
      } else if (PERIOD_PATTERNS.some(p => p.test(strValue))) {
        typeCounts.date++;
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          typeCounts.integer++;
        } else {
          typeCounts.decimal++;
        }
      } else if (!isNaN(Number(strValue))) {
        const num = Number(strValue);
        if (Number.isInteger(num)) {
          typeCounts.integer++;
        } else {
          typeCounts.decimal++;
        }
      } else {
        typeCounts.string++;
      }
    }

    // Find dominant type
    const total = Object.values(typeCounts).reduce((a, b) => a + b, 0);
    let dominantType: ColumnType = 'string';
    let maxCount = 0;

    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type as ColumnType;
      }
    }

    // Merge integer/decimal to number if mixed
    if (typeCounts.integer > 0 && typeCounts.decimal > 0) {
      dominantType = 'number';
      maxCount = typeCounts.integer + typeCounts.decimal;
    }

    const confidence = total > 0 ? maxCount / total : 0.3;

    // Check if too mixed
    if (confidence < 0.6 && typeCounts.string > 0) {
      return { type: 'mixed', confidence: 0.5 };
    }

    return { type: dominantType, confidence };
  }

  /**
   * Detect semantic category from column name and data
   */
  private detectSemanticCategory(
    headerName: string,
    data: unknown[],
    inferredType: ColumnType
  ): SemanticCategory | undefined {
    // Check header name patterns
    for (const [category, patterns] of Object.entries(SEMANTIC_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(headerName)) {
          return category as SemanticCategory;
        }
      }
    }

    // Infer from data patterns
    if (inferredType === 'id') {
      // Check if it looks like employee ID
      const hasEmployeeIdPattern = data.some(v =>
        EMPLOYEE_ID_PATTERN.test(String(v))
      );
      if (hasEmployeeIdPattern) {
        return 'employee_id';
      }
    }

    if (inferredType === 'currency') {
      // Check if it's likely commission or income based on column position or value range
      if (/수수료|커미션|보수|commission/i.test(headerName)) {
        return 'commission';
      }
      if (/수입|소득|급여|income/i.test(headerName)) {
        return 'income';
      }
      return 'amount';
    }

    if (inferredType === 'percentage') {
      return 'rate';
    }

    if (inferredType === 'integer') {
      if (/건수|개수|수량|count/i.test(headerName)) {
        return 'count';
      }
    }

    return undefined;
  }

  /**
   * Detect structure markers for schema matching
   */
  private detectStructureMarkers(
    sheetName: string,
    headers: ColumnAnalysis[]
  ): string[] {
    const markers: string[] = [];

    // Add sheet name
    markers.push(`sheet:${sheetName}`);

    // Add semantic categories present
    const categories = new Set(
      headers
        .map(h => h.semanticCategory)
        .filter((c): c is SemanticCategory => c !== undefined)
    );
    Array.from(categories).forEach(cat => {
      markers.push(`has:${cat}`);
    });

    // Add key column info
    const hasEmployeeId = headers.some(h =>
      h.semanticCategory === 'employee_id'
    );
    if (hasEmployeeId) {
      markers.push('key:employee_id');
    }

    // Detect document type from markers
    if (categories.has('commission') || categories.has('income')) {
      markers.push('type:compensation');
    }
    if (sheetName.includes('MDRT') || sheetName.includes('mdrt')) {
      markers.push('type:mdrt');
    }
    if (categories.has('policy_number')) {
      markers.push('type:contract');
    }

    return markers;
  }

  /**
   * Analyze CSV document
   */
  private async analyzeCsv(
    buffer: Buffer,
    analysis: DocumentAnalysis
  ): Promise<void> {
    // Convert CSV to workbook format and use Excel analysis
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    await this.analyzeExcel(buffer, analysis);
    analysis.documentType = 'csv';
  }

  /**
   * Analyze PDF document (placeholder - would need PDF parsing library)
   */
  private async analyzePdf(
    _buffer: Buffer,
    analysis: DocumentAnalysis
  ): Promise<void> {
    // TODO: Implement PDF analysis with pdf-parse or similar
    analysis.structure.sections = [];
    analysis.confidence = 0.3;
  }

  /**
   * Analyze JSON document
   */
  private async analyzeJson(
    buffer: Buffer,
    analysis: DocumentAnalysis
  ): Promise<void> {
    try {
      const content = JSON.parse(buffer.toString('utf-8'));
      analysis.rawSample = Array.isArray(content) ? content[0] : content;
      analysis.confidence = 0.8;

      // Analyze as table if array of objects
      if (Array.isArray(content) && content.length > 0 && typeof content[0] === 'object') {
        const headers = Object.keys(content[0]);
        const table: TableAnalysis = {
          location: { rowStart: 0, rowEnd: content.length - 1 },
          columnCount: headers.length,
          rowCount: content.length,
          headers,
          sampleData: content.slice(0, MAX_SAMPLE_VALUES),
        };
        analysis.structure.tables = [table];
      }
    } catch {
      analysis.confidence = 0.1;
    }
  }

  /**
   * Try to match analysis to existing schema
   */
  private async matchToExistingSchema(analysis: DocumentAnalysis): Promise<void> {
    if (!analysis.structure.sheets || analysis.structure.sheets.length === 0) {
      return;
    }

    // Get structure markers from the analysis
    const analysisMarkers = new Set<string>();
    for (const sheet of analysis.structure.sheets) {
      for (const marker of sheet.structureMarkers) {
        analysisMarkers.add(marker);
      }
    }

    // Query existing schemas
    const schemas = await db.query.ragTemplateSchemas.findMany({
      where: eq(ragTemplateSchemas.isActive, true),
    });

    let bestMatch: { schemaId: string; slug: string; score: number } | null = null;

    for (const schema of schemas) {
      // Compare markers using metadata field keys as markers
      const metadataFields = schema.metadataFields as Array<{ key: string }> || [];
      const schemaMarkers = metadataFields.map(f => f.key.toLowerCase());
      const matchCount = schemaMarkers.filter(m => analysisMarkers.has(m)).length;
      const score = schemaMarkers.length > 0 ? matchCount / schemaMarkers.length : 0;

      if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          schemaId: schema.id,
          slug: schema.templateSlug,
          score,
        };
      }
    }

    if (bestMatch) {
      analysis.suggestedSchemaId = bestMatch.schemaId;
      analysis.suggestedSchemaSlug = bestMatch.slug;
      analysis.confidence = Math.max(analysis.confidence, bestMatch.score);
    }
  }

  /**
   * Analyze multiple sheets to detect relationships
   */
  async analyzeRelationships(analysis: DocumentAnalysis): Promise<void> {
    if (!analysis.structure.sheets || analysis.structure.sheets.length < 2) {
      return;
    }

    // Look for foreign key relationships between sheets
    const sheets = analysis.structure.sheets;

    for (let i = 0; i < sheets.length; i++) {
      for (let j = i + 1; j < sheets.length; j++) {
        const sheet1 = sheets[i];
        const sheet2 = sheets[j];

        // Find columns with same name and high uniqueness
        for (const col1 of sheet1.headers) {
          for (const col2 of sheet2.headers) {
            if (
              col1.normalizedName === col2.normalizedName &&
              (col1.uniqueness > 0.8 || col2.uniqueness > 0.8)
            ) {
              // Potential foreign key
              const fk = {
                sourceColumn: col1.name,
                targetTable: sheet2.name,
                targetColumn: col2.name,
                confidence: Math.min(col1.uniqueness, col2.uniqueness),
              };
              sheet1.foreignKeys.push(fk);
            }
          }
        }
      }
    }
  }

  /**
   * Get summary of document analysis for logging
   */
  getSummary(analysis: DocumentAnalysis): string {
    const lines: string[] = [
      `Document Type: ${analysis.documentType}`,
      `Confidence: ${(analysis.confidence * 100).toFixed(1)}%`,
      `File: ${analysis.fileInfo.fileName} (${(analysis.fileInfo.size / 1024).toFixed(1)} KB)`,
    ];

    if (analysis.suggestedSchemaSlug) {
      lines.push(`Suggested Schema: ${analysis.suggestedSchemaSlug}`);
    }

    if (analysis.structure.sheets) {
      lines.push(`Sheets: ${analysis.structure.sheets.length}`);
      for (const sheet of analysis.structure.sheets) {
        lines.push(`  - ${sheet.name}: ${sheet.rowCount} rows, ${sheet.columnCount} cols`);
        if (sheet.keyColumns.length > 0) {
          lines.push(`    Keys: ${sheet.keyColumns.join(', ')}`);
        }
      }
    }

    return lines.join('\n');
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const documentAnalyzer = new DocumentAnalyzer();
