# Phase 2: Authentication & Authorization

**Duration**: 2-3 days
**Dependencies**: Phase 1 complete
**Deliverables**: Complete auth system with RBAC

---

## Task 2.1: Supabase Auth Setup

### 2.1.1 Install Auth Dependencies

```bash
npm install @supabase/ssr @supabase/auth-helpers-nextjs
```

### 2.1.2 Supabase Client Configuration

**File**: `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
```

**File**: `lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );
};
```

**File**: `lib/supabase/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, supabaseResponse };
};
```

### Tests for 2.1
- [ ] Client creation test
- [ ] Server client test
- [ ] Cookie handling test

---

## Task 2.2: User & Role Schema

### 2.2.1 User Profiles Schema

**File**: `lib/db/schema/users.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';

// User roles enum
export const userRoleEnum = pgEnum('user_role', [
  'super_admin',   // Full system access
  'org_admin',     // Organization admin
  'manager',       // Department manager
  'employee',      // Regular employee
  'viewer',        // Read-only access
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Matches Supabase auth.users.id
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),

  // Profile
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),

  // Role & Permissions
  role: userRoleEnum('role').default('employee').notNull(),
  permissions: jsonb('permissions').$type<UserPermissions>(),

  // Employee Link (if user is also an employee)
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'set null' }),

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('users_org_idx').on(table.organizationId),
  roleIdx: index('users_role_idx').on(table.role),
  employeeIdx: index('users_employee_idx').on(table.employeeId),
}));

export interface UserPermissions {
  // Document permissions
  documents?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
    process?: boolean;
    rollback?: boolean;
  };
  // Employee permissions
  employees?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
    viewSensitive?: boolean;
  };
  // Category permissions
  categories?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  // Template permissions
  templates?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  // RAG permissions
  rag?: {
    query?: boolean;
    queryAllEmployees?: boolean;
    viewLineage?: boolean;
  };
  // Admin permissions
  admin?: {
    manageUsers?: boolean;
    viewAuditLogs?: boolean;
    manageSettings?: boolean;
  };
}

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  employee: one(employees, {
    fields: [users.employeeId],
    references: [employees.id],
  }),
}));

// Import required for employee reference
import { employees } from './employees';
import { pgEnum } from 'drizzle-orm/pg-core';
```

### 2.2.2 Default Role Permissions

**File**: `lib/auth/permissions.ts`

```typescript
import type { UserPermissions } from '@/lib/db/schema/users';

export const DEFAULT_ROLE_PERMISSIONS: Record<string, UserPermissions> = {
  super_admin: {
    documents: { create: true, read: true, update: true, delete: true, process: true, rollback: true },
    employees: { create: true, read: true, update: true, delete: true, viewSensitive: true },
    categories: { create: true, read: true, update: true, delete: true },
    templates: { create: true, read: true, update: true, delete: true },
    rag: { query: true, queryAllEmployees: true, viewLineage: true },
    admin: { manageUsers: true, viewAuditLogs: true, manageSettings: true },
  },
  org_admin: {
    documents: { create: true, read: true, update: true, delete: true, process: true, rollback: true },
    employees: { create: true, read: true, update: true, delete: true, viewSensitive: true },
    categories: { create: true, read: true, update: true, delete: true },
    templates: { create: true, read: true, update: true, delete: true },
    rag: { query: true, queryAllEmployees: true, viewLineage: true },
    admin: { manageUsers: true, viewAuditLogs: true, manageSettings: true },
  },
  manager: {
    documents: { create: true, read: true, update: true, delete: false, process: true, rollback: false },
    employees: { create: false, read: true, update: false, delete: false, viewSensitive: false },
    categories: { create: false, read: true, update: false, delete: false },
    templates: { create: false, read: true, update: false, delete: false },
    rag: { query: true, queryAllEmployees: false, viewLineage: true },
    admin: { manageUsers: false, viewAuditLogs: true, manageSettings: false },
  },
  employee: {
    documents: { create: false, read: true, update: false, delete: false, process: false, rollback: false },
    employees: { create: false, read: false, update: false, delete: false, viewSensitive: false },
    categories: { create: false, read: true, update: false, delete: false },
    templates: { create: false, read: true, update: false, delete: false },
    rag: { query: true, queryAllEmployees: false, viewLineage: false },
    admin: { manageUsers: false, viewAuditLogs: false, manageSettings: false },
  },
  viewer: {
    documents: { create: false, read: true, update: false, delete: false, process: false, rollback: false },
    employees: { create: false, read: false, update: false, delete: false, viewSensitive: false },
    categories: { create: false, read: true, update: false, delete: false },
    templates: { create: false, read: true, update: false, delete: false },
    rag: { query: true, queryAllEmployees: false, viewLineage: false },
    admin: { manageUsers: false, viewAuditLogs: false, manageSettings: false },
  },
};

export type PermissionKey =
  | 'documents.create' | 'documents.read' | 'documents.update' | 'documents.delete' | 'documents.process' | 'documents.rollback'
  | 'employees.create' | 'employees.read' | 'employees.update' | 'employees.delete' | 'employees.viewSensitive'
  | 'categories.create' | 'categories.read' | 'categories.update' | 'categories.delete'
  | 'templates.create' | 'templates.read' | 'templates.update' | 'templates.delete'
  | 'rag.query' | 'rag.queryAllEmployees' | 'rag.viewLineage'
  | 'admin.manageUsers' | 'admin.viewAuditLogs' | 'admin.manageSettings';

export function hasPermission(permissions: UserPermissions | undefined, key: PermissionKey): boolean {
  if (!permissions) return false;

  const [category, action] = key.split('.') as [keyof UserPermissions, string];
  const categoryPerms = permissions[category];

  if (!categoryPerms) return false;

  return (categoryPerms as Record<string, boolean>)[action] ?? false;
}

export function mergePermissions(rolePerms: UserPermissions, customPerms?: UserPermissions): UserPermissions {
  if (!customPerms) return rolePerms;

  return {
    documents: { ...rolePerms.documents, ...customPerms.documents },
    employees: { ...rolePerms.employees, ...customPerms.employees },
    categories: { ...rolePerms.categories, ...customPerms.categories },
    templates: { ...rolePerms.templates, ...customPerms.templates },
    rag: { ...rolePerms.rag, ...customPerms.rag },
    admin: { ...rolePerms.admin, ...customPerms.admin },
  };
}
```

### Tests for 2.2
- [ ] Permission check functions
- [ ] Role permissions mapping
- [ ] Permission merge logic

---

## Task 2.3: Auth Middleware

### 2.3.1 Main Middleware

**File**: `middleware.ts`

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/api/auth',
];

// API routes that don't require authentication
const publicApiRoutes = [
  '/api/health',
  '/api/auth',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isPublicApiRoute = publicApiRoutes.some((route) => pathname.startsWith(route));

  // Static files and public routes don't need auth check
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    isPublicRoute ||
    isPublicApiRoute
  ) {
    return NextResponse.next();
  }

  // Update session and check authentication
  const { user, supabaseResponse } = await updateSession(request);

  // Redirect to login if not authenticated
  if (!user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### 2.3.2 Auth Context Provider

**File**: `lib/auth/provider.tsx`

```typescript
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { UserPermissions } from '@/lib/db/schema/users';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: string;
  organizationId?: string;
  employeeId?: string;
  permissions: UserPermissions;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (key: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }

      setSession(session);
      setLoading(false);
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/auth/profile?userId=${userId}`);
      if (response.ok) {
        const profile = await response.json();
        setUser(profile);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  const hasPermission = (key: string): boolean => {
    if (!user?.permissions) return false;

    const [category, action] = key.split('.');
    const categoryPerms = user.permissions[category as keyof UserPermissions];

    if (!categoryPerms) return false;

    return (categoryPerms as Record<string, boolean>)[action] ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signOut,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Tests for 2.3
- [ ] Middleware route protection
- [ ] Auth context provider
- [ ] Sign in/out flow

---

## Task 2.4: Auth API Routes

### 2.4.1 Profile API

**File**: `app/api/auth/profile/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { DEFAULT_ROLE_PERMISSIONS, mergePermissions } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        organization: true,
        employee: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Merge role permissions with custom permissions
    const rolePerms = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.viewer;
    const permissions = mergePermissions(rolePerms, user.permissions || undefined);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      organizationId: user.organizationId,
      employeeId: user.employeeId,
      permissions,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
```

### 2.4.2 Auth Callback Handler

**File**: `app/auth/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login page on error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

### Tests for 2.4
- [ ] Profile API test
- [ ] Auth callback test
- [ ] Error handling test

---

## Task 2.5: Auth Pages

### 2.5.1 Login Page

**File**: `app/(auth)/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Envelope, Lock, Warning } from '@phosphor-icons/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push(redirect);
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">로그인</CardTitle>
          <CardDescription>
            계정 정보를 입력하여 로그인하세요
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <Warning className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Envelope className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">비밀번호</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  비밀번호 찾기
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              계정이 없으신가요?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                회원가입
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

### 2.5.2 Auth Layout

**File**: `app/(auth)/layout.tsx`

```typescript
import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {children}
    </div>
  );
}
```

### Tests for 2.5
- [ ] Login page rendering
- [ ] Form validation
- [ ] Login flow E2E test

---

## Task 2.6: Protected Route Components

### 2.6.1 Permission Guard

**File**: `components/auth/permission-guard.tsx`

```typescript
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
```

### 2.6.2 Role Guard

**File**: `components/auth/role-guard.tsx`

```typescript
'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
```

### Tests for 2.6
- [ ] Permission guard test
- [ ] Role guard test
- [ ] Redirect behavior test

---

## Phase Completion Checklist

- [ ] Supabase client configured (browser + server)
- [ ] User profiles schema created
- [ ] Permissions system implemented
- [ ] Middleware protecting routes
- [ ] Auth context provider working
- [ ] Auth API routes functional
- [ ] Login page complete
- [ ] Permission/Role guards working
- [ ] All auth tests passing

---

## Next Phase

→ [Phase 3: Admin Layout & Navigation](./PHASE-03-ADMIN-LAYOUT.md)
