/**
 * Generic PDF Processor
 *
 * Handles standard PDF documents with page-based chunking.
 * Uses organization namespace by default.
 */

import { parsePDF } from '@/lib/utils/pdf-parser';
import { BaseDocumentProcessor } from './base-processor';
import type {
  DocumentForProcessing,
  ProcessorOptions,
  ProcessorResult,
  ProcessedChunk,
  GenericVectorMetadata,
  NamespaceStrategy,
} from './types';

const PDF_MIME_TYPES = [
  'application/pdf',
];

/**
 * Default chunk configuration for PDFs.
 */
const DEFAULT_CHUNK_CONFIG = {
  maxChunkSize: 1000,
  chunkOverlap: 200,
  minChunkSize: 100,
};

/**
 * Generic PDF processor for standard document processing.
 * Uses organization namespace and page-aware chunking.
 */
export class GenericPdfProcessor extends BaseDocumentProcessor {
  readonly type = 'generic_pdf';
  readonly name = 'Generic PDF Processor';
  readonly supportedMimeTypes = PDF_MIME_TYPES;
  readonly priority = 0; // Lowest priority - fallback processor

  /**
   * Process a PDF document and generate chunks.
   */
  async process(
    content: Buffer | string,
    document: DocumentForProcessing,
    options: ProcessorOptions
  ): Promise<ProcessorResult> {
    const startTime = Date.now();
    const fileSize = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content);

    // Convert Buffer to Uint8Array for Blob compatibility
    // Copy bytes to new ArrayBuffer to ensure compatibility (Buffer may use SharedArrayBuffer)
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

    // Convert to Blob for pdf-parser
    const blob = new Blob([blobContent], { type: 'application/pdf' });

    // Parse PDF
    const pdfResult = await parsePDF(blob);

    // Determine namespace strategy
    const namespaceStrategy = this.getNamespaceStrategy(document, options);
    const namespace = this.generateNamespace(namespaceStrategy, {
      organizationId: document.organizationId,
      documentId: document.id,
    });

    // Process pages into chunks
    const chunks = this.processPages(
      pdfResult.pages,
      pdfResult.pageCount,
      document,
      options,
      namespace
    );

    return this.createResult(
      chunks,
      startTime,
      fileSize,
      namespaceStrategy,
      {
        pageCount: pdfResult.pageCount,
        metadata: pdfResult.metadata,
      }
    );
  }

  /**
   * Determine namespace strategy for PDF documents.
   * Uses organization namespace by default, document namespace for large PDFs.
   */
  getNamespaceStrategy(
    document: DocumentForProcessing,
    options: ProcessorOptions
  ): NamespaceStrategy {
    // If processing mode explicitly set, respect it
    if (options.processingMode === 'employee_split') {
      return 'employee';
    }

    // Default to organization namespace for PDFs
    return 'organization';
  }

  /**
   * Process PDF pages into chunks.
   */
  private processPages(
    pages: Array<{ pageNumber: number; text: string }>,
    totalPages: number,
    document: DocumentForProcessing,
    options: ProcessorOptions,
    namespace: string
  ): ProcessedChunk[] {
    const chunks: ProcessedChunk[] = [];
    const maxChunkSize = options.maxChunkSize || options.chunkSize || DEFAULT_CHUNK_CONFIG.maxChunkSize;
    const chunkOverlap = options.chunkOverlap || DEFAULT_CHUNK_CONFIG.chunkOverlap;

    let globalChunkIndex = 0;

    for (const page of pages) {
      // Skip empty pages
      if (!page.text.trim()) {
        continue;
      }

      // Chunk the page content
      const pageChunks = this.chunkText(page.text, maxChunkSize, chunkOverlap);

      for (const chunkContent of pageChunks) {
        // Skip very small chunks
        if (chunkContent.length < DEFAULT_CHUNK_CONFIG.minChunkSize) {
          continue;
        }

        const metadata: GenericVectorMetadata = {
          ...this.createBaseMetadata(
            document,
            options,
            globalChunkIndex,
            chunkContent,
            'pdf'
          ),
          pageNumber: page.pageNumber,
          totalPages,
          metadataType: 'generic',
        };

        // Use helper to create properly-formed chunk
        const chunk = this.createProcessedChunk(
          chunkContent,
          chunkContent, // For PDFs, embedding text is the same as content
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
}

/**
 * Singleton instance for export.
 */
export const genericPdfProcessor = new GenericPdfProcessor();
