'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown, Question } from '@phosphor-icons/react';
import { faqContent } from '@/lib/landing/content';
import { cn } from '@/lib/utils';

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-background py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            {faqContent.title}
          </h2>
        </motion.div>

        <div className="space-y-4">
          {faqContent.faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/50 sm:gap-4 sm:px-6 sm:py-5"
              >
                <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
                  <Question
                    size={20}
                    weight="duotone"
                    className="mt-0.5 shrink-0 text-primary sm:mt-0"
                  />
                  <span className="text-sm font-medium text-foreground sm:text-base">
                    {faq.question}
                  </span>
                </div>
                <CaretDown
                  size={20}
                  className={cn(
                    'shrink-0 text-muted-foreground transition-transform duration-200',
                    openIndex === idx && 'rotate-180'
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="border-t border-border bg-muted/30 px-4 py-4 sm:px-6 sm:py-5">
                      <p className="text-sm text-muted-foreground sm:text-base">{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
