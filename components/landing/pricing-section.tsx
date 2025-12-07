'use client';

import { motion } from 'framer-motion';
import { Check, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';
import { pricingContent } from '@/lib/landing/content';

export function PricingSection() {
  return (
    <section id="pricing" className="bg-muted/30 py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            {pricingContent.title}
          </h2>
          <p className="text-lg text-muted-foreground">
            {pricingContent.subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="relative rounded-3xl border border-primary bg-card p-8 shadow-xl shadow-primary/10 md:p-12"
        >
          {/* Price */}
          <div className="mb-8 text-center">
            <div className="mb-2 flex items-baseline justify-center gap-1">
              <span className="text-6xl font-bold text-primary md:text-7xl">
                {pricingContent.price.amount}
              </span>
              <span className="text-2xl font-medium text-foreground">
                {pricingContent.price.unit}
              </span>
            </div>
            <p className="text-lg text-muted-foreground">
              {pricingContent.price.period}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {pricingContent.description}
            </p>
          </div>

          {/* Features Grid */}
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {pricingContent.features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 text-foreground"
              >
                <Check
                  size={20}
                  weight="bold"
                  className="shrink-0 text-primary"
                />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4 text-center">
            <Link
              href="/signup"
              className="group relative inline-flex h-14 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-10 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/30"
            >
              <span className="relative z-10 flex items-center gap-2">
                {pricingContent.cta}
                <ArrowRight
                  size={20}
                  weight="bold"
                  className="transition-transform group-hover:translate-x-1"
                />
              </span>
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </Link>
            <p className="text-sm text-muted-foreground">
              3분 만에 설정 완료 · 신용카드 불필요
            </p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-6 text-center text-sm text-muted-foreground"
        >
          {pricingContent.note}
        </motion.p>
      </div>
    </section>
  );
}
