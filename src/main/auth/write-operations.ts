// pattern: Functional Core

/**
 * Write operations types for creating and deleting AT Protocol records.
 *
 * The actual implementation is in auth-ipc.ts (Imperative Shell).
 * This module provides types and test utilities.
 */

export type WriteResult = {
  readonly success: boolean
  readonly uri?: string
  readonly cid?: string
  readonly error?: string
}

/**
 * Pure function to create a record on the AT Protocol.
 * Exported for testability but actual implementation is in auth-ipc.ts
 */
export async function createRecord(_collection: string, _record: unknown): Promise<WriteResult> {
  // This function will be called via IPC from auth-ipc.ts
  // The actual implementation with session access is in auth-ipc.ts
  throw new Error('createRecord should be called via IPC handler, not directly')
}

/**
 * Pure function to delete a record from the AT Protocol.
 * Exported for testability but actual implementation is in auth-ipc.ts
 */
export async function deleteRecord(_collection: string, _rkey: string): Promise<WriteResult> {
  // This function will be called via IPC from auth-ipc.ts
  // The actual implementation with session access is in auth-ipc.ts
  throw new Error('deleteRecord should be called via IPC handler, not directly')
}
