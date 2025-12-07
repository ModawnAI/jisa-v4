/**
 * Clarification Builder
 *
 * Generates contextual follow-up questions based on
 * what context is missing from a user's query.
 */

import type { QueryIntent, QueryIntentType, TemplateType } from './query-intent';

/**
 * Clarification type
 */
export type ClarificationType = 'period' | 'template' | 'field' | 'calculation' | 'general';

/**
 * Clarification result
 */
export interface ClarificationResult {
  question: string;
  type: ClarificationType;
  options?: string[];
  priority: number;
}

/**
 * Missing context analysis
 */
export interface MissingContext {
  period: boolean;
  template: boolean;
  field: boolean;
  calculationType: boolean;
}

/**
 * Question templates by type (Korean)
 */
const QUESTION_TEMPLATES: Record<ClarificationType, string[]> = {
  period: [
    '어느 기간의 정보를 찾으시나요?',
    '언제 데이터가 필요하신가요?',
    '몇 월 정보를 확인하고 싶으신가요?',
  ],
  template: [
    '어떤 종류의 정보가 필요하신가요?',
    '수수료, MDRT, 일정 중 어떤 것이 궁금하신가요?',
    '무엇에 대해 알고 싶으신가요?',
  ],
  field: [
    '어떤 항목을 확인하고 싶으신가요?',
    '구체적으로 어떤 정보가 필요하신가요?',
  ],
  calculation: [
    '어떤 계산이 필요하신가요?',
    '비교, 합계, 또는 다른 계산이 필요하신가요?',
  ],
  general: [
    '좀 더 구체적으로 말씀해 주시겠어요?',
    '어떤 정보를 찾고 계신지 조금 더 설명해 주실 수 있나요?',
    '무엇을 도와드릴까요?',
  ],
};

/**
 * Contextual hints based on intent type
 */
const INTENT_HINTS: Record<QueryIntentType, string> = {
  direct_lookup: '예: "이번달 총 수수료", "11월 커미션"',
  calculation: '예: "MDRT까지 얼마 남았어?", "지난달 대비 증가율"',
  comparison: '예: "10월과 11월 비교", "작년 대비"',
  aggregation: '예: "올해 총 수입", "평균 월 커미션"',
  general_qa: '예: "다음주 일정", "회사 정책 설명"',
};

/**
 * Options for template type clarification
 */
const TEMPLATE_OPTIONS: Array<{ label: string; type: TemplateType }> = [
  { label: '💰 수수료/커미션', type: 'compensation' },
  { label: '🏆 MDRT 현황', type: 'mdrt' },
  { label: '📅 일정/일반 정보', type: 'general' },
];

/**
 * Options for period clarification
 */
const PERIOD_OPTIONS = [
  '이번달',
  '지난달',
  '올해',
  '특정 월 (예: 11월)',
];

class ClarificationBuilder {
  /**
   * Build clarification question based on intent
   */
  buildClarification(intent: Partial<QueryIntent>): ClarificationResult {
    const missing = this.analyzeMissingContext(intent);
    const prioritized = this.prioritizeMissing(missing, intent);

    return this.createClarificationResult(prioritized, intent);
  }

  /**
   * Build clarification with options (for button-based UIs)
   */
  buildClarificationWithOptions(
    intent: Partial<QueryIntent>
  ): ClarificationResult & { hasOptions: true; options: string[] } {
    const missing = this.analyzeMissingContext(intent);
    const prioritized = this.prioritizeMissing(missing, intent);

    const result = this.createClarificationResult(prioritized, intent);

    return {
      ...result,
      hasOptions: true,
      options: this.getOptionsForType(prioritized),
    };
  }

  /**
   * Analyze what context is missing
   */
  analyzeMissingContext(intent: Partial<QueryIntent>): MissingContext {
    return {
      period: !intent.filters?.period && this.needsPeriod(intent),
      template: !intent.template || intent.template === 'general',
      field: (!intent.fields || intent.fields.length === 0) && this.needsField(intent),
      calculationType: intent.intent === 'calculation' && !intent.calculation?.type,
    };
  }

  /**
   * Check if intent type typically needs a period
   */
  private needsPeriod(intent: Partial<QueryIntent>): boolean {
    const periodRequired: QueryIntentType[] = [
      'direct_lookup',
      'calculation',
      'comparison',
      'aggregation',
    ];
    return periodRequired.includes(intent.intent as QueryIntentType);
  }

  /**
   * Check if intent type needs specific fields
   */
  private needsField(intent: Partial<QueryIntent>): boolean {
    const fieldRequired: QueryIntentType[] = ['direct_lookup', 'comparison'];
    return fieldRequired.includes(intent.intent as QueryIntentType);
  }

  /**
   * Prioritize which missing context to ask about
   */
  private prioritizeMissing(
    missing: MissingContext,
    intent: Partial<QueryIntent>
  ): ClarificationType {
    // Template is highest priority - determines what data to search
    if (missing.template) return 'template';

    // Period is second - many queries need time context
    if (missing.period) return 'period';

    // Field for lookups
    if (missing.field) return 'field';

    // Calculation type for calculations
    if (missing.calculationType) return 'calculation';

    // Default to general
    return 'general';
  }

  /**
   * Create the clarification result
   */
  private createClarificationResult(
    type: ClarificationType,
    intent: Partial<QueryIntent>
  ): ClarificationResult {
    const templates = QUESTION_TEMPLATES[type];
    const question = templates[Math.floor(Math.random() * templates.length)];

    // Add hint based on intent if available
    const hint = intent.intent ? INTENT_HINTS[intent.intent] : '';
    const fullQuestion = hint ? `${question}\n${hint}` : question;

    return {
      question: fullQuestion,
      type,
      options: this.getOptionsForType(type),
      priority: this.getPriorityForType(type),
    };
  }

  /**
   * Get options for a clarification type
   */
  private getOptionsForType(type: ClarificationType): string[] {
    switch (type) {
      case 'template':
        return TEMPLATE_OPTIONS.map((o) => o.label);
      case 'period':
        return PERIOD_OPTIONS;
      case 'field':
        return ['총 수수료', '커미션', '인센티브', '오버라이드', '기타'];
      case 'calculation':
        return ['MDRT 달성률', '기간 비교', '합계', '평균'];
      default:
        return [];
    }
  }

  /**
   * Get priority for clarification type
   */
  private getPriorityForType(type: ClarificationType): number {
    const priorities: Record<ClarificationType, number> = {
      template: 1,
      period: 2,
      field: 3,
      calculation: 4,
      general: 5,
    };
    return priorities[type];
  }

  /**
   * Build a combined clarification when multiple things are missing
   */
  buildCombinedClarification(intent: Partial<QueryIntent>): string {
    const missing = this.analyzeMissingContext(intent);
    const missingParts: string[] = [];

    if (missing.template) {
      missingParts.push('어떤 종류의 정보');
    }
    if (missing.period) {
      missingParts.push('어느 기간');
    }
    if (missing.field) {
      missingParts.push('어떤 항목');
    }

    if (missingParts.length === 0) {
      return QUESTION_TEMPLATES.general[0];
    }

    if (missingParts.length === 1) {
      return `${missingParts[0]}가 필요하신지 말씀해 주세요.`;
    }

    const lastPart = missingParts.pop();
    return `${missingParts.join(', ')}와 ${lastPart}을 알려주시면 더 정확한 답변을 드릴 수 있어요.`;
  }

  /**
   * Parse user's response to clarification
   */
  parseTemplateResponse(response: string): TemplateType | null {
    const normalized = response.toLowerCase();

    if (/수수료|커미션|급여|지급|돈/.test(normalized)) {
      return 'compensation';
    }
    if (/mdrt|엠디알티|cot|tot|달성/.test(normalized)) {
      return 'mdrt';
    }
    if (/일정|스케줄|일반|기타|정보/.test(normalized)) {
      return 'general';
    }

    // Check for numbered responses (1, 2, 3)
    if (/^1|첫\s*번째|수수료/.test(normalized)) return 'compensation';
    if (/^2|두\s*번째|mdrt/.test(normalized)) return 'mdrt';
    if (/^3|세\s*번째|일정/.test(normalized)) return 'general';

    return null;
  }
}

// Export singleton instance
export const clarificationBuilder = new ClarificationBuilder();

// Export utility functions
export function buildClarificationQuestion(intent: Partial<QueryIntent>): string {
  return clarificationBuilder.buildClarification(intent).question;
}

export function getClarificationType(intent: Partial<QueryIntent>): ClarificationType {
  return clarificationBuilder.buildClarification(intent).type;
}

export function getMissingContext(intent: Partial<QueryIntent>): MissingContext {
  return clarificationBuilder.analyzeMissingContext(intent);
}
