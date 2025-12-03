/**
 * Verification Code Service
 *
 * Manages verification codes for KakaoTalk employee authentication.
 * Code format: EMP-{employee_id}-{random_suffix}
 */

import { db } from '@/lib/db';
import { verificationCodes, employees } from '@/lib/db/schema';
import { eq, desc, and, ilike, or, sql, lte } from 'drizzle-orm';

// Types
export interface CreateVerificationCodeInput {
  employeeId: string; // UUID
  role?: 'ceo' | 'admin' | 'manager' | 'senior' | 'junior' | 'user';
  tier?: 'enterprise' | 'pro' | 'basic' | 'free';
  maxUses?: number;
  expiresInDays?: number;
  description?: string;
  createdBy?: string; // UUID
}

export interface VerificationCodeFilters {
  search?: string;
  status?: 'active' | 'used' | 'expired' | 'revoked';
  employeeId?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Generate a random alphanumeric suffix
 */
function generateRandomSuffix(length: number = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0,O,1,I)
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a verification code based on employee's 사번
 * Format: EMP-{employee_id}-{random_suffix}
 * Example: EMP-00124-X7K9
 */
async function generateUniqueCode(employeeCode: string): Promise<string> {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const suffix = generateRandomSuffix(4);
    const code = `EMP-${employeeCode}-${suffix}`;

    // Check if code already exists
    const existing = await db
      .select({ id: verificationCodes.id })
      .from(verificationCodes)
      .where(eq(verificationCodes.code, code))
      .limit(1);

    if (existing.length === 0) {
      return code;
    }
  }

  throw new Error('코드 생성에 실패했습니다. 다시 시도해주세요.');
}

export const verificationCodeService = {
  /**
   * Create a new verification code for an employee
   */
  async create(input: CreateVerificationCodeInput) {
    const {
      employeeId,
      role = 'user',
      tier = 'free',
      maxUses = 1,
      expiresInDays = 30,
      description,
      createdBy,
    } = input;

    // Get employee info
    const employee = await db
      .select({
        id: employees.id,
        employeeId: employees.employeeId,
        name: employees.name,
      })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (employee.length === 0) {
      throw new Error('직원을 찾을 수 없습니다.');
    }

    const emp = employee[0];

    // Generate unique code
    const code = await generateUniqueCode(emp.employeeId);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create verification code
    const result = await db
      .insert(verificationCodes)
      .values({
        code,
        employeeId: emp.id,
        employeeCode: emp.employeeId,
        role,
        tier,
        maxUses,
        expiresAt,
        description,
        createdBy,
        status: 'active',
      })
      .returning();

    return {
      ...result[0],
      employee: emp,
    };
  },

  /**
   * List verification codes with filtering and pagination
   */
  async list(filters: VerificationCodeFilters, pagination: PaginationParams) {
    const { search, status, employeeId } = filters;
    const { page = 1, limit = 10, sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(verificationCodes.code, `%${search}%`),
          ilike(verificationCodes.employeeCode, `%${search}%`),
          ilike(verificationCodes.description, `%${search}%`)
        )
      );
    }

    if (status) {
      conditions.push(eq(verificationCodes.status, status));
    }

    if (employeeId) {
      conditions.push(eq(verificationCodes.employeeId, employeeId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(verificationCodes)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    // Get data with employee join
    const data = await db
      .select({
        id: verificationCodes.id,
        code: verificationCodes.code,
        kakaoUserId: verificationCodes.kakaoUserId,
        employeeId: verificationCodes.employeeId,
        employeeCode: verificationCodes.employeeCode,
        status: verificationCodes.status,
        role: verificationCodes.role,
        tier: verificationCodes.tier,
        maxUses: verificationCodes.maxUses,
        currentUses: verificationCodes.currentUses,
        description: verificationCodes.description,
        expiresAt: verificationCodes.expiresAt,
        usedAt: verificationCodes.usedAt,
        createdAt: verificationCodes.createdAt,
        employeeName: employees.name,
      })
      .from(verificationCodes)
      .leftJoin(employees, eq(verificationCodes.employeeId, employees.id))
      .where(whereClause)
      .orderBy(sortOrder === 'desc' ? desc(verificationCodes.createdAt) : verificationCodes.createdAt)
      .limit(limit)
      .offset(offset);

    return {
      data,
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get a single verification code by ID
   */
  async getById(id: string) {
    const result = await db
      .select({
        id: verificationCodes.id,
        code: verificationCodes.code,
        kakaoUserId: verificationCodes.kakaoUserId,
        employeeId: verificationCodes.employeeId,
        employeeCode: verificationCodes.employeeCode,
        status: verificationCodes.status,
        role: verificationCodes.role,
        tier: verificationCodes.tier,
        maxUses: verificationCodes.maxUses,
        currentUses: verificationCodes.currentUses,
        description: verificationCodes.description,
        expiresAt: verificationCodes.expiresAt,
        usedAt: verificationCodes.usedAt,
        createdAt: verificationCodes.createdAt,
        employeeName: employees.name,
        employeeEmail: employees.email,
        department: employees.department,
      })
      .from(verificationCodes)
      .leftJoin(employees, eq(verificationCodes.employeeId, employees.id))
      .where(eq(verificationCodes.id, id))
      .limit(1);

    return result[0] || null;
  },

  /**
   * Revoke a verification code
   */
  async revoke(id: string) {
    const result = await db
      .update(verificationCodes)
      .set({ status: 'revoked' })
      .where(eq(verificationCodes.id, id))
      .returning();

    return result[0] || null;
  },

  /**
   * Delete a verification code (hard delete)
   */
  async delete(id: string) {
    const result = await db
      .delete(verificationCodes)
      .where(eq(verificationCodes.id, id))
      .returning();

    return result[0] || null;
  },

  /**
   * Get statistics for verification codes
   */
  async getStats() {
    const now = new Date();
    const nowStr = now.toISOString();

    const stats = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where status = 'active' and expires_at > ${nowStr}::timestamp)::int`,
        used: sql<number>`count(*) filter (where status = 'used')::int`,
        expired: sql<number>`count(*) filter (where status = 'expired' or (status = 'active' and expires_at <= ${nowStr}::timestamp))::int`,
        revoked: sql<number>`count(*) filter (where status = 'revoked')::int`,
      })
      .from(verificationCodes);

    return stats[0];
  },

  /**
   * Bulk create codes for multiple employees
   */
  async bulkCreate(
    employeeIds: string[],
    options: {
      role?: 'ceo' | 'admin' | 'manager' | 'senior' | 'junior' | 'user';
      tier?: 'enterprise' | 'pro' | 'basic' | 'free';
      maxUses?: number;
      expiresInDays?: number;
      createdBy?: string;
    }
  ) {
    const results = [];

    for (const employeeId of employeeIds) {
      try {
        const code = await this.create({
          employeeId,
          ...options,
        });
        results.push({ success: true, employeeId, code });
      } catch (error) {
        results.push({
          success: false,
          employeeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  },

  /**
   * Update expired codes status
   */
  async updateExpiredCodes() {
    const now = new Date();

    const result = await db
      .update(verificationCodes)
      .set({ status: 'expired' })
      .where(
        and(
          eq(verificationCodes.status, 'active'),
          lte(verificationCodes.expiresAt, now)
        )
      )
      .returning();

    return result.length;
  },
};

export default verificationCodeService;
