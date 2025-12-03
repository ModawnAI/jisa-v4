import { db } from '@/lib/db';
import {
  documentTemplates,
  templateColumnMappings,
  templateVersions,
} from '@/lib/db/schema';
import { eq, and, asc, desc, sql, ilike, or } from 'drizzle-orm';
import { AppError, ERROR_CODES } from '@/lib/errors';

// Types
export type FileType = 'excel' | 'csv' | 'pdf' | 'word';
export type ProcessingMode = 'company' | 'employee_split' | 'employee_aggregate';
export type ChunkingStrategy = 'auto' | 'row_per_chunk' | 'fixed_size' | 'semantic';
export type FieldRole = 'employee_identifier' | 'content' | 'metadata' | 'skip';
export type TargetFieldType = 'string' | 'number' | 'date' | 'currency';

export interface CreateTemplateInput {
  name: string;
  slug: string;
  description?: string;
  categoryId: string;
  documentTypeId?: string;
  fileType: FileType;
  processingMode?: ProcessingMode;
  chunkingStrategy?: ChunkingStrategy;
  chunkSize?: number;
  chunkOverlap?: number;
  isRecurring?: boolean;
  recurringPeriod?: string;
  retentionDays?: number;
  createdBy?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  categoryId?: string;
  documentTypeId?: string;
  fileType?: FileType;
  processingMode?: ProcessingMode;
  chunkingStrategy?: ChunkingStrategy;
  chunkSize?: number;
  chunkOverlap?: number;
  isRecurring?: boolean;
  recurringPeriod?: string;
  retentionDays?: number;
  isActive?: boolean;
}

export interface ColumnMappingInput {
  sourceColumn: string;
  sourceColumnIndex?: number;
  targetField: string;
  targetFieldType: TargetFieldType;
  fieldRole?: FieldRole;
  transformFunction?: string;
  defaultValue?: string;
  isRequired?: boolean;
  validationRegex?: string;
  sortOrder?: number;
}

export interface ListTemplatesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  fileType?: FileType;
  includeInactive?: boolean;
}

export class TemplateService {
  /**
   * Create a new template
   */
  async create(input: CreateTemplateInput) {
    // Check for duplicate slug
    const existing = await db.query.documentTemplates.findFirst({
      where: eq(documentTemplates.slug, input.slug),
    });

    if (existing) {
      throw new AppError(
        ERROR_CODES.TEMPLATE_DUPLICATE,
        `템플릿 슬러그 '${input.slug}'가 이미 존재합니다.`,
        409
      );
    }

    const [template] = await db
      .insert(documentTemplates)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        categoryId: input.categoryId,
        documentTypeId: input.documentTypeId,
        fileType: input.fileType,
        processingMode: input.processingMode || 'company',
        chunkingStrategy: input.chunkingStrategy || 'auto',
        chunkSize: input.chunkSize,
        chunkOverlap: input.chunkOverlap,
        isRecurring: input.isRecurring || false,
        recurringPeriod: input.recurringPeriod,
        retentionDays: input.retentionDays,
        createdBy: input.createdBy,
        version: 1,
        isLatest: true,
      })
      .returning();

    return template;
  }

  /**
   * Get template by ID with relations
   */
  async getById(id: string) {
    const template = await db.query.documentTemplates.findFirst({
      where: eq(documentTemplates.id, id),
      with: {
        category: true,
        documentType: true,
        columnMappings: {
          orderBy: [asc(templateColumnMappings.sortOrder)],
        },
      },
    });

    if (!template) {
      throw new AppError(ERROR_CODES.TEMPLATE_NOT_FOUND, '템플릿을 찾을 수 없습니다.', 404);
    }

    return template;
  }

  /**
   * Get template by slug
   */
  async getBySlug(slug: string) {
    const template = await db.query.documentTemplates.findFirst({
      where: and(
        eq(documentTemplates.slug, slug),
        eq(documentTemplates.isLatest, true)
      ),
      with: {
        category: true,
        documentType: true,
        columnMappings: {
          orderBy: [asc(templateColumnMappings.sortOrder)],
        },
      },
    });

    if (!template) {
      throw new AppError(ERROR_CODES.TEMPLATE_NOT_FOUND, '템플릿을 찾을 수 없습니다.', 404);
    }

    return template;
  }

  /**
   * List templates with pagination and filtering
   */
  async list(params: ListTemplatesParams = {}) {
    const {
      page = 1,
      pageSize = 20,
      search,
      categoryId,
      fileType,
      includeInactive = false,
    } = params;

    const conditions = [];

    // Only show latest versions
    conditions.push(eq(documentTemplates.isLatest, true));

    if (!includeInactive) {
      conditions.push(eq(documentTemplates.isActive, true));
    }

    if (search) {
      conditions.push(
        or(
          ilike(documentTemplates.name, `%${search}%`),
          ilike(documentTemplates.slug, `%${search}%`),
          ilike(documentTemplates.description, `%${search}%`)
        )
      );
    }

    if (categoryId) {
      conditions.push(eq(documentTemplates.categoryId, categoryId));
    }

    if (fileType) {
      conditions.push(eq(documentTemplates.fileType, fileType));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [templates, [{ total }]] = await Promise.all([
      db.query.documentTemplates.findMany({
        where: whereClause,
        with: {
          category: true,
        },
        orderBy: [desc(documentTemplates.updatedAt)],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(documentTemplates)
        .where(whereClause),
    ]);

    return {
      data: templates,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Update template (creates new version if structure changes)
   */
  async update(id: string, input: UpdateTemplateInput, _changeReason?: string) {
    const existing = await db.query.documentTemplates.findFirst({
      where: eq(documentTemplates.id, id),
      with: {
        columnMappings: true,
      },
    });

    if (!existing) {
      throw new AppError(ERROR_CODES.TEMPLATE_NOT_FOUND, '템플릿을 찾을 수 없습니다.', 404);
    }

    // Simple update without version bump for basic fields
    const [template] = await db
      .update(documentTemplates)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(documentTemplates.id, id))
      .returning();

    return template;
  }

  /**
   * Create a new version of the template
   */
  async createVersion(id: string, input: UpdateTemplateInput, changeReason: string, createdBy?: string) {
    const existing = await this.getById(id);

    // Create version snapshot
    await db.insert(templateVersions).values({
      templateId: existing.id,
      version: existing.version,
      configSnapshot: {
        name: existing.name,
        description: existing.description,
        fileType: existing.fileType,
        processingMode: existing.processingMode,
        chunkingStrategy: existing.chunkingStrategy,
        chunkSize: existing.chunkSize,
        chunkOverlap: existing.chunkOverlap,
        isRecurring: existing.isRecurring,
        recurringPeriod: existing.recurringPeriod,
        retentionDays: existing.retentionDays,
      },
      columnMappingsSnapshot: existing.columnMappings,
      changeReason,
      createdBy,
    });

    // Update template with new version
    const [template] = await db
      .update(documentTemplates)
      .set({
        ...input,
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(documentTemplates.id, id))
      .returning();

    return template;
  }

  /**
   * Get version history for a template
   */
  async getVersionHistory(templateId: string) {
    return db.query.templateVersions.findMany({
      where: eq(templateVersions.templateId, templateId),
      orderBy: [desc(templateVersions.version)],
    });
  }

  /**
   * Delete template (soft delete)
   */
  async delete(id: string) {
    const existing = await db.query.documentTemplates.findFirst({
      where: eq(documentTemplates.id, id),
    });

    if (!existing) {
      throw new AppError(ERROR_CODES.TEMPLATE_NOT_FOUND, '템플릿을 찾을 수 없습니다.', 404);
    }

    // TODO: Check for documents using this template

    const [template] = await db
      .update(documentTemplates)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(documentTemplates.id, id))
      .returning();

    return template;
  }

  // ========== Column Mapping Methods ==========

  /**
   * Set column mappings for a template (replaces all existing)
   */
  async setColumnMappings(templateId: string, mappings: ColumnMappingInput[]) {
    // Verify template exists
    const template = await db.query.documentTemplates.findFirst({
      where: eq(documentTemplates.id, templateId),
    });

    if (!template) {
      throw new AppError(ERROR_CODES.TEMPLATE_NOT_FOUND, '템플릿을 찾을 수 없습니다.', 404);
    }

    await db.transaction(async (tx) => {
      // Delete existing mappings
      await tx
        .delete(templateColumnMappings)
        .where(eq(templateColumnMappings.templateId, templateId));

      // Insert new mappings
      if (mappings.length > 0) {
        await tx.insert(templateColumnMappings).values(
          mappings.map((mapping, index) => ({
            templateId,
            sourceColumn: mapping.sourceColumn,
            sourceColumnIndex: mapping.sourceColumnIndex,
            targetField: mapping.targetField,
            targetFieldType: mapping.targetFieldType,
            fieldRole: mapping.fieldRole || 'metadata',
            transformFunction: mapping.transformFunction,
            defaultValue: mapping.defaultValue,
            isRequired: mapping.isRequired || false,
            validationRegex: mapping.validationRegex,
            sortOrder: mapping.sortOrder ?? index,
          }))
        );
      }
    });

    // Return updated mappings
    return db.query.templateColumnMappings.findMany({
      where: eq(templateColumnMappings.templateId, templateId),
      orderBy: [asc(templateColumnMappings.sortOrder)],
    });
  }

  /**
   * Get column mappings for a template
   */
  async getColumnMappings(templateId: string) {
    return db.query.templateColumnMappings.findMany({
      where: eq(templateColumnMappings.templateId, templateId),
      orderBy: [asc(templateColumnMappings.sortOrder)],
    });
  }

  /**
   * Add a single column mapping
   */
  async addColumnMapping(templateId: string, mapping: ColumnMappingInput) {
    // Get next sort order
    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${templateColumnMappings.sortOrder}), -1)` })
      .from(templateColumnMappings)
      .where(eq(templateColumnMappings.templateId, templateId));

    const [newMapping] = await db
      .insert(templateColumnMappings)
      .values({
        templateId,
        sourceColumn: mapping.sourceColumn,
        sourceColumnIndex: mapping.sourceColumnIndex,
        targetField: mapping.targetField,
        targetFieldType: mapping.targetFieldType,
        fieldRole: mapping.fieldRole || 'metadata',
        transformFunction: mapping.transformFunction,
        defaultValue: mapping.defaultValue,
        isRequired: mapping.isRequired || false,
        validationRegex: mapping.validationRegex,
        sortOrder: mapping.sortOrder ?? (maxOrder ?? -1) + 1,
      })
      .returning();

    return newMapping;
  }

  /**
   * Update a column mapping
   */
  async updateColumnMapping(mappingId: string, mapping: Partial<ColumnMappingInput>) {
    const [updated] = await db
      .update(templateColumnMappings)
      .set(mapping)
      .where(eq(templateColumnMappings.id, mappingId))
      .returning();

    if (!updated) {
      throw new AppError(ERROR_CODES.TEMPLATE_MAPPING_INVALID, '컬럼 매핑을 찾을 수 없습니다.', 404);
    }

    return updated;
  }

  /**
   * Delete a column mapping
   */
  async deleteColumnMapping(mappingId: string) {
    const [deleted] = await db
      .delete(templateColumnMappings)
      .where(eq(templateColumnMappings.id, mappingId))
      .returning();

    if (!deleted) {
      throw new AppError(ERROR_CODES.TEMPLATE_MAPPING_INVALID, '컬럼 매핑을 찾을 수 없습니다.', 404);
    }

    return deleted;
  }

  /**
   * Reorder column mappings
   */
  async reorderColumnMappings(orders: { id: string; sortOrder: number }[]) {
    await db.transaction(async (tx) => {
      for (const { id, sortOrder } of orders) {
        await tx
          .update(templateColumnMappings)
          .set({ sortOrder })
          .where(eq(templateColumnMappings.id, id));
      }
    });
  }

  // ========== Utility Methods ==========

  /**
   * Get templates for select dropdown
   */
  async getSelectOptions(categoryId?: string) {
    const conditions = [
      eq(documentTemplates.isActive, true),
      eq(documentTemplates.isLatest, true),
    ];

    if (categoryId) {
      conditions.push(eq(documentTemplates.categoryId, categoryId));
    }

    const templates = await db.query.documentTemplates.findMany({
      where: and(...conditions),
      columns: {
        id: true,
        name: true,
        fileType: true,
      },
      orderBy: [asc(documentTemplates.name)],
    });

    return templates.map((t) => ({
      value: t.id,
      label: `${t.name} (${t.fileType.toUpperCase()})`,
    }));
  }

  /**
   * Duplicate a template
   */
  async duplicate(id: string, newSlug: string, newName?: string) {
    const original = await this.getById(id);

    // Create new template
    const newTemplate = await this.create({
      name: newName || `${original.name} (복사본)`,
      slug: newSlug,
      description: original.description || undefined,
      categoryId: original.categoryId,
      documentTypeId: original.documentTypeId || undefined,
      fileType: original.fileType as FileType,
      processingMode: original.processingMode as ProcessingMode,
      chunkingStrategy: original.chunkingStrategy as ChunkingStrategy,
      chunkSize: original.chunkSize || undefined,
      chunkOverlap: original.chunkOverlap || undefined,
      isRecurring: original.isRecurring,
      recurringPeriod: original.recurringPeriod || undefined,
      retentionDays: original.retentionDays || undefined,
    });

    // Copy column mappings
    if (original.columnMappings.length > 0) {
      await this.setColumnMappings(
        newTemplate.id,
        original.columnMappings.map((m) => ({
          sourceColumn: m.sourceColumn,
          sourceColumnIndex: m.sourceColumnIndex || undefined,
          targetField: m.targetField,
          targetFieldType: m.targetFieldType as TargetFieldType,
          fieldRole: m.fieldRole as FieldRole,
          transformFunction: m.transformFunction || undefined,
          defaultValue: m.defaultValue || undefined,
          isRequired: m.isRequired,
          validationRegex: m.validationRegex || undefined,
          sortOrder: m.sortOrder,
        }))
      );
    }

    return this.getById(newTemplate.id);
  }
}

export const templateService = new TemplateService();
