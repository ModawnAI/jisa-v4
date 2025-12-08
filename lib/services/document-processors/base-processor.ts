/**
 * Base Document Processor
 *
 * Abstract base class providing common functionality for all document processors.
 * Handles namespace generation, chunking utilities, and metadata management.
 */

import { createHash } from 'crypto';
import type {
  DocumentProcessor,
  DocumentForProcessing,
  ProcessorOptions,
  ProcessorResult,
  ProcessedChunk,
  NamespaceStrategy,
  NamespaceContext,
  BaseVectorMetadata,
  VectorMetadata,
} from './types';

// Namespace prefixes matching Python implementation
const NAMESPACE_PREFIXES = {
  organization: 'org_',
  employee: 'emp_',
  department: 'dept_',
  document: 'doc_',
  public: 'public',  // No prefix for public namespace
} as const;

/**
 * Abstract base class for document processors.
 * Provides common utilities and enforces the processor interface.
 */
export abstract class BaseDocumentProcessor implements DocumentProcessor {
  abstract readonly type: string;
  abstract readonly name: string;
  abstract readonly supportedMimeTypes: string[];
  abstract readonly priority: number;

  /**
   * Check if this processor can handle the given document.
   * Default implementation checks MIME type.
   */
  canProcess(document: DocumentForProcessing): boolean {
    return this.supportedMimeTypes.includes(document.mimeType);
  }

  /**
   * Process document content and generate chunks.
   * Must be implemented by subclasses.
   */
  abstract process(
    content: Buffer | string,
    document: DocumentForProcessing,
    options: ProcessorOptions
  ): Promise<ProcessorResult>;

  /**
   * Determine namespace strategy based on document characteristics.
   * Default: organization namespace. Override for specialized behavior.
   */
  getNamespaceStrategy(
    _document: DocumentForProcessing,
    options: ProcessorOptions
  ): NamespaceStrategy {
    // Employee-split mode uses employee namespace
    if (options.processingMode === 'employee_split') {
      return 'employee';
    }

    // Default to organization namespace
    return 'organization';
  }

  /**
   * Generate the actual namespace string based on strategy and context.
   */
  generateNamespace(
    strategy: NamespaceStrategy,
    context: NamespaceContext
  ): string {
    switch (strategy) {
      case 'organization':
        return `${NAMESPACE_PREFIXES.organization}${context.organizationId}`;
      case 'employee':
        if (!context.employeeId) {
          throw new Error('Employee ID required for employee namespace strategy');
        }
        return `${NAMESPACE_PREFIXES.employee}${context.employeeId}`;
      case 'department':
        if (!context.departmentId) {
          throw new Error('Department ID required for department namespace strategy');
        }
        return `${NAMESPACE_PREFIXES.department}${context.departmentId}`;
      case 'document':
        if (!context.documentId) {
          throw new Error('Document ID required for document namespace strategy');
        }
        return `${NAMESPACE_PREFIXES.document}${context.documentId}`;
      case 'public':
        return NAMESPACE_PREFIXES.public;
      default:
        return `${NAMESPACE_PREFIXES.organization}${context.organizationId}`;
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Generate a content hash for deduplication.
   */
  protected generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  /**
   * Generate a unique chunk ID.
   */
  protected generateChunkId(
    documentId: string,
    chunkIndex: number,
    employeeId?: string
  ): string {
    const base = employeeId
      ? `${documentId}_emp_${employeeId}_chunk_${chunkIndex}`
      : `${documentId}_chunk_${chunkIndex}`;
    return base;
  }

  /**
   * Create base metadata for a chunk.
   */
  protected createBaseMetadata(
    document: DocumentForProcessing,
    options: ProcessorOptions,
    chunkIndex: number,
    content: string,
    sourceType: 'pdf' | 'excel' | 'csv' | 'text' = 'pdf'
  ): BaseVectorMetadata {
    return {
      documentId: document.id,
      organizationId: document.organizationId,
      chunkIndex,
      clearanceLevel: options.defaultClearance || 'basic',
      source: options.originalFileName || document.originalFileName,
      sourceType,
      templateId: options.templateId || document.templateId || undefined,
      createdAt: new Date().toISOString(),
      processingBatchId: options.processingBatchId,
      contentHash: this.generateContentHash(content),
    };
  }

  /**
   * Split text into chunks with overlap.
   */
  protected chunkText(
    text: string,
    maxSize: number = 1000,
    overlap: number = 200
  ): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + maxSize;

      // Try to break at sentence/paragraph boundary
      if (end < text.length) {
        const breakPoints = ['\n\n', '\n', '. ', ', ', ' '];
        for (const breakPoint of breakPoints) {
          const lastBreak = text.lastIndexOf(breakPoint, end);
          if (lastBreak > start + maxSize / 2) {
            end = lastBreak + breakPoint.length;
            break;
          }
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = end - overlap;
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Format Korean currency value.
   */
  protected formatKRW(value: number | undefined | null): string {
    if (value === undefined || value === null) return '0원';
    return `${value.toLocaleString('ko-KR')}원`;
  }

  /**
   * Format date in Korean format (YYYY년 MM월 DD일).
   */
  protected formatKoreanDate(date: Date | string | undefined | null): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  /**
   * Create a processing result structure.
   */
  protected createResult(
    chunks: ProcessedChunk[],
    startTime: number,
    fileSize: number,
    namespaceStrategy: NamespaceStrategy,
    aggregations?: Record<string, unknown>
  ): ProcessorResult {
    return {
      chunks,
      namespaceStrategy,
      aggregations,
      processingInfo: {
        processorType: this.type,
        processingTime: Date.now() - startTime,
        sourceFileSize: fileSize,
        totalChunks: chunks.length,
      },
    };
  }

  /**
   * Create a ProcessedChunk with all required fields.
   */
  protected createProcessedChunk(
    content: string,
    embeddingText: string,
    metadata: VectorMetadata,
    namespace: string,
    documentId: string,
    chunkIndex: number,
    employeeId?: string
  ): ProcessedChunk {
    const contentHash = this.generateContentHash(content);
    const vectorId = this.generateChunkId(documentId, chunkIndex, employeeId);

    return {
      vectorId,
      embeddingText,
      content,
      metadata,
      namespace,
      chunkIndex,
      contentHash,
      chunkId: vectorId,
    };
  }

  /**
   * Validate required metadata fields.
   */
  protected validateMetadata(metadata: VectorMetadata): boolean {
    return !!(
      metadata.documentId &&
      metadata.organizationId &&
      typeof metadata.chunkIndex === 'number' &&
      metadata.clearanceLevel &&
      metadata.source &&
      metadata.sourceType
    );
  }
}

// =============================================================================
// Namespace Helper Functions
// =============================================================================

/**
 * Extract employee ID from namespace string.
 */
export function extractEmployeeIdFromNamespace(
  namespace: string
): string | null {
  if (namespace.startsWith(NAMESPACE_PREFIXES.employee)) {
    return namespace.slice(NAMESPACE_PREFIXES.employee.length);
  }
  return null;
}

/**
 * Extract organization ID from namespace string.
 */
export function extractOrganizationIdFromNamespace(
  namespace: string
): string | null {
  if (namespace.startsWith(NAMESPACE_PREFIXES.organization)) {
    return namespace.slice(NAMESPACE_PREFIXES.organization.length);
  }
  return null;
}

/**
 * Determine if a namespace is employee-scoped.
 */
export function isEmployeeNamespace(namespace: string): boolean {
  return namespace.startsWith(NAMESPACE_PREFIXES.employee);
}

/**
 * Determine if a namespace is public.
 */
export function isPublicNamespace(namespace: string): boolean {
  return namespace === NAMESPACE_PREFIXES.public;
}

/**
 * Get the namespace prefix for a strategy.
 */
export function getNamespacePrefix(strategy: NamespaceStrategy): string {
  return NAMESPACE_PREFIXES[strategy];
}

/**
 * Get the public namespace string.
 */
export function getPublicNamespace(): string {
  return NAMESPACE_PREFIXES.public;
}
