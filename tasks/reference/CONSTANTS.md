# Constants and Enums Reference

Complete constants, enums, and configuration values for JISA App.

---

## Route Constants

```typescript
// lib/constants/routes.ts

/**
 * Application routes
 */
export const ROUTES = {
  // Auth routes
  AUTH: {
    LOGIN: "/login",
    SIGNUP: "/signup",
    FORGOT_PASSWORD: "/forgot-password",
    CALLBACK: "/auth/callback",
    LOGOUT: "/logout",
  },

  // Admin routes
  ADMIN: {
    HOME: "/admin",
    DASHBOARD: "/admin",

    // Employees
    EMPLOYEES: "/admin/employees",
    EMPLOYEE_NEW: "/admin/employees/new",
    EMPLOYEE_DETAIL: (id: string) => `/admin/employees/${id}`,
    EMPLOYEE_EDIT: (id: string) => `/admin/employees/${id}/edit`,

    // Documents
    DOCUMENTS: "/admin/documents",
    DOCUMENT_UPLOAD: "/admin/documents/upload",
    DOCUMENT_DETAIL: (id: string) => `/admin/documents/${id}`,

    // Categories
    CATEGORIES: "/admin/categories",

    // Templates
    TEMPLATES: "/admin/templates",
    TEMPLATE_NEW: "/admin/templates/new",
    TEMPLATE_DETAIL: (id: string) => `/admin/templates/${id}`,

    // Knowledge
    KNOWLEDGE: "/admin/knowledge",

    // Chat
    CHAT: "/admin/chat",

    // Settings
    SETTINGS: "/admin/settings",
    SETTINGS_ORGANIZATION: "/admin/settings/organization",
    SETTINGS_PROFILE: "/admin/settings/profile",
  },

  // Employee portal routes
  EMPLOYEE: {
    HOME: "/employee",
    CHAT: "/employee/chat",
    DOCUMENTS: "/employee/documents",
  },

  // API routes
  API: {
    HEALTH: "/api/health",

    AUTH: {
      LOGIN: "/api/auth/login",
      LOGOUT: "/api/auth/logout",
      ME: "/api/auth/me",
    },

    EMPLOYEES: "/api/employees",
    EMPLOYEE: (id: string) => `/api/employees/${id}`,

    DOCUMENTS: "/api/documents",
    DOCUMENT: (id: string) => `/api/documents/${id}`,
    DOCUMENT_UPLOAD: "/api/documents/upload",

    CATEGORIES: "/api/categories",
    CATEGORY: (id: string) => `/api/categories/${id}`,

    TEMPLATES: "/api/templates",
    TEMPLATE: (id: string) => `/api/templates/${id}`,

    KNOWLEDGE: "/api/knowledge",
    KNOWLEDGE_SEARCH: "/api/knowledge/search",
    KNOWLEDGE_SYNC: "/api/knowledge/sync",

    CHAT: "/api/chat",

    PROCESSING: "/api/processing",
    PROCESSING_BATCH: (id: string) => `/api/processing/${id}`,
    PROCESSING_ROLLBACK: (id: string) => `/api/processing/${id}/rollback`,
  },
} as const;
```

---

## Korean Messages

```typescript
// lib/constants/messages.ts

/**
 * Korean UI messages
 */
export const MESSAGES = {
  // Common
  COMMON: {
    LOADING: "로딩 중...",
    SAVING: "저장 중...",
    DELETING: "삭제 중...",
    PROCESSING: "처리 중...",
    SEARCH: "검색",
    SEARCH_PLACEHOLDER: "검색어를 입력하세요",
    NO_RESULTS: "결과가 없습니다",
    CONFIRM: "확인",
    CANCEL: "취소",
    SAVE: "저장",
    DELETE: "삭제",
    EDIT: "수정",
    CREATE: "생성",
    CLOSE: "닫기",
    BACK: "뒤로",
    NEXT: "다음",
    PREVIOUS: "이전",
    SELECT: "선택",
    SELECT_ALL: "전체 선택",
    DESELECT_ALL: "전체 해제",
    REQUIRED: "필수",
    OPTIONAL: "선택사항",
  },

  // Auth
  AUTH: {
    LOGIN: "로그인",
    LOGOUT: "로그아웃",
    SIGNUP: "회원가입",
    EMAIL: "이메일",
    PASSWORD: "비밀번호",
    CONFIRM_PASSWORD: "비밀번호 확인",
    FORGOT_PASSWORD: "비밀번호를 잊으셨나요?",
    RESET_PASSWORD: "비밀번호 재설정",
    LOGIN_SUCCESS: "로그인되었습니다",
    LOGOUT_SUCCESS: "로그아웃되었습니다",
    LOGIN_ERROR: "로그인에 실패했습니다",
    INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다",
    SESSION_EXPIRED: "세션이 만료되었습니다. 다시 로그인해주세요",
  },

  // Employees
  EMPLOYEES: {
    TITLE: "직원 관리",
    NEW: "직원 추가",
    EDIT: "직원 수정",
    DELETE: "직원 삭제",
    DELETE_CONFIRM: "이 직원을 삭제하시겠습니까?",
    DELETE_SUCCESS: "직원이 삭제되었습니다",
    SAVE_SUCCESS: "직원 정보가 저장되었습니다",
    IMPORT: "직원 일괄 등록",
    EXPORT: "직원 목록 내보내기",
    NO_EMPLOYEES: "등록된 직원이 없습니다",

    // Fields
    NAME: "이름",
    EMPLOYEE_NUMBER: "사번",
    DEPARTMENT: "부서",
    POSITION: "직급",
    EMAIL: "이메일",
    PHONE: "연락처",
    HIRE_DATE: "입사일",
    STATUS: "상태",
    CLEARANCE_LEVEL: "권한 등급",
  },

  // Documents
  DOCUMENTS: {
    TITLE: "문서 관리",
    UPLOAD: "문서 업로드",
    UPLOAD_SUCCESS: "문서가 업로드되었습니다",
    DELETE: "문서 삭제",
    DELETE_CONFIRM: "이 문서를 삭제하시겠습니까?",
    DELETE_SUCCESS: "문서가 삭제되었습니다",
    PROCESSING: "문서 처리 중...",
    PROCESS_SUCCESS: "문서 처리가 완료되었습니다",
    PROCESS_ERROR: "문서 처리 중 오류가 발생했습니다",
    NO_DOCUMENTS: "업로드된 문서가 없습니다",
    DRAG_DROP: "파일을 드래그하여 업로드하세요",
    OR_CLICK: "또는 클릭하여 파일 선택",

    // Fields
    FILE_NAME: "파일명",
    FILE_TYPE: "파일 유형",
    FILE_SIZE: "파일 크기",
    CATEGORY: "카테고리",
    STATUS: "상태",
    UPLOADED_AT: "업로드일",
    PROCESSED_AT: "처리일",
  },

  // Categories
  CATEGORIES: {
    TITLE: "카테고리 관리",
    NEW: "카테고리 추가",
    EDIT: "카테고리 수정",
    DELETE: "카테고리 삭제",
    DELETE_CONFIRM: "이 카테고리를 삭제하시겠습니까?",
    DELETE_SUCCESS: "카테고리가 삭제되었습니다",
    SAVE_SUCCESS: "카테고리가 저장되었습니다",
    NO_CATEGORIES: "등록된 카테고리가 없습니다",

    // Fields
    NAME: "카테고리명",
    DESCRIPTION: "설명",
    PARENT: "상위 카테고리",
    DOCUMENT_COUNT: "문서 수",
  },

  // Templates
  TEMPLATES: {
    TITLE: "템플릿 관리",
    NEW: "템플릿 추가",
    EDIT: "템플릿 수정",
    DELETE: "템플릿 삭제",
    DELETE_CONFIRM: "이 템플릿을 삭제하시겠습니까?",
    DELETE_SUCCESS: "템플릿이 삭제되었습니다",
    SAVE_SUCCESS: "템플릿이 저장되었습니다",
    NO_TEMPLATES: "등록된 템플릿이 없습니다",

    // Fields
    NAME: "템플릿명",
    DESCRIPTION: "설명",
    FILE_TYPE: "파일 유형",
    PROCESSING_MODE: "처리 방식",
    FIELDS: "필드 설정",
    COLUMN_MAPPING: "컬럼 매핑",
  },

  // Knowledge
  KNOWLEDGE: {
    TITLE: "지식베이스",
    SYNC: "동기화",
    SYNC_SUCCESS: "지식베이스가 동기화되었습니다",
    SYNC_ERROR: "동기화 중 오류가 발생했습니다",
    SEARCH: "지식 검색",
    NO_RESULTS: "검색 결과가 없습니다",

    // Stats
    TOTAL_VECTORS: "전체 벡터 수",
    TOTAL_DOCUMENTS: "전체 문서 수",
    NAMESPACES: "네임스페이스",
  },

  // Chat
  CHAT: {
    TITLE: "AI 채팅",
    PLACEHOLDER: "질문을 입력하세요...",
    SEND: "전송",
    CLEAR: "대화 지우기",
    SOURCES: "출처",
    NO_SOURCES: "출처 없음",
    THINKING: "생각 중...",
    ERROR: "응답 생성 중 오류가 발생했습니다",
  },

  // Errors
  ERRORS: {
    GENERIC: "오류가 발생했습니다",
    NOT_FOUND: "요청한 리소스를 찾을 수 없습니다",
    UNAUTHORIZED: "인증이 필요합니다",
    FORBIDDEN: "접근 권한이 없습니다",
    VALIDATION: "입력값을 확인해주세요",
    NETWORK: "네트워크 오류가 발생했습니다",
    SERVER: "서버 오류가 발생했습니다",
    FILE_TOO_LARGE: "파일 크기가 너무 큽니다",
    INVALID_FILE_TYPE: "지원하지 않는 파일 형식입니다",
  },

  // Success
  SUCCESS: {
    SAVED: "저장되었습니다",
    DELETED: "삭제되었습니다",
    UPDATED: "수정되었습니다",
    CREATED: "생성되었습니다",
    UPLOADED: "업로드되었습니다",
  },
} as const;
```

---

## Enums

```typescript
// lib/constants/enums.ts

/**
 * User roles
 */
export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  VIEWER: "viewer",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "최고 관리자",
  admin: "관리자",
  manager: "매니저",
  viewer: "조회자",
};

/**
 * Employee status
 */
export const EMPLOYEE_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
  TERMINATED: "terminated",
} as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUS)[keyof typeof EMPLOYEE_STATUS];

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "재직",
  inactive: "휴직",
  pending: "대기",
  terminated: "퇴사",
};

export const EMPLOYEE_STATUS_COLORS: Record<EmployeeStatus, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  terminated: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

/**
 * Clearance levels
 */
export const CLEARANCE_LEVELS = {
  BASIC: "basic",
  STANDARD: "standard",
  ELEVATED: "elevated",
  FULL: "full",
} as const;

export type ClearanceLevel = (typeof CLEARANCE_LEVELS)[keyof typeof CLEARANCE_LEVELS];

export const CLEARANCE_LEVEL_LABELS: Record<ClearanceLevel, string> = {
  basic: "기본",
  standard: "일반",
  elevated: "상위",
  full: "전체",
};

export const CLEARANCE_LEVEL_ORDER: Record<ClearanceLevel, number> = {
  basic: 1,
  standard: 2,
  elevated: 3,
  full: 4,
};

/**
 * Document status
 */
export const DOCUMENT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  ARCHIVED: "archived",
} as const;

export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "대기",
  processing: "처리 중",
  completed: "완료",
  failed: "실패",
  archived: "보관",
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  archived: "bg-purple-100 text-purple-800",
};

/**
 * File types
 */
export const FILE_TYPES = {
  PDF: "pdf",
  XLSX: "xlsx",
  XLS: "xls",
  CSV: "csv",
  DOCX: "docx",
  TXT: "txt",
} as const;

export type FileType = (typeof FILE_TYPES)[keyof typeof FILE_TYPES];

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  pdf: "PDF",
  xlsx: "Excel (xlsx)",
  xls: "Excel (xls)",
  csv: "CSV",
  docx: "Word",
  txt: "텍스트",
};

export const FILE_TYPE_ICONS: Record<FileType, string> = {
  pdf: "FilePdf",
  xlsx: "FileXls",
  xls: "FileXls",
  csv: "FileCsv",
  docx: "FileDoc",
  txt: "FileText",
};

export const ACCEPTED_FILE_TYPES: Record<FileType, string[]> = {
  pdf: ["application/pdf"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  xls: ["application/vnd.ms-excel"],
  csv: ["text/csv"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  txt: ["text/plain"],
};

/**
 * Namespace types
 */
export const NAMESPACE_TYPES = {
  COMPANY: "company",
  EMPLOYEE: "employee",
} as const;

export type NamespaceType = (typeof NAMESPACE_TYPES)[keyof typeof NAMESPACE_TYPES];

export const NAMESPACE_TYPE_LABELS: Record<NamespaceType, string> = {
  company: "회사 공통",
  employee: "직원 개인",
};

/**
 * Processing modes
 */
export const PROCESSING_MODES = {
  STANDARD: "standard",
  EMPLOYEE_SPLIT: "employee_split",
  BATCH: "batch",
  CUSTOM: "custom",
} as const;

export type ProcessingMode = (typeof PROCESSING_MODES)[keyof typeof PROCESSING_MODES];

export const PROCESSING_MODE_LABELS: Record<ProcessingMode, string> = {
  standard: "일반 처리",
  employee_split: "직원별 분리",
  batch: "일괄 처리",
  custom: "사용자 정의",
};

/**
 * Batch status
 */
export const BATCH_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  ROLLED_BACK: "rolled_back",
} as const;

export type BatchStatus = (typeof BATCH_STATUS)[keyof typeof BATCH_STATUS];

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  pending: "대기",
  processing: "처리 중",
  completed: "완료",
  failed: "실패",
  rolled_back: "롤백됨",
};
```

---

## Configuration

```typescript
// lib/constants/config.ts

/**
 * Application configuration
 */
export const APP_CONFIG = {
  // App metadata
  APP_NAME: "JISA App",
  APP_DESCRIPTION: "ContractorHub - 하청업체 급여 및 온보딩 관리 시스템",
  APP_VERSION: "1.0.0",

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],

  // File upload
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES_PER_UPLOAD: 10,

  // Search
  SEARCH_DEBOUNCE_MS: 300,
  MIN_SEARCH_LENGTH: 2,

  // Chat
  MAX_CHAT_HISTORY: 50,
  MAX_SOURCES_PER_RESPONSE: 5,
  CHAT_CONTEXT_WINDOW: 10,

  // Processing
  CHUNK_SIZE: 1000,
  CHUNK_OVERLAP: 200,
  MAX_CHUNKS_PER_DOCUMENT: 500,

  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_CHAT_REQUESTS_PER_MINUTE: 20,

  // Session
  SESSION_TIMEOUT_MINUTES: 60,
  REFRESH_THRESHOLD_MINUTES: 5,
} as const;

/**
 * AI/ML configuration
 */
export const AI_CONFIG = {
  // OpenAI
  EMBEDDING_MODEL: "text-embedding-3-large",
  EMBEDDING_DIMENSIONS: 3072,

  // Gemini
  GEMINI_MODEL: "gemini-1.5-flash",

  // Chat
  CHAT_MODEL: "gpt-4o",
  CHAT_TEMPERATURE: 0.7,
  CHAT_MAX_TOKENS: 2000,

  // RAG
  RAG_TOP_K: 10,
  RAG_RERANK_TOP_K: 5,
  RAG_MIN_SCORE: 0.7,
} as const;

/**
 * Pinecone configuration
 */
export const PINECONE_CONFIG = {
  // Namespace prefixes
  COMPANY_NAMESPACE_PREFIX: "org_",
  EMPLOYEE_NAMESPACE_PREFIX: "emp_",

  // Batch sizes
  UPSERT_BATCH_SIZE: 100,
  DELETE_BATCH_SIZE: 1000,
  QUERY_TOP_K: 10,
} as const;

/**
 * Date/time formats
 */
export const DATE_FORMATS = {
  // Display formats (Korean)
  DATE: "yyyy년 MM월 dd일",
  DATE_SHORT: "yyyy-MM-dd",
  TIME: "HH:mm",
  TIME_WITH_SECONDS: "HH:mm:ss",
  DATETIME: "yyyy년 MM월 dd일 HH:mm",
  DATETIME_SHORT: "yyyy-MM-dd HH:mm",
  RELATIVE: "relative", // Special marker for relative time

  // API formats
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  DATE_API: "yyyy-MM-dd",
} as const;

/**
 * Number formats
 */
export const NUMBER_FORMATS = {
  CURRENCY: {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  },
  PERCENT: {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  },
  DECIMAL: {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
} as const;
```

---

## API Error Codes

```typescript
// lib/constants/errors.ts

/**
 * API error codes with Korean messages
 */
export const ERROR_CODES = {
  // General errors (1xxx)
  INTERNAL_ERROR: {
    code: "E1000",
    message: "서버 오류가 발생했습니다",
    httpStatus: 500,
  },
  VALIDATION_ERROR: {
    code: "E1001",
    message: "입력값이 올바르지 않습니다",
    httpStatus: 400,
  },
  NOT_FOUND: {
    code: "E1002",
    message: "요청한 리소스를 찾을 수 없습니다",
    httpStatus: 404,
  },
  CONFLICT: {
    code: "E1003",
    message: "이미 존재하는 데이터입니다",
    httpStatus: 409,
  },

  // Auth errors (2xxx)
  UNAUTHORIZED: {
    code: "E2000",
    message: "인증이 필요합니다",
    httpStatus: 401,
  },
  FORBIDDEN: {
    code: "E2001",
    message: "접근 권한이 없습니다",
    httpStatus: 403,
  },
  INVALID_CREDENTIALS: {
    code: "E2002",
    message: "이메일 또는 비밀번호가 올바르지 않습니다",
    httpStatus: 401,
  },
  SESSION_EXPIRED: {
    code: "E2003",
    message: "세션이 만료되었습니다",
    httpStatus: 401,
  },
  TOKEN_INVALID: {
    code: "E2004",
    message: "유효하지 않은 토큰입니다",
    httpStatus: 401,
  },

  // Employee errors (3xxx)
  EMPLOYEE_NOT_FOUND: {
    code: "E3000",
    message: "직원을 찾을 수 없습니다",
    httpStatus: 404,
  },
  EMPLOYEE_DUPLICATE: {
    code: "E3001",
    message: "이미 등록된 사번입니다",
    httpStatus: 409,
  },
  EMPLOYEE_HAS_DOCUMENTS: {
    code: "E3002",
    message: "문서가 있는 직원은 삭제할 수 없습니다",
    httpStatus: 400,
  },

  // Document errors (4xxx)
  DOCUMENT_NOT_FOUND: {
    code: "E4000",
    message: "문서를 찾을 수 없습니다",
    httpStatus: 404,
  },
  DOCUMENT_TOO_LARGE: {
    code: "E4001",
    message: "파일 크기가 너무 큽니다 (최대 50MB)",
    httpStatus: 413,
  },
  DOCUMENT_INVALID_TYPE: {
    code: "E4002",
    message: "지원하지 않는 파일 형식입니다",
    httpStatus: 400,
  },
  DOCUMENT_PROCESSING_FAILED: {
    code: "E4003",
    message: "문서 처리에 실패했습니다",
    httpStatus: 500,
  },
  DOCUMENT_ALREADY_PROCESSED: {
    code: "E4004",
    message: "이미 처리된 문서입니다",
    httpStatus: 400,
  },

  // Category errors (5xxx)
  CATEGORY_NOT_FOUND: {
    code: "E5000",
    message: "카테고리를 찾을 수 없습니다",
    httpStatus: 404,
  },
  CATEGORY_HAS_CHILDREN: {
    code: "E5001",
    message: "하위 카테고리가 있어 삭제할 수 없습니다",
    httpStatus: 400,
  },
  CATEGORY_HAS_DOCUMENTS: {
    code: "E5002",
    message: "문서가 있는 카테고리는 삭제할 수 없습니다",
    httpStatus: 400,
  },

  // Template errors (6xxx)
  TEMPLATE_NOT_FOUND: {
    code: "E6000",
    message: "템플릿을 찾을 수 없습니다",
    httpStatus: 404,
  },
  TEMPLATE_INVALID_CONFIG: {
    code: "E6001",
    message: "템플릿 설정이 올바르지 않습니다",
    httpStatus: 400,
  },

  // Knowledge errors (7xxx)
  KNOWLEDGE_SYNC_FAILED: {
    code: "E7000",
    message: "지식베이스 동기화에 실패했습니다",
    httpStatus: 500,
  },
  KNOWLEDGE_SEARCH_FAILED: {
    code: "E7001",
    message: "검색 중 오류가 발생했습니다",
    httpStatus: 500,
  },
  EMBEDDING_FAILED: {
    code: "E7002",
    message: "임베딩 생성에 실패했습니다",
    httpStatus: 500,
  },

  // Chat errors (8xxx)
  CHAT_GENERATION_FAILED: {
    code: "E8000",
    message: "응답 생성에 실패했습니다",
    httpStatus: 500,
  },
  CHAT_RATE_LIMITED: {
    code: "E8001",
    message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요",
    httpStatus: 429,
  },
  CHAT_CONTEXT_TOO_LONG: {
    code: "E8002",
    message: "대화 내용이 너무 깁니다",
    httpStatus: 400,
  },

  // Processing errors (9xxx)
  BATCH_NOT_FOUND: {
    code: "E9000",
    message: "처리 배치를 찾을 수 없습니다",
    httpStatus: 404,
  },
  BATCH_ALREADY_COMPLETED: {
    code: "E9001",
    message: "이미 완료된 배치입니다",
    httpStatus: 400,
  },
  ROLLBACK_FAILED: {
    code: "E9002",
    message: "롤백에 실패했습니다",
    httpStatus: 500,
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
```

---

## Sidebar Navigation

```typescript
// lib/constants/navigation.ts

import {
  House,
  Users,
  FileText,
  FolderOpen,
  FileCode,
  Database,
  ChatCircle,
  Gear,
  type Icon,
} from "@phosphor-icons/react";

export interface NavItem {
  title: string;
  href: string;
  icon: Icon;
  badge?: string | number;
  children?: NavItem[];
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    title: "대시보드",
    href: "/admin",
    icon: House,
  },
  {
    title: "직원 관리",
    href: "/admin/employees",
    icon: Users,
  },
  {
    title: "문서 관리",
    href: "/admin/documents",
    icon: FileText,
  },
  {
    title: "카테고리",
    href: "/admin/categories",
    icon: FolderOpen,
  },
  {
    title: "템플릿",
    href: "/admin/templates",
    icon: FileCode,
  },
  {
    title: "지식베이스",
    href: "/admin/knowledge",
    icon: Database,
  },
  {
    title: "AI 채팅",
    href: "/admin/chat",
    icon: ChatCircle,
  },
  {
    title: "설정",
    href: "/admin/settings",
    icon: Gear,
  },
];

export const EMPLOYEE_NAV_ITEMS: NavItem[] = [
  {
    title: "홈",
    href: "/employee",
    icon: House,
  },
  {
    title: "AI 채팅",
    href: "/employee/chat",
    icon: ChatCircle,
  },
  {
    title: "내 문서",
    href: "/employee/documents",
    icon: FileText,
  },
];
```

---

## Keyboard Shortcuts

```typescript
// lib/constants/shortcuts.ts

/**
 * Keyboard shortcuts
 */
export const SHORTCUTS = {
  // Global
  SEARCH: "cmd+k",
  SETTINGS: "cmd+,",
  HELP: "cmd+/",

  // Navigation
  GO_HOME: "g h",
  GO_EMPLOYEES: "g e",
  GO_DOCUMENTS: "g d",
  GO_CHAT: "g c",

  // Actions
  NEW: "n",
  EDIT: "e",
  DELETE: "d",
  SAVE: "cmd+s",
  CANCEL: "esc",

  // Table
  SELECT_ALL: "cmd+a",
  NEXT_PAGE: "j",
  PREV_PAGE: "k",
} as const;

export const SHORTCUT_LABELS: Record<keyof typeof SHORTCUTS, string> = {
  SEARCH: "검색",
  SETTINGS: "설정",
  HELP: "도움말",
  GO_HOME: "홈으로",
  GO_EMPLOYEES: "직원 관리",
  GO_DOCUMENTS: "문서 관리",
  GO_CHAT: "AI 채팅",
  NEW: "새로 만들기",
  EDIT: "수정",
  DELETE: "삭제",
  SAVE: "저장",
  CANCEL: "취소",
  SELECT_ALL: "전체 선택",
  NEXT_PAGE: "다음 페이지",
  PREV_PAGE: "이전 페이지",
};
```

---

## Query Keys (React Query)

```typescript
// lib/constants/query-keys.ts

/**
 * React Query keys for caching
 */
export const QUERY_KEYS = {
  // Auth
  AUTH: {
    SESSION: ["auth", "session"],
    USER: ["auth", "user"],
  },

  // Employees
  EMPLOYEES: {
    LIST: (filters?: Record<string, unknown>) => ["employees", "list", filters],
    DETAIL: (id: string) => ["employees", "detail", id],
    STATS: ["employees", "stats"],
  },

  // Documents
  DOCUMENTS: {
    LIST: (filters?: Record<string, unknown>) => ["documents", "list", filters],
    DETAIL: (id: string) => ["documents", "detail", id],
    STATS: ["documents", "stats"],
  },

  // Categories
  CATEGORIES: {
    LIST: ["categories", "list"],
    TREE: ["categories", "tree"],
    DETAIL: (id: string) => ["categories", "detail", id],
  },

  // Templates
  TEMPLATES: {
    LIST: (filters?: Record<string, unknown>) => ["templates", "list", filters],
    DETAIL: (id: string) => ["templates", "detail", id],
  },

  // Knowledge
  KNOWLEDGE: {
    STATS: ["knowledge", "stats"],
    NAMESPACES: ["knowledge", "namespaces"],
    SEARCH: (query: string) => ["knowledge", "search", query],
  },

  // Chat
  CHAT: {
    SESSIONS: ["chat", "sessions"],
    SESSION: (id: string) => ["chat", "session", id],
    MESSAGES: (sessionId: string) => ["chat", "messages", sessionId],
  },

  // Processing
  PROCESSING: {
    BATCHES: (filters?: Record<string, unknown>) => ["processing", "batches", filters],
    BATCH: (id: string) => ["processing", "batch", id],
  },
} as const;
```

---

## Exports

```typescript
// lib/constants/index.ts

export * from "./routes";
export * from "./messages";
export * from "./enums";
export * from "./config";
export * from "./errors";
export * from "./navigation";
export * from "./shortcuts";
export * from "./query-keys";
```
