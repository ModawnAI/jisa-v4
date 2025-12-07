'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/provider';
import { navigation, type NavItem } from '@/lib/config/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  const isActive = (href: string) => {
    // Exact match
    if (pathname === href) {
      return true;
    }

    // For dashboard, only exact match
    if (href === '/dashboard') {
      return false;
    }

    // For other routes, check if pathname starts with href
    // BUT only if there's no more specific route in navigation
    if (pathname.startsWith(href + '/')) {
      // Check if there's a more specific nav item that matches
      const allHrefs = navigation.flatMap(s => s.items.map(i => i.href));
      const hasMoreSpecificMatch = allHrefs.some(
        navHref => navHref !== href &&
                   navHref.startsWith(href) &&
                   pathname.startsWith(navHref)
      );
      return !hasMoreSpecificMatch;
    }

    return false;
  };

  const filterByPermission = (item: NavItem): boolean => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">M</span>
            </div>
            <span className="font-semibold">모드온</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', collapsed && 'mx-auto')}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <CaretRight className="h-4 w-4" />
          ) : (
            <CaretLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-2">
          <TooltipProvider delayDuration={0}>
            {navigation.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-2">
                {section.title && !collapsed && (
                  <div className="mb-1 px-3 py-2 text-xs font-medium text-muted-foreground">
                    {section.title}
                  </div>
                )}
                {section.items.filter(filterByPermission).map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isActive(item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            ))}
          </TooltipProvider>
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-2">
        {/* Version info or additional actions */}
      </div>
    </aside>
  );
}

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

function NavLink({ item, isActive, collapsed }: NavLinkProps) {
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" weight={isActive ? 'fill' : 'regular'} />
      {!collapsed && (
        <>
          <span className="flex-1">{item.title}</span>
          {item.badge && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">
          <p>{item.title}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}
