'use client';

import { motion } from 'framer-motion';
import { Quotes, Star, User } from '@phosphor-icons/react';
import { InfiniteMovingCards } from '@/components/aceternity/infinite-moving-cards';
import { testimonialsContent } from '@/lib/landing/content';

export function TestimonialsSection() {
  const testimonialItems = testimonialsContent.testimonials.map((t) => ({
    quote: t.quote,
    name: t.name,
    title: `${t.title} · ${t.company}`,
  }));

  return (
    <section id="testimonials" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            {testimonialsContent.title}
          </h2>
        </motion.div>

        {/* Desktop Grid */}
        <div className="hidden gap-6 md:grid md:grid-cols-2">
          {testimonialsContent.testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    weight="fill"
                    className="text-yellow-500"
                  />
                ))}
              </div>
              <div className="relative mb-6">
                <Quotes
                  size={24}
                  weight="fill"
                  className="absolute -left-2 -top-2 text-primary/20"
                />
                <p className="relative z-10 text-foreground">
                  &quot;{testimonial.quote}&quot;
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <User size={24} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.title} · {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden">
          <InfiniteMovingCards
            items={testimonialItems}
            direction="left"
            speed="slow"
            type="testimonial"
          />
        </div>
      </div>
    </section>
  );
}
