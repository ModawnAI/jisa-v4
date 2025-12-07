'use client';

import { motion } from 'framer-motion';
import {
  Upload,
  Robot,
  Key,
  ChatCircle,
} from '@phosphor-icons/react';
import { howItWorksContent } from '@/lib/landing/content';

const iconMap = {
  Upload,
  Robot,
  Key,
  ChatCircle,
};

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-muted/30 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            {howItWorksContent.title}
          </h2>
        </motion.div>

        {/* Desktop Timeline */}
        <div className="hidden md:block">
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            <div className="relative grid grid-cols-4 gap-8">
              {howItWorksContent.steps.map((step, idx) => {
                const Icon = iconMap[step.icon as keyof typeof iconMap];
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.15 }}
                    viewport={{ once: true }}
                    className="relative flex flex-col items-center text-center"
                  >
                    {/* Step Number */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                      {idx + 1}
                    </div>

                    {/* Icon */}
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-background shadow-lg">
                      <Icon
                        size={36}
                        weight="duotone"
                        className="text-primary"
                      />
                    </div>

                    {/* Content */}
                    <h3 className="mb-2 text-lg font-bold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {step.description}
                    </p>

                    {/* Time Badge */}
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {step.time}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Timeline */}
        <div className="md:hidden">
          <div className="relative space-y-8">
            {/* Vertical Line */}
            <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-primary/20" />

            {howItWorksContent.steps.map((step, idx) => {
              const Icon = iconMap[step.icon as keyof typeof iconMap];
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="relative flex gap-6"
                >
                  {/* Icon */}
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-background shadow">
                    <Icon size={24} weight="duotone" className="text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 rounded-xl border border-border bg-card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-bold text-foreground">{step.title}</h3>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {step.time}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
