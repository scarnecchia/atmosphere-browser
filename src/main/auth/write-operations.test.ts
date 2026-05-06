// pattern: Functional Core

import { describe, it, expect } from 'vitest'
import type { WriteResult } from './write-operations.js'

/**
 * Tests for write operations types.
 * The actual implementation is in auth-ipc.ts (Imperative Shell)
 * and is tested via IPC integration tests in auth-ipc.test.ts
 */

describe('write-operations types', () => {
  it('exports WriteResult type', () => {
    const result: WriteResult = { success: true, uri: 'at://test', cid: 'bafy123' }
    expect(result.success).toBe(true)
  })

  it('WriteResult can represent error state', () => {
    const errorResult: WriteResult = { success: false, error: 'Not authenticated' }
    expect(errorResult.success).toBe(false)
    expect(errorResult.error).toBeDefined()
  })
})
