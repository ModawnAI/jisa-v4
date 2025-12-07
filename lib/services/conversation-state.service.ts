/**
 * Conversation State Service
 *
 * Manages conversation state for multi-turn interactions,
 * particularly for handling clarification flows.
 */

import type { QueryIntent, TemplateType } from '@/lib/ai/query-intent';

/**
 * Pending clarification state
 */
export interface PendingClarification {
  originalQuery: string;
  partialIntent: Partial<QueryIntent>;
  askedQuestion: string;
  clarificationType: 'period' | 'template' | 'field' | 'general';
  askedAt: Date;
  expiresAt: Date;
}

/**
 * Confirmed context from previous interactions
 */
export interface ConfirmedContext {
  period?: string;
  templateType?: TemplateType;
  company?: string;
  calculationType?: string;
  fields?: string[];
}

/**
 * Message in conversation history
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: Partial<QueryIntent>;
    route?: string;
    processingTimeMs?: number;
  };
}

/**
 * Complete conversation state
 */
export interface ConversationState {
  sessionId: string;
  employeeId?: string;
  pendingClarification?: PendingClarification;
  confirmedContext: ConfirmedContext;
  history: ConversationMessage[];
  createdAt: Date;
  lastActivityAt: Date;
}

/**
 * Result of handling a user message
 */
export interface MessageHandlingResult {
  shouldProcessAsRAG: boolean;
  mergedIntent?: Partial<QueryIntent>;
  contextApplied: boolean;
  clarificationResolved: boolean;
}

/**
 * Period patterns for Korean input
 */
const PERIOD_PATTERNS: Array<{ pattern: RegExp; extractor: (match: RegExpMatchArray) => string }> = [
  // 이번달, 지난달, 저번달
  {
    pattern: /이번\s*달/,
    extractor: () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },
  },
  {
    pattern: /지난\s*달|저번\s*달/,
    extractor: () => {
      const now = new Date();
      now.setMonth(now.getMonth() - 1);
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },
  },
  // 특정 월: 1월, 2월, ... 12월
  {
    pattern: /(\d{1,2})\s*월/,
    extractor: (match) => {
      const month = parseInt(match[1]);
      const year = new Date().getFullYear();
      return `${year}-${String(month).padStart(2, '0')}`;
    },
  },
  // YYYY년 MM월
  {
    pattern: /(\d{4})\s*년\s*(\d{1,2})\s*월/,
    extractor: (match) => {
      return `${match[1]}-${String(parseInt(match[2])).padStart(2, '0')}`;
    },
  },
  // 분기: 1분기, 2분기, ...
  {
    pattern: /(\d)\s*분기/,
    extractor: (match) => {
      const quarter = parseInt(match[1]);
      const year = new Date().getFullYear();
      return `${year}-Q${quarter}`;
    },
  },
];

/**
 * Template type patterns for Korean input
 */
const TEMPLATE_PATTERNS: Array<{ pattern: RegExp; type: TemplateType }> = [
  { pattern: /수수료|커미션|급여|지급/i, type: 'compensation' },
  { pattern: /mdrt|엠디알티|cot|tot/i, type: 'mdrt' },
  { pattern: /일정|스케줄|일반|기타/i, type: 'general' },
];

// State storage (in-memory, can be replaced with Redis)
const stateStore = new Map<string, ConversationState>();

// State TTL (30 minutes)
const STATE_TTL_MS = 30 * 60 * 1000;

// Clarification TTL (5 minutes)
const CLARIFICATION_TTL_MS = 5 * 60 * 1000;

class ConversationStateService {
  /**
   * Get or create conversation state
   */
  getOrCreateState(sessionId: string, employeeId?: string): ConversationState {
    let state = stateStore.get(sessionId);

    if (!state || this.isStateExpired(state)) {
      state = this.createNewState(sessionId, employeeId);
      stateStore.set(sessionId, state);
    }

    return state;
  }

  /**
   * Handle incoming user message
   */
  handleUserMessage(
    sessionId: string,
    message: string,
    employeeId?: string
  ): MessageHandlingResult {
    const state = this.getOrCreateState(sessionId, employeeId);
    state.lastActivityAt = new Date();

    // Add message to history
    this.addToHistory(state, 'user', message);

    // Check for pending clarification
    if (state.pendingClarification) {
      if (this.isClarificationExpired(state.pendingClarification)) {
        // Clarification expired, treat as new query
        state.pendingClarification = undefined;
        return {
          shouldProcessAsRAG: true,
          contextApplied: this.hasConfirmedContext(state),
          clarificationResolved: false,
          mergedIntent: this.buildIntentFromContext(state.confirmedContext),
        };
      }

      // Parse user's clarification response
      const parsedResponse = this.parseClarificationResponse(
        message,
        state.pendingClarification.clarificationType
      );

      if (parsedResponse) {
        // Merge with partial intent
        const mergedIntent = this.mergeIntentWithResponse(
          state.pendingClarification.partialIntent,
          parsedResponse
        );

        // Update confirmed context
        this.updateConfirmedContext(state, parsedResponse);

        // Clear pending clarification
        state.pendingClarification = undefined;

        return {
          shouldProcessAsRAG: true,
          mergedIntent: {
            ...mergedIntent,
            confidence: 0.85, // Boosted by user confirmation
          },
          contextApplied: true,
          clarificationResolved: true,
        };
      }
    }

    // No pending clarification or couldn't parse response
    // Apply confirmed context if available
    const contextIntent = this.hasConfirmedContext(state)
      ? this.buildIntentFromContext(state.confirmedContext)
      : undefined;

    return {
      shouldProcessAsRAG: true,
      mergedIntent: contextIntent,
      contextApplied: !!contextIntent,
      clarificationResolved: false,
    };
  }

  /**
   * Set pending clarification
   */
  setPendingClarification(
    sessionId: string,
    originalQuery: string,
    partialIntent: Partial<QueryIntent>,
    askedQuestion: string,
    clarificationType: PendingClarification['clarificationType']
  ): void {
    const state = stateStore.get(sessionId);
    if (!state) return;

    const now = new Date();
    state.pendingClarification = {
      originalQuery,
      partialIntent,
      askedQuestion,
      clarificationType,
      askedAt: now,
      expiresAt: new Date(now.getTime() + CLARIFICATION_TTL_MS),
    };

    // Add assistant message to history
    this.addToHistory(state, 'assistant', askedQuestion);
  }

  /**
   * Add assistant response to history
   */
  addAssistantResponse(
    sessionId: string,
    response: string,
    metadata?: ConversationMessage['metadata']
  ): void {
    const state = stateStore.get(sessionId);
    if (!state) return;

    this.addToHistory(state, 'assistant', response, metadata);
  }

  /**
   * Check if session has pending clarification
   */
  hasPendingClarification(sessionId: string): boolean {
    const state = stateStore.get(sessionId);
    if (!state?.pendingClarification) return false;
    return !this.isClarificationExpired(state.pendingClarification);
  }

  /**
   * Get confirmed context for a session
   */
  getConfirmedContext(sessionId: string): ConfirmedContext | undefined {
    const state = stateStore.get(sessionId);
    return state?.confirmedContext;
  }

  /**
   * Update confirmed context
   */
  updateConfirmedContext(
    state: ConversationState,
    update: Partial<ConfirmedContext>
  ): void {
    state.confirmedContext = {
      ...state.confirmedContext,
      ...update,
    };
  }

  /**
   * Clear session state
   */
  clearState(sessionId: string): void {
    stateStore.delete(sessionId);
  }

  /**
   * Get conversation history
   */
  getHistory(sessionId: string, limit = 10): ConversationMessage[] {
    const state = stateStore.get(sessionId);
    if (!state) return [];
    return state.history.slice(-limit);
  }

  /**
   * Clean up expired states (call periodically)
   */
  cleanupExpiredStates(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [sessionId, state] of stateStore.entries()) {
      if (now - state.lastActivityAt.getTime() > STATE_TTL_MS) {
        stateStore.delete(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Private methods

  private createNewState(sessionId: string, employeeId?: string): ConversationState {
    const now = new Date();
    return {
      sessionId,
      employeeId,
      confirmedContext: {},
      history: [],
      createdAt: now,
      lastActivityAt: now,
    };
  }

  private isStateExpired(state: ConversationState): boolean {
    return Date.now() - state.lastActivityAt.getTime() > STATE_TTL_MS;
  }

  private isClarificationExpired(clarification: PendingClarification): boolean {
    return new Date() > clarification.expiresAt;
  }

  private addToHistory(
    state: ConversationState,
    role: 'user' | 'assistant',
    content: string,
    metadata?: ConversationMessage['metadata']
  ): void {
    state.history.push({
      role,
      content,
      timestamp: new Date(),
      metadata,
    });

    // Keep history bounded
    if (state.history.length > 50) {
      state.history = state.history.slice(-50);
    }
  }

  private hasConfirmedContext(state: ConversationState): boolean {
    const ctx = state.confirmedContext;
    return !!(ctx.period || ctx.templateType || ctx.company);
  }

  private buildIntentFromContext(context: ConfirmedContext): Partial<QueryIntent> {
    return {
      template: context.templateType,
      filters: {
        period: context.period,
        company: context.company,
      },
      fields: context.fields,
    };
  }

  private parseClarificationResponse(
    message: string,
    type: PendingClarification['clarificationType']
  ): Partial<ConfirmedContext> | null {
    const normalized = message.trim().toLowerCase();

    switch (type) {
      case 'period':
        return this.extractPeriod(normalized);
      case 'template':
        return this.extractTemplate(normalized);
      case 'general':
        // Try to extract any recognizable context
        return (
          this.extractPeriod(normalized) ||
          this.extractTemplate(normalized)
        );
      default:
        return null;
    }
  }

  private extractPeriod(message: string): Partial<ConfirmedContext> | null {
    for (const { pattern, extractor } of PERIOD_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        return { period: extractor(match) };
      }
    }
    return null;
  }

  private extractTemplate(message: string): Partial<ConfirmedContext> | null {
    for (const { pattern, type } of TEMPLATE_PATTERNS) {
      if (pattern.test(message)) {
        return { templateType: type };
      }
    }
    return null;
  }

  private mergeIntentWithResponse(
    partialIntent: Partial<QueryIntent>,
    response: Partial<ConfirmedContext>
  ): Partial<QueryIntent> {
    return {
      ...partialIntent,
      template: response.templateType || partialIntent.template,
      filters: {
        ...partialIntent.filters,
        period: response.period || partialIntent.filters?.period,
        company: response.company || partialIntent.filters?.company,
      },
    };
  }
}

// Export singleton instance
export const conversationStateService = new ConversationStateService();

// Run cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    conversationStateService.cleanupExpiredStates();
  }, 10 * 60 * 1000);
}
