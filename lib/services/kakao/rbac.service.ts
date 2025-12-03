/**
 * Role-Based Access Control (RBAC) Service
 * Enforces hierarchical role and subscription tier based access control
 *
 * Migrated from: backend/src/services/rbac.service.ts
 */

import { createClient as createServiceClient } from '@/lib/supabase/server';
import type { UserProfile, RBACFilter, AccessCheckResult } from '@/lib/types/kakao';

/**
 * Role hierarchy: Higher roles inherit lower role permissions
 * CEO > Admin > Manager > Senior > Junior > User
 */
const ROLE_HIERARCHY: Record<string, string[]> = {
  ceo: ['ceo', 'admin', 'manager', 'senior', 'junior', 'user'],
  admin: ['admin', 'manager', 'senior', 'junior', 'user'],
  manager: ['manager', 'senior', 'junior', 'user'],
  senior: ['senior', 'junior', 'user'],
  junior: ['junior', 'user'],
  user: ['user'],
};

/**
 * Subscription tier hierarchy: Higher tiers include lower tier content
 * Enterprise > Pro > Basic > Free
 */
const TIER_HIERARCHY: Record<string, string[]> = {
  enterprise: ['enterprise', 'pro', 'basic', 'free'],
  pro: ['pro', 'basic', 'free'],
  basic: ['basic', 'free'],
  free: ['free'],
};

export class RBACService {
  /**
   * Get role hierarchy for a given role
   */
  getRoleHierarchy(role: string): string[] {
    return ROLE_HIERARCHY[role] || [role];
  }

  /**
   * Get tier hierarchy for a given subscription tier
   */
  getTierHierarchy(tier: string): string[] {
    return TIER_HIERARCHY[tier] || [tier];
  }

  /**
   * Check if user has required role (considering hierarchy)
   */
  hasRole(userRole: string, requiredRole: string): boolean {
    const allowedRoles = this.getRoleHierarchy(userRole);
    return allowedRoles.includes(requiredRole);
  }

  /**
   * Check if user has required tier (considering hierarchy)
   */
  hasTier(userTier: string, requiredTier: string): boolean {
    const allowedTiers = this.getTierHierarchy(userTier);
    return allowedTiers.includes(requiredTier);
  }

  /**
   * Get user profile with metadata
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('[RBAC] Failed to get user profile:', error);
      return null;
    }

    console.log('[RBAC] User profile loaded:', {
      id: data.id,
      role: data.role,
      tier: data.subscription_tier,
      kakao_user_id: data.kakao_user_id,
    });

    return data as UserProfile;
  }

  /**
   * Build Pinecone filter for user based on role, tier, and metadata
   */
  async buildPineconeFilter(userId: string): Promise<RBACFilter> {
    const user = await this.getUserProfile(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const filter: RBACFilter = {};
    const userMetadata = (user.metadata as Record<string, unknown>) || {};

    // Role-based filtering
    // CEO and Admin can see everything, so no role filter
    if (user.role !== 'ceo' && user.role !== 'admin') {
      filter.access_roles = { $in: this.getRoleHierarchy(user.role) };
    }

    // Tier-based filtering
    // Everyone is filtered by tier (including admins)
    filter.access_tiers = { $in: this.getTierHierarchy(user.subscription_tier) };

    // Clearance level filtering
    if (userMetadata.clearance_level !== undefined) {
      filter.required_clearance_level = { $lte: userMetadata.clearance_level as number };
    }

    // Department filtering
    if (userMetadata.department) {
      filter.allowed_departments = { $in: [userMetadata.department as string, '*'] };
    }

    // Region filtering
    if (userMetadata.region) {
      filter.allowed_regions = { $in: [userMetadata.region as string, '*'] };
    }

    console.log(`[RBAC] Built filter for user ${user.email || user.kakao_user_id}:`, filter);

    return filter;
  }

  /**
   * Check if user can access specific content based on metadata
   */
  async canAccessContent(
    userId: string,
    contentMetadata: Record<string, unknown>
  ): Promise<AccessCheckResult> {
    const user = await this.getUserProfile(userId);

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // CEO and Admin bypass most checks
    const isAdmin = ['ceo', 'admin'].includes(user.role);

    // Check required role
    if (contentMetadata.required_role && !isAdmin) {
      if (!this.hasRole(user.role, contentMetadata.required_role as string)) {
        return {
          allowed: false,
          reason: `Requires role: ${contentMetadata.required_role}, user has: ${user.role}`,
        };
      }
    }

    // Check required tier (applies to everyone including admins)
    if (contentMetadata.required_tier) {
      if (!this.hasTier(user.subscription_tier, contentMetadata.required_tier as string)) {
        return {
          allowed: false,
          reason: `Requires tier: ${contentMetadata.required_tier}, user has: ${user.subscription_tier}`,
        };
      }
    }

    const userMetadata = (user.metadata as Record<string, unknown>) || {};

    // Check clearance level
    if (contentMetadata.required_clearance_level !== undefined && !isAdmin) {
      const userClearance = (userMetadata.clearance_level as number) || 0;
      if (userClearance < (contentMetadata.required_clearance_level as number)) {
        return {
          allowed: false,
          reason: `Requires clearance level: ${contentMetadata.required_clearance_level}, user has: ${userClearance}`,
        };
      }
    }

    // Check department restrictions
    if (contentMetadata.allowed_departments && !isAdmin) {
      const allowedDepts = Array.isArray(contentMetadata.allowed_departments)
        ? contentMetadata.allowed_departments
        : [contentMetadata.allowed_departments];

      if (
        !allowedDepts.includes('*') &&
        !allowedDepts.includes(userMetadata.department)
      ) {
        return {
          allowed: false,
          reason: `Not in allowed departments: ${allowedDepts.join(', ')}`,
        };
      }
    }

    // Check region restrictions
    if (contentMetadata.allowed_regions && !isAdmin) {
      const allowedRegions = Array.isArray(contentMetadata.allowed_regions)
        ? contentMetadata.allowed_regions
        : [contentMetadata.allowed_regions];

      if (
        !allowedRegions.includes('*') &&
        !allowedRegions.includes(userMetadata.region)
      ) {
        return {
          allowed: false,
          reason: `Not in allowed regions: ${allowedRegions.join(', ')}`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Log access attempt (for audit trail)
   */
  async logAccessAttempt(params: {
    userId: string;
    resourceType: 'document' | 'context' | 'query';
    resourceId: string;
    accessGranted: boolean;
    denialReason?: string;
  }): Promise<void> {
    const supabase = await createServiceClient();

    await supabase.from('analytics_events').insert({
      user_id: params.userId,
      event_type: 'access_attempt',
      event_data: {
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        access_granted: params.accessGranted,
        denial_reason: params.denialReason,
      },
    });
  }
}

// Export singleton instance
export const rbacService = new RBACService();
