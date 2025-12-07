/**
 * Period Utility Functions
 *
 * Standardizes period format across the RAG system.
 * Single source of truth for period handling.
 *
 * CRITICAL: All period values MUST be stored in YYYYMM format (e.g., "202509")
 * This ensures consistent filtering between query and stored data.
 */

// Standard format: YYYYMM (e.g., "202509")
export const PERIOD_FORMAT = 'YYYYMM' as const;

/**
 * Normalize any period input to YYYYMM format
 *
 * Handles:
 * - Korean relative terms: "이번달", "지난달", "전월", "올해", "작년"
 * - English relative terms: "latest", "previous", "current_year", "last_year"
 * - YYYY-MM format: "2025-09" -> "202509"
 * - Month only: "9" or "09" -> "{currentYear}09"
 * - Already YYYYMM: "202509" -> "202509"
 *
 * @param input - Period string in various formats
 * @returns Period in YYYYMM format
 */
export function normalizePeriod(input: string): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Handle relative period terms
  const normalizedInput = input.toLowerCase().trim();

  switch (normalizedInput) {
    // Current month
    case 'latest':
    case '이번달':
    case '이번 달':
    case '현재':
    case '금월':
    case 'current':
    case 'this_month':
      return `${currentYear}${String(currentMonth).padStart(2, '0')}`;

    // Previous month
    case 'previous':
    case '지난달':
    case '지난 달':
    case '전월':
    case '전달':
    case 'last_month':
    case 'prev':
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      return `${prevYear}${String(prevMonth).padStart(2, '0')}`;

    // Current year
    case 'current_year':
    case '올해':
    case 'this_year':
      return String(currentYear);

    // Last year
    case 'last_year':
    case '작년':
    case '전년':
    case 'prev_year':
      return String(currentYear - 1);
  }

  // Remove any separators (-, /, .)
  const cleaned = input.replace(/[-\/.]/g, '');

  // Check if already in YYYYMM format
  if (/^\d{6}$/.test(cleaned)) {
    return cleaned;
  }

  // Check if YYYY-MM format (after cleaning: YYYYMM)
  if (/^\d{4}-\d{2}$/.test(input)) {
    return input.replace('-', '');
  }

  // Check if just a month number (1-12)
  if (/^\d{1,2}$/.test(input)) {
    const month = parseInt(input, 10);
    if (month >= 1 && month <= 12) {
      return `${currentYear}${String(month).padStart(2, '0')}`;
    }
  }

  // Check for Korean month patterns: "9월", "12월"
  const koreanMonthMatch = input.match(/(\d{1,2})월/);
  if (koreanMonthMatch) {
    const month = parseInt(koreanMonthMatch[1], 10);
    if (month >= 1 && month <= 12) {
      return `${currentYear}${String(month).padStart(2, '0')}`;
    }
  }

  // Check for year-month Korean patterns: "2025년 9월"
  const koreanFullMatch = input.match(/(\d{4})년\s*(\d{1,2})월/);
  if (koreanFullMatch) {
    const year = koreanFullMatch[1];
    const month = parseInt(koreanFullMatch[2], 10);
    return `${year}${String(month).padStart(2, '0')}`;
  }

  // Return cleaned or original if no pattern matched
  return cleaned || input;
}

/**
 * Format YYYYMM period for display in Korean
 *
 * @param period - Period in YYYYMM format
 * @returns Formatted string like "2025년 9월"
 */
export function formatPeriodForDisplay(period: string): string {
  if (!period) return '';

  // Handle year-only format
  if (/^\d{4}$/.test(period)) {
    return `${period}년`;
  }

  // Handle YYYYMM format
  if (/^\d{6}$/.test(period)) {
    const year = period.substring(0, 4);
    const month = parseInt(period.substring(4, 6), 10);
    return `${year}년 ${month}월`;
  }

  // Handle YYYY-MM format (legacy)
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split('-');
    return `${year}년 ${parseInt(month, 10)}월`;
  }

  return period;
}

/**
 * Get the current period in YYYYMM format
 *
 * @returns Current period like "202512"
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get the previous period in YYYYMM format
 *
 * @returns Previous month period like "202511"
 */
export function getPreviousPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  return `${prevYear}${String(prevMonth).padStart(2, '0')}`;
}

/**
 * Convert YYYYMM to YYYY-MM format (for legacy compatibility)
 *
 * @param period - Period in YYYYMM format
 * @returns Period in YYYY-MM format
 */
export function periodToISOFormat(period: string): string {
  if (/^\d{6}$/.test(period)) {
    return `${period.substring(0, 4)}-${period.substring(4, 6)}`;
  }
  return period;
}

/**
 * Convert YYYY-MM to YYYYMM format
 *
 * @param period - Period in YYYY-MM format
 * @returns Period in YYYYMM format
 */
export function periodFromISOFormat(period: string): string {
  if (/^\d{4}-\d{2}$/.test(period)) {
    return period.replace('-', '');
  }
  return period;
}

/**
 * Validate if a string is a valid period
 *
 * @param period - Period string to validate
 * @returns True if valid YYYYMM format with valid month
 */
export function isValidPeriod(period: string): boolean {
  if (!/^\d{6}$/.test(period)) {
    return false;
  }

  const month = parseInt(period.substring(4, 6), 10);
  return month >= 1 && month <= 12;
}

/**
 * Compare two periods
 *
 * @param a - First period in YYYYMM format
 * @param b - Second period in YYYYMM format
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function comparePeriods(a: string, b: string): number {
  const normalizedA = normalizePeriod(a);
  const normalizedB = normalizePeriod(b);
  return normalizedA.localeCompare(normalizedB);
}
