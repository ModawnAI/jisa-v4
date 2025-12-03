export const ROUTES = {
  // 인증
  LOGIN: '/login',
  SIGNUP: '/signup',
  LOGOUT: '/logout',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // 관리자 대시보드
  DASHBOARD: '/dashboard',

  // 직원 관리
  EMPLOYEES: '/employees',
  EMPLOYEE_NEW: '/employees/new',
  EMPLOYEE_DETAIL: (id: string) => `/employees/${id}`,
  EMPLOYEE_EDIT: (id: string) => `/employees/${id}/edit`,

  // 카테고리
  CATEGORIES: '/categories',
  CATEGORY_NEW: '/categories/new',
  CATEGORY_DETAIL: (id: string) => `/categories/${id}`,

  // 템플릿
  TEMPLATES: '/templates',
  TEMPLATE_NEW: '/templates/new',
  TEMPLATE_DETAIL: (id: string) => `/templates/${id}`,

  // 문서
  DOCUMENTS: '/documents',
  DOCUMENT_UPLOAD: '/documents/upload',
  DOCUMENT_DETAIL: (id: string) => `/documents/${id}`,

  // RAG
  CHAT: '/chat',
  LINEAGE: '/lineage',

  // 시스템
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  SECURITY: '/security',

  // API
  API: {
    EMPLOYEES: '/api/employees',
    CATEGORIES: '/api/categories',
    TEMPLATES: '/api/templates',
    DOCUMENTS: '/api/documents',
    RAG: '/api/rag',
    KAKAO: '/api/kakao',
    INNGEST: '/api/inngest',
    AUTH: '/api/auth',
  },
} as const;
