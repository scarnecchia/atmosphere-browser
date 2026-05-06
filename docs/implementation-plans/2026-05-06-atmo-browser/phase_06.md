# Atmosphere Browser Implementation Plan — Phase 6: Authentication and Write Actions

**Goal:** Users can log in via AT Protocol OAuth (loopback pattern) and perform interactions — like, repost, reply.

**Architecture:** OAuth module in main process handles loopback flow (local HTTP server on 127.0.0.1, system browser auth, token exchange). Session persisted with Electron safeStorage. AuthChannel exposed to tiles via IPC for write operations. Post tile gains interaction buttons when authenticated.

**Tech Stack:** @atproto/oauth-client-node (loopback pattern), @atproto/api (Agent for authenticated XRPC), Electron safeStorage for token persistence, TypeScript

**Scope:** 7 phases from original design (phase 6 of 7)

**Codebase verified:** 2026-05-06 — Phase 5 provides engagement counts, Constellation integration. TileContext.auth field exists as null. Preload exposes IPC bridge.

---

## Acceptance Criteria Coverage

This phase implements and tests:

### atmo-browser.AC6: Authentication
- **atmo-browser.AC6.1 Success:** OAuth loopback flow completes — user clicks login, system browser opens, authorization returns to app
- **atmo-browser.AC6.2 Success:** Session persists across app restart via stored refresh token
- **atmo-browser.AC6.3 Success:** Logged-in state shows current handle in account widget
- **atmo-browser.AC6.4 Failure:** OAuth flow interrupted (user closes browser tab) returns to logged-out state gracefully
- **atmo-browser.AC6.5 Failure:** Expired token triggers automatic refresh without user intervention

### atmo-browser.AC7: Write actions
- **atmo-browser.AC7.1 Success:** Authenticated user can like a post (creates `app.bsky.feed.like` record)
- **atmo-browser.AC7.2 Success:** Authenticated user can repost (creates `app.bsky.feed.repost` record)
- **atmo-browser.AC7.3 Success:** Authenticated user can reply to a post (creates `app.bsky.feed.post` with reply ref)
- **atmo-browser.AC7.4 Failure:** Write actions hidden/disabled when not authenticated
- **atmo-browser.AC7.5 Failure:** Write failure (network error, auth expired) shows error message, does not corrupt local state

---

<!-- START_SUBCOMPONENT_A (tasks 1-3) -->
<!-- START_TASK_1 -->
### Task 1: OAuth module with loopback flow

**Verifies:** atmo-browser.AC6.1, atmo-browser.AC6.4

**Files:**
- Create: `src/main/auth/oauth-client.ts`
- Create: `src/main/auth/session-store.ts`
- Modify: `package.json` (add @atproto/oauth-client-node dependency)

**Implementation:**

OAuth client using `@atproto/oauth-client-node` with the loopback pattern. Spawns a local HTTP server on `127.0.0.1` with a random port, opens system browser for authorization, receives the auth code at callback.

Add to package.json dependencies:
```json
"@atproto/oauth-client-node": "^0.3.17"
```

`src/main/auth/session-store.ts` — persists tokens using Electron safeStorage:

```typescript
import { app, safeStorage } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs'

const SESSION_DIR = join(app.getPath('userData'), 'auth-sessions')

function ensureDir(): void {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true })
  }
}

function sessionPath(sub: string): string {
  const safe = sub.replace(/[^a-zA-Z0-9_:-]/g, '_')
  return join(SESSION_DIR, `${safe}.enc`)
}

export const sessionStore = {
  async set(sub: string, session: unknown): Promise<void> {
    ensureDir()
    const json = JSON.stringify(session)
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(json)
      writeFileSync(sessionPath(sub), encrypted)
    } else {
      writeFileSync(sessionPath(sub), json)
    }
  },

  async get(sub: string): Promise<unknown | undefined> {
    const path = sessionPath(sub)
    if (!existsSync(path)) return undefined

    const data = readFileSync(path)
    if (safeStorage.isEncryptionAvailable()) {
      const decrypted = safeStorage.decryptString(data)
      return JSON.parse(decrypted)
    }
    return JSON.parse(data.toString())
  },

  async del(sub: string): Promise<void> {
    const path = sessionPath(sub)
    if (existsSync(path)) {
      unlinkSync(path)
    }
  },
}
```

`src/main/auth/oauth-client.ts` — the OAuth flow:

```typescript
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
        const url = new URL(req.url, `http://127.0.0.1:${port}`)
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

    const port = 0
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
```

Note: The exact `NodeOAuthClient` constructor API, `authorize` params, and `callback` method signatures should be verified against the actual `@atproto/oauth-client-node` package at execution time. The key contracts: create client → authorize (returns URL) → callback (exchanges code) → session with DID and handle.

**Testing:**

Tests must verify:
- atmo-browser.AC6.1: OAuth flow spawns server, generates auth URL, handles callback
- atmo-browser.AC6.4: Timeout after 5 minutes resolves to null (graceful failure)
- Login cancellation closes the server

Test file: `src/main/auth/oauth-client.test.ts`

**Verification:**

Run: `npm install`
Expected: @atproto/oauth-client-node installs.

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: OAuth loopback flow with session persistence`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Auth IPC bridge and session restore

**Verifies:** atmo-browser.AC6.2, atmo-browser.AC6.3, atmo-browser.AC6.5

**Files:**
- Create: `src/main/auth/auth-ipc.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

**Implementation:**

IPC handlers for authentication operations. On app startup, attempt to restore saved session. Expose auth state to renderer.

`src/main/auth/auth-ipc.ts`:

```typescript
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
```

Update `src/preload/index.ts`:

```typescript
authLogin: (handle: string): Promise<unknown> => ipcRenderer.invoke('auth-login', handle),
authLogout: (): Promise<void> => ipcRenderer.invoke('auth-logout'),
authState: (): Promise<unknown> => ipcRenderer.invoke('auth-state'),
authCancel: (): Promise<void> => ipcRenderer.invoke('auth-cancel'),
```

Update `src/main/index.ts`:

```typescript
import { registerAuthIpc, restoreAuthOnStartup } from './auth/auth-ipc.js'
// in app.whenReady():
registerAuthIpc()
await restoreAuthOnStartup()
```

**Testing:**

Tests must verify:
- atmo-browser.AC6.2: After successful login, auth-state returns the authenticated user
- atmo-browser.AC6.3: Auth state includes handle for display in account widget
- atmo-browser.AC6.5: Session restore on startup returns previously saved session

Test file: `src/main/auth/auth-ipc.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: auth IPC bridge with session restore on startup`
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: Account widget component

**Verifies:** atmo-browser.AC6.3, atmo-browser.AC6.4

**Files:**
- Create: `src/renderer/components/account-widget.ts`
- Modify: `src/renderer/components/shell-window.ts`
- Modify: `src/renderer/main.ts`

**Implementation:**

Account widget shows login/logout state. When logged out, shows a login button that prompts for handle and initiates OAuth flow. When logged in, shows current handle with logout button.

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('account-widget')
export class AccountWidget extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 8px;
      }

      .handle {
        font-size: 13px;
        color: var(--shell-fg);
        font-weight: 500;
      }

      button {
        padding: 4px 10px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: var(--shell-surface);
        color: var(--shell-fg);
        font-size: 12px;
        cursor: pointer;
      }

      button:hover {
        background: var(--shell-border);
      }

      .login-form {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .login-form input {
        padding: 4px 8px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: var(--shell-input-bg);
        color: var(--shell-fg);
        font-size: 12px;
        width: 150px;
      }

      .status {
        font-size: 11px;
        color: var(--shell-text-muted);
      }
    `,
  ]

  @state()
  private isAuthenticated = false

  @state()
  private handle = ''

  @state()
  private showLoginForm = false

  @state()
  private loginHandle = ''

  @state()
  private isLoggingIn = false

  async connectedCallback(): Promise<void> {
    super.connectedCallback()
    await this.checkAuthState()
  }

  render() {
    if (this.isAuthenticated) {
      return html`
        <span class="handle">@${this.handle}</span>
        <button @click="${this.handleLogout}">Logout</button>
      `
    }

    if (this.isLoggingIn) {
      return html`
        <span class="status">Authenticating...</span>
        <button @click="${this.cancelLogin}">Cancel</button>
      `
    }

    if (this.showLoginForm) {
      return html`
        <div class="login-form">
          <input
            type="text"
            placeholder="handle.bsky.social"
            .value="${this.loginHandle}"
            @input="${(e: Event) => { this.loginHandle = (e.target as HTMLInputElement).value }}"
            @keydown="${(e: KeyboardEvent) => { if (e.key === 'Enter') this.handleLogin() }}"
          />
          <button @click="${this.handleLogin}">Login</button>
          <button @click="${() => { this.showLoginForm = false }}">Cancel</button>
        </div>
      `
    }

    return html`<button @click="${() => { this.showLoginForm = true }}">Login</button>`
  }

  private async checkAuthState(): Promise<void> {
    const state = (await window.atBrowser.authState()) as { did: string; handle: string; isAuthenticated: boolean } | null
    if (state?.isAuthenticated) {
      this.isAuthenticated = true
      this.handle = state.handle
    }
  }

  private async handleLogin(): Promise<void> {
    if (!this.loginHandle.trim()) return

    this.isLoggingIn = true
    this.showLoginForm = false

    const result = (await window.atBrowser.authLogin(this.loginHandle.trim())) as { did: string; handle: string; isAuthenticated: boolean } | null

    this.isLoggingIn = false

    if (result?.isAuthenticated) {
      this.isAuthenticated = true
      this.handle = result.handle
      this.dispatchEvent(new CustomEvent('auth-changed', { bubbles: true, composed: true }))
    }
  }

  private async handleLogout(): Promise<void> {
    await window.atBrowser.authLogout()
    this.isAuthenticated = false
    this.handle = ''
    this.dispatchEvent(new CustomEvent('auth-changed', { bubbles: true, composed: true }))
  }

  private async cancelLogin(): Promise<void> {
    await window.atBrowser.authCancel()
    this.isLoggingIn = false
  }
}
```

Add `<account-widget>` to the shell-window toolbar.

**Testing:**

Tests must verify:
- atmo-browser.AC6.3: When authenticated, widget shows handle text
- atmo-browser.AC6.4: Cancel button during login flow returns to logged-out state

Test file: `src/renderer/components/account-widget.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: account widget with login/logout UI`
<!-- END_TASK_3 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (tasks 4-5) -->
<!-- START_TASK_4 -->
### Task 4: AuthChannel and write operations IPC

**Verifies:** atmo-browser.AC7.1, atmo-browser.AC7.2, atmo-browser.AC7.3, atmo-browser.AC7.5

**Files:**
- Create: `src/main/auth/write-operations.ts`
- Modify: `src/main/auth/auth-ipc.ts`
- Modify: `src/preload/index.ts`

**Implementation:**

Write operations module that uses the authenticated session to create/delete records. Exposes IPC handlers for like, repost, and reply actions.

`src/main/auth/write-operations.ts`:

```typescript
import { ipcMain } from 'electron'
import { initOAuthClient } from './oauth-client.js'
import { getCurrentAuth } from './auth-ipc.js'

export type WriteResult = {
  readonly success: boolean
  readonly uri?: string
  readonly cid?: string
  readonly error?: string
}

async function createRecord(collection: string, record: unknown): Promise<WriteResult> {
  const auth = getCurrentAuth()
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

async function deleteRecord(collection: string, rkey: string): Promise<WriteResult> {
  const auth = getCurrentAuth()
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

export function registerWriteIpc(): void {
  ipcMain.handle('write-like', async (_event, subjectUri: string, subjectCid: string) => {
    return createRecord('app.bsky.feed.like', {
      $type: 'app.bsky.feed.like',
      subject: { uri: subjectUri, cid: subjectCid },
      createdAt: new Date().toISOString(),
    })
  })

  ipcMain.handle('write-repost', async (_event, subjectUri: string, subjectCid: string) => {
    return createRecord('app.bsky.feed.repost', {
      $type: 'app.bsky.feed.repost',
      subject: { uri: subjectUri, cid: subjectCid },
      createdAt: new Date().toISOString(),
    })
  })

  ipcMain.handle(
    'write-reply',
    async (_event, text: string, parentUri: string, parentCid: string, rootUri: string, rootCid: string) => {
      return createRecord('app.bsky.feed.post', {
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

  ipcMain.handle('write-delete', async (_event, collection: string, rkey: string) => {
    return deleteRecord(collection, rkey)
  })
}
```

Note: The exact way to access the session's access token and server URL depends on the `@atproto/oauth-client-node` API. The executor should verify how to get the authenticated session's bearer token and PDS URL at execution time. Using `@atproto/api` Agent with the OAuthSession may be more appropriate.

Update preload to expose write operations:

```typescript
writeLike: (subjectUri: string, subjectCid: string): Promise<unknown> =>
  ipcRenderer.invoke('write-like', subjectUri, subjectCid),
writeRepost: (subjectUri: string, subjectCid: string): Promise<unknown> =>
  ipcRenderer.invoke('write-repost', subjectUri, subjectCid),
writeReply: (text: string, parentUri: string, parentCid: string, rootUri: string, rootCid: string): Promise<unknown> =>
  ipcRenderer.invoke('write-reply', text, parentUri, parentCid, rootUri, rootCid),
writeDelete: (collection: string, rkey: string): Promise<unknown> =>
  ipcRenderer.invoke('write-delete', collection, rkey),
```

**Testing:**

Tests must verify:
- atmo-browser.AC7.1: `write-like` creates an `app.bsky.feed.like` record with correct subject
- atmo-browser.AC7.2: `write-repost` creates an `app.bsky.feed.repost` record with correct subject
- atmo-browser.AC7.3: `write-reply` creates an `app.bsky.feed.post` with reply refs
- atmo-browser.AC7.5: When not authenticated, write operations return `{success: false, error: ...}`
- atmo-browser.AC7.5: When network fails, returns error result without throwing

Test file: `src/main/auth/write-operations.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: write operations IPC for like, repost, reply`
<!-- END_TASK_4 -->

<!-- START_TASK_5 -->
### Task 5: Post tile interaction buttons

**Verifies:** atmo-browser.AC7.1, atmo-browser.AC7.2, atmo-browser.AC7.4, atmo-browser.AC7.5

**Files:**
- Modify: `src/renderer/tiles/post-tile.ts`

**Implementation:**

Add like, repost, and reply buttons to the post tile. Buttons are hidden when not authenticated (AC7.4). On click, invoke write IPC. Show success/error feedback. Reply button opens a simple text input.

Add to post-tile:

```typescript
@property({ type: Boolean })
isAuthenticated = false

@property({ type: String })
postCid = ''

@state()
private showReplyInput = false

@state()
private replyText = ''

@state()
private writeError: string | null = null

@state()
private likeSuccess = false

@state()
private repostSuccess = false
```

Add interaction bar styles:

```css
.interaction-bar {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  padding-top: 8px;
}

.interaction-btn {
  padding: 4px 8px;
  border: 1px solid var(--shell-border);
  border-radius: 4px;
  background: none;
  color: var(--shell-text-muted);
  font-size: 12px;
  cursor: pointer;
}

.interaction-btn:hover {
  background: var(--shell-surface);
  color: var(--shell-fg);
}

.interaction-btn.success {
  color: var(--shell-accent);
  border-color: var(--shell-accent);
}

.reply-input {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  padding: 8px;
  background: var(--shell-surface);
  border-radius: 4px;
}

.reply-input textarea {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--shell-border);
  border-radius: 4px;
  background: var(--shell-input-bg);
  color: var(--shell-fg);
  font-size: 13px;
  resize: vertical;
  min-height: 60px;
}

.write-error {
  color: var(--shell-error);
  font-size: 12px;
  margin-top: 4px;
}
```

Render interaction bar only when authenticated:

```typescript
private renderInteractions() {
  if (!this.isAuthenticated) return nothing

  return html`
    <div class="interaction-bar">
      <button class="interaction-btn ${this.likeSuccess ? 'success' : ''}" @click="${this.handleLike}">
        ${this.likeSuccess ? '♥ Liked' : '♡ Like'}
      </button>
      <button class="interaction-btn ${this.repostSuccess ? 'success' : ''}" @click="${this.handleRepost}">
        ${this.repostSuccess ? '↻ Reposted' : '↻ Repost'}
      </button>
      <button class="interaction-btn" @click="${() => { this.showReplyInput = !this.showReplyInput }}">
        ↩ Reply
      </button>
    </div>
    ${this.showReplyInput ? this.renderReplyInput() : nothing}
    ${this.writeError ? html`<p class="write-error">${this.writeError}</p>` : nothing}
  `
}
```

**Testing:**

Tests must verify:
- atmo-browser.AC7.1: Like button calls writeLike IPC with correct URI and CID
- atmo-browser.AC7.2: Repost button calls writeRepost IPC with correct URI and CID
- atmo-browser.AC7.4: Interaction bar is not rendered when isAuthenticated=false
- atmo-browser.AC7.5: Write failure shows error message in writeError state

Test file: `src/renderer/tiles/post-tile.test.ts` (extend existing)

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

Run: `npx electron-vite dev`
Expected: When logged in, posts show like/repost/reply buttons. Clicking like creates a record. When logged out, buttons are hidden.

**Commit:** `feat: post tile interaction buttons (like, repost, reply)`
<!-- END_TASK_5 -->
<!-- END_SUBCOMPONENT_B -->
