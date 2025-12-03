# 에러 처리 표준

> ContractorHub의 일관된 에러 처리 패턴

---

## 1. 에러 코드 체계

### 1.1 에러 코드 정의

```typescript
// lib/constants/errors.ts

/**
 * API 에러 코드 (전체)
 */
export const ERROR_CODES = {
  // === 일반 (1xx) ===
  INTERNAL_ERROR: 'E100',
  VALIDATION_ERROR: 'E101',
  NOT_FOUND: 'E102',
  UNAUTHORIZED: 'E103',
  FORBIDDEN: 'E104',
  CONFLICT: 'E105',
  RATE_LIMITED: 'E106',

  // === 인증 (2xx) ===
  AUTH_INVALID_CREDENTIALS: 'E200',
  AUTH_SESSION_EXPIRED: 'E201',
  AUTH_TOKEN_INVALID: 'E202',
  AUTH_KAKAO_NOT_LINKED: 'E203',
  AUTH_PHONE_NOT_VERIFIED: 'E204',

  // === 직원 (3xx) ===
  EMPLOYEE_NOT_FOUND: 'E300',
  EMPLOYEE_DUPLICATE_ID: 'E301',
  EMPLOYEE_RAG_DISABLED: 'E302',
  EMPLOYEE_NAMESPACE_ERROR: 'E303',

  // === 문서 (4xx) ===
  DOCUMENT_NOT_FOUND: 'E400',
  DOCUMENT_PROCESSING_FAILED: 'E401',
  DOCUMENT_INVALID_FORMAT: 'E402',
  DOCUMENT_TOO_LARGE: 'E403',
  DOCUMENT_PARSING_ERROR: 'E404',
  DOCUMENT_UPLOAD_FAILED: 'E405',

  // === 템플릿 (5xx) ===
  TEMPLATE_NOT_FOUND: 'E500',
  TEMPLATE_MAPPING_INVALID: 'E501',
  TEMPLATE_VERSION_MISMATCH: 'E502',
  TEMPLATE_COLUMN_MISSING: 'E503',

  // === 카테고리 (6xx) ===
  CATEGORY_NOT_FOUND: 'E600',
  CATEGORY_DUPLICATE_SLUG: 'E601',
  CATEGORY_HAS_CHILDREN: 'E602',
  CATEGORY_HAS_DOCUMENTS: 'E603',

  // === Pinecone (7xx) ===
  PINECONE_UPSERT_FAILED: 'E700',
  PINECONE_QUERY_FAILED: 'E701',
  PINECONE_DELETE_FAILED: 'E702',
  PINECONE_NAMESPACE_NOT_FOUND: 'E703',
  PINECONE_CONNECTION_ERROR: 'E704',

  // === RAG (8xx) ===
  RAG_QUERY_FAILED: 'E800',
  RAG_EMBEDDING_FAILED: 'E801',
  RAG_LLM_ERROR: 'E802',
  RAG_NO_RESULTS: 'E803',
  RAG_CONTEXT_TOO_LONG: 'E804',

  // === 충돌 (9xx) ===
  CONFLICT_DUPLICATE_PERIOD: 'E900',
  CONFLICT_RESOLUTION_REQUIRED: 'E901',
  CONFLICT_ROLLBACK_FAILED: 'E902',

  // === Inngest (10xx) ===
  INNGEST_FUNCTION_FAILED: 'E1000',
  INNGEST_TIMEOUT: 'E1001',
  INNGEST_RETRY_EXHAUSTED: 'E1002',

  // === 카카오 (11xx) ===
  KAKAO_WEBHOOK_INVALID: 'E1100',
  KAKAO_MESSAGE_FAILED: 'E1101',
  KAKAO_USER_NOT_FOUND: 'E1102',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
```

### 1.2 에러 메시지 (한국어)

```typescript
// lib/constants/error-messages.ts

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // 일반
  E100: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  E101: '입력값이 올바르지 않습니다.',
  E102: '요청한 리소스를 찾을 수 없습니다.',
  E103: '로그인이 필요합니다.',
  E104: '접근 권한이 없습니다.',
  E105: '요청이 충돌합니다.',
  E106: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',

  // 인증
  E200: '잘못된 인증 정보입니다.',
  E201: '세션이 만료되었습니다. 다시 로그인해주세요.',
  E202: '유효하지 않은 토큰입니다.',
  E203: '카카오톡 계정이 연동되지 않았습니다.',
  E204: '전화번호 인증이 필요합니다.',

  // 직원
  E300: '직원을 찾을 수 없습니다.',
  E301: '이미 존재하는 사번입니다.',
  E302: 'RAG 기능이 비활성화된 직원입니다.',
  E303: '직원 네임스페이스 오류가 발생했습니다.',

  // 문서
  E400: '문서를 찾을 수 없습니다.',
  E401: '문서 처리에 실패했습니다.',
  E402: '지원하지 않는 파일 형식입니다. (Excel, CSV, PDF, Word만 지원)',
  E403: '파일 크기가 너무 큽니다. (최대 50MB)',
  E404: '파일 파싱 중 오류가 발생했습니다.',
  E405: '파일 업로드에 실패했습니다.',

  // 템플릿
  E500: '템플릿을 찾을 수 없습니다.',
  E501: '컬럼 매핑이 올바르지 않습니다.',
  E502: '템플릿 버전이 일치하지 않습니다.',
  E503: '필수 컬럼이 누락되었습니다.',

  // 카테고리
  E600: '카테고리를 찾을 수 없습니다.',
  E601: '이미 존재하는 카테고리 슬러그입니다.',
  E602: '하위 카테고리가 있어 삭제할 수 없습니다.',
  E603: '해당 카테고리에 문서가 있어 삭제할 수 없습니다.',

  // Pinecone
  E700: '벡터 저장에 실패했습니다.',
  E701: '벡터 검색에 실패했습니다.',
  E702: '벡터 삭제에 실패했습니다.',
  E703: '네임스페이스를 찾을 수 없습니다.',
  E704: 'Pinecone 연결에 실패했습니다.',

  // RAG
  E800: 'RAG 쿼리 처리에 실패했습니다.',
  E801: '임베딩 생성에 실패했습니다.',
  E802: 'AI 응답 생성에 실패했습니다.',
  E803: '관련 문서를 찾을 수 없습니다.',
  E804: '컨텍스트가 너무 깁니다.',

  // 충돌
  E900: '해당 기간에 이미 데이터가 존재합니다.',
  E901: '충돌 해결이 필요합니다.',
  E902: '롤백에 실패했습니다.',

  // Inngest
  E1000: '백그라운드 작업이 실패했습니다.',
  E1001: '작업 시간이 초과되었습니다.',
  E1002: '최대 재시도 횟수를 초과했습니다.',

  // 카카오
  E1100: '유효하지 않은 웹훅 요청입니다.',
  E1101: '메시지 전송에 실패했습니다.',
  E1102: '사용자를 찾을 수 없습니다.',
};
```

---

## 2. 에러 클래스

```typescript
// lib/errors/app-error.ts

import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/errors';
import type { ErrorCode } from '@/lib/constants/errors';

/**
 * 애플리케이션 에러 기본 클래스
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message?: string,
    options?: {
      statusCode?: number;
      details?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message || ERROR_MESSAGES[code]);

    this.code = code;
    this.statusCode = options?.statusCode || this.getDefaultStatusCode(code);
    this.details = options?.details;
    this.isOperational = true;
    this.cause = options?.cause;

    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultStatusCode(code: ErrorCode): number {
    const prefix = code.slice(1, 2);
    switch (prefix) {
      case '1': // 일반
        if (code === 'E103') return 401;
        if (code === 'E104') return 403;
        if (code === 'E102') return 404;
        if (code === 'E105') return 409;
        if (code === 'E106') return 429;
        return 400;
      case '2': // 인증
        return 401;
      case '3': // 직원
      case '4': // 문서
      case '5': // 템플릿
      case '6': // 카테고리
        if (code.endsWith('00')) return 404;
        if (code.endsWith('01')) return 409;
        return 400;
      case '7': // Pinecone
      case '8': // RAG
        return 500;
      case '9': // 충돌
        return 409;
      default:
        return 500;
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * 유효성 검사 에러
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    fieldErrors?: Record<string, string[]>
  ) {
    super(ERROR_CODES.VALIDATION_ERROR, message, {
      statusCode: 400,
      details: { fieldErrors },
    });
  }
}

/**
 * 인증 에러
 */
export class AuthenticationError extends AppError {
  constructor(code: ErrorCode = ERROR_CODES.UNAUTHORIZED) {
    super(code, undefined, { statusCode: 401 });
  }
}

/**
 * 권한 에러
 */
export class AuthorizationError extends AppError {
  constructor(message?: string) {
    super(ERROR_CODES.FORBIDDEN, message, { statusCode: 403 });
  }
}

/**
 * 리소스 없음 에러
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(ERROR_CODES.NOT_FOUND, `${resource}을(를) 찾을 수 없습니다`, {
      statusCode: 404,
    });
  }
}

/**
 * 충돌 에러
 */
export class ConflictError extends AppError {
  constructor(code: ErrorCode, details?: Record<string, unknown>) {
    super(code, undefined, { statusCode: 409, details });
  }
}
```

---

## 3. API 응답 유틸리티

```typescript
// lib/utils/api.ts

import type { ErrorCode } from '@/lib/constants/errors';
import { ERROR_MESSAGES } from '@/lib/constants/error-messages';

/**
 * 성공 응답 생성
 */
export function createApiResponse<T>(
  data: T,
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  }
) {
  return {
    success: true as const,
    data,
    ...(meta && { meta }),
  };
}

/**
 * 에러 응답 생성
 */
export function createApiError(
  code: ErrorCode,
  message?: string,
  options?: {
    details?: Record<string, unknown>;
  }
) {
  return {
    success: false as const,
    error: {
      code,
      message: message || ERROR_MESSAGES[code],
      ...(options?.details && { details: options.details }),
    },
  };
}

/**
 * 검색 파라미터 파싱
 */
export function parseSearchParams(
  searchParams: URLSearchParams
): {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  q?: string;
  filters: Record<string, string>;
} {
  return {
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '20'),
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    q: searchParams.get('q') || undefined,
    filters: Object.fromEntries(
      Array.from(searchParams.entries()).filter(
        ([key]) => !['page', 'pageSize', 'sortBy', 'sortOrder', 'q'].includes(key)
      )
    ),
  };
}
```

---

## 4. API 라우트 에러 처리

### 4.1 표준 에러 핸들러

```typescript
// lib/utils/api-handler.ts

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '@/lib/errors/app-error';
import { createApiError } from '@/lib/utils/api';
import { ERROR_CODES } from '@/lib/constants/errors';
import * as Sentry from '@sentry/nextjs';

type ApiHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

/**
 * API 라우트 래퍼
 * 자동으로 에러 처리 및 로깅 수행
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error, request);
    }
  };
}

/**
 * 에러 처리
 */
function handleApiError(error: unknown, request: NextRequest): NextResponse {
  // 요청 정보 추출
  const requestInfo = {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
  };

  // AppError (예상된 에러)
  if (error instanceof AppError) {
    console.warn(`[API Error] ${error.code}: ${error.message}`, {
      ...requestInfo,
      details: error.details,
    });

    return NextResponse.json(
      createApiError(error.code, error.message, { details: error.details }),
      { status: error.statusCode }
    );
  }

  // Zod 유효성 검사 에러
  if (error instanceof ZodError) {
    const fieldErrors = error.flatten().fieldErrors;

    console.warn(`[Validation Error]`, {
      ...requestInfo,
      fieldErrors,
    });

    return NextResponse.json(
      createApiError(ERROR_CODES.VALIDATION_ERROR, '입력값이 올바르지 않습니다', {
        details: { fieldErrors },
      }),
      { status: 400 }
    );
  }

  // 예상치 못한 에러
  console.error(`[Unexpected Error]`, error, requestInfo);

  // Sentry로 전송
  Sentry.captureException(error, {
    extra: requestInfo,
  });

  return NextResponse.json(
    createApiError(ERROR_CODES.INTERNAL_ERROR),
    { status: 500 }
  );
}
```

### 4.2 사용 예시

```typescript
// app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/utils/api-handler';
import { createApiResponse } from '@/lib/utils/api';
import { getEmployees, createEmployee } from '@/lib/services/employee.service';
import { AppError } from '@/lib/errors/app-error';
import { ERROR_CODES } from '@/lib/constants/errors';

const createEmployeeSchema = z.object({
  employeeId: z.string().min(1, '사번을 입력하세요'),
  name: z.string().min(1, '이름을 입력하세요'),
  phone: z.string().min(1, '전화번호를 입력하세요'),
  clearanceLevel: z.enum(['basic', 'standard', 'advanced']).optional(),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const result = await getEmployees();
  return NextResponse.json(createApiResponse(result.data, result.meta));
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const data = createEmployeeSchema.parse(body);  // Zod 에러는 자동 처리

  try {
    const employee = await createEmployee(data);
    return NextResponse.json(createApiResponse(employee), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      throw new AppError(ERROR_CODES.EMPLOYEE_DUPLICATE_ID);
    }
    throw error;
  }
});
```

---

## 5. 클라이언트 에러 처리

### 5.1 에러 바운더리

```typescript
// components/shared/error-boundary.tsx
'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { WarningCircle, ArrowClockwise } from '@phosphor-icons/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Sentry로 전송
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="p-4 rounded-full bg-destructive/10 mb-4">
            <WarningCircle size={48} className="text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            오류가 발생했습니다
          </h2>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            페이지를 불러오는 중 문제가 발생했습니다.
            잠시 후 다시 시도해주세요.
          </p>
          <Button onClick={this.handleRetry}>
            <ArrowClockwise size={16} className="mr-2" />
            다시 시도
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 5.2 API 에러 처리 훅

```typescript
// hooks/use-api-error.ts
'use client';

import { useToast } from '@/hooks/use-toast';
import { ERROR_MESSAGES } from '@/lib/constants/error-messages';
import type { ErrorCode } from '@/lib/constants/errors';

interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function useApiError() {
  const { toast } = useToast();

  const handleError = (error: unknown) => {
    // API 에러 응답
    if (isApiError(error)) {
      toast({
        title: '오류',
        description: error.error.message,
        variant: 'destructive',
      });
      return;
    }

    // fetch 에러
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        // 요청 취소됨 - 무시
        return;
      }

      toast({
        title: '네트워크 오류',
        description: '서버와의 연결에 실패했습니다.',
        variant: 'destructive',
      });
      return;
    }

    // 알 수 없는 에러
    toast({
      title: '오류',
      description: '알 수 없는 오류가 발생했습니다.',
      variant: 'destructive',
    });
  };

  return { handleError };
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    (error as any).success === false &&
    'error' in error
  );
}
```

### 5.3 데이터 패칭 훅

```typescript
// hooks/use-fetch.ts
'use client';

import { useState, useCallback } from 'react';
import { useApiError } from './use-api-error';

interface UseFetchOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
}

export function useFetch<T>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useApiError();

  const execute = useCallback(
    async (
      fetcher: () => Promise<T>,
      options?: UseFetchOptions<T>
    ): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetcher();

        // API 에러 응답 체크
        if (typeof response === 'object' && response !== null) {
          const obj = response as any;
          if (obj.success === false) {
            throw response;
          }
        }

        options?.onSuccess?.(response);
        return response;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        handleError(err);
        options?.onError?.(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  return {
    execute,
    isLoading,
    error,
  };
}
```

---

## 6. 로깅 전략

```typescript
// lib/utils/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};

  withContext(context: LogContext): Logger {
    const logger = new Logger();
    logger.context = { ...this.context, ...context };
    return logger;
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>) {
    this.log('error', message, {
      ...data,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...this.context,
      ...data,
    };

    if (process.env.NODE_ENV === 'development') {
      // 개발 환경: 콘솔 출력
      const consoleMethod = level === 'error' ? console.error : console[level];
      consoleMethod(`[${level.toUpperCase()}] ${message}`, logData);
    } else {
      // 프로덕션: JSON 형식
      console.log(JSON.stringify(logData));
    }
  }
}

export const logger = new Logger();
```

---

## 7. Sentry 통합

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // 샘플링
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // 필터링
  ignoreErrors: [
    'AbortError',
    'ResizeObserver loop',
    'Non-Error promise rejection',
  ],

  beforeSend(event) {
    // 민감한 데이터 제거
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      delete data.password;
      delete data.token;
    }
    return event;
  },
});
```

---

## 8. 에러 처리 체크리스트

### API 라우트
- [ ] `withErrorHandler` 래퍼 사용
- [ ] Zod 스키마로 입력 검증
- [ ] 적절한 에러 코드 사용
- [ ] 에러 로깅

### 서비스 레이어
- [ ] AppError 클래스 사용
- [ ] 구체적인 에러 코드 사용
- [ ] 외부 서비스 에러 래핑

### 클라이언트
- [ ] ErrorBoundary 적용
- [ ] useApiError 훅 사용
- [ ] 토스트 알림 표시
- [ ] 로딩/에러 상태 UI
