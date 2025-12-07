'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, ChatCircle, PaperPlaneTilt } from '@phosphor-icons/react';
import { AuroraBackground } from '@/components/aceternity/aurora-background';
import { Spotlight } from '@/components/aceternity/spotlight';
import { Button } from '@/components/aceternity/moving-border';
import { heroContent } from '@/lib/landing/content';

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
            className="mt-8 flex flex-wrap items-center justify-center gap-8 md:gap-12"
          >
            {heroContent.stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl font-bold text-primary md:text-4xl">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Button
              as={Link}
              href="#cta"
              borderRadius="1.75rem"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {heroContent.primaryCta}
            </Button>
            <Link
              href="#how-it-works"
              className="group flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              {heroContent.secondaryCta}
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </motion.div>

          {/* KakaoTalk Chat Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative mt-16 w-full max-w-2xl"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              {/* KakaoTalk header */}
              <div className="flex items-center gap-3 border-b border-border bg-[#FFE812] px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3C1E1E]">
                  <span className="text-sm font-bold text-[#FFE812]">M</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#3C1E1E]">모드온 AI</p>
                  <p className="text-xs text-[#3C1E1E]/60">항상 응답 가능</p>
                </div>
              </div>

              {/* Chat messages */}
              <div className="space-y-4 bg-[#B2C7D9] p-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-[#FFE812] px-4 py-2.5">
                    <p className="text-sm text-[#3C1E1E]">이번 달 정산 얼마야?</p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
                    <span className="text-xs font-bold text-primary">AI</span>
                  </div>
                  <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 shadow-sm">
                    <p className="text-sm text-gray-800">
                      안녕하세요, 김민수님! 👋
                      <br /><br />
                      이번 달 정산 내역입니다:
                      <br />
                      <span className="font-medium">• 기본수수료: 4,500,000원</span>
                      <br />
                      <span className="font-medium">• 성과급: 800,000원</span>
                      <br />
                      <span className="font-medium">• 공제액: -570,000원</span>
                      <br /><br />
                      <span className="font-semibold text-primary">실수령액: 4,730,000원</span>
                      <br />
                      <span className="text-xs text-gray-500">25일 입금 예정</span>
                    </p>
                  </div>
                </div>

                {/* User follow-up */}
                <div className="flex justify-end">
                  <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-[#FFE812] px-4 py-2.5">
                    <p className="text-sm text-[#3C1E1E]">이번 달 수수료율 얼마야?</p>
                  </div>
                </div>

                {/* AI response 2 */}
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
                    <span className="text-xs font-bold text-primary">AI</span>
                  </div>
                  <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 shadow-sm">
                    <p className="text-sm text-gray-800">
                      김민수님의 현재 수수료율:
                      <br />
                      <span className="font-medium">• 자동차보험: 12%</span>
                      <br />
                      <span className="font-medium">• 화재보험: 18%</span>
                      <br />
                      <span className="font-semibold text-primary">• 생명보험: 25%</span>
                    </p>
                  </div>
                </div>

                {/* Input field */}
                <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2">
                  <input
                    type="text"
                    placeholder="메시지를 입력하세요"
                    className="flex-1 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400"
                    disabled
                  />
                  <PaperPlaneTilt size={20} className="text-primary" weight="fill" />
                </div>
              </div>
            </div>

            {/* Glow effect */}
            <div className="absolute -inset-x-20 -bottom-20 h-40 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </motion.div>
        </div>
      </div>
    </AuroraBackground>
  );
}
