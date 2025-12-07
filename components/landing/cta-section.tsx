'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Envelope, Sparkle } from '@phosphor-icons/react';
import { Spotlight } from '@/components/aceternity/spotlight';
import { ctaContent } from '@/lib/landing/content';

export function CtaSection() {
  return (
    <section
      id="cta"
      className="relative overflow-x-clip bg-card py-24"
    >
      <Spotlight
        className="-top-40 left-0 md:-top-20 md:left-60"
        fill="rgba(30, 157, 241, 0.3)"
      />
      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
            <Sparkle size={16} weight="fill" className="text-primary" />
            <span className="text-sm font-medium text-primary">
              14일 무료 체험
            </span>
          </div>

          <h2 className="mb-6 text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            {ctaContent.title}
          </h2>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            {ctaContent.subtitle}
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="group relative inline-flex h-14 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/30"
            >
              <span className="relative z-10 flex items-center gap-2">
                {ctaContent.primaryCta}
                <ArrowRight
                  size={18}
                  weight="bold"
                  className="transition-transform group-hover:translate-x-1"
                />
              </span>
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </Link>

            <a
              href="mailto:info@modawn.ai"
              className="flex h-14 items-center gap-2 rounded-full border border-border bg-background px-6 font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Envelope size={18} />
              <span>{ctaContent.secondaryCta}</span>
            </a>
          </div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-wrap items-center justify-center gap-8 text-muted-foreground"
        >
          <div className="flex items-center gap-2 text-sm">
            <svg
              className="h-5 w-5 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>신용카드 불필요</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg
              className="h-5 w-5 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>즉시 시작</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg
              className="h-5 w-5 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>언제든 취소 가능</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
