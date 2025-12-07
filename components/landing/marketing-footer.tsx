'use client';

import Link from 'next/link';
import { Envelope, MapPin, Buildings, IdentificationBadge } from '@phosphor-icons/react';
import { footerContent, navContent } from '@/lib/landing/content';

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <Link href="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                M
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">
                  {navContent.logo}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">
                  {navContent.logoSub}
                </span>
              </div>
            </Link>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              {footerContent.description}
            </p>

            {/* Company Details */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Buildings size={16} className="shrink-0" />
                <span>
                  {footerContent.company.name}
                  <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    {footerContent.company.badge}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <IdentificationBadge size={16} className="shrink-0" />
                <span>{footerContent.company.ceo}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 shrink-0 text-center text-xs">사</span>
                <span>{footerContent.company.businessNumber}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span>{footerContent.company.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Envelope size={16} className="shrink-0" />
                <a
                  href={`mailto:${footerContent.company.email}`}
                  className="text-primary hover:underline"
                >
                  {footerContent.company.email}
                </a>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              제품
            </h3>
            <ul className="space-y-3">
              {footerContent.links.product.map((link, idx) => (
                <li key={idx}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              고객지원
            </h3>
            <ul className="space-y-3">
              {footerContent.links.support.map((link, idx) => (
                <li key={idx}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="mb-4 mt-8 text-sm font-semibold text-foreground">
              법적 고지
            </h3>
            <ul className="space-y-3">
              {footerContent.links.legal.map((link, idx) => (
                <li key={idx}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            {footerContent.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
