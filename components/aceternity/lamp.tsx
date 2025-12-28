'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface LampContainerProps {
  children: ReactNode;
  className?: string;
}

export function LampContainer({ children, className }: LampContainerProps) {
  return (
    <div
      className={cn(
        'relative z-0 flex min-h-[400px] w-full flex-col items-center justify-center overflow-hidden rounded-md bg-background',
        className
      )}
    >
      <div className="relative isolate z-0 flex w-full flex-1 scale-y-125 items-center justify-center">
        <motion.div
          initial={{ opacity: 0.5, width: '10rem' }}
          whileInView={{ opacity: 1, width: '100%' }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: 'easeInOut',
          }}
          style={{
            backgroundImage:
              'conic-gradient(var(--conic-position), var(--tw-gradient-stops))',
          }}
          className="bg-gradient-conic absolute inset-auto right-1/2 h-56 w-full max-w-[30rem] overflow-visible from-primary via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute bottom-0 left-0 z-20 h-40 w-[100%] bg-background [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute bottom-0 left-0 z-20 h-[100%] w-40 bg-background [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0.5, width: '10rem' }}
          whileInView={{ opacity: 1, width: '100%' }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: 'easeInOut',
          }}
          style={{
            backgroundImage:
              'conic-gradient(var(--conic-position), var(--tw-gradient-stops))',
          }}
          className="bg-gradient-conic absolute inset-auto left-1/2 h-56 w-full max-w-[30rem] from-transparent via-transparent to-primary text-white [--conic-position:from_290deg_at_center_top]"
        >
          <div className="absolute bottom-0 right-0 z-20 h-[100%] w-40 bg-background [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute bottom-0 right-0 z-20 h-40 w-[100%] bg-background [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-background blur-2xl" />
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />
        <div className="absolute inset-auto z-50 h-36 w-full max-w-[28rem] -translate-y-1/2 rounded-full bg-primary opacity-50 blur-3xl" />
        <motion.div
          initial={{ width: '6rem' }}
          whileInView={{ width: '80%' }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: 'easeInOut',
          }}
          className="absolute inset-auto z-30 h-36 w-full max-w-64 -translate-y-[6rem] rounded-full bg-primary blur-2xl"
        />
        <motion.div
          initial={{ width: '10rem' }}
          whileInView={{ width: '100%' }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: 'easeInOut',
          }}
          className="absolute inset-auto z-50 h-0.5 w-full max-w-[30rem] -translate-y-[7rem] bg-primary"
        />

        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-background" />
      </div>

      <div className="relative z-50 flex -translate-y-60 flex-col items-center px-5">
        {children}
      </div>
    </div>
  );
}
