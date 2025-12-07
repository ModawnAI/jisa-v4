'use client';

import { motion } from 'framer-motion';
import {
  CaretLeft,
  MagnifyingGlass,
  List,
  PaperPlaneTilt,
  Plus,
  SmileyWink,
  Image as ImageIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  type: 'user' | 'ai';
  content: string | React.ReactNode;
  time?: string;
  read?: boolean;
}

interface KakaoChatMockupProps {
  botName?: string;
  botSubtitle?: string;
  messages: ChatMessage[];
  showTyping?: boolean;
  className?: string;
  compact?: boolean;
}

export function KakaoChatMockup({
  botName = '모드온 AI',
  botSubtitle = '항상 응답 가능',
  messages,
  showTyping = false,
  className,
  compact = false,
}: KakaoChatMockupProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-2xl',
        className
      )}
    >
      {/* KakaoTalk header */}
      <div className="flex items-center gap-2 border-b border-[#D4B400] bg-[#FFE812] px-3 py-2.5">
        <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#D4B400]/30">
          <CaretLeft size={20} weight="bold" className="text-[#3C1E1E]" />
        </button>
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3C1E1E] to-[#5C3E3E]">
              <span className="text-sm font-bold text-[#FFE812]">M</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#FFE812] bg-green-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#3C1E1E]">{botName}</p>
            <p className="text-xs text-[#3C1E1E]/60">{botSubtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#D4B400]/30">
            <MagnifyingGlass size={18} className="text-[#3C1E1E]" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#D4B400]/30">
            <List size={18} className="text-[#3C1E1E]" />
          </button>
        </div>
      </div>

      {/* Chat messages */}
      <div
        className={cn(
          'space-y-3 bg-[#B2C7D9] p-3',
          compact ? 'min-h-[200px]' : 'min-h-[280px]'
        )}
      >
        {messages.map((message, idx) => (
          <ChatBubble key={idx} message={message} compact={compact} />
        ))}

        {/* Typing indicator */}
        {showTyping && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
              <span className="text-[10px] font-bold text-primary">AI</span>
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-1">
                <motion.span
                  className="h-2 w-2 rounded-full bg-gray-400"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                />
                <motion.span
                  className="h-2 w-2 rounded-full bg-gray-400"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                />
                <motion.span
                  className="h-2 w-2 rounded-full bg-gray-400"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input field */}
      <div className="flex items-center gap-2 border-t border-border bg-white px-3 py-2">
        <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:text-gray-600">
          <Plus size={20} weight="bold" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5">
          <input
            type="text"
            placeholder="메시지를 입력하세요"
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400"
            disabled
          />
          <button className="text-gray-400 hover:text-gray-600">
            <SmileyWink size={18} />
          </button>
          <button className="text-gray-400 hover:text-gray-600">
            <ImageIcon size={18} />
          </button>
        </div>
        <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFE812] text-[#3C1E1E] hover:bg-[#D4B400]">
          <PaperPlaneTilt size={16} weight="fill" />
        </button>
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  compact,
}: {
  message: ChatMessage;
  compact?: boolean;
}) {
  if (message.type === 'user') {
    return (
      <div className="flex items-end justify-end gap-1.5">
        {message.time && (
          <div className="flex flex-col items-end gap-0.5">
            {message.read && (
              <span className="text-[10px] font-medium text-[#3C1E1E]/60">
                1
              </span>
            )}
            <span className="text-[10px] text-[#3C1E1E]/50">{message.time}</span>
          </div>
        )}
        <div
          className={cn(
            'max-w-[70%] rounded-2xl rounded-tr-sm bg-[#FFE812] px-3.5 py-2',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          <p className="text-[#3C1E1E]">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm',
          compact ? 'h-7 w-7' : 'h-8 w-8'
        )}
      >
        <span
          className={cn(
            'font-bold text-primary',
            compact ? 'text-[10px]' : 'text-xs'
          )}
        >
          AI
        </span>
      </div>
      <div className="flex max-w-[75%] flex-col gap-1">
        <div
          className={cn(
            'rounded-2xl rounded-tl-sm bg-white px-3.5 py-2 shadow-sm',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {typeof message.content === 'string' ? (
            <p className="text-gray-800 whitespace-pre-line">{message.content}</p>
          ) : (
            message.content
          )}
        </div>
        {message.time && (
          <span className="text-[10px] text-[#3C1E1E]/50">{message.time}</span>
        )}
      </div>
    </div>
  );
}

// Pre-defined chat scenarios for use cases
export const chatScenarios = {
  settlement: {
    title: '정산 조회',
    description: '이번 달 정산 내역을 실시간으로 확인',
    messages: [
      { type: 'user' as const, content: '이번 달 정산 얼마야?', time: '오후 2:30', read: true },
      {
        type: 'ai' as const,
        content: (
          <div className="space-y-2">
            <p>안녕하세요, 김민수님!</p>
            <p className="font-medium">11월 정산 내역입니다:</p>
            <div className="space-y-1 text-gray-700">
              <p>• 기본수수료: 4,500,000원</p>
              <p>• 성과급: 800,000원</p>
              <p>• 공제액: -570,000원</p>
            </div>
            <p className="font-semibold text-primary">실수령액: 4,730,000원</p>
            <p className="text-xs text-gray-500">25일 입금 예정</p>
          </div>
        ),
        time: '오후 2:30',
      },
    ],
  },
  policy: {
    title: '영업정책 안내',
    description: '최신 수수료율과 정책 변경사항 확인',
    messages: [
      { type: 'user' as const, content: '이번 달 수수료율 변경됐어?', time: '오전 10:15', read: true },
      {
        type: 'ai' as const,
        content: (
          <div className="space-y-2">
            <p>네, 11월부터 일부 변경되었습니다.</p>
            <div className="rounded-lg bg-primary/10 p-2 space-y-1">
              <p className="font-medium text-primary">변경 사항</p>
              <p>• 자동차보험: 12% → <span className="text-green-600 font-medium">13%</span></p>
              <p>• 화재보험: 18% (유지)</p>
              <p>• 생명보험: 25% (유지)</p>
            </div>
            <p className="text-xs text-gray-500">자세한 내용은 영업정책 가이드를 참고해주세요.</p>
          </div>
        ),
        time: '오전 10:15',
      },
    ],
  },
  performance: {
    title: '실적 확인',
    description: '개인 실적과 목표 달성률 조회',
    messages: [
      { type: 'user' as const, content: '이번 달 내 실적 어때?', time: '오후 5:20', read: true },
      {
        type: 'ai' as const,
        content: (
          <div className="space-y-2">
            <p>김민수님의 11월 실적입니다.</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>월 목표</span>
                <span className="font-medium">50,000,000원</span>
              </div>
              <div className="flex justify-between">
                <span>현재 달성</span>
                <span className="font-medium text-primary">42,500,000원</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '85%' }} />
              </div>
              <p className="text-center font-semibold text-primary">85% 달성!</p>
            </div>
            <p className="text-xs text-gray-500">이번 주 7,500,000원 더 달성하면 목표 완료!</p>
          </div>
        ),
        time: '오후 5:20',
      },
    ],
  },
  benefits: {
    title: '복리후생 조회',
    description: '복지포인트, 휴가 잔여일 등 확인',
    messages: [
      { type: 'user' as const, content: '복지포인트 얼마 남았어?', time: '오후 3:45', read: true },
      {
        type: 'ai' as const,
        content: (
          <div className="space-y-2">
            <p>김민수님의 복리후생 현황입니다.</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>복지포인트</span>
                <span className="font-semibold text-primary">350,000P</span>
              </div>
              <div className="flex items-center justify-between">
                <span>연차 잔여</span>
                <span className="font-medium">8일 / 15일</span>
              </div>
              <div className="flex items-center justify-between">
                <span>건강검진</span>
                <span className="text-orange-600 font-medium">미완료</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">복지포인트는 12월 31일까지 사용 가능합니다.</p>
          </div>
        ),
        time: '오후 3:45',
      },
    ],
  },
  general: {
    title: '일반 문의',
    description: '업무 관련 일반적인 질문 응답',
    messages: [
      { type: 'user' as const, content: '정산일 언제야?', time: '오전 9:00', read: true },
      {
        type: 'ai' as const,
        content: (
          <div className="space-y-2">
            <p>정산 관련 일정 안내드립니다.</p>
            <div className="space-y-1 text-gray-700">
              <p>• <span className="font-medium">정산 마감일:</span> 매월 20일</p>
              <p>• <span className="font-medium">정산일:</span> 매월 25일</p>
              <p>• <span className="font-medium">입금:</span> 정산일 당일 오후 3시</p>
            </div>
            <p className="text-xs text-gray-500">주말/공휴일인 경우 다음 영업일에 처리됩니다.</p>
          </div>
        ),
        time: '오전 9:00',
      },
    ],
  },
  comparison: {
    title: '이력 비교',
    description: '지난 달과 실적 비교 분석',
    messages: [
      { type: 'user' as const, content: '지난달이랑 비교해줘', time: '오후 4:10', read: true },
      {
        type: 'ai' as const,
        content: (
          <div className="space-y-2">
            <p>10월 vs 11월 비교입니다.</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>총 실적</span>
                <span>38M → <span className="text-green-600 font-medium">42.5M</span> <span className="text-green-600 text-xs">+11.8%</span></span>
              </div>
              <div className="flex justify-between">
                <span>계약 건수</span>
                <span>12건 → <span className="text-green-600 font-medium">15건</span> <span className="text-green-600 text-xs">+25%</span></span>
              </div>
              <div className="flex justify-between">
                <span>정산금</span>
                <span>4.2M → <span className="text-green-600 font-medium">4.73M</span> <span className="text-green-600 text-xs">+12.6%</span></span>
              </div>
            </div>
            <p className="text-xs text-primary font-medium">모든 지표가 상승했어요! 훌륭합니다! 🎉</p>
          </div>
        ),
        time: '오후 4:10',
      },
    ],
  },
};
