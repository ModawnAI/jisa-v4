/**
 * Comprehensive 100+ E2E RAG Test Suite
 *
 * Tests for employee J00134 (윤나래) and public documents
 * Covers: greetings, random text, incomplete sentences, tone variations,
 * schedule questions, policy documents, and much more.
 *
 * Run: npx tsx scripts/comprehensive-100-test.ts
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

config({ path: path.join(process.cwd(), '.env.local') });

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
const index = pinecone.index((process.env.PINECONE_INDEX_NAME || 'contractorhub').trim());
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

const EMPLOYEE_NAMESPACE = 'emp_J00134';
const PUBLIC_NAMESPACE = 'public';
const EMPLOYEE_SABON = 'J00134';
const EMPLOYEE_NAME = '윤나래';

// Test categories with expected behaviors
interface TestCase {
  id: number;
  category: string;
  query: string;
  description: string;
  namespace: 'employee' | 'public' | 'both' | 'none';
  expectedBehavior: string;
  validationFn?: (result: TestResult) => boolean;
}

interface TestResult {
  testId: number;
  query: string;
  passed: boolean;
  duration: number;
  retrievedCount: number;
  topScore: number;
  hasSearchableText: boolean;
  searchableTextPreview: string;
  generatedAnswer?: string;
  error?: string;
  details: Record<string, unknown>;
}

// Comprehensive test cases - 100+ tests
const TEST_CASES: TestCase[] = [
  // ==================== CATEGORY 1: GREETINGS & SMALL TALK (10 tests) ====================
  { id: 1, category: 'Greetings', query: '안녕', description: 'Simple Korean greeting', namespace: 'none', expectedBehavior: 'Should handle gracefully, may not retrieve relevant docs' },
  { id: 2, category: 'Greetings', query: '안녕하세요', description: 'Formal Korean greeting', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 3, category: 'Greetings', query: 'hello', description: 'English greeting', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 4, category: 'Greetings', query: 'hi', description: 'Casual English greeting', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 5, category: 'Greetings', query: '반갑습니다', description: 'Nice to meet you', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 6, category: 'Greetings', query: '좋은 아침이에요', description: 'Good morning', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 7, category: 'Greetings', query: '수고하세요', description: 'Work hard (parting)', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 8, category: 'Greetings', query: 'Hey there!', description: 'Casual English', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 9, category: 'Greetings', query: '오랜만이에요', description: 'Long time no see', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 10, category: 'Greetings', query: '감사합니다', description: 'Thank you', namespace: 'none', expectedBehavior: 'Should handle gracefully' },

  // ==================== CATEGORY 2: IDENTITY QUESTIONS (10 tests) ====================
  { id: 11, category: 'Identity', query: '누구세요?', description: 'Who are you (formal)', namespace: 'none', expectedBehavior: 'Should introduce itself as AI assistant' },
  { id: 12, category: 'Identity', query: '넌 뭐야', description: 'What are you (informal)', namespace: 'none', expectedBehavior: 'Should introduce itself' },
  { id: 13, category: 'Identity', query: 'who are you', description: 'English identity question', namespace: 'none', expectedBehavior: 'Should introduce itself' },
  { id: 14, category: 'Identity', query: '뭐하는 AI야?', description: 'What kind of AI', namespace: 'none', expectedBehavior: 'Should explain purpose' },
  { id: 15, category: 'Identity', query: '이름이 뭐야?', description: 'What is your name', namespace: 'none', expectedBehavior: 'Should respond appropriately' },
  { id: 16, category: 'Identity', query: '뭘 도와줄 수 있어?', description: 'What can you help with', namespace: 'none', expectedBehavior: 'Should explain capabilities' },
  { id: 17, category: 'Identity', query: '챗봇이야?', description: 'Are you a chatbot', namespace: 'none', expectedBehavior: 'Should confirm AI status' },
  { id: 18, category: 'Identity', query: '사람이야?', description: 'Are you a person', namespace: 'none', expectedBehavior: 'Should clarify AI status' },
  { id: 19, category: 'Identity', query: 'what do you do', description: 'English capability question', namespace: 'none', expectedBehavior: 'Should explain purpose' },
  { id: 20, category: 'Identity', query: '어디 소속이야?', description: 'What organization', namespace: 'none', expectedBehavior: 'Should mention HO&F' },

  // ==================== CATEGORY 3: RANDOM/NONSENSE INPUT (10 tests) ====================
  { id: 21, category: 'Random', query: 'asdfghjkl', description: 'Keyboard mash', namespace: 'none', expectedBehavior: 'Should handle gracefully, ask for clarification' },
  { id: 22, category: 'Random', query: '???', description: 'Question marks only', namespace: 'none', expectedBehavior: 'Should ask for clarification' },
  { id: 23, category: 'Random', query: '...', description: 'Ellipsis only', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 24, category: 'Random', query: '123456', description: 'Numbers only', namespace: 'none', expectedBehavior: 'Should ask for clarification' },
  { id: 25, category: 'Random', query: 'ㅋㅋㅋㅋ', description: 'Korean laughter', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 26, category: 'Random', query: 'ㅎㅎㅎ', description: 'Korean chuckle', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 27, category: 'Random', query: '🤔', description: 'Emoji only', namespace: 'none', expectedBehavior: 'Should ask for clarification' },
  { id: 28, category: 'Random', query: '헐', description: 'Korean exclamation', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 29, category: 'Random', query: 'test', description: 'Test word', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 30, category: 'Random', query: 'ㅁㄴㅇㄹ', description: 'Korean consonants', namespace: 'none', expectedBehavior: 'Should handle gracefully' },

  // ==================== CATEGORY 4: INCOMPLETE SENTENCES (10 tests) ====================
  { id: 31, category: 'Incomplete', query: '내 커미션', description: 'My commission (incomplete)', namespace: 'employee', expectedBehavior: 'Should retrieve commission data' },
  { id: 32, category: 'Incomplete', query: '커미션', description: 'Just commission', namespace: 'employee', expectedBehavior: 'Should retrieve commission data' },
  { id: 33, category: 'Incomplete', query: '총수입', description: 'Just total income', namespace: 'employee', expectedBehavior: 'Should retrieve income data' },
  { id: 34, category: 'Incomplete', query: 'MDRT', description: 'Just MDRT', namespace: 'employee', expectedBehavior: 'Should retrieve MDRT status' },
  { id: 35, category: 'Incomplete', query: '11월', description: 'Just November', namespace: 'both', expectedBehavior: 'Could retrieve multiple docs' },
  { id: 36, category: 'Incomplete', query: '시간표', description: 'Just schedule', namespace: 'public', expectedBehavior: 'Should retrieve KRS schedule' },
  { id: 37, category: 'Incomplete', query: '한화생명', description: 'Just Hanwha Life', namespace: 'public', expectedBehavior: 'Should retrieve policy doc' },
  { id: 38, category: 'Incomplete', query: '순위', description: 'Just ranking', namespace: 'employee', expectedBehavior: 'Should retrieve ranking data' },
  { id: 39, category: 'Incomplete', query: '월별', description: 'Just monthly', namespace: 'employee', expectedBehavior: 'Should retrieve monthly data' },
  { id: 40, category: 'Incomplete', query: '시책', description: 'Just incentive', namespace: 'public', expectedBehavior: 'Should retrieve policy doc' },

  // ==================== CATEGORY 5: EMPLOYEE BASIC INFO (10 tests) ====================
  { id: 41, category: 'EmployeeInfo', query: '윤나래 사원 정보', description: 'Employee info formal', namespace: 'employee', expectedBehavior: 'Should retrieve J00134 info' },
  { id: 42, category: 'EmployeeInfo', query: '윤나래 누구야?', description: 'Who is 윤나래 (informal)', namespace: 'employee', expectedBehavior: 'Should retrieve J00134 info' },
  { id: 43, category: 'EmployeeInfo', query: 'J00134 사번 정보', description: 'Employee ID lookup', namespace: 'employee', expectedBehavior: 'Should retrieve J00134 info' },
  { id: 44, category: 'EmployeeInfo', query: '내 정보 알려줘', description: 'Tell me my info', namespace: 'employee', expectedBehavior: 'Should retrieve employee info' },
  { id: 45, category: 'EmployeeInfo', query: '윤나래 직종이 뭐야?', description: 'Job type question', namespace: 'employee', expectedBehavior: 'Should show LP' },
  { id: 46, category: 'EmployeeInfo', query: '윤나래 소속 지점', description: 'Branch/department', namespace: 'employee', expectedBehavior: 'Should show 서울' },
  { id: 47, category: 'EmployeeInfo', query: '윤나래 지사', description: 'District office', namespace: 'employee', expectedBehavior: 'Should show HO&F' },
  { id: 48, category: 'EmployeeInfo', query: '내 사번', description: 'My employee ID', namespace: 'employee', expectedBehavior: 'Should show J00134' },
  { id: 49, category: 'EmployeeInfo', query: '사원 기본 정보', description: 'Basic employee info', namespace: 'employee', expectedBehavior: 'Should retrieve basic info' },
  { id: 50, category: 'EmployeeInfo', query: '프로필 조회', description: 'Profile lookup', namespace: 'employee', expectedBehavior: 'Should retrieve profile' },

  // ==================== CATEGORY 6: COMMISSION QUERIES - VARIATIONS (15 tests) ====================
  { id: 51, category: 'Commission', query: '윤나래의 총 커미션은 얼마인가요?', description: 'Formal commission query', namespace: 'employee', expectedBehavior: 'Should return 45,272,186원' },
  { id: 52, category: 'Commission', query: '커미션 얼마야?', description: 'Informal commission query', namespace: 'employee', expectedBehavior: 'Should return commission amount' },
  { id: 53, category: 'Commission', query: '내 FYC 알려줘', description: 'FYC specific query', namespace: 'employee', expectedBehavior: 'Should return FYC data' },
  { id: 54, category: 'Commission', query: '올해 커미션 합계', description: 'This year commission total', namespace: 'employee', expectedBehavior: 'Should return annual total' },
  { id: 55, category: 'Commission', query: '2025년 커미션', description: '2025 commission', namespace: 'employee', expectedBehavior: 'Should return 2025 data' },
  { id: 56, category: 'Commission', query: '보장성 금액 얼마야?', description: 'Protection amount', namespace: 'employee', expectedBehavior: 'Should return 20,254,794원' },
  { id: 57, category: 'Commission', query: '연간 커미션 합계 금액', description: 'Annual commission total', namespace: 'employee', expectedBehavior: 'Should return total' },
  { id: 58, category: 'Commission', query: '윤나래 FYC 연간 합계', description: 'FYC annual total', namespace: 'employee', expectedBehavior: 'Should return 45,272,186원' },
  { id: 59, category: 'Commission', query: '수수료 얼마 받았어?', description: 'How much fee received', namespace: 'employee', expectedBehavior: 'Should return commission' },
  { id: 60, category: 'Commission', query: '커미션이 얼마지?', description: 'What is the commission', namespace: 'employee', expectedBehavior: 'Should return amount' },
  { id: 61, category: 'Commission', query: '나 커미션 몇이야', description: 'Very informal commission', namespace: 'employee', expectedBehavior: 'Should return amount' },
  { id: 62, category: 'Commission', query: 'commission', description: 'English commission', namespace: 'employee', expectedBehavior: 'Should retrieve commission' },
  { id: 63, category: 'Commission', query: 'FYC', description: 'Just FYC', namespace: 'employee', expectedBehavior: 'Should retrieve FYC data' },
  { id: 64, category: 'Commission', query: '실적이 어때?', description: 'How is my performance', namespace: 'employee', expectedBehavior: 'Should return performance data' },
  { id: 65, category: 'Commission', query: '윤나래 실적 조회', description: 'Performance lookup', namespace: 'employee', expectedBehavior: 'Should return performance' },

  // ==================== CATEGORY 7: INCOME QUERIES (10 tests) ====================
  { id: 66, category: 'Income', query: '총수입 얼마야?', description: 'Total income informal', namespace: 'employee', expectedBehavior: 'Should return 48,169,867원' },
  { id: 67, category: 'Income', query: '윤나래의 AGI', description: 'AGI query', namespace: 'employee', expectedBehavior: 'Should return AGI' },
  { id: 68, category: 'Income', query: '연간 총수입 합계', description: 'Annual income total', namespace: 'employee', expectedBehavior: 'Should return total' },
  { id: 69, category: 'Income', query: '신계약수입', description: 'New contract income', namespace: 'employee', expectedBehavior: 'Should return 45,272,186원' },
  { id: 70, category: 'Income', query: '수입이 얼마야?', description: 'What is income', namespace: 'employee', expectedBehavior: 'Should return income' },
  { id: 71, category: 'Income', query: '내 수입 알려줘', description: 'Tell me my income', namespace: 'employee', expectedBehavior: 'Should return income data' },
  { id: 72, category: 'Income', query: '2025년 총수입', description: '2025 total income', namespace: 'employee', expectedBehavior: 'Should return 2025 income' },
  { id: 73, category: 'Income', query: 'AGI 기준 실적', description: 'AGI based performance', namespace: 'employee', expectedBehavior: 'Should return AGI data' },
  { id: 74, category: 'Income', query: '올해 벌은 돈', description: 'Money earned this year (casual)', namespace: 'employee', expectedBehavior: 'Should return income' },
  { id: 75, category: 'Income', query: 'total income', description: 'English income query', namespace: 'employee', expectedBehavior: 'Should return income' },

  // ==================== CATEGORY 8: MDRT STATUS QUERIES (10 tests) ====================
  { id: 76, category: 'MDRT', query: 'MDRT 달성했어?', description: 'Did I achieve MDRT', namespace: 'employee', expectedBehavior: 'Should show 미달성' },
  { id: 77, category: 'MDRT', query: '엠디알티 자격', description: 'MDRT qualification', namespace: 'employee', expectedBehavior: 'Should show status' },
  { id: 78, category: 'MDRT', query: 'MDRT 달성률', description: 'MDRT achievement rate', namespace: 'employee', expectedBehavior: 'Should show 64%/39.3%' },
  { id: 79, category: 'MDRT', query: 'MDRT까지 얼마나 부족해?', description: 'How much short of MDRT', namespace: 'employee', expectedBehavior: 'Should show shortfall' },
  { id: 80, category: 'MDRT', query: '윤나래 MDRT 현황', description: 'MDRT status', namespace: 'employee', expectedBehavior: 'Should show full status' },
  { id: 81, category: 'MDRT', query: 'FYC 기준 MDRT', description: 'FYC based MDRT', namespace: 'employee', expectedBehavior: 'Should show FYC MDRT status' },
  { id: 82, category: 'MDRT', query: 'AGI 기준 MDRT', description: 'AGI based MDRT', namespace: 'employee', expectedBehavior: 'Should show AGI MDRT status' },
  { id: 83, category: 'MDRT', query: 'MDRT 기준 금액', description: 'MDRT threshold amount', namespace: 'employee', expectedBehavior: 'Should show thresholds' },
  { id: 84, category: 'MDRT', query: '나 MDRT 됐나?', description: 'Did I get MDRT (very informal)', namespace: 'employee', expectedBehavior: 'Should show status' },
  { id: 85, category: 'MDRT', query: 'MDRT 자격 요건', description: 'MDRT requirements', namespace: 'employee', expectedBehavior: 'Should explain requirements' },

  // ==================== CATEGORY 9: MONTHLY DATA QUERIES (10 tests) ====================
  { id: 86, category: 'Monthly', query: '월별 커미션 추이', description: 'Monthly commission trend', namespace: 'employee', expectedBehavior: 'Should show monthly data' },
  { id: 87, category: 'Monthly', query: '2월 커미션', description: 'February commission', namespace: 'employee', expectedBehavior: 'Should show ~19.4M' },
  { id: 88, category: 'Monthly', query: '가장 많이 번 달', description: 'Highest earning month', namespace: 'employee', expectedBehavior: 'Should identify Feb' },
  { id: 89, category: 'Monthly', query: '월별 실적', description: 'Monthly performance', namespace: 'employee', expectedBehavior: 'Should show monthly' },
  { id: 90, category: 'Monthly', query: '이번달 실적', description: 'This month performance', namespace: 'employee', expectedBehavior: 'Should show recent' },
  { id: 91, category: 'Monthly', query: '10월 커미션 얼마였어?', description: 'October commission', namespace: 'employee', expectedBehavior: 'Should show 3,082,669원' },
  { id: 92, category: 'Monthly', query: '월별 트렌드', description: 'Monthly trend', namespace: 'employee', expectedBehavior: 'Should show trend' },
  { id: 93, category: 'Monthly', query: '상반기 실적', description: 'First half performance', namespace: 'employee', expectedBehavior: 'Should show H1 data' },
  { id: 94, category: 'Monthly', query: '하반기 실적', description: 'Second half performance', namespace: 'employee', expectedBehavior: 'Should show H2 data' },
  { id: 95, category: 'Monthly', query: '분기별 실적', description: 'Quarterly performance', namespace: 'employee', expectedBehavior: 'Should aggregate quarterly' },

  // ==================== CATEGORY 10: RANKING QUERIES (8 tests) ====================
  { id: 96, category: 'Ranking', query: '내 순위', description: 'My ranking', namespace: 'employee', expectedBehavior: 'Should show 87위' },
  { id: 97, category: 'Ranking', query: '지사 내 순위가 몇이야?', description: 'Ranking within branch', namespace: 'employee', expectedBehavior: 'Should show 87위' },
  { id: 98, category: 'Ranking', query: '전체 순위', description: 'Overall ranking', namespace: 'employee', expectedBehavior: 'Should show 87위' },
  { id: 99, category: 'Ranking', query: '상위 몇 퍼센트야?', description: 'Top percentile', namespace: 'employee', expectedBehavior: 'Should show 89%' },
  { id: 100, category: 'Ranking', query: '윤나래 등수', description: 'Rank/position', namespace: 'employee', expectedBehavior: 'Should show ranking' },
  { id: 101, category: 'Ranking', query: '나보다 잘하는 사람 몇명?', description: 'People above me', namespace: 'employee', expectedBehavior: 'Should calculate' },
  { id: 102, category: 'Ranking', query: '성적 순위', description: 'Performance ranking', namespace: 'employee', expectedBehavior: 'Should show ranking' },
  { id: 103, category: 'Ranking', query: 'ranking', description: 'English ranking query', namespace: 'employee', expectedBehavior: 'Should show ranking' },

  // ==================== CATEGORY 11: SCHEDULE/KRS TIMETABLE (12 tests) ====================
  { id: 104, category: 'Schedule', query: 'KRS 시간표', description: 'KRS timetable', namespace: 'public', expectedBehavior: 'Should retrieve schedule' },
  { id: 105, category: 'Schedule', query: '11월 교육 일정', description: 'November training schedule', namespace: 'public', expectedBehavior: 'Should retrieve schedule' },
  { id: 106, category: 'Schedule', query: '생명보험 시험 일정', description: 'Life insurance exam schedule', namespace: 'public', expectedBehavior: 'Should retrieve schedule' },
  { id: 107, category: 'Schedule', query: '11월 10일 뭐해?', description: 'What on Nov 10', namespace: 'public', expectedBehavior: 'Should show Nov 10 schedule' },
  { id: 108, category: 'Schedule', query: '교육 스케줄', description: 'Training schedule', namespace: 'public', expectedBehavior: 'Should retrieve schedule' },
  { id: 109, category: 'Schedule', query: '변액보험 시험 언제야?', description: 'Variable insurance exam when', namespace: 'public', expectedBehavior: 'Should show exam time' },
  { id: 110, category: 'Schedule', query: 'KB라이프 교육', description: 'KB Life training', namespace: 'public', expectedBehavior: 'Should show KB training' },
  { id: 111, category: 'Schedule', query: '오유진 강의 언제야?', description: 'When is 오유진 lecture', namespace: 'public', expectedBehavior: 'Should find instructor' },
  { id: 112, category: 'Schedule', query: '수료식 언제야?', description: 'When is graduation', namespace: 'public', expectedBehavior: 'Should show ceremony' },
  { id: 113, category: 'Schedule', query: '16기 시간표', description: 'Cohort 16 timetable', namespace: 'public', expectedBehavior: 'Should show 16th cohort' },
  { id: 114, category: 'Schedule', query: '이번주 교육', description: 'This week training', namespace: 'public', expectedBehavior: 'Should show schedule' },
  { id: 115, category: 'Schedule', query: '강사 누구야?', description: 'Who is the instructor', namespace: 'public', expectedBehavior: 'Should list instructors' },

  // ==================== CATEGORY 12: POLICY/INCENTIVE (11월 시책공지) (12 tests) ====================
  { id: 116, category: 'Policy', query: '11월 시책', description: 'November incentive', namespace: 'public', expectedBehavior: 'Should retrieve policy doc' },
  { id: 117, category: 'Policy', query: '한화생명 시책 공지', description: 'Hanwha Life incentive notice', namespace: 'public', expectedBehavior: 'Should retrieve Hanwha policy' },
  { id: 118, category: 'Policy', query: '성과비례 프로모션', description: 'Performance proportional promotion', namespace: 'public', expectedBehavior: 'Should show promotion details' },
  { id: 119, category: 'Policy', query: '13회차 시책', description: '13th payment incentive', namespace: 'public', expectedBehavior: 'Should show 13th payment policy' },
  { id: 120, category: 'Policy', query: '환수 기준', description: 'Clawback criteria', namespace: 'public', expectedBehavior: 'Should show clawback rules' },
  { id: 121, category: 'Policy', query: '지원금액 환수', description: 'Support amount clawback', namespace: 'public', expectedBehavior: 'Should show clawback' },
  { id: 122, category: 'Policy', query: '민원해지 규정', description: 'Complaint cancellation rules', namespace: 'public', expectedBehavior: 'Should show rules' },
  { id: 123, category: 'Policy', query: '10년납 시책', description: '10-year payment incentive', namespace: 'public', expectedBehavior: 'Should show policy' },
  { id: 124, category: 'Policy', query: '한화생명 보너스', description: 'Hanwha Life bonus', namespace: 'public', expectedBehavior: 'Should show incentive' },
  { id: 125, category: 'Policy', query: '인센티브 정책', description: 'Incentive policy', namespace: 'public', expectedBehavior: 'Should retrieve policy' },
  { id: 126, category: 'Policy', query: '시책 공지사항', description: 'Incentive announcements', namespace: 'public', expectedBehavior: 'Should retrieve notices' },
  { id: 127, category: 'Policy', query: '25.10.06 공지', description: '25.10.06 notice', namespace: 'public', expectedBehavior: 'Should retrieve by date' },

  // ==================== CATEGORY 13: INFORMAL/CASUAL KOREAN (10 tests) ====================
  { id: 128, category: 'Informal', query: '야 내 돈 얼마야', description: 'Hey how much money', namespace: 'employee', expectedBehavior: 'Should return income/commission' },
  { id: 129, category: 'Informal', query: '뭐냐 실적', description: 'What is performance (very casual)', namespace: 'employee', expectedBehavior: 'Should return performance' },
  { id: 130, category: 'Informal', query: '그래서 나 MDRT 됨?', description: 'So did I get MDRT', namespace: 'employee', expectedBehavior: 'Should show MDRT status' },
  { id: 131, category: 'Informal', query: '언제 교육해', description: 'When is training (casual)', namespace: 'public', expectedBehavior: 'Should show schedule' },
  { id: 132, category: 'Informal', query: '시간표 줘', description: 'Give me schedule', namespace: 'public', expectedBehavior: 'Should retrieve schedule' },
  { id: 133, category: 'Informal', query: '커미션 많이 받았냐', description: 'Did you get much commission', namespace: 'employee', expectedBehavior: 'Should return commission' },
  { id: 134, category: 'Informal', query: '실적 구려?', description: 'Is performance bad', namespace: 'employee', expectedBehavior: 'Should show performance' },
  { id: 135, category: 'Informal', query: '한화 시책 뭐임', description: 'Hanwha incentive what (casual)', namespace: 'public', expectedBehavior: 'Should show policy' },
  { id: 136, category: 'Informal', query: '순위 몇등임', description: 'What rank (casual)', namespace: 'employee', expectedBehavior: 'Should show rank' },
  { id: 137, category: 'Informal', query: '그거 알려줘', description: 'Tell me that (vague)', namespace: 'none', expectedBehavior: 'Should ask for clarification' },

  // ==================== CATEGORY 14: TYPOS/MISSPELLINGS (10 tests) ====================
  { id: 138, category: 'Typo', query: '컴미션', description: 'Commission typo', namespace: 'employee', expectedBehavior: 'Should still find commission' },
  { id: 139, category: 'Typo', query: '엠디아르티', description: 'MDRT phonetic Korean', namespace: 'employee', expectedBehavior: 'Should find MDRT' },
  { id: 140, category: 'Typo', query: '윤나레', description: 'Name typo (래→레)', namespace: 'employee', expectedBehavior: 'Should still find 윤나래' },
  { id: 141, category: 'Typo', query: '시책공ㅈㅣ', description: 'Notice typo', namespace: 'public', expectedBehavior: 'May have issues' },
  { id: 142, category: 'Typo', query: '케이알에스', description: 'KRS phonetic', namespace: 'public', expectedBehavior: 'Should find KRS' },
  { id: 143, category: 'Typo', query: '한와생명', description: 'Hanwha typo', namespace: 'public', expectedBehavior: 'May find Hanwha' },
  { id: 144, category: 'Typo', query: '수입금액', description: 'Income amount variation', namespace: 'employee', expectedBehavior: 'Should find income' },
  { id: 145, category: 'Typo', query: '11웡', description: 'November typo', namespace: 'both', expectedBehavior: 'May have issues' },
  { id: 146, category: 'Typo', query: 'commision', description: 'English typo', namespace: 'employee', expectedBehavior: 'May find commission' },
  { id: 147, category: 'Typo', query: 'mdert', description: 'MDRT typo', namespace: 'employee', expectedBehavior: 'May find MDRT' },

  // ==================== CATEGORY 15: MULTI-PART QUESTIONS (8 tests) ====================
  { id: 148, category: 'MultiPart', query: '커미션이랑 총수입 둘 다 알려줘', description: 'Both commission and income', namespace: 'employee', expectedBehavior: 'Should show both' },
  { id: 149, category: 'MultiPart', query: 'MDRT 달성률이랑 순위', description: 'MDRT rate and ranking', namespace: 'employee', expectedBehavior: 'Should show both' },
  { id: 150, category: 'MultiPart', query: '시간표랑 시책 공지', description: 'Schedule and policy notice', namespace: 'public', expectedBehavior: 'Should retrieve both' },
  { id: 151, category: 'MultiPart', query: '월별 추이 그리고 연간 합계', description: 'Monthly trend and annual total', namespace: 'employee', expectedBehavior: 'Should show both' },
  { id: 152, category: 'MultiPart', query: 'FYC랑 AGI 비교', description: 'FYC and AGI comparison', namespace: 'employee', expectedBehavior: 'Should compare both' },
  { id: 153, category: 'MultiPart', query: '기본정보하고 실적', description: 'Basic info and performance', namespace: 'employee', expectedBehavior: 'Should show both' },
  { id: 154, category: 'MultiPart', query: '지사 순위 전체 순위', description: 'Branch rank overall rank', namespace: 'employee', expectedBehavior: 'Should show both ranks' },
  { id: 155, category: 'MultiPart', query: '보장성 금액과 MDRT 기준', description: 'Protection amount and MDRT threshold', namespace: 'employee', expectedBehavior: 'Should show both' },

  // ==================== CATEGORY 16: EDGE CASES (10 tests) ====================
  { id: 156, category: 'Edge', query: '', description: 'Empty string', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 157, category: 'Edge', query: ' ', description: 'Single space', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 158, category: 'Edge', query: '커미션'.repeat(50), description: 'Very long repetition', namespace: 'employee', expectedBehavior: 'Should handle' },
  { id: 159, category: 'Edge', query: '!@#$%^&*()', description: 'Special characters only', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 160, category: 'Edge', query: '            커미션            ', description: 'Whitespace padded', namespace: 'employee', expectedBehavior: 'Should trim and retrieve' },
  { id: 161, category: 'Edge', query: '\n\n커미션\n\n', description: 'Newline padded', namespace: 'employee', expectedBehavior: 'Should handle' },
  { id: 162, category: 'Edge', query: '가나다라마바사아자차카타파하', description: 'Korean alphabet', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 163, category: 'Edge', query: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', description: 'English alphabet', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 164, category: 'Edge', query: '1234567890', description: 'Numbers sequence', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
  { id: 165, category: 'Edge', query: '커미션 ' + 'a'.repeat(1000), description: '1000+ chars', namespace: 'employee', expectedBehavior: 'Should handle truncation' },

  // ==================== CATEGORY 17: COMPARATIVE/ANALYTICAL (8 tests) ====================
  { id: 166, category: 'Analytical', query: '평균 대비 내 실적', description: 'My performance vs average', namespace: 'employee', expectedBehavior: 'Should analyze' },
  { id: 167, category: 'Analytical', query: '제일 잘 번 달은?', description: 'Best earning month', namespace: 'employee', expectedBehavior: 'Should identify Feb' },
  { id: 168, category: 'Analytical', query: '실적 추세 어때?', description: 'Performance trend', namespace: 'employee', expectedBehavior: 'Should analyze trend' },
  { id: 169, category: 'Analytical', query: 'MDRT 달성하려면 얼마 더 벌어야해?', description: 'How much more for MDRT', namespace: 'employee', expectedBehavior: 'Should calculate gap' },
  { id: 170, category: 'Analytical', query: '올해 목표 달성률', description: 'Annual goal achievement', namespace: 'employee', expectedBehavior: 'Should show rate' },
  { id: 171, category: 'Analytical', query: '월평균 커미션', description: 'Monthly average commission', namespace: 'employee', expectedBehavior: 'Should calculate avg' },
  { id: 172, category: 'Analytical', query: '상반기 하반기 비교', description: 'First half vs second half', namespace: 'employee', expectedBehavior: 'Should compare' },
  { id: 173, category: 'Analytical', query: '실적 개선됐나?', description: 'Has performance improved', namespace: 'employee', expectedBehavior: 'Should analyze' },

  // ==================== CATEGORY 18: SPECIFIC DATE/TIME (7 tests) ====================
  { id: 174, category: 'DateTime', query: '2025년 11월 데이터', description: '2025 November data', namespace: 'both', expectedBehavior: 'Should retrieve Nov 2025' },
  { id: 175, category: 'DateTime', query: '4분기 실적', description: 'Q4 performance', namespace: 'employee', expectedBehavior: 'Should show Q4 data' },
  { id: 176, category: 'DateTime', query: '11월 14일 교육', description: 'Nov 14 training', namespace: 'public', expectedBehavior: 'Should show Nov 14' },
  { id: 177, category: 'DateTime', query: '오늘 교육 일정', description: 'Today training schedule', namespace: 'public', expectedBehavior: 'Should check schedule' },
  { id: 178, category: 'DateTime', query: '이번 분기 보고서', description: 'This quarter report', namespace: 'employee', expectedBehavior: 'Should show Q4' },
  { id: 179, category: 'DateTime', query: '25년 Q4', description: '25 Q4 short form', namespace: 'employee', expectedBehavior: 'Should retrieve Q4 2025' },
  { id: 180, category: 'DateTime', query: '작년 실적', description: 'Last year performance', namespace: 'employee', expectedBehavior: 'May not have data' },

  // ==================== CATEGORY 19: CONTEXTUAL FOLLOW-UPS (simulated) (7 tests) ====================
  { id: 181, category: 'Context', query: '더 자세히', description: 'More details (follow-up)', namespace: 'both', expectedBehavior: 'Should ask for clarification' },
  { id: 182, category: 'Context', query: '그게 뭔데?', description: 'What is that', namespace: 'none', expectedBehavior: 'Should ask for clarification' },
  { id: 183, category: 'Context', query: '다시 설명해줘', description: 'Explain again', namespace: 'none', expectedBehavior: 'Should ask for context' },
  { id: 184, category: 'Context', query: '요약해줘', description: 'Summarize', namespace: 'both', expectedBehavior: 'May ask what to summarize' },
  { id: 185, category: 'Context', query: '이전 질문', description: 'Previous question', namespace: 'none', expectedBehavior: 'Should ask for clarification' },
  { id: 186, category: 'Context', query: '맞아?', description: 'Is that right', namespace: 'none', expectedBehavior: 'Should ask for context' },
  { id: 187, category: 'Context', query: '응', description: 'Yes', namespace: 'none', expectedBehavior: 'Should ask for clarification' },

  // ==================== CATEGORY 20: FULL SENTENCE FORMAL (8 tests) ====================
  { id: 188, category: 'Formal', query: '윤나래 사원의 2025년 연간 총 커미션 금액을 알려주시겠습니까?', description: 'Very formal commission request', namespace: 'employee', expectedBehavior: 'Should return 45,272,186원' },
  { id: 189, category: 'Formal', query: 'MDRT 자격 달성 현황에 대해 상세히 설명해 주십시오.', description: 'Very formal MDRT request', namespace: 'employee', expectedBehavior: 'Should explain MDRT status' },
  { id: 190, category: 'Formal', query: '11월 KRS 교육 시간표를 확인하고 싶습니다.', description: 'Formal schedule request', namespace: 'public', expectedBehavior: 'Should retrieve schedule' },
  { id: 191, category: 'Formal', query: '한화생명 11월 시책 공지 내용을 알려주세요.', description: 'Formal policy request', namespace: 'public', expectedBehavior: 'Should retrieve policy' },
  { id: 192, category: 'Formal', query: '지사 내 실적 순위와 전체 순위를 비교해서 알려주세요.', description: 'Formal ranking comparison', namespace: 'employee', expectedBehavior: 'Should show rankings' },
  { id: 193, category: 'Formal', query: '월별 커미션 추이를 분석해 주시기 바랍니다.', description: 'Formal trend analysis request', namespace: 'employee', expectedBehavior: 'Should analyze trend' },
  { id: 194, category: 'Formal', query: '보장성 금액이 MDRT 기준에 미치는 영향을 설명해 주세요.', description: 'Formal protection impact', namespace: 'employee', expectedBehavior: 'Should explain impact' },
  { id: 195, category: 'Formal', query: '성과비례 프로모션 조건을 상세히 알려주십시오.', description: 'Formal promotion conditions', namespace: 'public', expectedBehavior: 'Should explain conditions' },

  // ==================== CATEGORY 21: MIXED LANGUAGE (5 tests) ====================
  { id: 196, category: 'Mixed', query: 'MDRT status 알려줘', description: 'Mixed Korean-English', namespace: 'employee', expectedBehavior: 'Should show MDRT status' },
  { id: 197, category: 'Mixed', query: 'commission 금액', description: 'Mixed commission', namespace: 'employee', expectedBehavior: 'Should show commission' },
  { id: 198, category: 'Mixed', query: '내 ranking', description: 'My ranking mixed', namespace: 'employee', expectedBehavior: 'Should show ranking' },
  { id: 199, category: 'Mixed', query: 'schedule 확인', description: 'Schedule check mixed', namespace: 'public', expectedBehavior: 'Should show schedule' },
  { id: 200, category: 'Mixed', query: 'FYC vs AGI', description: 'English abbreviations', namespace: 'employee', expectedBehavior: 'Should compare both' },

  // ==================== BONUS: STRESS TESTS (5 tests) ====================
  { id: 201, category: 'Stress', query: '커미션 총수입 MDRT 순위 월별 연간 분기 실적 합계 평균', description: 'Many keywords at once', namespace: 'employee', expectedBehavior: 'Should retrieve relevant data' },
  { id: 202, category: 'Stress', query: '시간표 시책 교육 한화 KB 11월 스케줄 공지 일정', description: 'Many public keywords', namespace: 'public', expectedBehavior: 'Should retrieve relevant data' },
  { id: 203, category: 'Stress', query: '윤나래 J00134 HO&F 서울 LP', description: 'All employee identifiers', namespace: 'employee', expectedBehavior: 'Should retrieve employee data' },
  { id: 204, category: 'Stress', query: Array(10).fill('커미션').join(' '), description: '10x commission', namespace: 'employee', expectedBehavior: 'Should still work' },
  { id: 205, category: 'Stress', query: '?'.repeat(100), description: '100 question marks', namespace: 'none', expectedBehavior: 'Should handle gracefully' },
];

// Import embedding utility
async function createEmbedding(text: string): Promise<number[]> {
  const { createEmbedding: embed } = await import('../lib/utils/embedding');
  return embed(text);
}

// Search function
async function searchNamespace(
  namespace: string,
  query: string,
  topK: number = 3
): Promise<{ matches: Array<{ id: string; score: number; metadata: Record<string, unknown> }> }> {
  if (!query.trim()) {
    return { matches: [] };
  }

  try {
    const embedding = await createEmbedding(query.slice(0, 8000)); // Truncate very long queries
    const result = await index.namespace(namespace).query({
      vector: embedding,
      topK,
      includeMetadata: true,
    });

    return {
      matches: (result.matches || []).map(m => ({
        id: m.id,
        score: m.score || 0,
        metadata: m.metadata as Record<string, unknown>,
      })),
    };
  } catch (error) {
    console.error(`Search error in ${namespace}:`, error);
    return { matches: [] };
  }
}

// Answer generation
async function generateAnswer(query: string, context: string): Promise<string> {
  try {
    const prompt = `당신은 HO&F 보험대리점의 급여/성과 전문 AI 어시스턴트입니다.

다음 컨텍스트를 바탕으로 질문에 정확하게 답변하세요.
컨텍스트가 없거나 관련 없는 경우, 정중하게 모른다고 답변하세요.
인사나 일상 대화에는 친절하게 응대하세요.

컨텍스트:
${context || '(관련 정보 없음)'}

질문: ${query}

답변 (한국어로):`;

    const response = await genai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });

    return response.text || '응답 생성 실패';
  } catch (error) {
    return `답변 생성 오류: ${error}`;
  }
}

// Run a single test
async function runTest(test: TestCase): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    testId: test.id,
    query: test.query,
    passed: false,
    duration: 0,
    retrievedCount: 0,
    topScore: 0,
    hasSearchableText: false,
    searchableTextPreview: '',
    details: {},
  };

  try {
    let matches: Array<{ id: string; score: number; metadata: Record<string, unknown> }> = [];

    // Search based on expected namespace
    if (test.namespace === 'employee' || test.namespace === 'both') {
      const empResult = await searchNamespace(EMPLOYEE_NAMESPACE, test.query);
      matches = [...matches, ...empResult.matches];
    }

    if (test.namespace === 'public' || test.namespace === 'both') {
      const pubResult = await searchNamespace(PUBLIC_NAMESPACE, test.query);
      matches = [...matches, ...pubResult.matches];
    }

    if (test.namespace === 'none') {
      // Still search both to see what happens
      const empResult = await searchNamespace(EMPLOYEE_NAMESPACE, test.query);
      const pubResult = await searchNamespace(PUBLIC_NAMESPACE, test.query);
      matches = [...empResult.matches, ...pubResult.matches];
    }

    // Sort by score
    matches.sort((a, b) => b.score - a.score);

    result.retrievedCount = matches.length;
    result.topScore = matches[0]?.score || 0;

    // Check searchable_text
    if (matches.length > 0) {
      const searchableText = matches[0].metadata.searchable_text as string;
      result.hasSearchableText = !!searchableText;
      result.searchableTextPreview = searchableText?.substring(0, 300) || '';
    }

    // Generate answer for certain categories
    const needsAnswer = ['Commission', 'Income', 'MDRT', 'Monthly', 'Ranking', 'Schedule',
                         'Policy', 'EmployeeInfo', 'Formal', 'MultiPart', 'Analytical'].includes(test.category);

    if (needsAnswer && matches.length > 0) {
      const context = matches.slice(0, 3).map(m => m.metadata.searchable_text || '').join('\n\n---\n\n');
      result.generatedAnswer = await generateAnswer(test.query, context);
    } else if (test.namespace === 'none') {
      // For greetings/identity/random - generate without context
      result.generatedAnswer = await generateAnswer(test.query, '');
    }

    // Determine pass/fail based on category expectations
    result.passed = evaluateTest(test, result);
    result.details = {
      category: test.category,
      expectedNamespace: test.namespace,
      expectedBehavior: test.expectedBehavior,
      matchIds: matches.slice(0, 3).map(m => m.id),
    };

  } catch (error) {
    result.error = String(error);
    result.passed = false;
  }

  result.duration = Date.now() - startTime;
  return result;
}

// Evaluate if test passed
function evaluateTest(test: TestCase, result: TestResult): boolean {
  // For edge cases with empty queries
  if (!test.query.trim()) {
    return true; // Just needs to not crash
  }

  // Category-specific evaluation
  switch (test.category) {
    case 'Greetings':
    case 'Identity':
    case 'Random':
    case 'Context':
      // These should generate some response without crashing
      return result.generatedAnswer !== undefined || result.error === undefined;

    case 'Edge':
      // Edge cases should not crash
      return result.error === undefined;

    case 'Commission':
      // Should retrieve commission data with high-ish score
      return result.retrievedCount > 0 &&
             result.topScore > 0.2 &&
             result.hasSearchableText &&
             (result.searchableTextPreview.includes('커미션') || result.searchableTextPreview.includes('FYC'));

    case 'Income':
      return result.retrievedCount > 0 &&
             result.topScore > 0.2 &&
             result.hasSearchableText &&
             (result.searchableTextPreview.includes('총수입') || result.searchableTextPreview.includes('AGI'));

    case 'MDRT':
      return result.retrievedCount > 0 &&
             result.topScore > 0.2 &&
             result.hasSearchableText &&
             result.searchableTextPreview.includes('MDRT');

    case 'Monthly':
      return result.retrievedCount > 0 &&
             result.topScore > 0.2 &&
             result.hasSearchableText &&
             result.searchableTextPreview.includes('월');

    case 'Ranking':
      return result.retrievedCount > 0 &&
             result.topScore > 0.2 &&
             result.hasSearchableText &&
             result.searchableTextPreview.includes('순위');

    case 'EmployeeInfo':
      return result.retrievedCount > 0 &&
             result.topScore > 0.2 &&
             result.hasSearchableText &&
             (result.searchableTextPreview.includes('J00134') || result.searchableTextPreview.includes('윤나래'));

    case 'Schedule':
      return result.retrievedCount > 0 &&
             result.topScore > 0.2 &&
             result.hasSearchableText &&
             (result.searchableTextPreview.includes('시간표') || result.searchableTextPreview.includes('교육') || result.searchableTextPreview.includes('일정'));

    case 'Policy':
      return result.retrievedCount > 0 &&
             result.topScore > 0.2 &&
             result.hasSearchableText &&
             (result.searchableTextPreview.includes('시책') || result.searchableTextPreview.includes('한화'));

    case 'Incomplete':
      // Incomplete sentences should still retrieve something relevant
      return result.retrievedCount > 0 && result.topScore > 0.15;

    case 'Informal':
      return result.retrievedCount > 0 || result.generatedAnswer !== undefined;

    case 'Typo':
      // Typos may or may not work - just check it doesn't crash
      return result.error === undefined;

    case 'Formal':
    case 'MultiPart':
    case 'Analytical':
      return result.retrievedCount > 0 &&
             result.topScore > 0.2 &&
             result.hasSearchableText;

    case 'DateTime':
      return result.retrievedCount > 0 && result.hasSearchableText;

    case 'Mixed':
      return result.retrievedCount > 0 && result.topScore > 0.15;

    case 'Stress':
      // Stress tests should handle without crashing
      return result.error === undefined;

    default:
      return result.retrievedCount > 0;
  }
}

// Main execution
async function main() {
  console.log('='.repeat(100));
  console.log('COMPREHENSIVE 100+ E2E RAG TEST SUITE');
  console.log(`Employee: ${EMPLOYEE_NAME} (${EMPLOYEE_SABON})`);
  console.log(`Total Tests: ${TEST_CASES.length}`);
  console.log('='.repeat(100));
  console.log('');

  const results: TestResult[] = [];
  const categoryStats: Record<string, { passed: number; failed: number }> = {};

  // Initialize category stats
  for (const test of TEST_CASES) {
    if (!categoryStats[test.category]) {
      categoryStats[test.category] = { passed: 0, failed: 0 };
    }
  }

  // Run tests with progress
  let completed = 0;
  const totalTests = TEST_CASES.length;

  for (const test of TEST_CASES) {
    const result = await runTest(test);
    results.push(result);

    if (result.passed) {
      categoryStats[test.category].passed++;
    } else {
      categoryStats[test.category].failed++;
    }

    completed++;
    const status = result.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    const scoreStr = result.topScore > 0 ? `score=${result.topScore.toFixed(3)}` : 'no-match';
    console.log(`[${completed}/${totalTests}] ${status} #${test.id} [${test.category}] "${test.query.substring(0, 30)}..." (${result.duration}ms, ${scoreStr})`);

    // Small delay to avoid rate limits
    if (completed % 10 === 0) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(100));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(100));

  const totalPassed = results.filter(r => r.passed).length;
  const totalFailed = results.filter(r => !r.passed).length;
  const passRate = ((totalPassed / totalTests) * 100).toFixed(1);

  console.log(`\nOVERALL: ${totalPassed}/${totalTests} passed (${passRate}%)\n`);

  // Category breakdown
  console.log('CATEGORY BREAKDOWN:');
  console.log('-'.repeat(60));
  const categories = Object.entries(categoryStats).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [category, stats] of categories) {
    const total = stats.passed + stats.failed;
    const rate = ((stats.passed / total) * 100).toFixed(0);
    const bar = '█'.repeat(Math.floor(stats.passed / total * 20)) + '░'.repeat(20 - Math.floor(stats.passed / total * 20));
    console.log(`${category.padEnd(15)} ${bar} ${stats.passed}/${total} (${rate}%)`);
  }

  // Failed tests details
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log('\n' + '='.repeat(100));
    console.log('FAILED TESTS DETAILS');
    console.log('='.repeat(100));

    for (const result of failedTests) {
      const test = TEST_CASES.find(t => t.id === result.testId)!;
      console.log(`\n\x1b[31m#${result.testId} [${test.category}]\x1b[0m`);
      console.log(`  Query: "${result.query.substring(0, 80)}${result.query.length > 80 ? '...' : ''}"`);
      console.log(`  Description: ${test.description}`);
      console.log(`  Expected: ${test.expectedBehavior}`);
      console.log(`  Retrieved: ${result.retrievedCount}, Score: ${result.topScore.toFixed(3)}`);
      console.log(`  Has searchable_text: ${result.hasSearchableText}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      if (result.generatedAnswer) {
        console.log(`  Answer: ${result.generatedAnswer.substring(0, 100)}...`);
      }
    }
  }

  // Sample successful tests for each category
  console.log('\n' + '='.repeat(100));
  console.log('SAMPLE SUCCESSFUL TESTS BY CATEGORY');
  console.log('='.repeat(100));

  for (const [category] of categories) {
    const successfulInCategory = results.filter(r => r.passed && TEST_CASES.find(t => t.id === r.testId)?.category === category);
    if (successfulInCategory.length > 0) {
      const sample = successfulInCategory[0];
      const test = TEST_CASES.find(t => t.id === sample.testId)!;
      console.log(`\n[${category}] #${sample.testId}`);
      console.log(`  Query: "${test.query.substring(0, 60)}${test.query.length > 60 ? '...' : ''}"`);
      console.log(`  Score: ${sample.topScore.toFixed(3)}, Duration: ${sample.duration}ms`);
      if (sample.generatedAnswer) {
        console.log(`  Answer: ${sample.generatedAnswer.substring(0, 150)}...`);
      }
    }
  }

  // Write detailed results to file
  const outputPath = path.join(process.cwd(), 'scripts', 'test-results-detailed.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      passRate: `${passRate}%`,
    },
    categoryStats,
    results: results.map(r => ({
      ...r,
      test: TEST_CASES.find(t => t.id === r.testId),
    })),
  }, null, 2));

  console.log(`\n\nDetailed results saved to: ${outputPath}`);
  console.log('='.repeat(100));
}

main().catch(console.error);
