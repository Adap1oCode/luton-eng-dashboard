// src/components/dashboard/client/normalize.ts

/**
 * Normalize any string field for consistent filtering and matching.
 * - Trims whitespace
 * - Converts to lowercase
 * - Handles nulls and non-strings safely
 */
export function normalizeFieldValue(value: any): string {
  if (typeof value === 'string') {
return value.trim().toUpperCase()
  }
  return ''
}
