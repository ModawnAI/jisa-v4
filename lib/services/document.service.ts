import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { eq, and, desc, sql, ilike, or, gte, lte } from 'drizzle-orm';
import { storageService } from './storage.service';
import { AppError, ERROR_CODES } from '@/lib/errors';

// Types
export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';

export interface CreateDocumentInput {
  file: File;
  fileName?: string; // Optional: preserved filename from client
  categoryId?: string;
  documentTypeId?: string;
  templateId?: string;
  period?: string;
  employeeId?: string;
  uploadedBy: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateDocumentInput {
  categoryId?: string;
  documentTypeId?: string;
  templateId?: string;
  period?: string;
  employeeId?: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentFilters {
  search?: string;
  categoryId?: string;
  templateId?: string;
  status?: DocumentStatus;
  period?: string;
  employeeId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includeDeleted?: boolean;
}

export interface ListDocumentsParams extends DocumentFilters {
  page?: number;
  pageSize?: number;
}

export class DocumentService {
  /**
   * Create and upload a new document
   */
  async create(input: CreateDocumentInput) {
    // Upload file to storage
    const uploadResult = await storageService.upload(
      input.file,
      'uploads', // Organization-agnostic folder
      { folder: 'documents' }
    );

    // Use preserved filename from client, fallback to file.name
    const actualFileName = input.fileName || input.file.name;

    // Determine file type from extension
    const fileType = this.getFileTypeFromName(actualFileName);

    // Create document record
    const [document] = await db
      .insert(documents)
      .values({
        fileName: actualFileName,
        fileUrl: uploadResult.url,
        filePath: uploadResult.path,
        fileType,
        fileSize: input.file.size,
        fileHash: uploadResult.hash,
        categoryId: input.categoryId,
        documentTypeId: input.documentTypeId,
        templateId: input.templateId,
        period: input.period,
        status: 'pending',
        metadata: input.metadata,
        employeeId: input.employeeId,
        uploadedBy: input.uploadedBy,
      })
      .returning();

    return document;
  }

  /**
   * Get document by ID with relations
   */
  async getById(id: string, includeDeleted = false) {
    const conditions = [eq(documents.id, id)];

    if (!includeDeleted) {
      conditions.push(eq(documents.isDeleted, false));
    }

    const document = await db.query.documents.findFirst({
      where: and(...conditions),
      with: {
        category: true,
        documentType: true,
        template: true,
        employee: true,
        uploader: true,
      },
    });

    if (!document) {
      throw new AppError(ERROR_CODES.DOCUMENT_NOT_FOUND, '문서를 찾을 수 없습니다.', 404);
    }

    return document;
  }

  /**
   * List documents with pagination and filtering
   */
  async list(params: ListDocumentsParams = {}) {
    const {
      page = 1,
      pageSize = 20,
      search,
      categoryId,
      templateId,
      status,
      period,
      employeeId,
      dateFrom,
      dateTo,
      includeDeleted = false,
    } = params;

    const conditions = [];

    // Exclude deleted unless specified
    if (!includeDeleted) {
      conditions.push(eq(documents.isDeleted, false));
    }

    if (search) {
      conditions.push(
        or(
          ilike(documents.fileName, `%${search}%`),
          ilike(documents.filePath, `%${search}%`)
        )
      );
    }

    if (categoryId) {
      conditions.push(eq(documents.categoryId, categoryId));
    }

    if (templateId) {
      conditions.push(eq(documents.templateId, templateId));
    }

    if (status) {
      conditions.push(eq(documents.status, status));
    }

    if (period) {
      conditions.push(eq(documents.period, period));
    }

    if (employeeId) {
      conditions.push(eq(documents.employeeId, employeeId));
    }

    if (dateFrom) {
      conditions.push(gte(documents.createdAt, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(documents.createdAt, dateTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [results, [{ total }]] = await Promise.all([
      db.query.documents.findMany({
        where: whereClause,
        with: {
          category: true,
          template: true,
          uploader: true,
        },
        orderBy: [desc(documents.createdAt)],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(documents)
        .where(whereClause),
    ]);

    return {
      data: results,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Update document metadata
   */
  async update(id: string, input: UpdateDocumentInput) {
    const existing = await db.query.documents.findFirst({
      where: and(eq(documents.id, id), eq(documents.isDeleted, false)),
    });

    if (!existing) {
      throw new AppError(ERROR_CODES.DOCUMENT_NOT_FOUND, '문서를 찾을 수 없습니다.', 404);
    }

    const [document] = await db
      .update(documents)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();

    return document;
  }

  /**
   * Update document processing status
   */
  async updateStatus(
    id: string,
    status: DocumentStatus,
    options?: {
      errorMessage?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const updates: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'processing') {
      updates.processedAt = null;
      updates.errorMessage = null;
    }

    if (status === 'completed' || status === 'failed' || status === 'partial') {
      updates.processedAt = new Date();
    }

    if (options?.errorMessage) {
      updates.errorMessage = options.errorMessage;
    }

    if (options?.metadata) {
      updates.metadata = options.metadata;
    }

    const [document] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();

    if (!document) {
      throw new AppError(ERROR_CODES.DOCUMENT_NOT_FOUND, '문서를 찾을 수 없습니다.', 404);
    }

    return document;
  }

  /**
   * Soft delete a document
   */
  async delete(id: string, deletedBy: string) {
    const existing = await db.query.documents.findFirst({
      where: and(eq(documents.id, id), eq(documents.isDeleted, false)),
    });

    if (!existing) {
      throw new AppError(ERROR_CODES.DOCUMENT_NOT_FOUND, '문서를 찾을 수 없습니다.', 404);
    }

    // Soft delete in database
    const [document] = await db
      .update(documents)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();

    return document;
  }

  /**
   * Hard delete a document (removes from storage too)
   */
  async hardDelete(id: string) {
    const existing = await db.query.documents.findFirst({
      where: eq(documents.id, id),
    });

    if (!existing) {
      throw new AppError(ERROR_CODES.DOCUMENT_NOT_FOUND, '문서를 찾을 수 없습니다.', 404);
    }

    // Delete from storage
    try {
      await storageService.delete(existing.filePath);
    } catch {
      // Continue even if storage delete fails
    }

    // Hard delete from database
    await db.delete(documents).where(eq(documents.id, id));

    return true;
  }

  /**
   * Restore a soft-deleted document
   */
  async restore(id: string) {
    const existing = await db.query.documents.findFirst({
      where: and(eq(documents.id, id), eq(documents.isDeleted, true)),
    });

    if (!existing) {
      throw new AppError(ERROR_CODES.DOCUMENT_NOT_FOUND, '삭제된 문서를 찾을 수 없습니다.', 404);
    }

    const [document] = await db
      .update(documents)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();

    return document;
  }

  /**
   * Get signed URL for downloading document
   */
  async getDownloadUrl(id: string, expiresIn = 3600) {
    const document = await this.getById(id);
    return storageService.getSignedUrl(document.filePath, expiresIn);
  }

  /**
   * Download document file
   */
  async downloadFile(id: string) {
    const document = await this.getById(id);
    const blob = await storageService.download(document.filePath);
    return {
      blob,
      fileName: document.fileName,
      mimeType: this.getMimeTypeFromFileType(document.fileType),
    };
  }

  /**
   * Get documents by period (for recurring documents)
   */
  async getByPeriod(period: string, templateId?: string) {
    const conditions = [
      eq(documents.period, period),
      eq(documents.isDeleted, false),
    ];

    if (templateId) {
      conditions.push(eq(documents.templateId, templateId));
    }

    return db.query.documents.findMany({
      where: and(...conditions),
      with: {
        category: true,
        template: true,
      },
      orderBy: [desc(documents.createdAt)],
    });
  }

  /**
   * Get documents pending processing
   */
  async getPendingDocuments(limit = 10) {
    return db.query.documents.findMany({
      where: and(
        eq(documents.status, 'pending'),
        eq(documents.isDeleted, false)
      ),
      orderBy: [documents.createdAt],
      limit,
    });
  }

  /**
   * Get processing statistics
   */
  async getStats(filters?: { dateFrom?: Date; dateTo?: Date }) {
    const conditions = [eq(documents.isDeleted, false)];

    if (filters?.dateFrom) {
      conditions.push(gte(documents.createdAt, filters.dateFrom));
    }

    if (filters?.dateTo) {
      conditions.push(lte(documents.createdAt, filters.dateTo));
    }

    const whereClause = and(...conditions);

    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${documents.status} = 'pending')::int`,
        processing: sql<number>`count(*) filter (where ${documents.status} = 'processing')::int`,
        completed: sql<number>`count(*) filter (where ${documents.status} = 'completed')::int`,
        failed: sql<number>`count(*) filter (where ${documents.status} = 'failed')::int`,
        partial: sql<number>`count(*) filter (where ${documents.status} = 'partial')::int`,
        totalSize: sql<number>`coalesce(sum(${documents.fileSize}), 0)::bigint`,
      })
      .from(documents)
      .where(whereClause);

    return stats;
  }

  // ========== Private Helpers ==========

  private getFileTypeFromName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'xlsx':
      case 'xls':
        return 'excel';
      case 'csv':
        return 'csv';
      case 'pdf':
        return 'pdf';
      case 'doc':
      case 'docx':
        return 'word';
      default:
        return 'unknown';
    }
  }

  private getMimeTypeFromFileType(fileType: string): string {
    switch (fileType) {
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      case 'pdf':
        return 'application/pdf';
      case 'word':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'application/octet-stream';
    }
  }
}

export const documentService = new DocumentService();
