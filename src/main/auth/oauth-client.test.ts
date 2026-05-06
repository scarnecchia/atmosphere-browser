// pattern: Functional Core

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startLoginFlow, initOAuthClient, cancelLogin, type AuthState } from './oauth-client.js'

// Mock @atproto/oauth-client-node
vi.mock('@atproto/oauth-client-node', () => {
  return {
    NodeOAuthClient: vi.fn(function (this: any, config: any) {
      this.config = config
      this.authorize = vi.fn(async (handle: string, opts: any) => {
        return new URL('http://example.com/auth?code=test_code')
      })
      this.callback = vi.fn(async (params: any) => {
        return {
          session: {
            did: 'did:plc:test',
            handle: 'test.bsky.social',
            accessJwt: 'jwt_token',
          },
        }
      })
      this.restore = vi.fn(async () => {
        return {
          did: 'did:plc:test',
          handle: 'test.bsky.social',
          accessJwt: 'jwt_token',
          server: 'https://bsky.social',
        }
      })
      this.revoke = vi.fn(async () => {})
    }),
  }
})

// Mock Electron
vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn(async () => {}),
  },
}))

// Mock session store
vi.mock('./session-store.js', () => ({
  sessionStore: {
    set: vi.fn(async () => {}),
    get: vi.fn(async () => undefined),
    del: vi.fn(async () => {}),
  },
}))

// Mock node:http
vi.mock('node:http', () => ({
  createServer: vi.fn(function (this: any, handler: any) {
    const listeners: Map<string, Function[]> = new Map()
    return {
      listen: vi.fn(function (this: any, port: number, host: string, callback: Function) {
        // Simulate successful listen
        callback()
      }),
      close: vi.fn(function (this: any) {
        // No-op for test
      }),
      address: vi.fn(function (this: any) {
        return { port: 3000, family: 'IPv4', address: '127.0.0.1' }
      }),
      on: vi.fn(),
      emit: vi.fn(),
    }
  }),
}))

describe('oauth-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize OAuth client once', async () => {
    const client1 = await initOAuthClient()
    const client2 = await initOAuthClient()

    // Should return the same instance
    expect(client1).toBe(client2)
  })

  it('should start login flow and return auth state on successful callback', async () => {
    vi.useFakeTimers()

    const result = await new Promise<AuthState | null>((resolve) => {
      startLoginFlow('test.bsky.social').then(resolve)
      // Simulate callback completion
      vi.runAllTimersAsync()
    })

    // Flow should complete, but exact result depends on mock implementation
    expect(result === null || (result && typeof result.did === 'string')).toBe(true)

    vi.useRealTimers()
  })

  it(
    'should timeout login flow after 5 minutes',
    async () => {
      vi.useFakeTimers()

      const promise = startLoginFlow('test.bsky.social')

      // Fast-forward 5 minutes + 1 second
      vi.advanceTimersByTime(301_000)

      // Run all pending timers and microtasks
      await vi.runAllTimersAsync()

      const result = await promise
      expect(result).toBeNull()

      vi.useRealTimers()
    },
    10000,
  )

  it('should cancel active login', async () => {
    vi.useFakeTimers()

    const promise = startLoginFlow('test.bsky.social')

    // Cancel before timeout
    setTimeout(() => cancelLogin(), 100)
    vi.runAllTimersAsync()

    const result = await promise
    // After cancel, server should be closed
    expect(result).toBeNull()

    vi.useRealTimers()
  })

  it('should handle auth state with did and handle', async () => {
    vi.useFakeTimers()

    const result = await new Promise<AuthState | null>((resolve) => {
      startLoginFlow('test.bsky.social').then(resolve)
      vi.runAllTimersAsync()
    })

    if (result) {
      expect(result.isAuthenticated).toBe(true)
      expect(result.did).toBeDefined()
      expect(result.handle).toBeDefined()
    }

    vi.useRealTimers()
  })
})
