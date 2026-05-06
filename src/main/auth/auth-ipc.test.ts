// pattern: Functional Core

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerAuthIpc, restoreAuthOnStartup, getCurrentAuth } from './auth-ipc.js'

// Mock Electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

// Mock oauth-client module
vi.mock('./oauth-client.js', () => ({
  startLoginFlow: vi.fn(async (handle: string) => ({
    did: 'did:plc:test123',
    handle: 'test.bsky.social',
    isAuthenticated: true,
  })),
  restoreSession: vi.fn(async () => ({
    did: 'did:plc:restored',
    handle: 'restored.bsky.social',
    isAuthenticated: true,
  })),
  logout: vi.fn(async () => {}),
  cancelLogin: vi.fn(),
}))

describe('auth-ipc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should register auth IPC handlers', async () => {
    const { ipcMain } = await import('electron')
    const mockHandle = vi.mocked(ipcMain.handle)

    registerAuthIpc()

    expect(mockHandle).toHaveBeenCalledWith('auth-login', expect.any(Function))
    expect(mockHandle).toHaveBeenCalledWith('auth-logout', expect.any(Function))
    expect(mockHandle).toHaveBeenCalledWith('auth-state', expect.any(Function))
    expect(mockHandle).toHaveBeenCalledWith('auth-cancel', expect.any(Function))
  })

  it('should restore auth on startup', async () => {
    const { restoreSession } = await import('./oauth-client.js')

    await restoreAuthOnStartup()

    expect(restoreSession).toHaveBeenCalled()
  })

  it('should return current auth state', async () => {
    // First login
    const { ipcMain } = await import('electron')
    const mockHandle = vi.mocked(ipcMain.handle)
    registerAuthIpc()

    // Get the login handler
    const loginHandler = mockHandle.mock.calls.find((call) => call[0] === 'auth-login')?.[1]

    if (loginHandler) {
      await loginHandler({}, 'test.bsky.social')
    }

    const authState = getCurrentAuth()
    expect(authState).not.toBeNull()
    expect(authState?.isAuthenticated).toBe(true)
  })

  it('should clear auth on logout', async () => {
    const { ipcMain } = await import('electron')
    const mockHandle = vi.mocked(ipcMain.handle)
    registerAuthIpc()

    // Login first
    const loginHandler = mockHandle.mock.calls.find((call) => call[0] === 'auth-login')?.[1]
    if (loginHandler) {
      await loginHandler({}, 'test.bsky.social')
    }

    // Then logout
    const logoutHandler = mockHandle.mock.calls.find((call) => call[0] === 'auth-logout')?.[1]
    if (logoutHandler) {
      await logoutHandler({})
    }

    const authState = getCurrentAuth()
    expect(authState).toBeNull()
  })
})
