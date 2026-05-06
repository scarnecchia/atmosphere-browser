// pattern: Imperative Shell (IPC handler registration)

import { ipcMain } from 'electron'
import { startLoginFlow, restoreSession, logout, cancelLogin, initOAuthClient, type AuthState } from './oauth-client.js'
import type { WriteResult } from './write-operations.js'

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

  // Write operation handlers
  ipcMain.handle('write-like', async (_event, subjectUri: string, subjectCid: string): Promise<WriteResult> => {
    return handleCreateRecord('app.bsky.feed.like', {
      $type: 'app.bsky.feed.like',
      subject: { uri: subjectUri, cid: subjectCid },
      createdAt: new Date().toISOString(),
    })
  })

  ipcMain.handle('write-repost', async (_event, subjectUri: string, subjectCid: string): Promise<WriteResult> => {
    return handleCreateRecord('app.bsky.feed.repost', {
      $type: 'app.bsky.feed.repost',
      subject: { uri: subjectUri, cid: subjectCid },
      createdAt: new Date().toISOString(),
    })
  })

  ipcMain.handle(
    'write-reply',
    async (
      _event,
      text: string,
      parentUri: string,
      parentCid: string,
      rootUri: string,
      rootCid: string,
    ): Promise<WriteResult> => {
      return handleCreateRecord('app.bsky.feed.post', {
        $type: 'app.bsky.feed.post',
        text,
        reply: {
          parent: { uri: parentUri, cid: parentCid },
          root: { uri: rootUri, cid: rootCid },
        },
        createdAt: new Date().toISOString(),
      })
    },
  )

  ipcMain.handle('write-delete', async (_event, collection: string, rkey: string): Promise<WriteResult> => {
    return handleDeleteRecord(collection, rkey)
  })
}

async function handleCreateRecord(collection: string, record: unknown): Promise<WriteResult> {
  const auth = currentAuth
  if (!auth) return { success: false, error: 'Not authenticated' }

  try {
    const client = await initOAuthClient()
    const session = await client.restore()
    if (!session) return { success: false, error: 'Session expired' }

    const response = await fetch(`${session.server}/xrpc/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessJwt}`,
      },
      body: JSON.stringify({
        repo: auth.did,
        collection,
        record,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      return { success: false, error: `Write failed: ${response.status} ${errBody}` }
    }

    const data = (await response.json()) as { uri: string; cid: string }
    return { success: true, uri: data.uri, cid: data.cid }
  } catch (err) {
    return { success: false, error: `Write error: ${String(err)}` }
  }
}

async function handleDeleteRecord(collection: string, rkey: string): Promise<WriteResult> {
  const auth = currentAuth
  if (!auth) return { success: false, error: 'Not authenticated' }

  try {
    const client = await initOAuthClient()
    const session = await client.restore()
    if (!session) return { success: false, error: 'Session expired' }

    const response = await fetch(`${session.server}/xrpc/com.atproto.repo.deleteRecord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessJwt}`,
      },
      body: JSON.stringify({
        repo: auth.did,
        collection,
        rkey,
      }),
    })

    if (!response.ok) {
      return { success: false, error: `Delete failed: ${response.status}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: `Delete error: ${String(err)}` }
  }
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
