/**
 * Template Registry Service
 *
 * Maps database templates to document processors and provides
 * template selection functionality for document uploads.
 */

import { db } from '@/lib/db';
import { documentTemplates, templateColumnMappings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getProcessor,
  mdrtExcelProcessor,
  genericPdfProcessor,
  type DocumentProcessor,
} from './document-processors';

// =============================================================================
// Types
// =============================================================================

export interface TemplateInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  fileType: string;
  processingMode: string;
  processorType: string;
  isRecurring: boolean;
  recurringPeriod: string | null;
}

export interface TemplateOption {
  value: string;
  label: string;
  description?: string;
  fileType: string;
  processorType: string;
}

export interface TemplateConfig {
  template: TemplateInfo;
  processor: DocumentProcessor;
  columnMappings: ColumnMapping[];
}

export interface ColumnMapping {
  sourceColumn: string;
  sourceColumnIndex: number | null;
  targetField: string;
  targetFieldType: string;
  fieldRole: string;
  transformFunction: string | null;
  defaultValue: string | null;
  isRequired: boolean;
}

// =============================================================================
// Template → Processor Mapping
// =============================================================================

/**
 * Map template slugs to processor types.
 * This is the central configuration for template-processor relationships.
 */
const TEMPLATE_PROCESSOR_MAP: Record<string, string> = {
  // MDRT templates
  'mdrt-quarterly': 'mdrt_excel',
  'mdrt-monthly': 'mdrt_excel',
  'mdrt-commission': 'mdrt_excel',

  // Compensation templates
  'compensation-monthly': 'compensation_excel',
  'compensation-statement': 'compensation_excel',
  'salary-summary': 'compensation_excel',

  // Policy templates
  'policy-document': 'generic_pdf',
  'onboarding-guide': 'generic_pdf',
  'product-info': 'generic_pdf',

  // Contract templates
  'contract-terms': 'generic_pdf',
};

/**
 * Get processor for a template slug.
 */
export function getProcessorForTemplateSlug(slug: string): DocumentProcessor {
  const processorType = TEMPLATE_PROCESSOR_MAP[slug];

  if (processorType) {
    const processor = getProcessor(processorType);
    if (processor) return processor;
  }

  // Fallback based on file type inference from slug
  if (slug.includes('excel') || slug.includes('mdrt') || slug.includes('compensation')) {
    return mdrtExcelProcessor;
  }

  return genericPdfProcessor;
}

// =============================================================================
// Template Service Functions
// =============================================================================

/**
 * Get all active templates for the template dropdown.
 */
export async function getTemplateOptions(
  categoryId?: string
): Promise<TemplateOption[]> {
  const conditions = [eq(documentTemplates.isActive, true)];

  if (categoryId) {
    conditions.push(eq(documentTemplates.categoryId, categoryId));
  }

  const templates = await db
    .select({
      id: documentTemplates.id,
      name: documentTemplates.name,
      slug: documentTemplates.slug,
      description: documentTemplates.description,
      fileType: documentTemplates.fileType,
    })
    .from(documentTemplates)
    .where(and(...conditions));

  return templates.map((t) => ({
    value: t.id,
    label: t.name,
    description: t.description || undefined,
    fileType: t.fileType,
    processorType: TEMPLATE_PROCESSOR_MAP[t.slug] || 'generic_pdf',
  }));
}

/**
 * Get template configuration with processor and column mappings.
 */
export async function getTemplateConfig(
  templateId: string
): Promise<TemplateConfig | null> {
  // Fetch template
  const [template] = await db
    .select()
    .from(documentTemplates)
    .where(eq(documentTemplates.id, templateId))
    .limit(1);

  if (!template) return null;

  // Fetch column mappings
  const mappings = await db
    .select()
    .from(templateColumnMappings)
    .where(eq(templateColumnMappings.templateId, templateId));

  // Get processor
  const processorType = TEMPLATE_PROCESSOR_MAP[template.slug] || 'generic_pdf';
  const processor = getProcessor(processorType) || genericPdfProcessor;

  return {
    template: {
      id: template.id,
      name: template.name,
      slug: template.slug,
      description: template.description,
      categoryId: template.categoryId,
      fileType: template.fileType,
      processingMode: template.processingMode,
      processorType,
      isRecurring: template.isRecurring,
      recurringPeriod: template.recurringPeriod,
    },
    processor,
    columnMappings: mappings.map((m) => ({
      sourceColumn: m.sourceColumn,
      sourceColumnIndex: m.sourceColumnIndex,
      targetField: m.targetField,
      targetFieldType: m.targetFieldType,
      fieldRole: m.fieldRole,
      transformFunction: m.transformFunction,
      defaultValue: m.defaultValue,
      isRequired: m.isRequired,
    })),
  };
}

/**
 * Get template by slug.
 */
export async function getTemplateBySlug(
  slug: string
): Promise<TemplateInfo | null> {
  const [template] = await db
    .select()
    .from(documentTemplates)
    .where(eq(documentTemplates.slug, slug))
    .limit(1);

  if (!template) return null;

  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    description: template.description,
    categoryId: template.categoryId,
    fileType: template.fileType,
    processingMode: template.processingMode,
    processorType: TEMPLATE_PROCESSOR_MAP[template.slug] || 'generic_pdf',
    isRecurring: template.isRecurring,
    recurringPeriod: template.recurringPeriod,
  };
}

/**
 * Auto-detect best template for a file based on filename patterns.
 */
export function autoDetectTemplate(filename: string): string | null {
  const lowerFilename = filename.toLowerCase();

  // MDRT patterns
  if (
    lowerFilename.includes('mdrt') ||
    (lowerFilename.includes('커미션') && lowerFilename.includes('총수입'))
  ) {
    return 'mdrt-quarterly';
  }

  // Compensation patterns
  if (
    lowerFilename.includes('마감') ||
    lowerFilename.includes('명세') ||
    lowerFilename.includes('인별')
  ) {
    return 'compensation-monthly';
  }

  // PDF patterns
  if (lowerFilename.endsWith('.pdf')) {
    if (lowerFilename.includes('정책') || lowerFilename.includes('규정')) {
      return 'policy-document';
    }
    if (lowerFilename.includes('온보딩') || lowerFilename.includes('교육')) {
      return 'onboarding-guide';
    }
    if (lowerFilename.includes('상품') || lowerFilename.includes('product')) {
      return 'product-info';
    }
  }

  return null;
}

/**
 * Get default templates that should be seeded.
 */
export function getDefaultTemplates() {
  return [
    {
      name: 'MDRT 분기별 실적',
      slug: 'mdrt-quarterly',
      description: 'MDRT 커미션/총수입 산출 Excel 파일. Gemini AI로 컬럼 자동 감지.',
      fileType: 'excel' as const,
      processingMode: 'employee_split' as const,
      chunkingStrategy: 'row_per_chunk' as const,
      isRecurring: true,
      recurringPeriod: 'quarterly',
      filenamePatterns: ['mdrt', '커미션', '총수입'],
    },
    {
      name: '급여/수수료 명세',
      slug: 'compensation-monthly',
      description: '월별 급여 및 수수료 명세 Excel 파일. 인별명세, 건별수수료 등 시트 처리.',
      fileType: 'excel' as const,
      processingMode: 'employee_split' as const,
      chunkingStrategy: 'row_per_chunk' as const,
      isRecurring: true,
      recurringPeriod: 'monthly',
      filenamePatterns: ['마감', '명세', '인별', '급여'],
    },
    {
      name: '정책 문서',
      slug: 'policy-document',
      description: '회사 정책 및 규정 PDF 문서.',
      fileType: 'pdf' as const,
      processingMode: 'company' as const,
      chunkingStrategy: 'semantic' as const,
      isRecurring: false,
      recurringPeriod: null,
      filenamePatterns: ['정책', '규정', 'policy'],
    },
    {
      name: '온보딩/교육 자료',
      slug: 'onboarding-guide',
      description: '신입 교육 및 온보딩 가이드 문서.',
      fileType: 'pdf' as const,
      processingMode: 'company' as const,
      chunkingStrategy: 'semantic' as const,
      isRecurring: false,
      recurringPeriod: null,
      filenamePatterns: ['온보딩', '교육', 'training'],
    },
    {
      name: '상품 정보',
      slug: 'product-info',
      description: '보험 상품 정보 문서.',
      fileType: 'pdf' as const,
      processingMode: 'company' as const,
      chunkingStrategy: 'semantic' as const,
      isRecurring: false,
      recurringPeriod: null,
      filenamePatterns: ['상품', 'product'],
    },
  ];
}
