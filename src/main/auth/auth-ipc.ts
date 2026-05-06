// pattern: Imperative Shell (IPC handler registration)

import { ipcMain } from 'electron'
import { startLoginFlow, restoreSession, logout, cancelLogin, type AuthState } from './oauth-client.js'

let currentAuth: AuthState | null = null

export function registerAuthIpc(): void {
  ipcMain.handle('auth-login', async (_event, handle: string): Promise<AuthState | null> => {
    const result = await startLoginFlow(handle)
    if (result) {
      currentAuth = result
    }
    return result
  })

  ipcMain.handle('auth-logout', async (): Promise<void> => {
    await logout()
    currentAuth = null
  })

  ipcMain.handle('auth-state', (): AuthState | null => {
    return currentAuth
  })

  ipcMain.handle('auth-cancel', (): void => {
    cancelLogin()
  })
}

export async function restoreAuthOnStartup(): Promise<void> {
  const restored = await restoreSession()
  if (restored) {
    currentAuth = restored
    console.log(`[auth] Session restored for ${restored.handle}`)
  }
}

export function getCurrentAuth(): AuthState | null {
  return currentAuth
}
