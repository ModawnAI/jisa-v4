'use client';

import { cn } from '@/lib/utils';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from 'framer-motion';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

interface NavItem {
  name: string;
  link: string;
  icon?: ReactNode;
}

interface FloatingNavProps {
  navItems: NavItem[];
  className?: string;
  logo?: ReactNode;
  ctaButton?: ReactNode;
}

export function FloatingNav({
  navItems,
  className,
  logo,
  ctaButton,
}: FloatingNavProps) {
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(true);

  useMotionValueEvent(scrollYProgress, 'change', (current) => {
    if (typeof current === 'number') {
      const direction = current - (scrollYProgress.getPrevious() ?? 0);

      if (scrollYProgress.get() < 0.05) {
        setVisible(true);
      } else {
        if (direction < 0) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      }
    }
  });

  return (
    <AnimatePresence mode="wait">
      <motion.nav
        initial={{ opacity: 1, y: 0 }}
        animate={{
          y: visible ? 0 : -100,
          opacity: visible ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        className={cn(
          'fixed inset-x-0 top-4 z-[5000] mx-auto flex max-w-5xl items-center justify-between rounded-full border border-border bg-background/80 px-4 py-2 shadow-lg backdrop-blur-md',
          className
        )}
      >
        {logo && <div className="flex-shrink-0">{logo}</div>}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((navItem, idx) => (
            <Link
              key={`link-${idx}`}
              href={navItem.link}
              className={cn(
                'relative flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
              )}
            >
              {navItem.icon && <span>{navItem.icon}</span>}
              <span>{navItem.name}</span>
            </Link>
          ))}
        </div>
        {ctaButton && <div className="flex-shrink-0">{ctaButton}</div>}
      </motion.nav>
    </AnimatePresence>
  );
}
