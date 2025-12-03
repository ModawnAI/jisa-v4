// Error codes organized by domain
export const ERROR_CODES = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Employee errors
  EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',
  EMPLOYEE_DUPLICATE: 'EMPLOYEE_DUPLICATE',
  EMPLOYEE_INVALID_STATUS: 'EMPLOYEE_INVALID_STATUS',

  // Category errors
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  CATEGORY_DUPLICATE: 'CATEGORY_DUPLICATE',
  CATEGORY_HAS_CHILDREN: 'CATEGORY_HAS_CHILDREN',
  CATEGORY_HAS_DOCUMENTS: 'CATEGORY_HAS_DOCUMENTS',

  // Template errors
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  TEMPLATE_DUPLICATE: 'TEMPLATE_DUPLICATE',
  TEMPLATE_HAS_DOCUMENTS: 'TEMPLATE_HAS_DOCUMENTS',
  TEMPLATE_INVALID_VERSION: 'TEMPLATE_INVALID_VERSION',
  TEMPLATE_MAPPING_INVALID: 'TEMPLATE_MAPPING_INVALID',

  // Document errors
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  DOCUMENT_PROCESSING_FAILED: 'DOCUMENT_PROCESSING_FAILED',
  DOCUMENT_ALREADY_PROCESSING: 'DOCUMENT_ALREADY_PROCESSING',

  // Processing errors
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  EMBEDDING_FAILED: 'EMBEDDING_FAILED',
  ROLLBACK_FAILED: 'ROLLBACK_FAILED',

  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// HTTP status code mappings for error codes
export const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TOKEN_EXPIRED: 401,
  VALIDATION_ERROR: 400,
  MISSING_FIELD: 400,
  INVALID_FORMAT: 400,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  CONFLICT: 409,
  EMPLOYEE_NOT_FOUND: 404,
  EMPLOYEE_DUPLICATE: 409,
  EMPLOYEE_INVALID_STATUS: 400,
  CATEGORY_NOT_FOUND: 404,
  CATEGORY_DUPLICATE: 409,
  CATEGORY_HAS_CHILDREN: 400,
  CATEGORY_HAS_DOCUMENTS: 400,
  TEMPLATE_NOT_FOUND: 404,
  TEMPLATE_DUPLICATE: 409,
  TEMPLATE_HAS_DOCUMENTS: 400,
  TEMPLATE_INVALID_VERSION: 400,
  TEMPLATE_MAPPING_INVALID: 400,
  DOCUMENT_NOT_FOUND: 404,
  DOCUMENT_PROCESSING_FAILED: 500,
  DOCUMENT_ALREADY_PROCESSING: 409,
  PROCESSING_FAILED: 500,
  EMBEDDING_FAILED: 500,
  ROLLBACK_FAILED: 500,
  DATABASE_ERROR: 500,
  INTERNAL_ERROR: 500,
};
