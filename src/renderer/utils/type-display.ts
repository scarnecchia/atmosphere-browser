// pattern: Functional Core

/**
 * Type name detection and depth limiting for structured data rendering.
 */

/**
 * Get human-readable type name for a value.
 * Arrays include length annotation: array[3]
 */
export function getTypeName(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return `array[${value.length}]`
  return typeof value
}

/**
 * Check if rendering has exceeded maximum nesting depth.
 * Prevents infinite loops in circular references.
 */
export function isMaxDepthExceeded(depth: number, maxDepth: number = 10): boolean {
  return depth > maxDepth
}
