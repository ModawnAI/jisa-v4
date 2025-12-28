'use client';

import { motion } from 'framer-motion';
import {
  Target,
  TreeStructure,
  Lock,
  ArrowsClockwise,
  CaretRight,
  MagnifyingGlass,
  ChatCircle,
} from '@phosphor-icons/react';
import { BackgroundBeams } from '@/components/aceternity/background-beams';
import { ragEngineContent } from '@/lib/landing/content';
import { cn } from '@/lib/utils';

const iconMap = {
  Target,
  TreeStructure,
  Lock,
  ArrowsClockwise,
};

export function RagEngineSection() {
  return (
    <section
      id="rag-engine"
      className="relative overflow-hidden bg-card py-24"
    >
      <BackgroundBeams className="absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            {ragEngineContent.title}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {ragEngineContent.subtitle}
          </p>
        </motion.div>

        {/* Query Example Flow */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-background/80 backdrop-blur">
            <div className="border-b border-border bg-muted/50 px-6 py-4">
              <h3 className="font-medium text-foreground">RAG 처리 흐름</h3>
            </div>
            <div className="p-6">
              {/* Input */}
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MagnifyingGlass size={20} className="text-primary" />
                </div>
                <div className="flex-1 rounded-lg bg-muted px-4 py-3">
                  <p className="font-medium text-foreground">
                    &quot;{ragEngineContent.queryExample.input}&quot;
                  </p>
                </div>
              </div>

              {/* Processing Steps */}
              <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
                {ragEngineContent.queryExample.steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="rounded-lg border border-border bg-card px-4 py-2 text-center">
                      <p className="text-xs text-muted-foreground">
                        {step.label}
                      </p>
                      <p className="font-medium text-primary">{step.value}</p>
                    </div>
                    {idx < ragEngineContent.queryExample.steps.length - 1 && (
                      <CaretRight
                        size={16}
                        className="text-muted-foreground"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Output */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                  <ChatCircle size={20} className="text-green-500" />
                </div>
                <div className="flex-1 rounded-lg bg-green-500/10 px-4 py-3">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    {ragEngineContent.queryExample.output}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* RAG Features Grid */}
        <div className="mb-16 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {ragEngineContent.features.map((feature, idx) => {
            const Icon = iconMap[feature.icon as keyof typeof iconMap];
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="rounded-xl border border-border bg-background/80 p-6 text-center backdrop-blur transition-all hover:border-primary/50"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Icon size={24} weight="duotone" className="text-primary" />
                </div>
                <h4 className="mb-1 font-semibold text-foreground">
                  {feature.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Intent Types */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <h3 className="mb-6 text-center text-lg font-semibold text-foreground">
            5가지 질문 유형 자동 인식
          </h3>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {ragEngineContent.intentTypes.map((intent, idx) => (
              <div
                key={idx}
                className={cn(
                  'group relative overflow-hidden rounded-full border px-3 py-1.5 transition-all sm:px-4 sm:py-2',
                  'border-border bg-background/80 hover:border-primary/50 hover:bg-primary/5'
                )}
              >
                <span className="mr-1.5 text-sm font-medium text-primary sm:mr-2 sm:text-base">
                  {intent.label}
                </span>
                <span className="text-xs text-muted-foreground sm:text-sm">
                  {intent.example}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
