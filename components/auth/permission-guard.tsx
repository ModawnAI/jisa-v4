'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { Lock } from '@phosphor-icons/react';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  showMessage?: boolean;
}

export function PermissionGuard({
  permission,
  children,
  fallback,
  showMessage = false,
}: PermissionGuardProps) {
  const { hasPermission, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!hasPermission(permission)) {
    if (fallback) return <>{fallback}</>;

    if (showMessage) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
          <Lock className="h-8 w-8" />
          <p>이 기능에 대한 권한이 없습니다.</p>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}
