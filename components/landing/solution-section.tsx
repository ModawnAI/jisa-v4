'use client';

import { motion } from 'framer-motion';
import {
  ChatTeardropDots,
  UserCircle,
  Upload,
  ShieldCheck,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { solutionContent } from '@/lib/landing/content';

const iconMap = {
  ChatTeardropDots,
  UserCircle,
  Upload,
  ShieldCheck,
  ArrowsClockwise,
};

export function SolutionSection() {
  const mainFeatures = solutionContent.items.slice(0, 2);
  const subFeatures = solutionContent.items.slice(2);

  return (
    <section id="solution" className="bg-muted/30 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
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

        {/* Main 2 features - larger cards */}
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          {mainFeatures.map((item, i) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <div className="mb-6 inline-flex rounded-xl bg-primary/10 p-4">
                  <Icon size={32} weight="duotone" className="text-primary" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Sub features - 3 column grid */}
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {subFeatures.map((item, i) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                viewport={{ once: true }}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md sm:gap-4 sm:p-5"
              >
                <div className="shrink-0 rounded-lg bg-primary/10 p-2.5 sm:p-3">
                  <Icon size={20} weight="duotone" className="text-primary sm:hidden" />
                  <Icon size={24} weight="duotone" className="hidden text-primary sm:block" />
                </div>
                <div>
                  <h4 className="mb-0.5 text-sm font-semibold text-foreground sm:mb-1 sm:text-base">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
