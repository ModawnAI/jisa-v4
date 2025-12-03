import { createHash } from 'crypto';

/**
 * Generate SHA-256 hash for content
 */
export function generateContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Generate a shorter hash (first 16 characters of SHA-256)
 */
export function generateShortHash(content: string): string {
  return generateContentHash(content).substring(0, 16);
}

/**
 * Generate hash from object (JSON serialized)
 */
export function generateObjectHash(obj: Record<string, unknown>): string {
  const sortedJson = JSON.stringify(obj, Object.keys(obj).sort());
  return generateContentHash(sortedJson);
}

/**
 * Generate unique ID combining multiple factors
 */
export function generateCompositeId(
  ...parts: (string | number | undefined | null)[]
): string {
  const combined = parts.filter((p) => p != null).join('_');
  return generateShortHash(combined);
}

/**
 * Generate vector ID for Pinecone
 */
export function generateVectorId(
  documentId: string,
  rowIndex: number,
  employeeId?: string
): string {
  const parts = [documentId, String(rowIndex)];
  if (employeeId) {
    parts.push(employeeId);
  }
  return parts.join('_');
}

/**
 * Validate hash format
 */
export function isValidHash(hash: string, length = 64): boolean {
  const regex = new RegExp(`^[a-f0-9]{${length}}$`);
  return regex.test(hash);
}
