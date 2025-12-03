/**
 * PDF Parser Utility
 * Extracts text content from PDF files using pdf-parse v2.x
 */

import { PDFParse } from 'pdf-parse';

export interface PDFParseResult {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  pages: PDFPage[];
}

export interface PDFPage {
  pageNumber: number;
  text: string;
}

export interface PDFParseOptions {
  maxPages?: number;
  pageBreakMarker?: string;
}

/**
 * Parse a PDF file and extract text content
 */
export async function parsePDF(
  fileBlob: Blob,
  options: PDFParseOptions = {}
): Promise<PDFParseResult> {
  const { maxPages } = options;

  // Convert Blob to Uint8Array
  const arrayBuffer = await fileBlob.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  // Create PDF parser instance
  const parser = new PDFParse({ data });

  try {
    // Get text content with page-wise extraction
    const textResult = await parser.getText({
      first: 1,
      last: maxPages || undefined,
    });

    // Get metadata
    const infoResult = await parser.getInfo();

    // Build pages array from textResult
    const pages: PDFPage[] = textResult.pages.map((page, index) => ({
      pageNumber: index + 1,
      text: page.text.trim(),
    }));

    // Parse metadata dates if available
    let creationDate: Date | undefined;
    let modificationDate: Date | undefined;

    const info = infoResult.info;
    if (info?.CreationDate) {
      creationDate = parsePDFDate(String(info.CreationDate));
    }
    if (info?.ModDate) {
      modificationDate = parsePDFDate(String(info.ModDate));
    }

    return {
      text: textResult.text,
      pageCount: textResult.pages.length,
      metadata: {
        title: info?.Title ? String(info.Title) : undefined,
        author: info?.Author ? String(info.Author) : undefined,
        subject: info?.Subject ? String(info.Subject) : undefined,
        creator: info?.Creator ? String(info.Creator) : undefined,
        producer: info?.Producer ? String(info.Producer) : undefined,
        creationDate,
        modificationDate,
      },
      pages,
    };
  } finally {
    // Clean up parser resources
    await parser.destroy();
  }
}

/**
 * Parse PDF date format (D:YYYYMMDDHHmmSS)
 */
function parsePDFDate(dateStr: string): Date | undefined {
  try {
    // Remove 'D:' prefix if present
    const cleaned = dateStr.replace(/^D:/, '');

    // Extract components
    const year = parseInt(cleaned.slice(0, 4), 10);
    const month = parseInt(cleaned.slice(4, 6), 10) - 1;
    const day = parseInt(cleaned.slice(6, 8), 10);
    const hour = parseInt(cleaned.slice(8, 10), 10) || 0;
    const minute = parseInt(cleaned.slice(10, 12), 10) || 0;
    const second = parseInt(cleaned.slice(12, 14), 10) || 0;

    return new Date(year, month, day, hour, minute, second);
  } catch {
    return undefined;
  }
}

/**
 * Extract text from specific pages
 */
export async function extractPagesText(
  fileBlob: Blob,
  pageNumbers: number[]
): Promise<Map<number, string>> {
  const result = await parsePDF(fileBlob);
  const pageTexts = new Map<number, string>();

  for (const page of result.pages) {
    if (pageNumbers.includes(page.pageNumber)) {
      pageTexts.set(page.pageNumber, page.text);
    }
  }

  return pageTexts;
}

export const pdfParser = {
  parse: parsePDF,
  extractPages: extractPagesText,
};
