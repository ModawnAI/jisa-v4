// === 권한 레벨 ===
export const CLEARANCE_LEVELS = {
  BASIC: 'basic',
  STANDARD: 'standard',
  ADVANCED: 'advanced',
} as const;

export type ClearanceLevel = typeof CLEARANCE_LEVELS[keyof typeof CLEARANCE_LEVELS];

export const CLEARANCE_LEVEL_CONFIG = {
  basic: {
    label: '기본',
    numeric: 1,
    namespaces: ['company_shared'],
    color: 'gray',
  },
  standard: {
    label: '표준',
    numeric: 2,
    namespaces: ['company_shared', 'company_standard'],
    color: 'blue',
  },
  advanced: {
    label: '고급',
    numeric: 3,
    namespaces: ['company_shared', 'company_standard', 'company_advanced'],
    color: 'purple',
  },
} as const;

// === 직원 상태 ===
export const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  ON_LEAVE: 'on_leave',
  TERMINATED: 'terminated',
} as const;

export type EmployeeStatus = typeof EMPLOYEE_STATUS[keyof typeof EMPLOYEE_STATUS];

// === 고용 형태 ===
export const EMPLOYMENT_TYPE = {
  FULL_TIME: 'full_time',
  PART_TIME: 'part_time',
  CONTRACT: 'contract',
  INTERN: 'intern',
} as const;

export type EmploymentType = typeof EMPLOYMENT_TYPE[keyof typeof EMPLOYMENT_TYPE];

// === 네임스페이스 타입 ===
export const NAMESPACE_TYPES = {
  COMPANY: 'company',
  EMPLOYEE: 'employee',
} as const;

export type NamespaceType = typeof NAMESPACE_TYPES[keyof typeof NAMESPACE_TYPES];

export const NAMESPACE_TYPE_LABELS: Record<NamespaceType, string> = {
  company: '회사 전체',
  employee: '직원별',
};

// === 문서 처리 모드 ===
export const PROCESSING_MODES = {
  COMPANY: 'company_wide',
  EMPLOYEE_SPLIT: 'employee_split',
} as const;

export type ProcessingMode = typeof PROCESSING_MODES[keyof typeof PROCESSING_MODES];

// === 처리 상태 ===
export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back',
} as const;

export type ProcessingStatus = typeof PROCESSING_STATUS[keyof typeof PROCESSING_STATUS];

// === 문서 타입 ===
export const DOCUMENT_TYPE = {
  GENERAL: 'general',
  EMPLOYEE_SPECIFIC: 'employee_specific',
} as const;

export type DocumentType = typeof DOCUMENT_TYPE[keyof typeof DOCUMENT_TYPE];

// === 파일 타입 ===
export const FILE_TYPES = {
  EXCEL: 'excel',
  CSV: 'csv',
  PDF: 'pdf',
  WORD: 'word',
} as const;

export type FileType = typeof FILE_TYPES[keyof typeof FILE_TYPES];

// === 충돌 상태 ===
export const CONFLICT_STATUS = {
  DETECTED: 'detected',
  PENDING_REVIEW: 'pending_review',
  RESOLVED_KEEP_EXISTING: 'resolved_keep_existing',
  RESOLVED_KEEP_NEW: 'resolved_keep_new',
  RESOLVED_MERGED: 'resolved_merged',
  AUTO_RESOLVED: 'auto_resolved',
} as const;

export type ConflictStatus = typeof CONFLICT_STATUS[keyof typeof CONFLICT_STATUS];

// === 사용자 역할 ===
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  VIEWER: 'viewer',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// === 제한 값 ===
export const LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_UPLOAD_FILES: 10,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  EMBEDDING_DIMENSIONS: 3072,
  MAX_TOKENS_CONTEXT: 8000,
} as const;

// === 레이블 매핑 ===
export const CLEARANCE_LABELS: Record<string, string> = {
  basic: '기본',
  standard: '표준',
  advanced: '고급',
};

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: '재직',
  inactive: '비활성',
  pending: '대기',
  on_leave: '휴직',
  terminated: '퇴사',
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: '정규직',
  part_time: '파트타임',
  contract: '계약직',
  intern: '인턴',
};

export const PROCESSING_STATUS_LABELS: Record<string, string> = {
  pending: '대기중',
  processing: '처리중',
  completed: '완료',
  failed: '실패',
  rolled_back: '롤백됨',
};

export const USER_ROLE_LABELS: Record<string, string> = {
  super_admin: '최고 관리자',
  org_admin: '조직 관리자',
  manager: '매니저',
  employee: '직원',
  viewer: '열람자',
};

export const FILE_TYPE_LABELS: Record<string, string> = {
  excel: 'Excel',
  csv: 'CSV',
  pdf: 'PDF',
  word: 'Word',
};

export const PROCESSING_MODE_LABELS: Record<string, string> = {
  company: '회사 전체',
  employee_split: '직원별 분리',
  employee_aggregate: '직원별 집계',
};

export const CHUNKING_STRATEGY_LABELS: Record<string, string> = {
  auto: '자동',
  row_per_chunk: '행별 청크',
  fixed_size: '고정 크기',
  semantic: '의미 기반',
};

export const FIELD_ROLE_LABELS: Record<string, string> = {
  employee_identifier: '직원 식별자',
  content: '내용',
  metadata: '메타데이터',
  skip: '건너뛰기',
};

export const TARGET_FIELD_TYPE_LABELS: Record<string, string> = {
  string: '문자열',
  number: '숫자',
  date: '날짜',
  currency: '통화',
};

// === 충돌 상태 레이블 ===
export const CONFLICT_STATUS_LABELS: Record<string, string> = {
  detected: '감지됨',
  reviewing: '검토 중',
  resolved_keep_existing: '기존 유지',
  resolved_keep_new: '신규 유지',
  resolved_merged: '병합됨',
  dismissed: '무시됨',
};

// === 충돌 타입 레이블 ===
export const CONFLICT_TYPE_LABELS: Record<string, string> = {
  duplicate_content: '중복 콘텐츠',
  version_mismatch: '버전 불일치',
  category_mismatch: '카테고리 불일치',
  metadata_conflict: '메타데이터 충돌',
  employee_mismatch: '직원 불일치',
};

// === 네임스페이스 레이블 (전체) ===
export const NAMESPACE_LABELS: Record<string, string> = {
  org_shared: '전체 공유',
  org_standard: '표준 전용',
  org_advanced: '고급 전용',
};

// === 문서 상태 레이블 ===
export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  pending: '대기중',
  processing: '처리중',
  completed: '완료',
  failed: '실패',
  partial: '부분 완료',
};

// === 문서 상태 색상 (Badge variant) ===
export const DOCUMENT_STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  processing: 'outline',
  completed: 'default',
  failed: 'destructive',
  partial: 'outline',
};
