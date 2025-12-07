'use client';

import { motion } from 'framer-motion';
import {
  ChatTeardropDots,
  UserCircle,
  Upload,
  ShieldCheck,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { BentoGrid, BentoGridItem } from '@/components/aceternity/bento-grid';
import { solutionContent } from '@/lib/landing/content';

const iconMap = {
  ChatTeardropDots,
  UserCircle,
  Upload,
  ShieldCheck,
  ArrowsClockwise,
};

export function SolutionSection() {
  const items = solutionContent.items.map((item) => {
    const Icon = iconMap[item.icon as keyof typeof iconMap];
    return {
      title: item.title,
      description: item.description,
      header: (
        <div className="flex h-full min-h-[120px] w-full items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
          <Icon size={48} weight="duotone" className="text-primary" />
        </div>
      ),
      className:
        item.size === 'large'
          ? 'md:col-span-1'
          : item.size === 'wide'
            ? 'md:col-span-2'
            : 'md:col-span-1',
    };
  });

  return (
    <section id="solution" className="bg-muted/30 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            {solutionContent.title}
          </h2>
        </motion.div>

        <BentoGrid className="mx-auto max-w-5xl">
          {items.map((item, i) => (
            <BentoGridItem
              key={i}
              title={item.title}
              description={item.description}
              header={item.header}
              className={item.className}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
