'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  FileText,
  ChartLineUp,
  Gift,
  Question,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { KakaoChatMockup, chatScenarios } from './kakao-chat-mockup';

const useCases = [
  {
    id: 'settlement',
    icon: Calculator,
    title: '정산 조회',
    shortTitle: '정산',
    description: '이번 달 정산금을 실시간으로 확인',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'policy',
    icon: FileText,
    title: '영업정책 안내',
    shortTitle: '정책',
    description: '수수료율, 정책 변경사항 확인',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'performance',
    icon: ChartLineUp,
    title: '실적 확인',
    shortTitle: '실적',
    description: '목표 달성률과 현재 실적 조회',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'benefits',
    icon: Gift,
    title: '복리후생',
    shortTitle: '복지',
    description: '복지포인트, 연차 잔여일 확인',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'comparison',
    icon: ClockCounterClockwise,
    title: '이력 비교',
    shortTitle: '비교',
    description: '지난달과 실적 비교 분석',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    id: 'general',
    icon: Question,
    title: '일반 문의',
    shortTitle: '문의',
    description: '정산일, 업무 관련 질문 응답',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
];

export function UseCasesSection() {
  const [activeCase, setActiveCase] = useState('settlement');
  const activeScenario =
    chatScenarios[activeCase as keyof typeof chatScenarios];

  return (
    <section id="use-cases" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            이런 질문들을 AI가 즉시 답변합니다
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            직원들이 자주 묻는 질문, 이제 관리자 대신 AI가 24시간 응대합니다
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Use Case Tabs */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
              {useCases.map((useCase) => {
                const Icon = useCase.icon;
                const isActive = activeCase === useCase.id;
                return (
                  <button
                    key={useCase.id}
                    onClick={() => setActiveCase(useCase.id)}
                    className={cn(
                      'group relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all',
                      isActive
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                        isActive ? 'bg-primary/20' : useCase.bgColor
                      )}
                    >
                      <Icon
                        size={22}
                        weight="duotone"
                        className={cn(
                          'transition-colors',
                          isActive ? 'text-primary' : useCase.color
                        )}
                      />
                    </div>
                    <div>
                      <h3
                        className={cn(
                          'font-semibold transition-colors',
                          isActive ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {useCase.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {useCase.description}
                      </p>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute -right-1 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-primary"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Stats below tabs */}
            <div className="mt-8 grid grid-cols-3 gap-4 rounded-xl border border-border bg-card p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">90%</p>
                <p className="text-xs text-muted-foreground">문의 감소</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">3초</p>
                <p className="text-xs text-muted-foreground">평균 응답</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">24/7</p>
                <p className="text-xs text-muted-foreground">무중단 응대</p>
              </div>
            </div>
          </motion.div>

          {/* Chat Preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <KakaoChatMockup
                  messages={activeScenario.messages}
                  className="mx-auto max-w-md shadow-xl"
                />
              </motion.div>
            </AnimatePresence>

            {/* Mobile Tab Selector */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:hidden">
              {useCases.map((useCase) => {
                const isActive = activeCase === useCase.id;
                return (
                  <button
                    key={useCase.id}
                    onClick={() => setActiveCase(useCase.id)}
                    className={cn(
                      'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {useCase.shortTitle}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
