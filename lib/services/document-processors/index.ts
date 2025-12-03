/**
 * Document Processor Registry
 *
 * Central registry for document processors with intelligent auto-selection
 * based on MIME type, template, filename patterns, and priority.
 */

import { genericPdfProcessor } from './generic-pdf-processor';
import { compensationExcelProcessor } from './compensation-excel-processor';
import { mdrtExcelProcessor } from './mdrt-excel-processor';
import type {
  DocumentProcessor,
  DocumentForProcessing,
  ProcessorSelectionCriteria,
  ProcessorResult,
  ProcessorOptions,
  NamespaceStrategy,
} from './types';

// =============================================================================
// Processor Registry
// =============================================================================

/**
 * Registry of all available document processors.
 * Processors are registered with their type identifier.
 */
const processorRegistry = new Map<string, DocumentProcessor>([
  ['mdrt_excel', mdrtExcelProcessor],
  ['compensation_excel', compensationExcelProcessor],
  ['generic_pdf', genericPdfProcessor],
]);

/**
 * Ordered list of processors by priority (highest first).
 * Used for auto-selection when no explicit processor is specified.
 */
const processorsByPriority: DocumentProcessor[] = [
  mdrtExcelProcessor,         // priority: 150 (MDRT/commission files)
  compensationExcelProcessor, // priority: 100
  genericPdfProcessor,        // priority: 0 (fallback)
];

// =============================================================================
// Processor Selection
// =============================================================================

/**
 * Get a specific processor by type.
 * @param type Processor type identifier (e.g., 'compensation_excel')
 * @returns The processor or undefined if not found
 */
export function getProcessor(type: string): DocumentProcessor | undefined {
  return processorRegistry.get(type);
}

/**
 * Get all registered processors.
 * @returns Array of all processors
 */
export function getAllProcessors(): DocumentProcessor[] {
  return Array.from(processorRegistry.values());
}

/**
 * Get processors sorted by priority (highest first).
 * @returns Array of processors sorted by priority
 */
export function getProcessorsByPriority(): DocumentProcessor[] {
  return [...processorsByPriority];
}

/**
 * Auto-select the best processor for a document.
 *
 * Selection priority:
 * 1. Explicit processor type from template
 * 2. Filename pattern matching
 * 3. MIME type matching with priority consideration
 * 4. Fallback to generic processor
 *
 * @param document Document to process
 * @param criteria Optional selection criteria
 * @returns The best matching processor
 */
export function selectProcessor(
  document: DocumentForProcessing,
  criteria?: ProcessorSelectionCriteria
): DocumentProcessor {
  // 1. Check for explicit processor type from template
  if (criteria?.templateId) {
    const templateProcessor = getProcessorForTemplate(criteria.templateId);
    if (templateProcessor) {
      return templateProcessor;
    }
  }

  // 2. Filename pattern matching (higher specificity)
  const filename = criteria?.fileName || document.originalFileName;
  const filenameProcessor = getProcessorByFilename(filename);
  if (filenameProcessor) {
    return filenameProcessor;
  }

  // 3. MIME type matching with priority ordering
  const mimeType = criteria?.mimeType || document.mimeType;
  const matchingProcessors = processorsByPriority.filter(
    (p) => p.canProcess({ ...document, mimeType })
  );

  if (matchingProcessors.length > 0) {
    // Return highest priority matching processor
    return matchingProcessors[0];
  }

  // 4. Fallback to generic PDF processor
  return genericPdfProcessor;
}

/**
 * Get processor based on template configuration.
 * Templates can specify a preferred processor type.
 *
 * @param templateId Template ID
 * @returns Processor if template has a configured processor type
 */
function getProcessorForTemplate(templateId: string): DocumentProcessor | undefined {
  // Template-to-processor mapping
  // This can be extended to fetch from database
  const templateProcessorMap: Record<string, string> = {
    // Example mappings - these would come from the template configuration
    'compensation-report': 'compensation_excel',
    'payroll-summary': 'compensation_excel',
    'employee-statement': 'compensation_excel',
  };

  const processorType = templateProcessorMap[templateId];
  if (processorType) {
    return processorRegistry.get(processorType);
  }

  return undefined;
}

/**
 * Get processor based on filename patterns.
 * Useful for auto-detecting document types from naming conventions.
 *
 * @param filename Original filename
 * @returns Processor if filename matches known patterns
 */
function getProcessorByFilename(filename: string): DocumentProcessor | undefined {
  const lowerFilename = filename.toLowerCase();

  const isExcel =
    lowerFilename.endsWith('.xlsx') ||
    lowerFilename.endsWith('.xls');

  if (!isExcel) {
    return undefined;
  }

  // MDRT-specific patterns (higher priority)
  // These indicate MDRT performance tracking files with Gemini-powered parsing
  const mdrtPatterns = [
    'mdrt',     // Million Dollar Round Table
    '커미션',   // commission (loan word) - MDRT files often use this
    '총수입',   // total income - MDRT performance files
  ];

  for (const pattern of mdrtPatterns) {
    if (lowerFilename.includes(pattern)) {
      return mdrtExcelProcessor;
    }
  }

  // General compensation Excel patterns (lower priority)
  const compensationPatterns = [
    '수수료',     // commission (fee-based)
    '보상',       // compensation
    '급여',       // salary/payroll
    '명세',       // statement
    '인별',       // individual
    '마감',       // closing/final
    'commission',
    'compensation',
    'payroll',
    'salary',
  ];

  for (const pattern of compensationPatterns) {
    if (lowerFilename.includes(pattern)) {
      return compensationExcelProcessor;
    }
  }

  return undefined;
}

// =============================================================================
// Processing Helpers
// =============================================================================

/**
 * Process a document using auto-selected processor.
 *
 * @param content File content
 * @param document Document metadata
 * @param options Processing options
 * @returns Processing result with chunks and metadata
 */
export async function processDocument(
  content: Buffer | string,
  document: DocumentForProcessing,
  options: ProcessorOptions
): Promise<ProcessorResult> {
  const processor = selectProcessor(document, {
    mimeType: document.mimeType,
    templateId: document.templateId || undefined,
    fileName: document.originalFileName,
  });

  return processor.process(content, document, options);
}

/**
 * Get namespace for a document based on processor's strategy.
 *
 * @param document Document metadata
 * @param options Processing options
 * @param employeeId Optional employee ID for employee namespace
 * @returns Namespace string for Pinecone
 */
export function getDocumentNamespace(
  document: DocumentForProcessing,
  options: ProcessorOptions,
  employeeId?: string
): string {
  const processor = selectProcessor(document);
  const strategy = processor.getNamespaceStrategy(document, options);

  return processor.generateNamespace(strategy, {
    organizationId: document.organizationId,
    documentId: document.id,
    employeeId,
  });
}

/**
 * Determine namespace strategy for a document.
 *
 * @param document Document metadata
 * @param options Processing options
 * @returns Namespace strategy
 */
export function getNamespaceStrategy(
  document: DocumentForProcessing,
  options: ProcessorOptions
): NamespaceStrategy {
  const processor = selectProcessor(document);
  return processor.getNamespaceStrategy(document, options);
}

// =============================================================================
// Registry Management
// =============================================================================

/**
 * Register a new processor.
 * Used for dynamic processor registration (e.g., plugins).
 *
 * @param processor Processor to register
 */
export function registerProcessor(processor: DocumentProcessor): void {
  processorRegistry.set(processor.type, processor);

  // Re-sort processors by priority
  const allProcessors = Array.from(processorRegistry.values());
  allProcessors.sort((a, b) => b.priority - a.priority);
  processorsByPriority.length = 0;
  processorsByPriority.push(...allProcessors);
}

/**
 * Unregister a processor.
 *
 * @param type Processor type to unregister
 * @returns true if processor was removed
 */
export function unregisterProcessor(type: string): boolean {
  const removed = processorRegistry.delete(type);

  if (removed) {
    const index = processorsByPriority.findIndex((p) => p.type === type);
    if (index >= 0) {
      processorsByPriority.splice(index, 1);
    }
  }

  return removed;
}

// =============================================================================
// Exports
// =============================================================================

// Re-export types
export * from './types';

// Re-export base class for extension
export { BaseDocumentProcessor } from './base-processor';
export {
  extractEmployeeIdFromNamespace,
  extractOrganizationIdFromNamespace,
  isEmployeeNamespace,
  getNamespacePrefix,
} from './base-processor';

// Re-export processor classes for direct instantiation
export { GenericPdfProcessor } from './generic-pdf-processor';
export { CompensationExcelProcessor } from './compensation-excel-processor';
export { MdrtExcelProcessor } from './mdrt-excel-processor';

// Re-export singleton instances
export { genericPdfProcessor, compensationExcelProcessor, mdrtExcelProcessor };
