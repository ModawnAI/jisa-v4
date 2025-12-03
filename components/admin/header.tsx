'use client';

import { useAuth } from '@/lib/auth/provider';
import { Breadcrumbs } from './breadcrumbs';
import { UserMenu } from './user-menu';
import { NotificationBell } from './notification-bell';
import { SearchCommand } from './search-command';
import { ModeToggle } from '@/components/ui/mode-toggle';

export function AdminHeader() {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Left: Breadcrumbs */}
      <Breadcrumbs />

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <SearchCommand />
        <ModeToggle />
        <NotificationBell />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
