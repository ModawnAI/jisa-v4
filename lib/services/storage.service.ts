import { createAdminClient } from '@/lib/supabase/admin';
import { v4 as uuidv4 } from 'uuid';
import { AppError, ERROR_CODES } from '@/lib/errors';

export interface UploadResult {
  path: string;
  url: string;
  size: number;
  hash?: string;
}

export interface UploadOptions {
  folder?: string;
  cacheControl?: string;
  upsert?: boolean;
}

// Allowed MIME types for document uploads
export const ALLOWED_MIME_TYPES = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'text/csv': 'csv',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
} as const;

export type AllowedMimeType = keyof typeof ALLOWED_MIME_TYPES;

// Extension to MIME type mapping (for fallback when file.type is undefined)
export const EXTENSION_TO_MIME: Record<string, AllowedMimeType> = {
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'xls': 'application/vnd.ms-excel',
  'csv': 'text/csv',
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// Allowed file extensions
export const ALLOWED_EXTENSIONS = Object.keys(EXTENSION_TO_MIME);

export class StorageService {
  private bucket = 'documents';

  /**
   * Upload a file to Supabase Storage
   */
  async upload(
    file: File | Blob,
    organizationId: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const supabase = createAdminClient();

    // Validate file type (check MIME type or fall back to extension)
    const validatedMimeType = this.getValidatedMimeType(file);
    if (!validatedMimeType) {
      const fileName = (file as File).name;
      const ext = fileName ? fileName.split('.').pop()?.toLowerCase() : 'unknown';
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `지원하지 않는 파일 형식입니다. (${file.type || ext})`,
        400
      );
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        '파일 크기는 50MB를 초과할 수 없습니다.',
        400
      );
    }

    // Generate unique file name
    const fileExt = this.getFileExtension(file);
    const fileName = `${uuidv4()}.${fileExt}`;
    const path = options.folder
      ? `${organizationId}/${options.folder}/${fileName}`
      : `${organizationId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .upload(path, file, {
        cacheControl: options.cacheControl || '3600',
        upsert: options.upsert || false,
      });

    if (error) {
      console.error('Supabase storage error:', { error, bucket: this.bucket, path });
      throw new AppError(
        ERROR_CODES.PROCESSING_FAILED,
        `파일 업로드에 실패했습니다: ${error.message}`,
        500
      );
    }

    // Get public URL (even for private buckets, we store the path-based URL)
    const { data: urlData } = supabase.storage
      .from(this.bucket)
      .getPublicUrl(data.path);

    // Generate file hash for deduplication
    const hash = await this.generateFileHash(file);

    return {
      path: data.path,
      url: urlData.publicUrl,
      size: file.size,
      hash,
    };
  }

  /**
   * Download a file from storage
   */
  async download(path: string): Promise<Blob> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .download(path);

    if (error) {
      throw new AppError(
        ERROR_CODES.DOCUMENT_NOT_FOUND,
        `파일 다운로드에 실패했습니다: ${error.message}`,
        404
      );
    }

    return data;
  }

  /**
   * Delete a file from storage
   */
  async delete(path: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase.storage
      .from(this.bucket)
      .remove([path]);

    if (error) {
      throw new AppError(
        ERROR_CODES.PROCESSING_FAILED,
        `파일 삭제에 실패했습니다: ${error.message}`,
        500
      );
    }
  }

  /**
   * Delete multiple files from storage
   */
  async deleteMany(paths: string[]): Promise<void> {
    if (paths.length === 0) return;

    const supabase = createAdminClient();

    const { error } = await supabase.storage
      .from(this.bucket)
      .remove(paths);

    if (error) {
      throw new AppError(
        ERROR_CODES.PROCESSING_FAILED,
        `파일 삭제에 실패했습니다: ${error.message}`,
        500
      );
    }
  }

  /**
   * Get signed URL for private file access
   */
  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new AppError(
        ERROR_CODES.DOCUMENT_NOT_FOUND,
        `서명된 URL 생성에 실패했습니다: ${error.message}`,
        404
      );
    }

    return data.signedUrl;
  }

  /**
   * Get multiple signed URLs
   */
  async getSignedUrls(paths: string[], expiresIn = 3600): Promise<{ path: string; signedUrl: string }[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrls(paths, expiresIn);

    if (error) {
      throw new AppError(
        ERROR_CODES.PROCESSING_FAILED,
        `서명된 URL 생성에 실패했습니다: ${error.message}`,
        500
      );
    }

    return data.map((item) => ({
      path: item.path || '',
      signedUrl: item.signedUrl,
    }));
  }

  /**
   * Check if file exists
   */
  async exists(path: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { data } = await supabase.storage
      .from(this.bucket)
      .list(path.substring(0, path.lastIndexOf('/')), {
        search: path.split('/').pop(),
      });

    return Boolean(data && data.length > 0);
  }

  /**
   * Get file metadata
   */
  async getMetadata(path: string): Promise<{
    size: number;
    mimetype: string;
    lastModified: Date;
  } | null> {
    const supabase = createAdminClient();

    const folder = path.substring(0, path.lastIndexOf('/'));
    const fileName = path.split('/').pop();

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .list(folder, { search: fileName });

    if (error || !data || data.length === 0) {
      return null;
    }

    const file = data[0];
    return {
      size: file.metadata?.size || 0,
      mimetype: file.metadata?.mimetype || '',
      lastModified: new Date(file.updated_at || file.created_at),
    };
  }

  // ========== Private Helpers ==========

  private isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
    return mimeType in ALLOWED_MIME_TYPES;
  }

  private isAllowedExtension(ext: string): boolean {
    return ext.toLowerCase() in EXTENSION_TO_MIME;
  }

  /**
   * Get validated MIME type from file, checking both file.type and extension
   * Returns the MIME type if valid, or null if invalid
   */
  private getValidatedMimeType(file: File | Blob): AllowedMimeType | null {
    // First, try the file's MIME type
    if (file.type && this.isAllowedMimeType(file.type)) {
      return file.type;
    }

    // Fall back to extension-based detection
    // Use safe property access instead of 'in' operator for FormData File objects
    const fileName = (file as File).name;
    if (fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (ext && this.isAllowedExtension(ext)) {
        return EXTENSION_TO_MIME[ext];
      }
    }

    return null;
  }

  private getFileExtension(file: File | Blob): string {
    // Try to get from File name (use safe property access for FormData File objects)
    const fileName = (file as File).name;
    if (fileName) {
      const ext = fileName.split('.').pop();
      if (ext) return ext.toLowerCase();
    }

    // Fall back to MIME type mapping
    if (file.type && this.isAllowedMimeType(file.type)) {
      return ALLOWED_MIME_TYPES[file.type];
    }

    return 'bin';
  }

  private async generateFileHash(file: File | Blob): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // If crypto is not available, return empty string
      return '';
    }
  }
}

export const storageService = new StorageService();
