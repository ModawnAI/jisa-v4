/**
 * Commission Query Detector Service
 * Detects if a user query is related to insurance commission
 *
 * Migrated from: backend/src/services/commission-detector.service.ts
 */

import type { CommissionDetectionResult } from '@/lib/types/kakao';

const COMMISSION_KEYWORDS = [
  // Commission-related
  '수수료', '커미션', 'commission', '보험료', '수당',

  // Insurance types
  '종신보험', '변액연금', '건강보험', '실손보험', '암보험',
  '종신', '변액', '연금', '보험',

  // Common insurance products
  '약속플러스', '변액유니버셜', '무배당', '유니버셜', '어린이보험',

  // Companies
  'KB', '삼성', '미래에셋', '한화', '교보', '동양', '메트라이프',
  '처브', '라이나', '흥국', 'AIA', '푸르덴셜', 'DB',

  // Payment periods
  '년납', '일시납', '전기납', '평생납',

  // Percentage indicators
  '%', '프로', '퍼센트', '프로센트',
];

const STRONG_INDICATORS = ['수수료', '커미션', 'commission', '%', '프로'];

/**
 * Detect if a query is about commission
 */
export function detectCommissionQuery(query: string): CommissionDetectionResult {
  const queryLower = query.toLowerCase().trim();
  const matchedKeywords: string[] = [];
  let strongMatch = false;

  // Check for keyword matches
  for (const keyword of COMMISSION_KEYWORDS) {
    if (queryLower.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);

      if (STRONG_INDICATORS.some(strong => keyword.toLowerCase().includes(strong.toLowerCase()))) {
        strongMatch = true;
      }
    }
  }

  // Calculate confidence
  let confidence = 0.0;

  if (strongMatch) {
    confidence = 0.9;
  } else if (matchedKeywords.length >= 3) {
    confidence = 0.8;
  } else if (matchedKeywords.length >= 2) {
    confidence = 0.6;
  } else if (matchedKeywords.length === 1) {
    confidence = 0.3;
  }

  // Check for percentage patterns
  const percentagePattern = /(\d+)\s*[%프프로센트]/;
  if (percentagePattern.test(queryLower)) {
    confidence = Math.max(confidence, 0.85);
    matchedKeywords.push('percentage_indicator');
  }

  // Check for product + percentage combination
  const hasInsurance = matchedKeywords.some(k =>
    ['종신보험', '변액연금', '보험'].includes(k)
  );
  const hasPercentage = percentagePattern.test(queryLower);

  if (hasInsurance && hasPercentage) {
    confidence = 0.95;
  }

  const isCommissionQuery = confidence >= 0.5;

  let reasoning: string;
  if (isCommissionQuery) {
    reasoning = `발견된 키워드: ${matchedKeywords.join(', ')}. `;
    if (strongMatch) {
      reasoning += '강한 수수료 관련 키워드 발견.';
    } else if (hasInsurance && hasPercentage) {
      reasoning += '보험 상품과 퍼센트 조합 발견.';
    } else {
      reasoning += `${matchedKeywords.length}개의 관련 키워드 발견.`;
    }
  } else {
    reasoning = '수수료 관련 키워드가 충분하지 않음.';
  }

  return {
    isCommissionQuery,
    confidence,
    matchedKeywords,
    reasoning,
  };
}
