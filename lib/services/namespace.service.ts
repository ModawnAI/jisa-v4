import { pineconeService } from './pinecone.service';
import { db } from '@/lib/db';
import { employees, knowledgeChunks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface NamespaceInfo {
  namespace: string;
  type: 'organization' | 'employee';
  entityId: string;
  entityName: string;
  vectorCount: number;
}

export interface QueryNamespaceOptions {
  includeOrganization?: boolean;
  includePersonal?: boolean;
  employeeId?: string;
  categoryId?: string;
}

/**
 * Namespace service for managing Pinecone namespaces
 * Implements dual namespace strategy:
 * - Organization/Category: org_{categoryId} for company-wide documents
 * - Employee: emp_{employeeId} for employee-specific documents
 */
export class NamespaceService {
  /**
   * Get organization namespace based on category
   */
  getOrganizationNamespace(categoryId: string): string {
    return `org_${categoryId}`;
  }

  /**
   * Get employee namespace
   * @param employeeId - The employee's 사번 (sabon/employee code like "J00307"), NOT the UUID
   */
  getEmployeeNamespace(employeeId: string): string {
    return `emp_${employeeId}`;
  }

  /**
   * Parse namespace to get type and entity ID
   */
  parseNamespace(namespace: string): { type: 'organization' | 'employee'; entityId: string } | null {
    if (namespace.startsWith('org_')) {
      return { type: 'organization', entityId: namespace.slice(4) };
    }
    if (namespace.startsWith('emp_')) {
      return { type: 'employee', entityId: namespace.slice(4) };
    }
    return null;
  }

  /**
   * Get namespaces for RAG query based on context
   * Returns namespaces that should be searched based on user permissions
   */
  async getQueryNamespaces(
    options: QueryNamespaceOptions = {}
  ): Promise<string[]> {
    const {
      includeOrganization = true,
      includePersonal = true,
      employeeId,
      categoryId,
    } = options;

    const namespaces: string[] = [];

    // Include organization namespace if category is specified
    if (includeOrganization && categoryId) {
      namespaces.push(this.getOrganizationNamespace(categoryId));
    }

    // Include personal namespace if employee is specified
    if (includePersonal && employeeId) {
      namespaces.push(this.getEmployeeNamespace(employeeId));
    }

    // If no specific filters, get all available namespaces from chunks
    if (namespaces.length === 0 && !categoryId && !employeeId) {
      const distinctNamespaces = await db
        .selectDistinct({ namespace: knowledgeChunks.pineconeNamespace })
        .from(knowledgeChunks);

      return distinctNamespaces.map(ns => ns.namespace);
    }

    return namespaces;
  }

  /**
   * Get namespaces accessible to an employee based on clearance
   */
  async getAccessibleNamespaces(
    employeeId: string,
    categoryId?: string
  ): Promise<string[]> {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, employeeId),
    });

    if (!employee) {
      return [];
    }

    const namespaces: string[] = [];

    // Employee's personal namespace
    namespaces.push(this.getEmployeeNamespace(employeeId));

    // Organization namespace if category specified
    if (categoryId) {
      namespaces.push(this.getOrganizationNamespace(categoryId));
    }

    return namespaces;
  }

  /**
   * Get all namespaces with stats
   */
  async getAllNamespacesWithStats(): Promise<NamespaceInfo[]> {
    const namespaces: NamespaceInfo[] = [];

    // Get organization namespaces from categories
    const categories = await db.query.documentCategories.findMany();

    for (const category of categories) {
      const namespace = this.getOrganizationNamespace(category.id);
      try {
        const stats = await pineconeService.getNamespaceStats(namespace);
        namespaces.push({
          namespace,
          type: 'organization',
          entityId: category.id,
          entityName: category.name,
          vectorCount: stats.vectorCount,
        });
      } catch {
        // Namespace might not exist yet
        namespaces.push({
          namespace,
          type: 'organization',
          entityId: category.id,
          entityName: category.name,
          vectorCount: 0,
        });
      }
    }

    // Get employee namespaces
    const allEmployees = await db.query.employees.findMany({
      where: eq(employees.isActive, true),
    });

    for (const emp of allEmployees) {
      const namespace = this.getEmployeeNamespace(emp.id);
      try {
        const stats = await pineconeService.getNamespaceStats(namespace);
        namespaces.push({
          namespace,
          type: 'employee',
          entityId: emp.id,
          entityName: emp.name,
          vectorCount: stats.vectorCount,
        });
      } catch {
        // Namespace might not exist yet
        namespaces.push({
          namespace,
          type: 'employee',
          entityId: emp.id,
          entityName: emp.name,
          vectorCount: 0,
        });
      }
    }

    return namespaces;
  }

  /**
   * Get namespace stats summary
   */
  async getNamespaceStatsSummary(): Promise<{
    totalOrganizationNamespaces: number;
    totalEmployeeNamespaces: number;
    totalVectors: number;
    organizationVectors: number;
    employeeVectors: number;
  }> {
    const namespaces = await this.getAllNamespacesWithStats();

    const orgNamespaces = namespaces.filter(ns => ns.type === 'organization');
    const empNamespaces = namespaces.filter(ns => ns.type === 'employee');

    const orgVectors = orgNamespaces.reduce((sum, ns) => sum + ns.vectorCount, 0);
    const empVectors = empNamespaces.reduce((sum, ns) => sum + ns.vectorCount, 0);

    return {
      totalOrganizationNamespaces: orgNamespaces.length,
      totalEmployeeNamespaces: empNamespaces.length,
      totalVectors: orgVectors + empVectors,
      organizationVectors: orgVectors,
      employeeVectors: empVectors,
    };
  }

  /**
   * Get namespaces by category
   */
  async getNamespacesByCategory(categoryId: string): Promise<{
    organizationNamespace: string;
    employeeNamespaces: string[];
  }> {
    const organizationNamespace = this.getOrganizationNamespace(categoryId);

    // Get employee namespaces that have chunks in this category
    const employeeChunks = await db
      .selectDistinct({ employeeId: knowledgeChunks.employeeId })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.categorySlug, categoryId));

    const employeeNamespaces = employeeChunks
      .filter(c => c.employeeId)
      .map(c => this.getEmployeeNamespace(c.employeeId!));

    return {
      organizationNamespace,
      employeeNamespaces,
    };
  }

  /**
   * Clean up namespaces for deleted entities
   */
  async cleanupOrphanedNamespaces(): Promise<{
    deletedNamespaces: string[];
    errors: string[];
  }> {
    const deletedNamespaces: string[] = [];
    const errors: string[] = [];

    // Get all namespaces from database chunks
    const dbNamespaces = await db
      .selectDistinct({ namespace: knowledgeChunks.pineconeNamespace })
      .from(knowledgeChunks);

    // Check for orphaned organization namespaces
    const categories = await db.query.documentCategories.findMany();
    const validOrgNamespaces = new Set(
      categories.map(c => this.getOrganizationNamespace(c.id))
    );

    // Check for orphaned employee namespaces
    const activeEmployees = await db.query.employees.findMany({
      where: eq(employees.isActive, true),
    });
    const validEmpNamespaces = new Set(
      activeEmployees.map(e => this.getEmployeeNamespace(e.id))
    );

    // Find namespaces in Pinecone that don't have corresponding entities
    for (const { namespace } of dbNamespaces) {
      const parsed = this.parseNamespace(namespace);
      if (!parsed) continue;

      let isOrphaned = false;

      if (parsed.type === 'organization' && !validOrgNamespaces.has(namespace)) {
        isOrphaned = true;
      } else if (parsed.type === 'employee' && !validEmpNamespaces.has(namespace)) {
        isOrphaned = true;
      }

      if (isOrphaned) {
        try {
          // Delete chunks from database
          await db
            .delete(knowledgeChunks)
            .where(eq(knowledgeChunks.pineconeNamespace, namespace));

          // Delete from Pinecone
          await pineconeService.deleteByFilter(namespace, {});

          deletedNamespaces.push(namespace);
        } catch (error) {
          errors.push(`Failed to delete namespace ${namespace}: ${error}`);
        }
      }
    }

    return { deletedNamespaces, errors };
  }
}

export const namespaceService = new NamespaceService();
