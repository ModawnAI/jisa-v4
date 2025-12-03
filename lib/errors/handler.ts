import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, ERROR_CODES, ERROR_STATUS_CODES } from './index';

type RouteContext = { params: Promise<Record<string, string>> };

type RouteHandler = (
  request: NextRequest,
  context?: RouteContext
) => Promise<NextResponse>;

/**
 * Higher-order function that wraps API route handlers with error handling
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: RouteContext) => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error('API Error:', error);

      // Handle AppError
      if (error instanceof AppError) {
        return NextResponse.json(error.toJSON(), { status: error.statusCode });
      }

      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: ERROR_CODES.VALIDATION_ERROR,
              message: '입력값이 올바르지 않습니다.',
              details: { errors: messages },
            },
          },
          { status: 400 }
        );
      }

      // Handle generic errors
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message,
          },
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  meta?: { page?: number; pageSize?: number; total?: number }
) {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
  });
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  code: keyof typeof ERROR_CODES,
  message: string,
  details?: Record<string, unknown>
) {
  const statusCode = ERROR_STATUS_CODES[ERROR_CODES[code]];
  return NextResponse.json(
    {
      success: false,
      error: {
        code: ERROR_CODES[code],
        message,
        ...(details && { details }),
      },
    },
    { status: statusCode }
  );
}
