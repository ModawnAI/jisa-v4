/**
 * Type Definitions for JISA KakaoTalk Backend
 */

// ============================================
// KakaoTalk Types
// ============================================

export interface KakaoWebhookRequest {
  userRequest: {
    utterance: string;
    user: {
      id: string;
      properties?: {
        nickname?: string;
        [key: string]: unknown;
      };
    };
    callbackUrl?: string | null;
  };
  bot?: {
    id: string;
    name: string;
  };
  action?: {
    id: string;
    name?: string;
    params?: Record<string, unknown>;
    detailParams?: Record<string, unknown>;
    clientExtra?: Record<string, unknown>;
  };
  contexts?: unknown[];
}

export interface KakaoResponse {
  version: string;
  template: {
    outputs: Array<{ simpleText: { text: string } }>;
    quickReplies?: Array<{
      action: string;
      label: string;
      messageText: string;
    }>;
  };
}

export interface KakaoCallbackResponse {
  version: string;
  useCallback: boolean;
  data: {
    text: string;
  };
}

// ============================================
// User & Profile Types
// ============================================

export type UserRole = 'user' | 'junior' | 'senior' | 'manager' | 'admin' | 'ceo';
export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface UserProfile {
  id: string;
  email?: string;
  kakao_user_id?: string;
  kakao_nickname?: string;
  full_name?: string;
  role: UserRole;
  subscription_tier: SubscriptionTier;
  department?: string;
  permissions?: Record<string, boolean>;
  metadata?: Record<string, unknown>;
  pinecone_namespace?: string;
  rag_enabled?: boolean;
  credential_id?: string;
  query_count?: number;
  first_chat_at?: string;
  last_chat_at?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Verification Code Types
// ============================================

export type CodeStatus = 'active' | 'used' | 'expired' | 'revoked';
export type CodeType = 'registration' | 'employee_registration';

export interface VerificationCode {
  id: string;
  code: string;
  code_type: CodeType;
  status: CodeStatus;
  is_used: boolean;
  is_active: boolean;
  current_uses: number;
  max_uses: number;
  created_at: string;
  expires_at: string;
  used_at?: string;
  used_by?: string[];
  role: UserRole;
  tier: SubscriptionTier;
  employee_sabon?: string;
  pinecone_namespace?: string;
  rag_enabled?: boolean;
  intended_recipient_id?: string;
  intended_recipient_name?: string;
  intended_recipient_email?: string;
  requires_credential_match?: boolean;
  credential_match_fields?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================
// RAG Types
// ============================================

export interface MetadataKey {
  chunk_types: string[];
  content_types: string[];
  primary_categories: string[];
  companies: string[];
  product_names_examples: string[];
  presenters_examples: string[];
  locations: string[];
  payment_terms: string[];
  commission_categories: string[];
  commission_periods: string[];
  boolean_filters: string[];
}

export interface PdfAttachment {
  name?: string;
  url: string;
  description: string;
  keywords?: string[];
}

export interface EnhancedQuery {
  enhanced_query: string;
  filters: Record<string, unknown> | null;
  reasoning: string;
}

export interface PineconeMatch {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface PineconeQueryResult {
  matches: PineconeMatch[];
}

// ============================================
// Employee RAG Types
// ============================================

export interface EmployeeRAGQuery {
  userId: string;
  query: string;
  topK?: number;
}

export interface EmployeeRAGResult {
  answer: string;
  sources: Array<{
    id: string;
    score: number;
    doc_type: string;
    metadata: Record<string, unknown>;
  }>;
  namespace: string;
  employee_id: string;
  query_stats: {
    vectors_searched: number;
    max_score: number;
    results_count: number;
    query_duration_ms: number;
  };
}

export interface EmployeeInfo {
  profileId: string;
  employeeId: string;
  fullName: string;
  pineconeNamespace: string;
  ragEnabled: boolean;
  vectorCount: number;
}

// ============================================
// Commission Types
// ============================================

export interface CommissionDetectionResult {
  isCommissionQuery: boolean;
  confidence: number;
  matchedKeywords: string[];
  reasoning: string;
}

export interface CommissionResult {
  status: 'success' | 'error';
  message?: string;
  error?: string;
  best_match?: {
    product_name: string;
    company: string;
    payment_period: string;
    match_score: number;
    metadata?: Record<string, unknown>;
  };
  commission_data?: {
    product: {
      commission_rates: Record<string, number>;
    };
    multiplier_ratio: number;
    calculation_formula: string;
  };
  percentage?: number;
  alternatives?: Array<{
    product_name: string;
    company: string;
    payment_period: string;
    match_score: number;
  }>;
}

// ============================================
// RBAC Types
// ============================================

export interface RBACFilter {
  access_roles?: { $in: string[] };
  access_tiers?: { $in: string[] };
  required_clearance_level?: { $lte: number };
  allowed_departments?: { $in: string[] };
  allowed_regions?: { $in: string[] };
  [key: string]: { $in?: string[]; $lte?: number } | undefined;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}

// ============================================
// Query Log Types
// ============================================

export interface QueryLog {
  id?: string;
  user_id: string;
  kakao_user_id?: string;
  query_text: string;
  response_text: string;
  query_type: 'commission' | 'rag' | 'employee_rag';
  response_time_ms: number;
  session_id?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Analytics Event Types
// ============================================

export interface AnalyticsEvent {
  id?: string;
  event_type: string;
  user_id?: string;
  kakao_user_id?: string;
  session_id?: string;
  event_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}
