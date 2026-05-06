/**
 * Write operations types for creating and deleting AT Protocol records.
 *
 * This is a pure types module (no side effects, exempt from pattern classification).
 * The actual implementation is in auth-ipc.ts (Imperative Shell).
 */

export type WriteResult = {
  readonly success: boolean
  readonly uri?: string
  readonly cid?: string
  readonly error?: string
}
