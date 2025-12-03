import { db } from '@/lib/db';
import { employees } from '@/lib/db/schema';
import { eq, and, like, or, desc, asc, sql, count, isNull } from 'drizzle-orm';
import type { ClearanceLevel } from '@/lib/constants';
import { generateEmployeeNamespace } from '@/lib/utils/namespace';
import { AppError, ERROR_CODES } from '@/lib/errors';

export interface CreateEmployeeInput {
  employeeId: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  managerId?: string;
  clearanceLevel?: ClearanceLevel;
  hireDate?: Date;
}

export interface UpdateEmployeeInput {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  managerId?: string | null;
  clearanceLevel?: ClearanceLevel;
  hireDate?: Date;
  terminationDate?: Date;
  isActive?: boolean;
}

export interface EmployeeFilters {
  search?: string;
  isActive?: boolean;
  department?: string;
  clearanceLevel?: ClearanceLevel;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class EmployeeService {
  /**
   * Create a new employee
   */
  async create(input: CreateEmployeeInput) {
    // Check for duplicate employee ID
    const existing = await db.query.employees.findFirst({
      where: eq(employees.employeeId, input.employeeId),
    });

    if (existing) {
      throw new AppError(
        ERROR_CODES.EMPLOYEE_DUPLICATE,
        `직원 ID ${input.employeeId}가 이미 존재합니다.`,
        409
      );
    }

    const [employee] = await db
      .insert(employees)
      .values({
        ...input,
        clearanceLevel: input.clearanceLevel || 'basic',
      })
      .returning();

    return employee;
  }

  /**
   * Get employee by UUID
   */
  async getById(id: string) {
    const employee = await db.query.employees.findFirst({
      where: and(
        eq(employees.id, id),
        isNull(employees.deletedAt)
      ),
      with: {
        manager: true,
        subordinates: true,
      },
    });

    if (!employee) {
      throw new AppError(ERROR_CODES.EMPLOYEE_NOT_FOUND, '직원을 찾을 수 없습니다.', 404);
    }

    return employee;
  }

  /**
   * Get employee by employee ID (사번)
   */
  async getByEmployeeId(employeeId: string) {
    return db.query.employees.findFirst({
      where: and(
        eq(employees.employeeId, employeeId),
        isNull(employees.deletedAt)
      ),
    });
  }

  /**
   * List employees with filters and pagination
   */
  async list(filters: EmployeeFilters, pagination: PaginationParams) {
    const { search, isActive, department, clearanceLevel } = filters;
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

    // Build where conditions
    const conditions = [isNull(employees.deletedAt)];

    if (search) {
      conditions.push(
        or(
          like(employees.name, `%${search}%`),
          like(employees.employeeId, `%${search}%`),
          like(employees.email, `%${search}%`),
          like(employees.department, `%${search}%`)
        )!
      );
    }

    if (typeof isActive === 'boolean') {
      conditions.push(eq(employees.isActive, isActive));
    }

    if (department) {
      conditions.push(eq(employees.department, department));
    }

    if (clearanceLevel) {
      conditions.push(eq(employees.clearanceLevel, clearanceLevel));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(employees)
      .where(whereClause);

    // Get paginated results with proper column sorting
    const getSortColumn = (field: string) => {
      switch (field) {
        case 'name': return employees.name;
        case 'employeeId': return employees.employeeId;
        case 'department': return employees.department;
        case 'updatedAt': return employees.updatedAt;
        default: return employees.createdAt;
      }
    };

    const sortColumn = getSortColumn(sortBy);
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const results = await db.query.employees.findMany({
      where: whereClause,
      orderBy: orderFn(sortColumn),
      limit,
      offset: (page - 1) * limit,
    });

    return {
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update employee
   */
  async update(id: string, input: UpdateEmployeeInput) {
    const [employee] = await db
      .update(employees)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(
        eq(employees.id, id),
        isNull(employees.deletedAt)
      ))
      .returning();

    if (!employee) {
      throw new AppError(ERROR_CODES.EMPLOYEE_NOT_FOUND, '직원을 찾을 수 없습니다.', 404);
    }

    return employee;
  }

  /**
   * Soft delete employee
   */
  async delete(id: string) {
    const [employee] = await db
      .update(employees)
      .set({
        isActive: false,
        terminationDate: new Date(),
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(employees.id, id),
        isNull(employees.deletedAt)
      ))
      .returning();

    if (!employee) {
      throw new AppError(ERROR_CODES.EMPLOYEE_NOT_FOUND, '직원을 찾을 수 없습니다.', 404);
    }

    return employee;
  }

  /**
   * Get departments list for filters
   */
  async getDepartments() {
    const result = await db
      .selectDistinct({ department: employees.department })
      .from(employees)
      .where(
        and(
          isNull(employees.deletedAt),
          sql`${employees.department} IS NOT NULL`
        )
      )
      .orderBy(employees.department);

    return result.map((r) => r.department).filter(Boolean) as string[];
  }

  /**
   * Get employee statistics
   */
  async getStatistics() {
    // By active status
    const byStatus = await db
      .select({
        isActive: employees.isActive,
        count: count(),
      })
      .from(employees)
      .where(isNull(employees.deletedAt))
      .groupBy(employees.isActive);

    // By department (active employees only)
    const byDepartment = await db
      .select({
        department: employees.department,
        count: count(),
      })
      .from(employees)
      .where(
        and(
          isNull(employees.deletedAt),
          eq(employees.isActive, true)
        )
      )
      .groupBy(employees.department);

    // By clearance level
    const byClearance = await db
      .select({
        clearanceLevel: employees.clearanceLevel,
        count: count(),
      })
      .from(employees)
      .where(
        and(
          isNull(employees.deletedAt),
          eq(employees.isActive, true)
        )
      )
      .groupBy(employees.clearanceLevel);

    return {
      byStatus: {
        active: byStatus.find((s) => s.isActive)?.count || 0,
        inactive: byStatus.find((s) => !s.isActive)?.count || 0,
      },
      byDepartment: Object.fromEntries(
        byDepartment.map((d) => [d.department || '미지정', d.count])
      ),
      byClearance: Object.fromEntries(
        byClearance.map((c) => [c.clearanceLevel, c.count])
      ),
    };
  }

  /**
   * Get Pinecone namespace for employee
   */
  getNamespace(employeeId: string): string {
    return generateEmployeeNamespace(employeeId);
  }
}

export const employeeService = new EmployeeService();
