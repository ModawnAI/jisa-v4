/**
 * Generate a Pinecone namespace for organization-wide documents
 */
export function generateOrgNamespace(organizationId: string): string {
  return `org_${organizationId}`;
}

/**
 * Generate a Pinecone namespace for employee-specific documents
 * @param employeeId - The employee's 사번 (sabon/employee code like "J00307"), NOT the UUID
 */
export function generateEmployeeNamespace(employeeId: string): string {
  return `emp_${employeeId}`;
}

/**
 * Parse namespace to extract type and ID
 */
export function parseNamespace(namespace: string): {
  type: 'org' | 'emp' | 'unknown';
  id: string;
} {
  if (namespace.startsWith('org_')) {
    return { type: 'org', id: namespace.slice(4) };
  }
  if (namespace.startsWith('emp_')) {
    return { type: 'emp', id: namespace.slice(4) };
  }
  return { type: 'unknown', id: namespace };
}

/**
 * Validate namespace format
 */
export function isValidNamespace(namespace: string): boolean {
  return /^(org|emp)_[a-zA-Z0-9-]+$/.test(namespace);
}
