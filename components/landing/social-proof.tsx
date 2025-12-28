'use client';

import { motion } from 'framer-motion';
import { InfiniteMovingCards } from '@/components/aceternity/infinite-moving-cards';
import { BackgroundBeams } from '@/components/aceternity/background-beams';
import { TextGenerateEffect } from '@/components/aceternity/text-generate-effect';
import { socialProofContent } from '@/lib/landing/content';

export function SocialProof() {
  return (
    <section className="group relative overflow-hidden border-y border-border bg-background py-16">
      {/* Background Effects */}
      <BackgroundBeams className="opacity-50" />

      {/* Gradient overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Animated Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <TextGenerateEffect
            words={socialProofContent.title}
            className="text-lg text-muted-foreground md:text-xl"
            duration={0.3}
          />
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="mb-12 flex flex-wrap items-center justify-center gap-8 md:gap-16"
        >
          {[
            { value: '90%', label: '문의 감소' },
            { value: '100%', label: '카톡 접근성' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 + idx * 0.1 }}
              viewport={{ once: true }}
              className="group/stat relative text-center"
            >
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 blur-xl transition-opacity duration-300 group-hover/stat:opacity-100" />
              <div className="relative">
                <div className="bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Logo Carousel */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <InfiniteMovingCards
            items={socialProofContent.logos}
            direction="left"
            speed="slow"
            type="logo"
            className="mx-auto"
            itemClassName="bg-muted/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors"
          />
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:mt-10 sm:gap-4"
        >
          {['E2EE 암호화', '금융권 보안', 'SOC 2 준수', '개인정보보호'].map(
            (badge, idx) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-medium text-primary sm:px-3 sm:py-1 sm:text-xs"
              >
                <span className="mr-1 h-1 w-1 rounded-full bg-primary sm:mr-1.5 sm:h-1.5 sm:w-1.5" />
                {badge}
              </span>
            )
          )}
        </motion.div>
      </div>
    </section>
  );
}
