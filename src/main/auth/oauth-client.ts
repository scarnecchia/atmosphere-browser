// pattern: Imperative Shell
// (Handles OAuth loopback flow with local HTTP server)

import { NodeOAuthClient, type NodeSavedState } from '@atproto/oauth-client-node'
import { requestLocalLock } from '@atproto/oauth-client'
import { buildAtprotoLoopbackClientMetadata } from '@atproto/oauth-types'
import { app, shell } from 'electron'
import { createServer, type Server } from 'node:http'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { resolveAtUri } from '../identity.js'
import { sessionStore } from './session-store.js'

const CALLBACK_PORT = 21849
const REDIRECT_URI = `http://127.0.0.1:${CALLBACK_PORT}/callback`

let oauthClient: NodeOAuthClient | null = null
let activeServer: Server | null = null

export type AuthState = {
  readonly did: string
  readonly handle: string
  readonly isAuthenticated: boolean
}

const stateMap = new Map<string, NodeSavedState>()

export async function initOAuthClient(): Promise<NodeOAuthClient> {
  if (oauthClient) return oauthClient

  oauthClient = new NodeOAuthClient({
    clientMetadata: buildAtprotoLoopbackClientMetadata({
      scope: 'atproto transition:generic',
      redirect_uris: [REDIRECT_URI],
    }),
    requestLock: requestLocalLock,
    stateStore: {
      async get(key: string) { return stateMap.get(key) },
      async set(key: string, value: NodeSavedState) { stateMap.set(key, value) },
      async del(key: string) { stateMap.delete(key) },
    },
    sessionStore,
  })

  return oauthClient
}

export async function startLoginFlow(handle: string): Promise<AuthState | null> {
  const client = await initOAuthClient()

  return new Promise((resolve) => {
    let resolved = false

    const server = createServer(async (req, res) => {
      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404)
        res.end()
        return
      }

      try {
        const url = new URL(req.url, `http://127.0.0.1:${CALLBACK_PORT}`)
        const { session } = await client.callback(url.searchParams)

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body><h1>Authenticated!</h1><p>You can close this tab.</p></body></html>')

        await storeSubject(session.did)
        resolved = true
        cleanup()
        resolve({
          did: session.did,
          handle,
          isAuthenticated: true,
        })
      } catch (err) {
        console.error('[auth] Callback error:', err)
        res.writeHead(500, { 'Content-Type': 'text/html' })
        res.end('<html><body><h1>Authentication failed</h1></body></html>')

        resolved = true
        cleanup()
        resolve(null)
      }
    })

    server.listen(CALLBACK_PORT, '127.0.0.1', async () => {
      activeServer = server

      try {
        const authUrl = await client.authorize(handle, {
          scope: 'atproto transition:generic',
        })
        await shell.openExternal(authUrl.toString())
      } catch (err) {
        console.error('[auth] Authorize error:', err)
        cleanup()
        resolve(null)
      }
    })

    server.on('error', (err) => {
      console.error('[auth] Server error:', err)
      resolve(null)
    })

    const timeout = setTimeout(() => {
      if (!resolved) {
        cleanup()
        resolve(null)
      }
    }, 300_000)

    function cleanup(): void {
      clearTimeout(timeout)
      server.close()
      activeServer = null
    }
  })
}

export async function restoreSession(): Promise<AuthState | null> {
  try {
    const client = await initOAuthClient()
    const sub = await getStoredSub()
    if (!sub) return null

    const session = await client.restore(sub)
    if (!session) return null

    let handle: string = session.did
    try {
      const resolved = await resolveAtUri(`at://${session.did}`)
      if (resolved?.handle) handle = resolved.handle
    } catch {
      // Best effort
    }

    return {
      did: session.did,
      handle,
      isAuthenticated: true,
    }
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  if (oauthClient) {
    try {
      const sub = await getStoredSub()
      if (sub) {
        await oauthClient.revoke(sub)
      }
    } catch {
      // Best effort
    }
  }
  await clearStoredSub()
}

export function cancelLogin(): void {
  if (activeServer) {
    activeServer.close()
    activeServer = null
  }
}

const SUB_PATH_LAZY = (): string => join(app.getPath('userData'), 'auth-sub.txt')

async function getStoredSub(): Promise<string | null> {
  try {
    const path = SUB_PATH_LAZY()
    if (!existsSync(path)) return null
    return readFileSync(path, 'utf-8').trim() || null
  } catch {
    return null
  }
}

async function storeSubject(sub: string): Promise<void> {
  writeFileSync(SUB_PATH_LAZY(), sub, 'utf-8')
}

async function clearStoredSub(): Promise<void> {
  try {
    const path = SUB_PATH_LAZY()
    if (existsSync(path)) unlinkSync(path)
  } catch {
    // Best effort
  }
}
