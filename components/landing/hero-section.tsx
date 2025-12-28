'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, ChatCircle } from '@phosphor-icons/react';
import { AuroraBackground } from '@/components/aceternity/aurora-background';
import { Spotlight } from '@/components/aceternity/spotlight';
import { heroContent } from '@/lib/landing/content';
import { KakaoChatMockup, ChatMessage } from './kakao-chat-mockup';

const heroMessages: ChatMessage[] = [
  {
    type: 'user',
    content: '이번 달 정산 얼마야?',
    time: '오후 2:30',
    read: true,
  },
  {
    type: 'ai',
    content: (
      <div className="space-y-2">
        <p>안녕하세요, 김민수님!</p>
        <p className="font-medium">11월 정산 내역입니다:</p>
        <div className="space-y-0.5 text-gray-700">
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
  {
    type: 'user',
    content: '지난달이랑 비교해줘',
    time: '오후 2:31',
    read: true,
  },
  {
    type: 'ai',
    content: (
      <div className="space-y-2">
        <p>10월 vs 11월 비교입니다.</p>
        <div className="space-y-0.5 text-gray-700">
          <p>
            • 정산금:{' '}
            <span className="text-green-600 font-medium">+530,000원</span>{' '}
            <span className="text-green-600 text-xs">(+12.6%)</span>
          </p>
          <p>
            • 계약건수:{' '}
            <span className="text-green-600 font-medium">+3건</span>{' '}
            <span className="text-green-600 text-xs">(+25%)</span>
          </p>
        </div>
        <p className="text-xs text-primary font-medium">
          모든 지표가 상승했어요! 훌륭합니다!
        </p>
      </div>
    ),
    time: '오후 2:31',
  },
];

export function HeroSection() {
  return (
    <AuroraBackground className="relative min-h-screen pt-24">
      <Spotlight
        className="-top-40 left-0 md:-top-20 md:left-60"
        fill="var(--primary)"
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center pt-20 text-center md:pt-28">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <ChatCircle size={16} weight="fill" />
              {heroContent.badge}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
          >
            {heroContent.headline.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            {heroContent.subheadline}
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-8 md:gap-12"
          >
            {heroContent.stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-2xl font-bold text-primary sm:text-3xl md:text-4xl">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground sm:text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10"
          >
            <Link
              href="#cta"
              className="group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/30 sm:h-14 sm:px-8 sm:text-base"
            >
              <span className="relative z-10 flex items-center gap-2">
                {heroContent.primaryCta}
                <ArrowRight
                  size={18}
                  weight="bold"
                  className="transition-transform group-hover:translate-x-1"
                />
              </span>
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </Link>
          </motion.div>

          {/* KakaoTalk Chat Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative mt-12 w-full max-w-xl sm:mt-16"
          >
            <KakaoChatMockup
              messages={heroMessages}
              className="shadow-2xl"
              compact
            />

            {/* Glow effect */}
            <div className="absolute -inset-x-10 -bottom-16 h-32 bg-gradient-to-t from-background via-background/80 to-transparent sm:-inset-x-20 sm:-bottom-20 sm:h-40" />
          </motion.div>
        </div>
      </div>
    </AuroraBackground>
  );
}
