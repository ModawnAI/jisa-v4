/**
 * Query Router Service
 *
 * Routes incoming queries to appropriate processing paths:
 * - Instant: Quick responses for greetings, FAQs
 * - RAG: Full vector search pipeline
 * - Clarify: Request more context from user
 * - Fallback: Generic response for unclear queries
 */

import {
  QueryRoute,
  INTENT_THRESHOLDS,
  getRouteForConfidence,
  ROUTE_DESCRIPTIONS,
} from '@/lib/ai/intent-thresholds';
import type { QueryIntent } from '@/lib/ai/query-intent';

/**
 * Quick pattern definitions for instant responses
 */
interface QuickPattern {
  pattern: RegExp;
  response: string;
  category: 'greeting' | 'thanks' | 'bye' | 'help' | 'faq' | 'casual';
}

/**
 * Off-topic pattern definitions for fallback routing
 */
interface OffTopicPattern {
  pattern: RegExp;
  category: string;
}

/**
 * Router decision result
 */
export interface RouterDecision {
  route: QueryRoute;
  response?: string;
  clarifyQuestion?: string;
  confidence: number;
  processingTimeMs: number;
  matchedPattern?: string;
  category?: string;
}

/**
 * Query context for routing decisions
 */
export interface QueryContext {
  employeeId?: string;
  sessionId?: string;
  previousQuery?: string;
  hasPendingClarification?: boolean;
  confirmedPeriod?: string;
  confirmedTemplate?: string;
}

/**
 * Quick patterns for instant responses (Korean)
 * Expanded to handle honorific suffixes (요, 습니다, etc.)
 */
const QUICK_PATTERNS: QuickPattern[] = [
  // Greetings - expanded with Korean variations
  {
    pattern: /^(안녕|안녕하세요|안녕요|하이|헬로|반가워|반가워요|반갑습니다|반갑네요)[\s!?.]*$/i,
    response: `안녕하세요! 저는 수수료와 실적 관련 질문을 도와드려요.

이렇게 물어보세요:
• "내 수수료 알려줘"
• "이번 달 실적 확인해줘"
• "MDRT 달성률 얼마야?"

무엇이 궁금하세요?`,
    category: 'greeting',
  },
  {
    pattern: /^(좋은\s*(아침|오후|저녁))(이에요|입니다)?[\s!?.]*$/i,
    response: `안녕하세요! 좋은 하루 되세요.

수수료, 실적, MDRT 관련 질문을 도와드릴 수 있어요!`,
    category: 'greeting',
  },

  // Thanks - expanded with Korean variations
  {
    pattern: /^(고마워|고마워요|고맙습니다|감사|감사해|감사해요|감사합니다|땡큐|thank|thanks)[\s!?.]*$/i,
    response: '도움이 되셨다니 기쁩니다! 다른 질문이 있으시면 말씀해 주세요.',
    category: 'thanks',
  },

  // Goodbye - expanded with Korean variations
  {
    pattern: /^(잘가|잘가요|안녕히|안녕히요|바이|bye|굿바이|끝|종료|그만|수고|수고해|수고해요|수고하세요|수고했어요|수고하셨습니다)[\s!?.]*$/i,
    response: '감사합니다. 좋은 하루 되세요!',
    category: 'bye',
  },

  // Help requests - expanded
  {
    pattern: /^(도움|도와줘|도와주세요|뭐\s*할\s*수\s*있|무엇을?\s*할\s*수|help|도움이?\s*필요)[\s!?.해요]*$/i,
    response: `다음과 같은 것들을 도와드릴 수 있어요:

📊 **수수료 조회**
- "이번달 수수료 알려줘"
- "지난달 커미션 얼마야?"

📈 **MDRT 현황**
- "MDRT 달성률 알려줘"
- "COT까지 얼마 남았어?"

📅 **일정 확인**
- "이번주 일정 뭐야?"
- "다음달 중요 일정"

💡 궁금한 점을 자유롭게 물어보세요!`,
    category: 'help',
  },

  // Simple FAQs
  {
    pattern: /^(넌\s*누구|너\s*누구야|뭐야\s*넌|who\s*are\s*you)[\s!?.]*$/i,
    response:
      '저는 계약자허브 AI 어시스턴트입니다. 수수료, MDRT, 일정 등에 대해 도와드릴 수 있어요!',
    category: 'faq',
  },

  // Casual chat - new category for small talk
  {
    pattern: /^(뭐해|뭐해\?|뭐하세요|뭐\s*하고\s*있어)[\s!?.]*$/i,
    response: '저는 항상 여기서 대기하고 있어요! 수수료나 MDRT 관련해서 궁금한 게 있으시면 물어보세요.',
    category: 'casual',
  },
  {
    pattern: /^(잘\s*있어|잘\s*있어요|잘\s*지내|잘\s*지내요|잘\s*있니)[\s!?.]*$/i,
    response: '네, 저는 항상 여기 있어요! 도움이 필요하시면 말씀해 주세요.',
    category: 'casual',
  },
];

/**
 * Off-topic patterns for fallback routing
 * These queries are outside the system's domain (insurance/compensation)
 */
const OFF_TOPIC_PATTERNS: OffTopicPattern[] = [
  // Finance/Investment (not insurance)
  {
    pattern: /주식|코인|비트코인|이더리움|암호화폐|투자\s*추천|펀드\s*추천|부동산\s*투자|금\s*시세/i,
    category: 'investment',
  },
  // Weather
  {
    pattern: /날씨|기온|비\s*(오|올)|눈\s*(오|올)|일기\s*예보|우산/i,
    category: 'weather',
  },
  // Food/Restaurant
  {
    pattern: /점심|저녁|아침\s*메뉴|뭐\s*먹|맛집|음식|배달|치킨|피자|햄버거|식당|카페|커피숍/i,
    category: 'food',
  },
  // Entertainment
  {
    pattern: /영화|드라마|넷플릭스|유튜브|게임|음악|노래|콘서트|공연|전시/i,
    category: 'entertainment',
  },
  // Coding/Tech requests
  {
    pattern: /코드\s*작성|프로그래밍|코딩|개발\s*해|python|javascript|java|html|css/i,
    category: 'coding',
  },
  // Shopping/Orders
  {
    pattern: /주문|배송|쇼핑|쿠팡|마켓|구매\s*추천|가격\s*비교/i,
    category: 'shopping',
  },
  // Jokes/Entertainment
  {
    pattern: /농담|웃긴|재밌는|개그|유머|심심|놀아줘|심심해/i,
    category: 'entertainment',
  },
  // Translation/Language
  {
    pattern: /번역|영어로|한국어로|일본어|중국어|translate/i,
    category: 'translation',
  },
  // Health (non-insurance)
  {
    pattern: /다이어트|운동\s*추천|헬스|요가|건강\s*식품|영양제/i,
    category: 'health',
  },
  // Travel
  {
    pattern: /여행|항공권|호텔|숙소|관광|휴가|비행기/i,
    category: 'travel',
  },
];

/**
 * Clarification question templates based on missing context
 */
const CLARIFICATION_TEMPLATES = {
  missingPeriod: [
    '어느 기간의 정보를 찾으시나요? (예: 이번달, 2024년 1분기)',
    '언제 정보가 필요하신가요? 특정 월이나 분기를 말씀해 주세요.',
  ],
  missingTemplate: [
    '어떤 종류의 정보가 필요하신가요? (예: 수수료, MDRT 현황, 일정)',
    '수수료 관련인가요, MDRT 관련인가요, 아니면 다른 정보인가요?',
  ],
  ambiguous: [
    '좀 더 구체적으로 말씀해 주시겠어요?',
    '무엇에 대해 알고 싶으신지 조금 더 설명해 주실 수 있나요?',
  ],
  multipleIntents: [
    '여러 가지를 물어보신 것 같은데, 하나씩 답변드릴까요? 먼저 어떤 것이 궁금하세요?',
  ],
};

class QueryRouterService {
  /**
   * Route a query to the appropriate processing path
   */
  async route(query: string, context?: QueryContext): Promise<RouterDecision> {
    const startTime = Date.now();

    // Stage 0: Quick pattern matching for instant responses (< 10ms)
    const instantMatch = this.checkInstantMatch(query);
    if (instantMatch) {
      return {
        route: 'instant',
        response: instantMatch.response,
        confidence: 1.0,
        processingTimeMs: Date.now() - startTime,
        matchedPattern: instantMatch.pattern.source,
        category: instantMatch.category,
      };
    }

    // Stage 1: Off-topic detection for fallback routing
    const offTopicMatch = this.checkOffTopicMatch(query);
    if (offTopicMatch) {
      return {
        route: 'fallback',
        response: this.getOffTopicResponse(offTopicMatch.category),
        confidence: 0.9, // High confidence it's off-topic
        processingTimeMs: Date.now() - startTime,
        matchedPattern: offTopicMatch.pattern.source,
        category: offTopicMatch.category,
      };
    }

    // If there's a pending clarification, treat response differently
    if (context?.hasPendingClarification) {
      // Let the conversation state service handle merging
      return {
        route: 'rag',
        confidence: 0.8, // Boosted because user is responding to clarification
        processingTimeMs: Date.now() - startTime,
        category: 'clarification_response',
      };
    }

    // Stage 2: Check for ambiguous single-word domain queries
    const ambiguousMatch = this.checkAmbiguousDomainQuery(query);
    if (ambiguousMatch) {
      return {
        route: 'clarify',
        clarifyQuestion: ambiguousMatch.clarifyQuestion,
        confidence: 0.4,
        processingTimeMs: Date.now() - startTime,
        category: ambiguousMatch.category,
      };
    }

    // Stage 3: Check for very short or likely incomplete queries
    if (this.isLikelyIncomplete(query)) {
      return {
        route: 'clarify',
        clarifyQuestion: this.getRandomClarification('ambiguous'),
        confidence: 0.3,
        processingTimeMs: Date.now() - startTime,
        category: 'incomplete',
      };
    }

    // Default: proceed to intent understanding via RAG
    // The actual confidence will be determined by QueryUnderstandingService
    return {
      route: 'rag',
      confidence: 0.6, // Default medium confidence for unknown queries
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Make routing decision based on parsed intent
   */
  routeWithIntent(intent: QueryIntent): RouterDecision {
    const startTime = Date.now();
    const route = getRouteForConfidence(intent.confidence);

    const decision: RouterDecision = {
      route,
      confidence: intent.confidence,
      processingTimeMs: Date.now() - startTime,
    };

    // Add clarification question if needed
    if (route === 'clarify') {
      decision.clarifyQuestion = this.buildClarificationQuestion(intent);
    }

    // Add fallback response if confidence is too low
    if (route === 'fallback') {
      decision.response = this.getFallbackResponse();
    }

    return decision;
  }

  /**
   * Check for instant response patterns
   */
  private checkInstantMatch(query: string): QuickPattern | null {
    const normalizedQuery = query.trim();

    for (const pattern of QUICK_PATTERNS) {
      if (pattern.pattern.test(normalizedQuery)) {
        return pattern;
      }
    }

    return null;
  }

  /**
   * Check for off-topic patterns (fallback routing)
   */
  private checkOffTopicMatch(query: string): OffTopicPattern | null {
    const normalizedQuery = query.trim();

    for (const pattern of OFF_TOPIC_PATTERNS) {
      if (pattern.pattern.test(normalizedQuery)) {
        return pattern;
      }
    }

    return null;
  }

  /**
   * Generate contextual response for off-topic queries
   */
  private getOffTopicResponse(category: string): string {
    const categoryResponses: Record<string, string> = {
      investment: '죄송합니다, 투자나 주식 관련 정보는 제공하지 않아요. 수수료나 MDRT 관련 질문을 도와드릴 수 있어요!',
      weather: '날씨 정보는 제공하지 않아요. 수수료 조회나 실적 확인을 도와드릴까요?',
      food: '음식이나 맛집 정보는 제공하지 않아요. 대신 수수료나 계약 관련 질문을 도와드릴 수 있어요!',
      entertainment: '엔터테인먼트 정보는 제공하지 않아요. 수수료, MDRT, 일정 관련해서 도움이 필요하시면 말씀해 주세요!',
      coding: '코딩이나 개발 관련 질문은 도와드리기 어려워요. 보험 계약이나 수수료 관련 질문을 해주세요!',
      shopping: '쇼핑이나 배송 정보는 제공하지 않아요. 수수료나 실적 관련 질문을 도와드릴까요?',
      translation: '번역 서비스는 제공하지 않아요. 수수료 조회나 MDRT 현황 확인을 도와드릴 수 있어요!',
      health: '건강/운동 정보는 제공하지 않아요. 대신 보험 계약이나 수수료 관련 질문을 도와드릴게요!',
      travel: '여행 정보는 제공하지 않아요. 수수료나 실적 관련 질문을 도와드릴까요?',
    };

    return categoryResponses[category] || this.getFallbackResponse();
  }

  /**
   * Check for ambiguous domain-related queries that need clarification
   */
  private checkAmbiguousDomainQuery(query: string): { clarifyQuestion: string; category: string } | null {
    const trimmed = query.trim();

    // Ambiguous domain keywords that need more context
    const ambiguousDomainPatterns: Array<{
      pattern: RegExp;
      clarifyQuestion: string;
      category: string;
    }> = [
      {
        pattern: /^(수수료|커미션)[\s?!.]*$/i,
        clarifyQuestion: '수수료 관련해서 어떤 정보가 필요하세요?\n- 이번 달 수수료 확인\n- 특정 계약 수수료 조회\n- 수수료 계산 방법',
        category: 'compensation_ambiguous',
      },
      {
        pattern: /^(내역|명세)[\s?!.]*$/i,
        clarifyQuestion: '어떤 내역이 필요하세요?\n- 수수료 내역\n- 계약 내역\n- 지급 내역',
        category: 'history_ambiguous',
      },
      {
        pattern: /^(계약|보험)[\s?!.]*$/i,
        clarifyQuestion: '계약 관련해서 어떤 정보가 필요하세요?\n- 계약 건수 확인\n- 특정 계약 조회\n- 계약별 수수료',
        category: 'contract_ambiguous',
      },
      {
        pattern: /^(정보|확인|조회)(해줘|해주세요|해봐|좀)?[\s?!.]*$/i,
        clarifyQuestion: '어떤 정보를 확인하고 싶으세요?\n- 수수료 정보\n- MDRT 현황\n- 계약 정보',
        category: 'info_ambiguous',
      },
      {
        pattern: /^(얼마|금액|돈)(야|예요|인가요|이야)?[\s?!.]*$/i,
        clarifyQuestion: '어떤 금액이 궁금하세요?\n- 이번 달 수수료\n- 특정 계약 수수료\n- 목표 달성 금액',
        category: 'amount_ambiguous',
      },
      {
        pattern: /^(알려줘|알려주세요|알려줄래|알고\s*싶어|알려봐)[\s?!.]*$/i,
        clarifyQuestion: '무엇을 알려드릴까요?\n- 수수료 정보\n- MDRT 달성률\n- 일정 정보',
        category: 'request_ambiguous',
      },
    ];

    for (const { pattern, clarifyQuestion, category } of ambiguousDomainPatterns) {
      if (pattern.test(trimmed)) {
        return { clarifyQuestion, category };
      }
    }

    return null;
  }

  /**
   * Check if query is likely incomplete
   */
  private isLikelyIncomplete(query: string): boolean {
    const trimmed = query.trim();

    // Very short queries (1-2 characters that aren't greetings)
    if (trimmed.length <= 2) {
      return true;
    }

    // Just numbers or special characters
    if (/^[\d\s.,!?]+$/.test(trimmed)) {
      return true;
    }

    // Single word queries that aren't clear commands
    const singleWordPatterns = /^(뭐|어|음|아|그|저|이|것|거|뭐지|음)$/;
    if (singleWordPatterns.test(trimmed)) {
      return true;
    }

    // Single question mark or punctuation
    if (/^[?!.]+$/.test(trimmed)) {
      return true;
    }

    return false;
  }

  /**
   * Build contextual clarification question based on what's missing
   */
  buildClarificationQuestion(intent: Partial<QueryIntent>): string {
    // Check what's missing and prioritize
    if (!intent.filters?.period && this.needsPeriod(intent)) {
      return this.getRandomClarification('missingPeriod');
    }

    if (!intent.template || intent.template === 'general') {
      return this.getRandomClarification('missingTemplate');
    }

    return this.getRandomClarification('ambiguous');
  }

  /**
   * Check if the query type typically needs a period
   */
  private needsPeriod(intent: Partial<QueryIntent>): boolean {
    const periodRequiredIntents = ['direct_lookup', 'calculation', 'comparison'];
    return periodRequiredIntents.includes(intent.intent || '');
  }

  /**
   * Get a random clarification from templates
   */
  private getRandomClarification(
    type: keyof typeof CLARIFICATION_TEMPLATES
  ): string {
    const templates = CLARIFICATION_TEMPLATES[type];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Get fallback response for very low confidence queries
   */
  private getFallbackResponse(): string {
    return `죄송합니다, 질문을 이해하지 못했어요.

다음과 같이 질문해 보세요:
- "이번달 수수료 알려줘"
- "MDRT 달성률이 궁금해"
- "다음주 일정 뭐야?"

어떤 정보가 필요하신가요?`;
  }

  /**
   * Get route description for logging
   */
  getRouteDescription(route: QueryRoute): string {
    return ROUTE_DESCRIPTIONS[route];
  }

  /**
   * Check if route requires RAG processing
   */
  requiresRAG(route: QueryRoute): boolean {
    return route === 'rag';
  }

  /**
   * Check if route requires user interaction
   */
  requiresUserInteraction(route: QueryRoute): boolean {
    return route === 'clarify';
  }
}

// Export singleton instance
export const queryRouterService = new QueryRouterService();
