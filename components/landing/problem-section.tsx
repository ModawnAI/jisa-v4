'use client';

import { motion } from 'framer-motion';
import { ChatCircleDots, Download, Question } from '@phosphor-icons/react';
import { WobbleCard } from '@/components/aceternity/wobble-card';
import { LampContainer } from '@/components/aceternity/lamp';
import { problemContent } from '@/lib/landing/content';

const iconMap = {
  ChatCircleDots,
  Download,
  Question,
};

export function ProblemSection() {
  return (
    <section id="problem" className="relative overflow-hidden bg-background">
      <LampContainer className="pt-24 pb-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-center text-3xl font-bold text-transparent sm:text-4xl md:text-5xl"
        >
          {problemContent.title}
        </motion.h2>
      </LampContainer>

      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {problemContent.cards.map((card, idx) => {
            const Icon = iconMap[card.icon as keyof typeof iconMap];
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <WobbleCard
                  containerClassName="h-full min-h-[200px]"
                  className="flex flex-col items-center p-6 text-center"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                    <Icon
                      size={28}
                      weight="duotone"
                      className="text-destructive"
                    />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-foreground">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </WobbleCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
