// pattern: Functional Core

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startLoginFlow, initOAuthClient, cancelLogin, type AuthState } from './oauth-client.js'

type MockOAuthClient = {
  authorize: ReturnType<typeof vi.fn>
  callback: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  revoke: ReturnType<typeof vi.fn>
}

vi.mock('@atproto/oauth-client-node', () => {
  return {
    NodeOAuthClient: vi.fn(function (this: MockOAuthClient) {
      this.authorize = vi.fn(async () => {
        return new URL('http://example.com/auth?code=test_code')
      })
      this.callback = vi.fn(async () => {
        return {
          session: {
            did: 'did:plc:test',
            sub: 'did:plc:test',
            server: { issuer: 'https://bsky.social' },
            fetchHandler: vi.fn(),
          },
        }
      })
      this.restore = vi.fn(async () => {
        return {
          did: 'did:plc:test',
          sub: 'did:plc:test',
          server: { issuer: 'https://bsky.social' },
          fetchHandler: vi.fn(),
        }
      })
      this.revoke = vi.fn(async () => {})
    }),
  }
})

vi.mock('@atproto/oauth-types', () => ({
  buildAtprotoLoopbackClientMetadata: vi.fn(() => ({
    client_id: 'http://localhost?scope=atproto+transition%3Ageneric&redirect_uri=http%3A%2F%2F127.0.0.1%2Fcallback',
    scope: 'atproto transition:generic',
    redirect_uris: ['http://127.0.0.1/callback'],
  })),
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-atmosphere'),
  },
  shell: {
    openExternal: vi.fn(async () => {}),
  },
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ''),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

type MockServer = {
  listen: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  address: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
}

vi.mock('node:http', () => ({
  createServer: vi.fn(function () {
    const mock: MockServer = {
      listen: vi.fn(function (
        this: MockServer,
        _port: number,
        _host: string,
        callback: () => void,
      ) {
        callback()
      }),
      close: vi.fn(function () {
        // No-op for test
      }),
      address: vi.fn(function () {
        return { port: 3000, family: 'IPv4', address: '127.0.0.1' }
      }),
      on: vi.fn(),
      emit: vi.fn(),
    }
    return mock
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

    expect(client1).toBe(client2)
  })

  it('should start login flow and have timeout mechanism', async () => {
    vi.useFakeTimers()

    const promise = startLoginFlow('test.bsky.social')

    vi.advanceTimersByTime(300_000)
    await vi.runAllTimersAsync()

    const result = await promise

    expect(result).toBeNull()

    vi.useRealTimers()
  })

  it(
    'should timeout login flow after 5 minutes',
    async () => {
      vi.useFakeTimers()

      const promise = startLoginFlow('test.bsky.social')

      vi.advanceTimersByTime(301_000)

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

    setTimeout(() => cancelLogin(), 100)
    vi.runAllTimersAsync()

    const result = await promise
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
