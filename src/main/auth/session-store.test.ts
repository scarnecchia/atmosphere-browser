// pattern: Functional Core

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sessionStore } from './session-store.js'

// Mock Electron's safeStorage and Node's fs module
vi.mock('electron', () => ({
  app: {
    getPath: () => '/mock/userData',
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (str: string) => Buffer.from(str, 'utf8'),
    decryptString: (buf: Buffer) => buf.toString('utf8'),
  },
}))

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

describe('sessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should set and get a session with encryption available', async () => {
    const { existsSync, writeFileSync, readFileSync } = await import('node:fs')
    const mockExistSync = vi.mocked(existsSync)
    const mockWriteSync = vi.mocked(writeFileSync)
    const mockReadSync = vi.mocked(readFileSync)

    mockExistSync.mockReturnValue(true)
    const testSession = { did: 'did:plc:test', handle: 'user.bsky.social' }
    const jsonStr = JSON.stringify(testSession)
    mockReadSync.mockReturnValue(Buffer.from(jsonStr, 'utf8'))

    // Test set
    await sessionStore.set('did:plc:test', testSession)
    expect(mockWriteSync).toHaveBeenCalled()

    // Test get
    const retrieved = await sessionStore.get('did:plc:test')
    expect(retrieved).toEqual(testSession)
  })

  it('should return undefined for non-existent session', async () => {
    const { existsSync } = await import('node:fs')
    const mockExistSync = vi.mocked(existsSync)

    mockExistSync.mockReturnValue(false)

    const result = await sessionStore.get('did:plc:nonexistent')
    expect(result).toBeUndefined()
  })

  it('should delete a session', async () => {
    const { existsSync, unlinkSync } = await import('node:fs')
    const mockExistSync = vi.mocked(existsSync)
    const mockUnlinkSync = vi.mocked(unlinkSync)

    mockExistSync.mockReturnValue(true)

    await sessionStore.del('did:plc:test')
    expect(mockUnlinkSync).toHaveBeenCalled()
  })

  it('should handle sanitizing DIDs with special characters', async () => {
    const { writeFileSync, existsSync } = await import('node:fs')
    const mockWriteSync = vi.mocked(writeFileSync)
    const mockExistSync = vi.mocked(existsSync)

    mockExistSync.mockReturnValue(true)

    const testSession = { did: 'did:plc:example/special@chars', handle: 'user.bsky.social' }
    await sessionStore.set('did:plc:example/special@chars', testSession)

    // Verify that special characters were replaced with underscores in the file path
    const callPath = mockWriteSync.mock.calls[0]?.[0] as string
    expect(callPath).toContain('_')
  })
})
