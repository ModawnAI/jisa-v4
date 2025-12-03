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
