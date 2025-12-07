'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { List, X } from '@phosphor-icons/react';
import { FloatingNav } from '@/components/aceternity/floating-navbar';
import { navContent } from '@/lib/landing/content';

export function MarketingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = navContent.links.map((link) => ({
    name: link.label,
    link: link.href,
  }));

  return (
    <>
      {/* Desktop Navigation */}
      <FloatingNav
        navItems={navItems}
        className="hidden md:flex"
        logo={
          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
              M
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-foreground">{navContent.logo}</span>
              <span className="text-xs text-muted-foreground">{navContent.logoSub}</span>
            </div>
          </Link>
        }
        ctaButton={
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {navContent.cta.login}
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {navContent.cta.signup}
            </Link>
          </div>
        }
      />

      {/* Mobile Navigation */}
      <nav className="fixed inset-x-0 top-0 z-50 md:hidden">
        <div className="flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-primary"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              C
            </div>
            <span>{navContent.logo}</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-foreground hover:bg-accent"
          >
            {mobileMenuOpen ? <X size={24} /> : <List size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-border bg-background/95 backdrop-blur-md"
            >
              <div className="space-y-1 px-4 py-4">
                {navContent.links.map((link, idx) => (
                  <Link
                    key={idx}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-center text-sm font-medium text-foreground hover:bg-accent"
                  >
                    {navContent.cta.login}
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
                  >
                    {navContent.cta.signup}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
