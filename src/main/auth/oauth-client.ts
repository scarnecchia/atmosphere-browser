// pattern: Imperative Shell
// (Handles OAuth loopback flow with local HTTP server)

import { NodeOAuthClient } from '@atproto/oauth-client-node'
import { shell } from 'electron'
import { createServer, type Server } from 'node:http'
import { sessionStore } from './session-store.js'

let oauthClient: NodeOAuthClient | null = null
let activeServer: Server | null = null

export type AuthState = {
  readonly did: string
  readonly handle: string
  readonly isAuthenticated: boolean
}

export async function initOAuthClient(): Promise<NodeOAuthClient> {
  if (oauthClient) return oauthClient

  // Create a state store for OAuth authorization flows
  const stateStore = {
    async set(key: string, state: unknown): Promise<void> {
      // State is temporary, don't persist
    },
    async get(key: string): Promise<unknown | undefined> {
      return undefined
    },
    async del(key: string): Promise<void> {
      // No-op
    },
  }

  oauthClient = new NodeOAuthClient({
    clientMetadata: {
      client_id: 'http://localhost',
      client_name: 'Atmosphere Browser',
      client_uri: 'http://localhost',
      redirect_uris: ['http://127.0.0.1/callback'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: 'atproto',
      token_endpoint_auth_method: 'none',
      application_type: 'native',
      dpop_bound_access_tokens: true,
    },
    sessionStore,
    stateStore,
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
        const url = new URL(req.url, `http://127.0.0.1:${(server.address() as any).port}`)
        const { session } = await client.callback(url.searchParams)

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body><h1>Authenticated!</h1><p>You can close this tab.</p></body></html>')

        resolved = true
        cleanup()
        resolve({
          did: session.did,
          handle: session.handle ?? handle,
          isAuthenticated: true,
        })
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' })
        res.end('<html><body><h1>Authentication failed</h1></body></html>')

        resolved = true
        cleanup()
        resolve(null)
      }
    })

    server.listen(0, '127.0.0.1', async () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        cleanup()
        resolve(null)
        return
      }

      activeServer = server

      try {
        const authUrl = await client.authorize(handle, {
          scope: 'atproto',
          redirect_uri: `http://127.0.0.1:${address.port}/callback`,
        })
        await shell.openExternal(authUrl.toString())
      } catch {
        cleanup()
        resolve(null)
      }
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
    const session = await client.restore()
    if (!session) return null

    return {
      did: session.did,
      handle: session.handle ?? session.did,
      isAuthenticated: true,
    }
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  if (oauthClient) {
    try {
      await oauthClient.revoke()
    } catch {
      // Best effort
    }
  }
}

export function cancelLogin(): void {
  if (activeServer) {
    activeServer.close()
    activeServer = null
  }
}
