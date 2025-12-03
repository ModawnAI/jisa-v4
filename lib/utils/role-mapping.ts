/**
 * Role Mapping Utilities
 * Maps between backend roles (KakaoTalk/Express) and frontend roles (Next.js/Drizzle)
 */

/**
 * Backend role enum (from Express backend)
 */
export const BACKEND_ROLES = {
  CEO: 'ceo',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SENIOR: 'senior',
  JUNIOR: 'junior',
  USER: 'user',
} as const;

export type BackendRole = typeof BACKEND_ROLES[keyof typeof BACKEND_ROLES];

/**
 * Frontend role enum (from Drizzle schema)
 */
export const FRONTEND_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  VIEWER: 'viewer',
} as const;

export type FrontendRole = typeof FRONTEND_ROLES[keyof typeof FRONTEND_ROLES];

/**
 * Clearance levels for document access
 */
export const CLEARANCE_LEVELS = {
  BASIC: 'basic',
  STANDARD: 'standard',
  ADVANCED: 'advanced',
} as const;

export type ClearanceLevel = typeof CLEARANCE_LEVELS[keyof typeof CLEARANCE_LEVELS];

/**
 * Map backend role to frontend role
 */
export function backendToFrontendRole(backendRole: BackendRole): FrontendRole {
  const mapping: Record<BackendRole, FrontendRole> = {
    [BACKEND_ROLES.CEO]: FRONTEND_ROLES.SUPER_ADMIN,
    [BACKEND_ROLES.ADMIN]: FRONTEND_ROLES.ORG_ADMIN,
    [BACKEND_ROLES.MANAGER]: FRONTEND_ROLES.MANAGER,
    [BACKEND_ROLES.SENIOR]: FRONTEND_ROLES.EMPLOYEE,
    [BACKEND_ROLES.JUNIOR]: FRONTEND_ROLES.EMPLOYEE,
    [BACKEND_ROLES.USER]: FRONTEND_ROLES.VIEWER,
  };

  return mapping[backendRole] || FRONTEND_ROLES.VIEWER;
}

/**
 * Map frontend role to backend role
 */
export function frontendToBackendRole(frontendRole: FrontendRole): BackendRole {
  const mapping: Record<FrontendRole, BackendRole> = {
    [FRONTEND_ROLES.SUPER_ADMIN]: BACKEND_ROLES.CEO,
    [FRONTEND_ROLES.ORG_ADMIN]: BACKEND_ROLES.ADMIN,
    [FRONTEND_ROLES.MANAGER]: BACKEND_ROLES.MANAGER,
    [FRONTEND_ROLES.EMPLOYEE]: BACKEND_ROLES.SENIOR,
    [FRONTEND_ROLES.VIEWER]: BACKEND_ROLES.USER,
  };

  return mapping[frontendRole] || BACKEND_ROLES.USER;
}

/**
 * Map backend role to clearance level
 */
export function backendRoleToClearance(backendRole: BackendRole): ClearanceLevel {
  const mapping: Record<BackendRole, ClearanceLevel> = {
    [BACKEND_ROLES.CEO]: CLEARANCE_LEVELS.ADVANCED,
    [BACKEND_ROLES.ADMIN]: CLEARANCE_LEVELS.ADVANCED,
    [BACKEND_ROLES.MANAGER]: CLEARANCE_LEVELS.STANDARD,
    [BACKEND_ROLES.SENIOR]: CLEARANCE_LEVELS.STANDARD,
    [BACKEND_ROLES.JUNIOR]: CLEARANCE_LEVELS.BASIC,
    [BACKEND_ROLES.USER]: CLEARANCE_LEVELS.BASIC,
  };

  return mapping[backendRole] || CLEARANCE_LEVELS.BASIC;
}

/**
 * Map frontend role to clearance level
 */
export function frontendRoleToClearance(frontendRole: FrontendRole): ClearanceLevel {
  const mapping: Record<FrontendRole, ClearanceLevel> = {
    [FRONTEND_ROLES.SUPER_ADMIN]: CLEARANCE_LEVELS.ADVANCED,
    [FRONTEND_ROLES.ORG_ADMIN]: CLEARANCE_LEVELS.ADVANCED,
    [FRONTEND_ROLES.MANAGER]: CLEARANCE_LEVELS.STANDARD,
    [FRONTEND_ROLES.EMPLOYEE]: CLEARANCE_LEVELS.BASIC,
    [FRONTEND_ROLES.VIEWER]: CLEARANCE_LEVELS.BASIC,
  };

  return mapping[frontendRole] || CLEARANCE_LEVELS.BASIC;
}

/**
 * Get clearance level numeric value for comparison
 */
export function getClearanceValue(clearance: ClearanceLevel): number {
  const values: Record<ClearanceLevel, number> = {
    [CLEARANCE_LEVELS.BASIC]: 1,
    [CLEARANCE_LEVELS.STANDARD]: 2,
    [CLEARANCE_LEVELS.ADVANCED]: 3,
  };

  return values[clearance] || 0;
}

/**
 * Check if user has required clearance level
 */
export function hasRequiredClearance(
  userClearance: ClearanceLevel,
  requiredClearance: ClearanceLevel
): boolean {
  return getClearanceValue(userClearance) >= getClearanceValue(requiredClearance);
}

/**
 * Permission definitions by role
 */
export const ROLE_PERMISSIONS = {
  [FRONTEND_ROLES.SUPER_ADMIN]: {
    canManageUsers: true,
    canManageEmployees: true,
    canManageDocuments: true,
    canManageTemplates: true,
    canManageCategories: true,
    canManagePrompts: true,
    canViewAnalytics: true,
    canExportData: true,
    canDeleteData: true,
    canAccessAllNamespaces: true,
  },
  [FRONTEND_ROLES.ORG_ADMIN]: {
    canManageUsers: true,
    canManageEmployees: true,
    canManageDocuments: true,
    canManageTemplates: true,
    canManageCategories: true,
    canManagePrompts: true,
    canViewAnalytics: true,
    canExportData: true,
    canDeleteData: false,
    canAccessAllNamespaces: true,
  },
  [FRONTEND_ROLES.MANAGER]: {
    canManageUsers: false,
    canManageEmployees: true,
    canManageDocuments: true,
    canManageTemplates: false,
    canManageCategories: false,
    canManagePrompts: false,
    canViewAnalytics: true,
    canExportData: true,
    canDeleteData: false,
    canAccessAllNamespaces: false,
  },
  [FRONTEND_ROLES.EMPLOYEE]: {
    canManageUsers: false,
    canManageEmployees: false,
    canManageDocuments: false,
    canManageTemplates: false,
    canManageCategories: false,
    canManagePrompts: false,
    canViewAnalytics: false,
    canExportData: false,
    canDeleteData: false,
    canAccessAllNamespaces: false,
  },
  [FRONTEND_ROLES.VIEWER]: {
    canManageUsers: false,
    canManageEmployees: false,
    canManageDocuments: false,
    canManageTemplates: false,
    canManageCategories: false,
    canManagePrompts: false,
    canViewAnalytics: false,
    canExportData: false,
    canDeleteData: false,
    canAccessAllNamespaces: false,
  },
} as const;

export type RolePermissions = typeof ROLE_PERMISSIONS[FrontendRole];

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  role: FrontendRole,
  permission: keyof RolePermissions
): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: FrontendRole): RolePermissions {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[FRONTEND_ROLES.VIEWER];
}

/**
 * Convert KakaoTalk user context to frontend permissions
 */
export interface KakaoUserContext {
  kakaoUserId: string;
  isVerified: boolean;
  employeeId?: string;
  backendRole?: BackendRole;
}

export interface UserPermissionContext {
  frontendRole: FrontendRole;
  clearanceLevel: ClearanceLevel;
  permissions: RolePermissions;
  allowedNamespaces: string[];
}

export function getKakaoUserPermissions(context: KakaoUserContext): UserPermissionContext {
  // Unverified users get viewer permissions
  if (!context.isVerified || !context.backendRole) {
    return {
      frontendRole: FRONTEND_ROLES.VIEWER,
      clearanceLevel: CLEARANCE_LEVELS.BASIC,
      permissions: ROLE_PERMISSIONS[FRONTEND_ROLES.VIEWER],
      allowedNamespaces: [], // No namespace access for unverified users
    };
  }

  const frontendRole = backendToFrontendRole(context.backendRole);
  const clearanceLevel = backendRoleToClearance(context.backendRole);
  const permissions = getRolePermissions(frontendRole);

  // Build allowed namespaces
  const allowedNamespaces: string[] = [];

  // All verified users can access company namespace
  allowedNamespaces.push('org_default');

  // Add employee-specific namespace if they have an employee ID
  if (context.employeeId) {
    allowedNamespaces.push(`emp_${context.employeeId}`);
  }

  return {
    frontendRole,
    clearanceLevel,
    permissions,
    allowedNamespaces,
  };
}
