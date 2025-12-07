'use client';

import { cn } from '@/lib/utils';
import { motion, stagger, useAnimate, useInView } from 'framer-motion';
import { useEffect } from 'react';

interface TextGenerateEffectProps {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
}

export function TextGenerateEffect({
  words,
  className,
  filter = true,
  duration = 0.5,
}: TextGenerateEffectProps) {
  const [scope, animate] = useAnimate();
  const isInView = useInView(scope, { once: true });
  const wordsArray = words.split(' ');

  useEffect(() => {
    if (isInView) {
      animate(
        'span',
        {
          opacity: 1,
          filter: filter ? 'blur(0px)' : 'none',
        },
        {
          duration,
          delay: stagger(0.2),
        }
      );
    }
  }, [isInView, animate, duration, filter]);

  return (
    <div className={cn('font-bold', className)}>
      <div className="mt-4">
        <div className="leading-snug tracking-wide text-foreground">
          <motion.div ref={scope}>
            {wordsArray.map((word, idx) => (
              <motion.span
                key={word + idx}
                className="opacity-0"
                style={{
                  filter: filter ? 'blur(10px)' : 'none',
                }}
              >
                {word}{' '}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
