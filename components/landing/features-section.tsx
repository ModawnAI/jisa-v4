'use client';

import { motion } from 'framer-motion';
import {
  ChatCircle,
  IdentificationCard,
  Lightning,
  ShieldCheck,
  Check,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { featuresContent } from '@/lib/landing/content';

const iconMap = {
  ChatCircle,
  IdentificationCard,
  Lightning,
  ShieldCheck,
};

export function FeaturesSection() {
  return (
    <section id="features" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            {featuresContent.title}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {featuresContent.features.map((feature, idx) => {
            const Icon = iconMap[feature.icon as keyof typeof iconMap];
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg'
                )}
              >
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5 transition-all group-hover:scale-150" />
                <div className="relative">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Icon size={28} weight="duotone" className="text-primary" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mb-6 text-muted-foreground">
                    {feature.subtitle}
                  </p>
                  <ul className="space-y-3">
                    {feature.points.map((point, pointIdx) => (
                      <li
                        key={pointIdx}
                        className="flex items-start gap-3 text-sm text-muted-foreground"
                      >
                        <Check
                          size={18}
                          weight="bold"
                          className="mt-0.5 shrink-0 text-primary"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
