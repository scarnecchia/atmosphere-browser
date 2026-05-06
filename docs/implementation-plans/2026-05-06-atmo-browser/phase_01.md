# Atmosphere Browser Implementation Plan — Phase 1: Project Scaffold and Protocol Layer

**Goal:** Electron app that resolves `at://` URIs and fetches records from PDSes, with Slingshot for fast identity resolution.

**Architecture:** Three-layer Electron app (main process handles protocol, renderer uses Lit web components, content rendered via DASL tiles). This phase builds the main process protocol layer and project scaffold only.

**Tech Stack:** Electron 34+, TypeScript (strict), Vite (via electron-vite), Lit 3+, @atproto/api, @dasl/tiles

**Scope:** 7 phases from original design (phase 1 of 7)

**Codebase verified:** 2026-05-06 — greenfield project, only design plan exists

---

## Acceptance Criteria Coverage

This phase is an infrastructure phase. Verification is operational (build succeeds, app launches, protocol resolves).

**Verifies: None** — this phase establishes scaffolding. Functional ACs begin in Phase 2.

---

<!-- START_TASK_1 -->
### Task 1: Initialize project with package.json and .gitignore

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.npmrc`

**Step 1: Create package.json**

```json
{
  "name": "atmosphere-browser",
  "version": "0.1.0",
  "description": "Desktop browser for the AT Protocol atmosphere",
  "private": true,
  "type": "module",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@atproto/api": "^0.19.14",
    "@dasl/tiles": "^1.1.3",
    "lit": "^3.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "electron": "^34.0.0",
    "electron-vite": "^2.4.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

**Step 2: Create .gitignore**

```
node_modules/
dist/
out/
*.tsbuildinfo
.env
.env.local
.vite/
```

**Step 3: Create .npmrc**

```
engine-strict=true
```

**Step 4: Verify operationally**

Run: `npm install`
Expected: Installs without errors. `node_modules/` directory created.

**Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore .npmrc
git commit -m "chore: initialize project with dependencies"
```
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: TypeScript and electron-vite configuration

**Files:**
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `electron-vite.config.ts`

**Step 1: Create tsconfig.json (base)**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

**Step 2: Create tsconfig.node.json (main process + preload)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist/main",
    "rootDir": "./src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "composite": true
  },
  "include": ["src/main/**/*", "src/preload/**/*"]
}
```

**Step 3: Create tsconfig.web.json (renderer process)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "./dist/renderer",
    "rootDir": "./src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "composite": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  },
  "include": ["src/renderer/**/*"]
}
```

**Step 4: Create electron-vite.config.ts**

```typescript
import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: 'src/main/index.ts',
      },
    },
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: 'src/preload/index.ts',
      },
    },
  },
  renderer: {
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: 'src/renderer/index.html',
      },
    },
  },
})
```

**Step 5: Verify operationally**

Run: `npx tsc --noEmit`
Expected: No errors (no source files yet, but config is valid).

**Step 6: Commit**

```bash
git add tsconfig.json tsconfig.node.json tsconfig.web.json electron-vite.config.ts
git commit -m "chore: add TypeScript and electron-vite configuration"
```
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: ESLint configuration and shared preload type declarations

**Files:**
- Create: `eslint.config.ts`
- Create: `src/shared/preload-api.d.ts`

**Step 1: Create eslint.config.ts**

```typescript
import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.config.*'],
  },
)
```

Add to package.json devDependencies:
```json
"@eslint/js": "^9.0.0",
"typescript-eslint": "^8.0.0",
"eslint": "^9.0.0"
```

**Step 2: Create src/shared/preload-api.d.ts**

Centralized type declaration for the Window.atBrowser interface. This file grows with each phase as new IPC methods are added.

```typescript
export type PreloadApi = {
  resolveUri: (uri: string) => Promise<unknown>
}

declare global {
  interface Window {
    atBrowser: PreloadApi
  }
}
```

**Step 3: Verify operationally**

Run: `npm install`
Expected: ESLint installs without errors.

Run: `npx eslint src/ --max-warnings=0`
Expected: No lint errors (no source files yet).

**Step 4: Commit**

```bash
git add eslint.config.ts src/shared/preload-api.d.ts
git commit -m "chore: add ESLint config and shared preload type declarations"
```
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Electron main process entry with at:// protocol registration

**Files:**
- Create: `src/main/index.ts`
- Create: `src/main/protocol.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.ts`

**Step 1: Create src/main/protocol.ts**

This module registers the `at://` scheme as privileged (must be called before app ready) and sets up the protocol handler.

```typescript
import { protocol } from 'electron'

export function registerAtProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'at',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ])
}

export function registerAtProtocolHandler(): void {
  protocol.handle('at', async (request) => {
    const url = request.url
    console.log(`[protocol] Handling at:// request: ${url}`)
    return new Response(JSON.stringify({ status: 'resolving', uri: url }), {
      headers: { 'Content-Type': 'application/json' },
    })
  })
}
```

**Step 2: Create src/main/index.ts**

```typescript
import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { registerAtProtocolScheme, registerAtProtocolHandler } from './protocol.js'

registerAtProtocolScheme()

async function createWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    await win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    await win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(async () => {
  registerAtProtocolHandler()
  await createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow()
  }
})
```

**Step 3: Create src/preload/index.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('atBrowser', {
  resolveUri: (uri: string): Promise<unknown> => ipcRenderer.invoke('resolve-uri', uri),
})
```

**Step 4: Create src/renderer/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'" />
  <title>Atmosphere Browser</title>
</head>
<body>
  <div id="app">
    <h1>Atmosphere Browser</h1>
    <p>Protocol layer initializing...</p>
  </div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

**Step 5: Create src/renderer/main.ts (minimal entry)**

```typescript
console.log('Atmosphere Browser renderer loaded')
```

**Step 6: Verify operationally**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

Run: `npx electron-vite build`
Expected: Builds main, preload, and renderer without errors.

**Step 7: Commit**

```bash
git add src/
git commit -m "feat: electron app scaffold with at:// protocol handler"
```
<!-- END_TASK_4 -->

<!-- START_SUBCOMPONENT_A (tasks 5-6) -->
<!-- START_TASK_5 -->
### Task 5: Identity resolution module (handle → DID → PDS endpoint)

**Files:**
- Create: `src/main/identity.ts`
- Create: `src/main/types.ts`

**Step 1: Create src/main/types.ts**

Shared types for the protocol layer.

```typescript
export type MiniDoc = {
  readonly did: string
  readonly handle: string
  readonly pds: string
  readonly signingKey: string | null
}

export type ResolvedUri = {
  readonly did: string
  readonly handle: string | null
  readonly pds: string
  readonly collection: string | null
  readonly rkey: string | null
}

export type ParsedAtUri = {
  readonly authority: string
  readonly collection: string | null
  readonly rkey: string | null
}
```

**Step 2: Create src/main/identity.ts**

```typescript
import type { MiniDoc, ParsedAtUri, ResolvedUri } from './types.js'

const SLINGSHOT_BASE = 'https://slingshot.microcosm.blue'
const PLC_DIRECTORY = 'https://plc.directory'

export function parseAtUri(uri: string): ParsedAtUri {
  const normalized = uri.startsWith('at://') ? uri : `at://${uri}`
  const withoutScheme = normalized.slice(5)
  const parts = withoutScheme.split('/')

  return {
    authority: parts[0] ?? '',
    collection: parts[1] ?? null,
    rkey: parts[2] ?? null,
  }
}

export async function resolveMiniDoc(identifier: string): Promise<MiniDoc | null> {
  const url = `${SLINGSHOT_BASE}/xrpc/blue.microcosm.identity.resolveMiniDoc?identifier=${encodeURIComponent(identifier)}`

  const response = await fetch(url)
  if (!response.ok) {
    console.warn(`[identity] Slingshot resolveMiniDoc failed for ${identifier}: ${response.status}`)
    return null
  }

  const data = (await response.json()) as MiniDoc
  return data
}

export async function resolveHandleViaDns(handle: string): Promise<string | null> {
  const response = await fetch(`https://dns.google/resolve?name=_atproto.${handle}&type=TXT`)

  if (!response.ok) return null

  const data = (await response.json()) as { Answer?: ReadonlyArray<{ data: string }> }
  const answer = data.Answer?.find((a) => a.data.startsWith('"did='))
  if (!answer) return null

  return answer.data.replace(/^"did=/, '').replace(/"$/, '')
}

export async function resolveIdentity(identifier: string): Promise<ResolvedUri | null> {
  const miniDoc = await resolveMiniDoc(identifier)
  if (miniDoc) {
    return {
      did: miniDoc.did,
      handle: miniDoc.handle,
      pds: miniDoc.pds,
      collection: null,
      rkey: null,
    }
  }

  if (identifier.startsWith('did:')) {
    const plcResponse = await fetch(`${PLC_DIRECTORY}/${encodeURIComponent(identifier)}`)
    if (!plcResponse.ok) return null

    const doc = (await plcResponse.json()) as {
      alsoKnownAs?: ReadonlyArray<string>
      service?: ReadonlyArray<{ id: string; serviceEndpoint: string }>
    }

    const handle = doc.alsoKnownAs?.find((aka) => aka.startsWith('at://'))?.slice(5) ?? null
    const pds = doc.service?.find((s) => s.id === '#atproto_pds')?.serviceEndpoint ?? null

    if (!pds) return null

    return { did: identifier, handle, pds, collection: null, rkey: null }
  }

  const did = await resolveHandleViaDns(identifier)
  if (!did) return null

  return resolveIdentity(did)
}

export async function resolveAtUri(uri: string): Promise<ResolvedUri | null> {
  const parsed = parseAtUri(uri)
  if (!parsed.authority) return null

  const resolved = await resolveIdentity(parsed.authority)
  if (!resolved) return null

  return {
    ...resolved,
    collection: parsed.collection,
    rkey: parsed.rkey,
  }
}
```

**Step 3: Verify operationally**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Step 4: Commit**

```bash
git add src/main/identity.ts src/main/types.ts
git commit -m "feat: identity resolution module with Slingshot and PLC fallback"
```
<!-- END_TASK_5 -->

<!-- START_TASK_6 -->
### Task 6: XRPC client for PDS communication

**Files:**
- Create: `src/main/xrpc-client.ts`

**Step 1: Create src/main/xrpc-client.ts**

This wraps @atproto/api for PDS communication. Uses the resolved PDS endpoint from identity resolution.

```typescript
import type { ResolvedUri } from './types.js'

export type RepoDescription = {
  readonly handle: string
  readonly did: string
  readonly collections: ReadonlyArray<string>
}

export type RecordEntry = {
  readonly uri: string
  readonly cid: string
  readonly value: unknown
}

export type RecordListResult = {
  readonly records: ReadonlyArray<RecordEntry>
  readonly cursor: string | null
}

export async function describeRepo(pds: string, repo: string): Promise<RepoDescription | null> {
  const url = `${pds}/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(repo)}`
  const response = await fetch(url)
  if (!response.ok) return null

  const data = (await response.json()) as {
    handle: string
    did: string
    collections: ReadonlyArray<string>
  }

  return {
    handle: data.handle,
    did: data.did,
    collections: data.collections,
  }
}

export async function listRecords(
  pds: string,
  repo: string,
  collection: string,
  limit: number = 25,
  cursor: string | null = null,
): Promise<RecordListResult | null> {
  let url = `${pds}/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(repo)}&collection=${encodeURIComponent(collection)}&limit=${limit}`
  if (cursor) {
    url += `&cursor=${encodeURIComponent(cursor)}`
  }

  const response = await fetch(url)
  if (!response.ok) return null

  const data = (await response.json()) as {
    records: ReadonlyArray<RecordEntry>
    cursor?: string
  }

  return {
    records: data.records,
    cursor: data.cursor ?? null,
  }
}

export async function getRecord(
  pds: string,
  repo: string,
  collection: string,
  rkey: string,
): Promise<RecordEntry | null> {
  const url = `${pds}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(repo)}&collection=${encodeURIComponent(collection)}&rkey=${encodeURIComponent(rkey)}`
  const response = await fetch(url)
  if (!response.ok) return null

  return (await response.json()) as RecordEntry
}

export async function getBlob(pds: string, did: string, cid: string): Promise<ArrayBuffer | null> {
  const url = `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`
  const response = await fetch(url)
  if (!response.ok) return null

  return response.arrayBuffer()
}
```

**Step 2: Verify operationally**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Step 3: Commit**

```bash
git add src/main/xrpc-client.ts
git commit -m "feat: XRPC client for PDS record fetching"
```
<!-- END_TASK_6 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_TASK_7 -->
### Task 7: Wire IPC handlers for URI resolution

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

**Step 1: Update src/main/index.ts to add IPC handlers**

Add IPC handler imports and registration after app ready. Add these imports at the top:

```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
```

Add after `registerAtProtocolHandler()` inside `app.whenReady().then(...)`:

```typescript
  ipcMain.handle('resolve-uri', async (_event, uri: string) => {
    const { resolveAtUri } = await import('./identity.js')
    const { describeRepo, listRecords, getRecord } = await import('./xrpc-client.js')

    const resolved = await resolveAtUri(uri)
    if (!resolved) return { error: 'Failed to resolve URI', uri }

    if (!resolved.collection && !resolved.rkey) {
      const repo = await describeRepo(resolved.pds, resolved.did)
      return { type: 'repo', resolved, repo }
    }

    if (resolved.collection && !resolved.rkey) {
      const records = await listRecords(resolved.pds, resolved.did, resolved.collection)
      return { type: 'collection', resolved, records }
    }

    if (resolved.collection && resolved.rkey) {
      const record = await getRecord(resolved.pds, resolved.did, resolved.collection, resolved.rkey)
      return { type: 'record', resolved, record }
    }

    return { error: 'Invalid URI format', uri }
  })
```

**Step 2: Update src/preload/index.ts**

The preload already exposes `resolveUri` — no changes needed.

**Step 3: Verify operationally**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

Run: `npx electron-vite build`
Expected: Builds without errors.

**Step 4: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: wire IPC handlers for AT-URI resolution"
```
<!-- END_TASK_7 -->

<!-- START_TASK_8 -->
### Task 8: End-to-end verification — app launches and resolves a URI

**Files:**
- Modify: `src/renderer/main.ts`

**Step 1: Update src/renderer/main.ts to test resolution**

```typescript
declare global {
  interface Window {
    atBrowser: {
      resolveUri: (uri: string) => Promise<unknown>
    }
  }
}

async function testResolution(): Promise<void> {
  const app = document.getElementById('app')
  if (!app) return

  app.innerHTML = '<h1>Atmosphere Browser</h1><p>Resolving at://bsky.app ...</p>'

  try {
    const result = await window.atBrowser.resolveUri('at://bsky.app')
    console.log('[renderer] Resolution result:', result)
    app.innerHTML = `<h1>Atmosphere Browser</h1><pre>${JSON.stringify(result, null, 2)}</pre>`
  } catch (err) {
    console.error('[renderer] Resolution failed:', err)
    app.innerHTML = `<h1>Atmosphere Browser</h1><p>Resolution failed: ${String(err)}</p>`
  }
}

testResolution()
```

**Step 2: Verify operationally**

Run: `npx electron-vite dev`
Expected:
- App window opens
- Console shows `[protocol] Handling at:// request: ...` messages
- Resolution result appears in the window (either repo data from bsky.app or an error if offline)
- No crashes or unhandled errors

Run: `npx electron-vite build`
Expected: Builds without errors.

**Step 3: Commit**

```bash
git add src/renderer/main.ts
git commit -m "feat: end-to-end URI resolution verification"
```
<!-- END_TASK_8 -->
