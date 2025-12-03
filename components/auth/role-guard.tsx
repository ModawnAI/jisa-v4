'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useRouter } from 'next/navigation';

interface RoleGuardProps {
  roles: string[];
  children: ReactNode;
  redirectTo?: string;
}

export function RoleGuard({
  roles,
  children,
  redirectTo = '/dashboard',
}: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !roles.includes(user.role)) {
      router.replace(redirectTo);
    }
  }, [user, loading, roles, redirectTo, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
