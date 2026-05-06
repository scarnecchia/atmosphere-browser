// pattern: Functional Core

/**
 * Validate AT-URI format and extract components.
 * AT-URIs have format: at://did:plc:example/app.bsky.feed.post/abc123
 */

/**
 * Check if a value is a valid AT-URI string.
 */
export function isAtUri(value: string): boolean {
  return typeof value === 'string' && value.startsWith('at://')
}

/**
 * Validate NSID format (dot-separated segments).
 * Example: app.bsky.feed.post
 */
export function isValidNsid(nsid: string): boolean {
  if (!nsid || typeof nsid !== 'string') return false
  const parts = nsid.split('.')
  return parts.length >= 2 && parts.every((p) => p.length > 0)
}

/**
 * Extract collection NSID from AT-URI.
 * Handles format: at://did:plc:example/app.bsky.feed.post/abc123
 * The DID includes colons, so we find the slash after the DID,
 * then extract the collection part.
 */
export function extractNsidFromUri(uri: string): string | null {
  if (!uri.startsWith('at://')) return null
  // Remove 'at://' prefix
  const withoutScheme = uri.slice(5)
  // Find first slash (end of DID)
  const firstSlashIdx = withoutScheme.indexOf('/')
  if (firstSlashIdx === -1) return null
  // Get everything after first slash
  const afterDid = withoutScheme.slice(firstSlashIdx + 1)
  // Split by slash to get collection (first part) and optional rkey
  const parts = afterDid.split('/')
  if (parts.length === 0 || !parts[0]) return null
  return parts[0]
}
