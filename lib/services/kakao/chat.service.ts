/**
 * Chat Service - Main Orchestrator
 * Routes queries to either Commission System, RAG System, or Employee RAG System
 *
 * Migrated from: backend/src/services/chat.service.ts
 */

import { GoogleGenAI } from '@google/genai';
import { detectCommissionQuery } from './commission-detector.service';
import { ragAnswer, ragAnswerWithRBAC } from './rag.service';
import { isEmployeeRAGQuery, cleanEmployeeRAGQuery, queryEmployeeRAG, getEmployeeInfo } from './employee-rag.service';
import type { CommissionResult } from '@/lib/types/kakao';

// Lazy initialization of Gemini client
let genaiClient: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI {
  if (!genaiClient) {
    genaiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return genaiClient;
}

/**
 * Format commission result as context for GPT (plain text, no technical details)
 */
export function formatCommissionForGPT(result: CommissionResult): string {
  if (result.status === 'error') {
    return `수수료 조회 오류: ${result.message || '수수료 정보를 찾을 수 없습니다.'}`;
  }

  if (!result.best_match || !result.commission_data) {
    return '수수료 정보를 찾을 수 없습니다.';
  }

  const lines: string[] = [];

  // Best match product
  const bestMatch = result.best_match;
  lines.push('=== 수수료 조회 결과 ===');
  lines.push('');
  lines.push(`상품명: ${bestMatch.product_name}`);
  lines.push(`보험회사: ${bestMatch.company}`);
  lines.push(`납입기간: ${bestMatch.payment_period}`);

  // Add 환산율 (conversion rate) if available - CONVERT TO PERCENTAGE
  const metadata = bestMatch.metadata || {};
  if (metadata['환산율']) {
    const conversionRate = parseFloat(String(metadata['환산율']));
    const conversionRatePercent = (conversionRate * 100).toFixed(2);
    lines.push(`환산율: ${conversionRatePercent}%`);
  }

  lines.push('');

  // Commission data - NO 배율, NO 공식
  const commData = result.commission_data;
  const percentage = result.percentage || 60;
  lines.push(`수수료율 (${percentage}% 기준):`);
  lines.push('');

  // Commission rates details - FILTER OUT col_X and only show meaningful keys
  const rates = Object.entries(commData.product.commission_rates);

  // Filter out technical column names
  const meaningfulRates = rates.filter(([key]) => {
    return !key.startsWith('col_') && !key.startsWith('Col_');
  });

  // Show only meaningful rates with cleaner key names - CONVERT TO PERCENTAGE
  for (const [key, value] of meaningfulRates.slice(0, 10)) {
    // Clean up key name
    let cleanKey = key;
    if (cleanKey.includes('_0.6_0.6_')) {
      cleanKey = cleanKey.split('_0.6_0.6_').pop() || cleanKey;
    }
    if (cleanKey.includes('2025년 FC 수수료_')) {
      cleanKey = cleanKey.replace('2025년 FC 수수료_', '');
    }

    // CRITICAL: Convert decimal to percentage (0.78 -> 78%, 3.7714 -> 377.14%)
    const percentValue = ((value as number) * 100).toFixed(2);
    lines.push(`${cleanKey}: ${percentValue}%`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Placeholder commission query function
 * In production, this would connect to the actual commission system
 */
async function queryCommission(userQuery: string): Promise<CommissionResult> {
  // Log that commission query was detected but system not integrated
  console.log(`[Commission] Query detected: ${userQuery}`);

  // Placeholder - return error to fallback to RAG
  return {
    status: 'error',
    message: 'Commission system - fallback to RAG for now',
  };
}

/**
 * Main chat handler - routes to appropriate system
 * Now supports RBAC filtering when userId is provided
 */
export async function getTextFromGPT(prompt: string, userId?: string | null): Promise<string> {
  try {
    console.log('='.repeat(80));

    // Step 0: Check for Employee RAG query (personal keywords detected)
    // Only route to employee RAG if user has RAG enabled
    if (userId && isEmployeeRAGQuery(prompt)) {
      // Check if user has employee RAG enabled
      const employeeInfo = await getEmployeeInfo(userId);

      if (employeeInfo?.ragEnabled && employeeInfo?.pineconeNamespace) {
        console.log('[Chat] Routing to EMPLOYEE RAG SYSTEM (personal query + RAG enabled)');

        try {
          const cleanQuery = cleanEmployeeRAGQuery(prompt);
          console.log(`[Chat] Cleaned query: ${cleanQuery}`);

          const result = await queryEmployeeRAG({
            userId,
            query: cleanQuery,
            topK: 10,
          });

          return result.answer;
        } catch (error) {
          console.error('[Chat] Employee RAG error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          if (errorMessage.includes('not found')) {
            return '직원 정보를 찾을 수 없습니다. 관리자에게 문의해주세요.';
          }

          if (errorMessage.includes('not enabled')) {
            return 'RAG 시스템이 활성화되지 않았습니다. 관리자에게 문의해주세요.';
          }

          return `급여 정보 조회 중 오류가 발생했습니다: ${errorMessage}`;
        }
      } else {
        console.log('[Chat] Personal query detected but user has no employee RAG - routing to general RAG');
      }
    }

    console.log('[Chat] Step 1: Commission Detection');

    const detection = detectCommissionQuery(prompt);

    console.log(`[Chat] Is Commission: ${detection.isCommissionQuery}`);
    console.log(`[Chat] Confidence: ${detection.confidence.toFixed(2)}`);
    console.log('='.repeat(80));

    // Route to Commission System
    if (detection.isCommissionQuery && detection.confidence >= 0.5) {
      console.log('[Chat] Routing to COMMISSION SYSTEM');

      try {
        const commissionResult = await queryCommission(prompt);

        // If commission system returned error, fallback to RAG
        if (commissionResult.status === 'error') {
          console.log('[Chat] Commission fallback to RAG...');
          // Fall through to RAG
        } else {
          const context = formatCommissionForGPT(commissionResult);

          const systemPrompt = `너는 한국 보험 수수료 전문가 AI입니다.
참조 정보: ${context}

ULTRA CRITICAL 수수료 데이터 처리 규칙:

절대 금지:
- 컬럼 이름 언급 금지: col_8, col_19 같은 기술 용어 사용 금지
- 계산/공식 언급 금지: "배율", "계산식", "×" 사용 금지
- 소수점 형식 금지: 절대로 소수점 형태로 표시하지 마세요
- 기술 설명 금지: 데이터 구조 설명 금지
- "퍼센트"라는 단어 사용 금지: 반드시 "%" 기호만 사용

CRITICAL 백분율 표시 규칙:
참조 정보에 있는 모든 숫자는 이미 백분율로 변환되어 "%" 기호가 붙어 있습니다.
- 이미 변환된 값: 78%, 377.14%, 628.56% 등
- 절대 해야 할 것: 그대로 복사해서 표시 (78% -> 78%, 377.14% -> 377.14%)
- 절대 하지 말아야 할 것:
  X "78퍼센트"라고 쓰지 마세요
  X "0.78%"로 바꾸지 마세요
  X 숫자를 다시 계산하지 마세요
  X "퍼센트"라는 단어를 사용하지 마세요

올바른 예시:
- 참조 정보: "초년도: 377.14%" -> 답변: "초년도 377.14%"
- 참조 정보: "환산율: 78%" -> 답변: "환산율 78%"
- 참조 정보: "합산: 628.56%" -> 답변: "합산 628.56%"

잘못된 예시 (절대 금지):
- "377.14퍼센트" <- 틀림!
- "78퍼센트" <- 틀림!
- "0.78%" <- 틀림!

필수 처리:
- 간결하게: 상품명, 회사, 주요 수수료율만 표시
- 있는 정보만: 없는 정보는 "해당 정보 없음"이라고만 표시
- 퍼센트 표시: 반드시 "%" 기호 사용, "퍼센트" 단어 절대 사용 금지

출력 형식:
- 순수 텍스트만 사용하세요
- 마크다운 기호를 절대 사용하지 마세요 (**, ##, *, -, [], (), | 등 모두 금지)
- 표 형식 금지: 표를 만들지 마세요
- 목록은 간단한 번호나 기호로만 표시: "1. ", "2. ", "• " 등
- 강조가 필요한 경우 대문자나 줄바꿈으로 표현하세요
- 들여쓰기와 줄바꿈만으로 구조를 표현하세요

다시 한번 강조: 참조 정보의 모든 숫자 뒤에 이미 "%"가 붙어 있습니다. 그대로 복사하세요. "퍼센트"라는 단어를 절대 사용하지 마세요.`;

          const genai = getGenAIClient();
          const response = await genai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `${systemPrompt}\n\n질문: ${prompt}`,
          });

          return response.text || '';
        }
      } catch (error) {
        console.error('[Chat] Commission system error:', error);
        console.log('[Chat] Fallback to RAG...');
        // Fallthrough to RAG
      }
    }

    // Route to RAG System with RBAC
    console.log('[Chat] Routing to RAG SYSTEM (RBAC-enabled)');

    // Use RBAC-enabled RAG if userId is provided
    if (userId) {
      console.log(`[Chat] Using RBAC-filtered RAG for user: ${userId}`);
      return await ragAnswerWithRBAC(prompt, userId, 10);
    } else {
      console.log('[Chat] Using standard RAG (public content only)');
      // For backward compatibility, use standard RAG for unauthenticated
      return await ragAnswer(prompt, 10);
    }
  } catch (error) {
    console.error('[Chat] Error:', error);
    return '죄송합니다. 응답 생성 중 오류가 발생했습니다.';
  }
}

const chatService = {
  getTextFromGPT,
  formatCommissionForGPT,
};

export default chatService;
