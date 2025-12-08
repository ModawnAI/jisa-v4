/**
 * Public Document Processor
 *
 * Handles general/public documents that are accessible to everyone.
 * Mirrors the employee data structure patterns for consistency.
 *
 * Key features:
 * - Uses 'public' namespace for broad accessibility
 * - doc_type categorization matching employee data patterns
 * - Structured Korean text for embeddings
 * - Rich metadata extraction from filenames and content
 *
 * doc_types:
 * - commission_rate: 수수료율 정보 (보험사별 상품별 수수료율)
 * - policy_announcement: 시책/공지 (정책, 혜택, 변경사항)
 * - schedule: 일정/시간표 (교육, 연수, KRS)
 * - general_info: 일반 정보
 */

import * as XLSX from 'xlsx';
import { parsePDF } from '@/lib/utils/pdf-parser';
import { BaseDocumentProcessor } from './base-processor';
import type {
  DocumentForProcessing,
  ProcessorOptions,
  ProcessorResult,
  ProcessedChunk,
  BaseVectorMetadata,
  NamespaceStrategy,
} from './types';

// Supported MIME types
const PDF_MIME_TYPES = ['application/pdf'];
const EXCEL_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const ALL_SUPPORTED_TYPES = [...PDF_MIME_TYPES, ...EXCEL_MIME_TYPES];

// Document type detection patterns (similar to employee data doc_type)
// IMPORTANT: Order matters - more specific patterns should come first
// Using array of tuples to ensure deterministic order
const DOC_TYPE_PATTERNS: Array<[string, string[]]> = [
  // Commission patterns FIRST (most specific for financial docs)
  ['commission_rate', ['수수료', '커미션', 'commission', 'fee', '요율']],
  // Schedule patterns (specific time-related)
  ['schedule', ['일정', '스케줄', '시간표', 'schedule', 'timetable', 'krs']],
  // Policy/announcement patterns LAST (more general, includes insurance company names)
  ['policy_announcement', ['시책', '공지', '안내', '정책', 'policy', 'notice']],
];

// Insurance company patterns for commission files
const INSURANCE_COMPANY_PATTERNS = [
  '한화', '삼성', '메리츠', '교보', '흥국', 'db', 'KB', '현대',
  '동양', '미래에셋', 'AIA', '푸르덴셜', '라이나', '처브',
  '생보', '손보', '생명', '화재',
];

// Default chunk configuration - SMALLER for fine-grained retrieval
const DEFAULT_CHUNK_CONFIG = {
  maxChunkSize: 400,     // Reduced from 1000 for finer granularity
  chunkOverlap: 50,      // Reduced overlap for more distinct chunks
  minChunkSize: 50,      // Allow smaller semantic units
};

// Semantic splitting patterns for different doc types
const SEMANTIC_SPLIT_PATTERNS = {
  // Policy document markers
  policy_markers: [
    /^□\s*/gm,           // Checkbox/bullet markers
    /^\d+\.\s+/gm,       // Numbered lists
    /^[-*]\s+/gm,        // Dash/asterisk lists
    /^[가-힣]\.\s+/gm,   // Korean letter lists (가. 나. 다.)
    /^【[^】]+】/gm,      // Korean brackets
  ],
  // Schedule patterns
  schedule_markers: [
    /\d{4}-\d{2}-\d{2}/g,  // ISO date
    /\d{2}:\d{2}[~\-]\d{2}:\d{2}/g,  // Time range
    /[가-힣]+\s*강사|담당/g,  // Instructor markers
  ],
  // Table row patterns
  table_markers: [
    /^\|.+\|$/gm,        // Pipe-separated tables
    /\t[^\t]+\t/g,       // Tab-separated content
  ],
};

/**
 * Public Document Metadata - mirrors employee metadata patterns
 */
interface PublicVectorMetadata extends BaseVectorMetadata {
  // Document type (matching employee RAG doc_type pattern)
  doc_type: 'commission_rate' | 'policy_announcement' | 'schedule' | 'general_info';

  // Period context
  period?: string;              // e.g., '2025-11'
  effective_date?: string;      // 시행일

  // Source context
  branch?: string;              // 지사 (e.g., 'HO&F')

  // Commission-specific (for commission_rate doc_type)
  insurance_company?: string;   // 보험사
  product_category?: string;    // 상품분류 (생보/손보)

  // Schedule-specific (for schedule doc_type)
  schedule_type?: string;       // 교육유형 (KRS, 입문, 직급교육)

  // Policy-specific (for policy_announcement doc_type)
  policy_type?: string;         // 시책유형

  // PDF-specific
  page_number?: number;
  total_pages?: number;

  // Excel-specific
  sheet_name?: string;
  row_count?: number;

  // Public access marker
  is_public: true;

  // Natural language description for embedding
  searchable_text?: string;
}

/**
 * Detect doc_type from filename patterns.
 * Uses ordered array to ensure deterministic matching (commission_rate first).
 */
function detectDocType(filename: string): PublicVectorMetadata['doc_type'] {
  // Normalize to NFC for consistent Unicode comparison
  // macOS filesystem returns NFD (decomposed), but patterns are NFC (precomposed)
  const normalizedFilename = filename.normalize('NFC').toLowerCase();

  for (const [docType, patterns] of DOC_TYPE_PATTERNS) {
    if (patterns.some((pattern) => normalizedFilename.includes(pattern.normalize('NFC')))) {
      return docType as PublicVectorMetadata['doc_type'];
    }
  }

  return 'general_info';
}

/**
 * Extract period from filename like "11월" or "2025-11"
 * Returns both structured format and Korean format for embedding
 */
function extractPeriodFromFilename(filename: string): { structured?: string; korean?: string } {
  // Normalize to NFC for consistent Unicode comparison (macOS uses NFD)
  const normalizedFilename = filename.normalize('NFC');

  // Pattern: N월 or YYYY-MM
  const monthMatch = normalizedFilename.match(/(\d{1,2})월/);
  if (monthMatch) {
    const month = monthMatch[1].padStart(2, '0');
    const currentYear = new Date().getFullYear();
    return {
      structured: `${currentYear}-${month}`,
      korean: `${monthMatch[1]}월`
    };
  }

  const periodMatch = normalizedFilename.match(/(\d{4})-(\d{2})/);
  if (periodMatch) {
    return {
      structured: `${periodMatch[1]}-${periodMatch[2]}`,
      korean: `${parseInt(periodMatch[2])}월`
    };
  }

  return {};
}

/**
 * Extract insurance company from filename (e.g., "한화생명")
 */
function extractInsuranceCompanyFromFilename(filename: string): string | undefined {
  const normalizedFilename = filename.normalize('NFC');

  // Full company names first (more specific)
  const fullCompanyPatterns = [
    '한화생명', '삼성생명', '메리츠화재', '교보생명', '흥국생명',
    'DB손해보험', 'KB손해보험', '현대해상', '동양생명', '미래에셋생명',
    'AIA생명', '푸르덴셜생명', '라이나생명', '처브생명',
  ];

  for (const company of fullCompanyPatterns) {
    if (normalizedFilename.includes(company)) {
      return company;
    }
  }

  // Partial patterns (less specific)
  const partialPatterns: [RegExp, string][] = [
    [/한화.*생명|한화/i, '한화생명'],
    [/삼성.*생명|삼성/i, '삼성생명'],
    [/메리츠/i, '메리츠'],
    [/교보/i, '교보생명'],
  ];

  for (const [pattern, company] of partialPatterns) {
    if (pattern.test(normalizedFilename)) {
      return company;
    }
  }

  return undefined;
}

/**
 * Extract date from filename patterns like (25.10.06.) or 25-1107
 */
function extractDateFromFilename(filename: string): string | undefined {
  const patterns = [
    /\((\d{2})\.(\d{2})\.(\d{2})\.\)/,  // (25.10.06.)
    /(\d{2})-(\d{2})(\d{2})/,            // 25-1107
    /(\d{4})-?(\d{2})-?(\d{2})/,         // 2025-11-07 or 20251107
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      let year: string, month: string, day: string;

      if (match[1].length === 2) {
        year = `20${match[1]}`;
        month = match[2];
        day = match[3] || '01';
      } else {
        year = match[1];
        month = match[2];
        day = match[3] || '01';
      }

      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return undefined;
}

/**
 * Extract branch/지사 from filename
 */
function extractBranchFromFilename(filename: string): string | undefined {
  // Common patterns: HO&F, 서울지사, etc.
  const patterns = [
    /ho&f/i,
    /([가-힣]+지사)/,
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}

/**
 * Public Document Processor for general/everyone accessible documents.
 * Mirrors employee data structure patterns for RAG consistency.
 */
export class PublicDocumentProcessor extends BaseDocumentProcessor {
  readonly type = 'public_document';
  readonly name = 'Public Document Processor';
  readonly supportedMimeTypes = ALL_SUPPORTED_TYPES;
  readonly priority = 50; // Medium priority

  /**
   * Check if this processor can handle the document.
   */
  canProcess(document: DocumentForProcessing): boolean {
    return this.supportedMimeTypes.includes(document.mimeType);
  }

  /**
   * Always use public namespace for this processor.
   */
  getNamespaceStrategy(
    _document: DocumentForProcessing,
    _options: ProcessorOptions
  ): NamespaceStrategy {
    return 'public';
  }

  /**
   * Process the document based on its type.
   */
  async process(
    content: Buffer | string,
    document: DocumentForProcessing,
    options: ProcessorOptions
  ): Promise<ProcessorResult> {
    const mimeType = document.mimeType;

    if (PDF_MIME_TYPES.includes(mimeType)) {
      return this.processPDF(content, document, options);
    } else if (EXCEL_MIME_TYPES.includes(mimeType)) {
      return this.processExcel(content, document, options);
    }

    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  /**
   * Process PDF document with structured Korean text.
   */
  private async processPDF(
    content: Buffer | string,
    document: DocumentForProcessing,
    options: ProcessorOptions
  ): Promise<ProcessorResult> {
    const startTime = Date.now();
    const fileSize = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content);

    // Convert Buffer to Uint8Array for Blob compatibility
    let blobContent: BlobPart;
    if (Buffer.isBuffer(content)) {
      const bytes = new Uint8Array(content.length);
      for (let i = 0; i < content.length; i++) {
        bytes[i] = content[i];
      }
      blobContent = bytes;
    } else {
      blobContent = content;
    }

    // Parse PDF
    const blob = new Blob([blobContent], { type: 'application/pdf' });
    const pdfResult = await parsePDF(blob);

    // Determine namespace (always public)
    const namespaceStrategy = this.getNamespaceStrategy(document, options);
    const namespace = this.generateNamespace(namespaceStrategy, {
      organizationId: document.organizationId,
      documentId: document.id,
    });

    // Extract metadata from filename
    const docType = detectDocType(document.originalFileName);
    const periodInfo = extractPeriodFromFilename(document.originalFileName);
    const effectiveDate = extractDateFromFilename(document.originalFileName);
    const branch = extractBranchFromFilename(document.originalFileName);
    // Extract insurance company from filename for policy documents
    const insuranceCompany = extractInsuranceCompanyFromFilename(document.originalFileName);

    // Process pages into chunks with structured text
    const chunks = this.processPDFPages(
      pdfResult.pages,
      pdfResult.pageCount,
      document,
      options,
      namespace,
      docType,
      periodInfo.structured,  // Period in structured format (2025-11)
      periodInfo.korean,      // Period in Korean format (11월)
      effectiveDate,
      branch,
      insuranceCompany        // Insurance company from filename
    );

    return this.createResult(
      chunks,
      startTime,
      fileSize,
      namespaceStrategy,
      {
        pageCount: pdfResult.pageCount,
        docType,
        period: periodInfo.structured,
        periodKorean: periodInfo.korean,
        effectiveDate,
        insuranceCompany,
        pdfMetadata: pdfResult.metadata,
      }
    );
  }

  /**
   * Process PDF pages into chunks with semantic-aware splitting.
   * Uses fine-grained chunking based on doc_type for better RAG retrieval.
   * Enhanced: includes insurance company and Korean period for better policy query matching.
   */
  private processPDFPages(
    pages: Array<{ pageNumber: number; text: string }>,
    totalPages: number,
    document: DocumentForProcessing,
    options: ProcessorOptions,
    namespace: string,
    docType: PublicVectorMetadata['doc_type'],
    period: string | undefined,
    periodKorean: string | undefined,  // e.g., "11월" for keyword matching
    effectiveDate: string | undefined,
    branch: string | undefined,
    insuranceCompany: string | undefined  // e.g., "한화생명" from filename
  ): ProcessedChunk[] {
    const chunks: ProcessedChunk[] = [];
    const maxChunkSize = options.maxChunkSize || DEFAULT_CHUNK_CONFIG.maxChunkSize;

    let globalChunkIndex = 0;

    for (const page of pages) {
      if (!page.text.trim()) {
        continue;
      }

      // Use semantic-aware splitting based on doc_type
      let pageChunks: string[];

      if (docType === 'policy_announcement') {
        pageChunks = this.splitPolicyDocument(page.text, maxChunkSize);
      } else if (docType === 'schedule') {
        pageChunks = this.splitScheduleDocument(page.text, maxChunkSize);
      } else {
        // Fallback to smaller size-based chunking
        pageChunks = this.chunkText(page.text, maxChunkSize, DEFAULT_CHUNK_CONFIG.chunkOverlap);
      }

      for (const chunkContent of pageChunks) {
        const trimmedContent = chunkContent.trim();
        if (trimmedContent.length < DEFAULT_CHUNK_CONFIG.minChunkSize) {
          continue;
        }

        // Extract keywords from chunk for enriched embedding
        const keywords = this.extractKeywordsFromChunk(trimmedContent, docType);

        // Always add period (Korean) and insurance company to keywords for policy docs
        // This ensures "11월" and "한화생명" appear in ALL chunks for better retrieval
        if (periodKorean && !keywords.includes(periodKorean)) {
          keywords.unshift(periodKorean);
        }
        if (insuranceCompany && !keywords.includes(insuranceCompany)) {
          keywords.unshift(insuranceCompany);
        }

        // Generate structured Korean text with keywords
        const searchableText = this.generatePDFEmbeddingText(
          trimmedContent,
          docType,
          period,
          periodKorean,
          effectiveDate,
          branch,
          insuranceCompany,
          page.pageNumber,
          totalPages,
          document.originalFileName,
          keywords
        );

        const metadata: PublicVectorMetadata = {
          ...this.createBaseMetadata(document, options, globalChunkIndex, searchableText, 'pdf'),
          clearanceLevel: 'basic',
          doc_type: docType,
          period,
          effective_date: effectiveDate,
          branch,
          insurance_company: insuranceCompany,  // Include insurance company in metadata
          page_number: page.pageNumber,
          total_pages: totalPages,
          is_public: true,
          searchable_text: searchableText,
        };

        const chunk = this.createProcessedChunk(
          trimmedContent,
          searchableText,
          metadata,
          namespace,
          document.id,
          globalChunkIndex
        );

        chunks.push(chunk);
        globalChunkIndex++;
      }
    }

    return chunks;
  }

  /**
   * Split policy announcement documents by semantic markers.
   * Creates fine-grained chunks for each policy item, product, or rule.
   */
  private splitPolicyDocument(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];

    // First, split by major section markers (□, numbered lists, etc.)
    const sectionSplitters = [
      /(?=^□\s*)/gm,           // Before checkbox markers
      /(?=^\d+\.\s+)/gm,       // Before numbered items
      /(?=^[가나다라마바사아자차카타파하]\.\s+)/gm,  // Before Korean letter items
      /(?=^【)/gm,             // Before Korean brackets
      /(?=^\s*-\s+[가-힣])/gm, // Before dash-prefixed Korean text
    ];

    let sections = [text];

    // Apply each splitter to create finer sections
    for (const splitter of sectionSplitters) {
      const newSections: string[] = [];
      for (const section of sections) {
        const parts = section.split(splitter).filter(p => p.trim());
        newSections.push(...parts);
      }
      sections = newSections;
    }

    // Process each section - further split if too large
    for (const section of sections) {
      if (section.length <= maxChunkSize) {
        if (section.trim()) {
          chunks.push(section.trim());
        }
      } else {
        // Split large sections by line breaks or sentences
        const subChunks = this.splitByLineBreaks(section, maxChunkSize);
        chunks.push(...subChunks);
      }
    }

    return chunks;
  }

  /**
   * Split schedule documents by time slots and sessions.
   * Creates one chunk per session/class for precise retrieval.
   */
  private splitScheduleDocument(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const lines = text.split('\n');

    let currentChunk = '';
    let currentSession = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check if this is a new session (has date or time pattern)
      const hasDate = /\d{4}-\d{2}-\d{2}/.test(trimmedLine) ||
                      /\d{1,2}월\s*\d{1,2}일/.test(trimmedLine);
      const hasTime = /\d{2}:\d{2}/.test(trimmedLine);

      // If we find a new date/time session, save previous chunk
      if ((hasDate || hasTime) && currentChunk) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmedLine;
        currentSession = trimmedLine;
      } else {
        // Add to current chunk
        const newChunk = currentChunk ? `${currentChunk}\n${trimmedLine}` : trimmedLine;

        if (newChunk.length > maxChunkSize && currentChunk) {
          // Save current and start new
          chunks.push(currentChunk.trim());
          currentChunk = trimmedLine;
        } else {
          currentChunk = newChunk;
        }
      }
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // If we got very few chunks, try a different approach
    if (chunks.length < 5 && text.length > 500) {
      // Split by tab-separated or whitespace-heavy lines (table rows)
      return this.splitByTableRows(text, maxChunkSize);
    }

    return chunks;
  }

  /**
   * Split text by line breaks for large sections.
   */
  private splitByLineBreaks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const lines = text.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      const newChunk = currentChunk ? `${currentChunk}\n${line}` : line;

      if (newChunk.length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk = newChunk;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Split by table rows (tab or multiple-space separated content).
   */
  private splitByTableRows(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];

    // Split by lines that look like table rows
    const lines = text.split('\n');
    let headerContext = '';

    // Find header line (usually first non-empty line with multiple columns)
    for (const line of lines.slice(0, 3)) {
      if (line.includes('\t') || /\s{2,}/.test(line)) {
        headerContext = line;
        break;
      }
    }

    // Process each line as potential table row
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Skip if it's just the header
      if (trimmed === headerContext.trim()) continue;

      // Create chunk with header context for better retrieval
      const chunkWithContext = headerContext
        ? `${headerContext}\n${trimmed}`
        : trimmed;

      if (chunkWithContext.length <= maxChunkSize) {
        chunks.push(chunkWithContext);
      } else {
        // For very long rows, split further
        chunks.push(trimmed);
      }
    }

    return chunks;
  }

  /**
   * Extract keywords from chunk content based on doc_type.
   */
  private extractKeywordsFromChunk(
    content: string,
    docType: PublicVectorMetadata['doc_type']
  ): string[] {
    const keywords: string[] = [];

    if (docType === 'policy_announcement') {
      // Extract percentages (commission rates)
      const percentages = content.match(/\d+(?:\.\d+)?%/g);
      if (percentages) keywords.push(...percentages);

      // Extract Korean currency
      const amounts = content.match(/\d{1,3}(?:,\d{3})*원/g);
      if (amounts) keywords.push(...amounts);

      // Extract insurance companies
      for (const company of INSURANCE_COMPANY_PATTERNS) {
        if (content.includes(company)) {
          keywords.push(company);
        }
      }

      // Extract product names (parenthetical items)
      const products = content.match(/\([가-힣A-Za-z0-9]+\)/g);
      if (products) keywords.push(...products.map(p => p.slice(1, -1)));
    }
    else if (docType === 'schedule') {
      // Extract dates
      const dates = content.match(/\d{4}-\d{2}-\d{2}/g);
      if (dates) keywords.push(...dates);

      // Extract times
      const times = content.match(/\d{2}:\d{2}/g);
      if (times) keywords.push(...times);

      // Extract Korean names (instructor names typically 2-4 chars)
      const names = content.match(/[가-힣]{2,4}(?:\s*강사|\s*담당)?/g);
      if (names) keywords.push(...names.slice(0, 5));

      // Extract course names
      const courses = content.match(/KRS|교육|연수|오리엔테이션|세미나|특강/gi);
      if (courses) keywords.push(...courses);
    }

    // Remove duplicates and limit
    return [...new Set(keywords)].slice(0, 10);
  }

  /**
   * Generate structured Korean text for PDF embedding.
   * Mirrors the employee data embedding text pattern.
   * Enhanced with insurance company, period (Korean), and keywords for better retrieval.
   */
  private generatePDFEmbeddingText(
    content: string,
    docType: PublicVectorMetadata['doc_type'],
    period: string | undefined,
    periodKorean: string | undefined,  // e.g., "11월"
    effectiveDate: string | undefined,
    branch: string | undefined,
    insuranceCompany: string | undefined,  // e.g., "한화생명"
    pageNumber: number,
    totalPages: number,
    filename: string,
    keywords: string[] = []
  ): string {
    const parts: string[] = [];

    // Header (mirroring employee data pattern)
    // For policy announcements, emphasize insurance company and period at the top
    parts.push(`## 문서 정보`);
    parts.push(`문서유형: ${this.getDocTypeLabel(docType)}`);
    if (insuranceCompany) parts.push(`보험사: ${insuranceCompany}`);  // Insurance company first for prominence
    if (periodKorean) parts.push(`기간: ${periodKorean}`);  // Korean period (11월) for natural search
    if (period && !periodKorean) parts.push(`기간: ${period}`);  // Fallback to structured period
    if (effectiveDate) parts.push(`시행일: ${effectiveDate}`);
    if (branch) parts.push(`지사: ${branch}`);
    parts.push(`파일명: ${filename}`);
    parts.push(`페이지: ${pageNumber}/${totalPages}`);

    // Add keywords section for better semantic retrieval
    if (keywords.length > 0) {
      parts.push('');
      parts.push(`## 키워드`);
      parts.push(keywords.join(', '));
    }

    // Content
    parts.push('');
    parts.push(`## 내용`);
    parts.push(content);

    return parts.join('\n');
  }

  /**
   * Process Excel document with structured Korean text.
   */
  private async processExcel(
    content: Buffer | string,
    document: DocumentForProcessing,
    options: ProcessorOptions
  ): Promise<ProcessorResult> {
    const startTime = Date.now();
    const fileSize = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content);

    // Parse Excel
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Determine namespace (always public)
    const namespaceStrategy = this.getNamespaceStrategy(document, options);
    const namespace = this.generateNamespace(namespaceStrategy, {
      organizationId: document.organizationId,
      documentId: document.id,
    });

    // Extract metadata from filename
    const docType = detectDocType(document.originalFileName);
    const periodInfo = extractPeriodFromFilename(document.originalFileName);
    const effectiveDate = extractDateFromFilename(document.originalFileName);
    const branch = extractBranchFromFilename(document.originalFileName);

    // Process all sheets with appropriate strategy based on doc_type
    let chunks: ProcessedChunk[];

    if (docType === 'commission_rate') {
      // Commission rate files need special handling to extract insurance/product structure
      chunks = this.processCommissionRateExcel(
        workbook,
        document,
        options,
        namespace,
        periodInfo.structured,
        effectiveDate,
        branch
      );
    } else {
      // Generic Excel processing
      chunks = this.processGenericExcel(
        workbook,
        document,
        options,
        namespace,
        docType,
        periodInfo.structured,
        effectiveDate,
        branch
      );
    }

    return this.createResult(
      chunks,
      startTime,
      fileSize,
      namespaceStrategy,
      {
        sheetCount: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames,
        docType,
        period: periodInfo.structured,
        effectiveDate,
      }
    );
  }

  /**
   * Process commission rate Excel files.
   * Extracts insurance company and product information.
   */
  private processCommissionRateExcel(
    workbook: XLSX.WorkBook,
    document: DocumentForProcessing,
    options: ProcessorOptions,
    namespace: string,
    period: string | undefined,
    effectiveDate: string | undefined,
    branch: string | undefined
  ): ProcessedChunk[] {
    const chunks: ProcessedChunk[] = [];
    const maxChunkSize = options.maxChunkSize || options.chunkSize || DEFAULT_CHUNK_CONFIG.maxChunkSize;
    let globalChunkIndex = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // Detect insurance company from sheet name
      const insuranceCompany = this.detectInsuranceCompany(sheetName);
      const productCategory = this.detectProductCategory(sheetName);

      // Convert sheet to rows (header: 1 returns array of arrays)
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
      }) as unknown as unknown[][];

      if (rows.length < 2) continue;

      // Get headers from first row
      const headers = rows[0] as string[];
      if (!headers || headers.length === 0) continue;

      // Process data rows in chunks
      const dataRows = rows.slice(1);
      let currentChunkContent = '';
      let currentChunkRows: string[] = [];

      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex];
        if (!row || row.every((cell) => cell === '' || cell === null || cell === undefined)) {
          continue;
        }

        // Format row as key-value pairs
        const rowText = headers
          .map((header, colIndex) => {
            const value = row[colIndex];
            if (value === '' || value === null || value === undefined) return '';
            return `${header}: ${value}`;
          })
          .filter((text) => text.length > 0)
          .join('\n');

        if (rowText.length === 0) continue;

        const newContent = currentChunkContent
          ? `${currentChunkContent}\n\n${rowText}`
          : rowText;

        if (newContent.length > maxChunkSize && currentChunkContent.length > 0) {
          // Create chunk with structured text
          const searchableText = this.generateCommissionRateEmbeddingText(
            currentChunkContent,
            sheetName,
            insuranceCompany,
            productCategory,
            period,
            effectiveDate,
            branch,
            document.originalFileName
          );

          const metadata: PublicVectorMetadata = {
            ...this.createBaseMetadata(document, options, globalChunkIndex, searchableText, 'excel'),
            clearanceLevel: 'basic',
            doc_type: 'commission_rate',
            period,
            effective_date: effectiveDate,
            branch,
            insurance_company: insuranceCompany,
            product_category: productCategory,
            sheet_name: sheetName,
            row_count: currentChunkRows.length,
            is_public: true,
            searchable_text: searchableText,
          };

          const chunk = this.createProcessedChunk(
            currentChunkContent,
            searchableText,
            metadata,
            namespace,
            document.id,
            globalChunkIndex
          );

          chunks.push(chunk);
          globalChunkIndex++;

          currentChunkContent = rowText;
          currentChunkRows = [String(rowIndex + 1)];
        } else {
          currentChunkContent = newContent;
          currentChunkRows.push(String(rowIndex + 1));
        }
      }

      // Don't forget the last chunk
      if (currentChunkContent.length > 0) {
        const searchableText = this.generateCommissionRateEmbeddingText(
          currentChunkContent,
          sheetName,
          insuranceCompany,
          productCategory,
          period,
          effectiveDate,
          branch,
          document.originalFileName
        );

        const metadata: PublicVectorMetadata = {
          ...this.createBaseMetadata(document, options, globalChunkIndex, searchableText, 'excel'),
          clearanceLevel: 'basic',
          doc_type: 'commission_rate',
          period,
          effective_date: effectiveDate,
          branch,
          insurance_company: insuranceCompany,
          product_category: productCategory,
          sheet_name: sheetName,
          row_count: currentChunkRows.length,
          is_public: true,
          searchable_text: searchableText,
        };

        const chunk = this.createProcessedChunk(
          currentChunkContent,
          searchableText,
          metadata,
          namespace,
          document.id,
          globalChunkIndex
        );

        chunks.push(chunk);
        globalChunkIndex++;
      }
    }

    return chunks;
  }

  /**
   * Generate structured Korean text for commission rate embedding.
   * Mirrors the employee data commission pattern.
   */
  private generateCommissionRateEmbeddingText(
    content: string,
    sheetName: string,
    insuranceCompany: string | undefined,
    productCategory: string | undefined,
    period: string | undefined,
    effectiveDate: string | undefined,
    branch: string | undefined,
    filename: string
  ): string {
    const parts: string[] = [];

    // Header (mirroring employee commission data pattern)
    parts.push(`## 수수료율 정보`);
    if (insuranceCompany) parts.push(`보험사: ${insuranceCompany}`);
    if (productCategory) parts.push(`상품분류: ${productCategory}`);
    parts.push(`시트: ${sheetName}`);
    if (period) parts.push(`기간: ${period}`);
    if (effectiveDate) parts.push(`시행일: ${effectiveDate}`);
    if (branch) parts.push(`지사: ${branch}`);
    parts.push(`파일명: ${filename}`);

    // Content
    parts.push('');
    parts.push(`## 상세 수수료율`);
    parts.push(content);

    return parts.join('\n');
  }

  /**
   * Process generic Excel files.
   */
  private processGenericExcel(
    workbook: XLSX.WorkBook,
    document: DocumentForProcessing,
    options: ProcessorOptions,
    namespace: string,
    docType: PublicVectorMetadata['doc_type'],
    period: string | undefined,
    effectiveDate: string | undefined,
    branch: string | undefined
  ): ProcessedChunk[] {
    const chunks: ProcessedChunk[] = [];
    const maxChunkSize = options.maxChunkSize || options.chunkSize || DEFAULT_CHUNK_CONFIG.maxChunkSize;
    let globalChunkIndex = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // Convert sheet to rows (header: 1 returns array of arrays)
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
      }) as unknown as unknown[][];

      if (rows.length < 2) continue;

      const headers = rows[0] as string[];
      if (!headers || headers.length === 0) continue;

      const dataRows = rows.slice(1);
      let currentChunkContent = '';
      let currentChunkRows: string[] = [];

      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex];
        if (!row || row.every((cell) => cell === '' || cell === null || cell === undefined)) {
          continue;
        }

        const rowText = headers
          .map((header, colIndex) => {
            const value = row[colIndex];
            if (value === '' || value === null || value === undefined) return '';
            return `${header}: ${value}`;
          })
          .filter((text) => text.length > 0)
          .join('\n');

        if (rowText.length === 0) continue;

        const newContent = currentChunkContent
          ? `${currentChunkContent}\n\n${rowText}`
          : rowText;

        if (newContent.length > maxChunkSize && currentChunkContent.length > 0) {
          const searchableText = this.generateGenericExcelEmbeddingText(
            currentChunkContent,
            sheetName,
            docType,
            period,
            effectiveDate,
            branch,
            document.originalFileName
          );

          const metadata: PublicVectorMetadata = {
            ...this.createBaseMetadata(document, options, globalChunkIndex, searchableText, 'excel'),
            clearanceLevel: 'basic',
            doc_type: docType,
            period,
            effective_date: effectiveDate,
            branch,
            sheet_name: sheetName,
            row_count: currentChunkRows.length,
            is_public: true,
            searchable_text: searchableText,
          };

          const chunk = this.createProcessedChunk(
            currentChunkContent,
            searchableText,
            metadata,
            namespace,
            document.id,
            globalChunkIndex
          );

          chunks.push(chunk);
          globalChunkIndex++;

          currentChunkContent = rowText;
          currentChunkRows = [String(rowIndex + 1)];
        } else {
          currentChunkContent = newContent;
          currentChunkRows.push(String(rowIndex + 1));
        }
      }

      // Last chunk
      if (currentChunkContent.length > 0) {
        const searchableText = this.generateGenericExcelEmbeddingText(
          currentChunkContent,
          sheetName,
          docType,
          period,
          effectiveDate,
          branch,
          document.originalFileName
        );

        const metadata: PublicVectorMetadata = {
          ...this.createBaseMetadata(document, options, globalChunkIndex, searchableText, 'excel'),
          clearanceLevel: 'basic',
          doc_type: docType,
          period,
          effective_date: effectiveDate,
          branch,
          sheet_name: sheetName,
          row_count: currentChunkRows.length,
          is_public: true,
          searchable_text: searchableText,
        };

        const chunk = this.createProcessedChunk(
          currentChunkContent,
          searchableText,
          metadata,
          namespace,
          document.id,
          globalChunkIndex
        );

        chunks.push(chunk);
        globalChunkIndex++;
      }
    }

    return chunks;
  }

  /**
   * Generate structured Korean text for generic Excel embedding.
   */
  private generateGenericExcelEmbeddingText(
    content: string,
    sheetName: string,
    docType: PublicVectorMetadata['doc_type'],
    period: string | undefined,
    effectiveDate: string | undefined,
    branch: string | undefined,
    filename: string
  ): string {
    const parts: string[] = [];

    parts.push(`## ${this.getDocTypeLabel(docType)}`);
    parts.push(`시트: ${sheetName}`);
    if (period) parts.push(`기간: ${period}`);
    if (effectiveDate) parts.push(`시행일: ${effectiveDate}`);
    if (branch) parts.push(`지사: ${branch}`);
    parts.push(`파일명: ${filename}`);

    parts.push('');
    parts.push(`## 내용`);
    parts.push(content);

    return parts.join('\n');
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Get human-readable label for doc_type.
   */
  private getDocTypeLabel(docType: PublicVectorMetadata['doc_type']): string {
    const labels: Record<PublicVectorMetadata['doc_type'], string> = {
      commission_rate: '수수료율 정보',
      policy_announcement: '시책/공지',
      schedule: '일정/시간표',
      general_info: '일반 정보',
    };
    return labels[docType] || '문서';
  }

  /**
   * Detect insurance company from sheet name or content.
   */
  private detectInsuranceCompany(text: string): string | undefined {
    const lowerText = text.toLowerCase();

    for (const company of INSURANCE_COMPANY_PATTERNS) {
      if (lowerText.includes(company.toLowerCase())) {
        return company;
      }
    }

    return undefined;
  }

  /**
   * Detect product category (생보/손보).
   */
  private detectProductCategory(text: string): string | undefined {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('생보') || lowerText.includes('생명')) {
      return '생보';
    }
    if (lowerText.includes('손보') || lowerText.includes('화재')) {
      return '손보';
    }
    if (lowerText.includes('통합')) {
      return '통합';
    }

    return undefined;
  }
}

/**
 * Singleton instance for export.
 */
export const publicDocumentProcessor = new PublicDocumentProcessor();

// Export detectDocType for testing
export function testDetectDocType(filename: string): string {
  const lowerFilename = filename.toLowerCase();

  for (const [docType, patterns] of DOC_TYPE_PATTERNS) {
    if (patterns.some((pattern) => lowerFilename.includes(pattern))) {
      return docType;
    }
  }

  return 'general_info';
}
