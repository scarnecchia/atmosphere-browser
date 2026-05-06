# Atmosphere Browser Implementation Plan — Phase 3: Tile Runtime

**Goal:** DASL tile loading, sandboxing, and context API working in the browser — tiles receive record data and render content.

**Architecture:** TileMothership configures loaders in the main process. Tile rendering happens in sandboxed renderer webContents. The shell bridges protocol layer data into the tile context API. Schema fallback renderer handles unknown lexicons.

**Tech Stack:** @dasl/tiles (TileMothership, loaders), Electron webContents sandboxing, CSP headers, TypeScript

**Scope:** 7 phases from original design (phase 3 of 7)

**Codebase verified:** 2026-05-06 — Phase 2 shell exists with address bar, tabs, navigation, IPC bridge. @dasl/tiles installed in Phase 1.

---

## Acceptance Criteria Coverage

This phase implements and tests:

### atmo-browser.AC2: Tile rendering system
- **atmo-browser.AC2.1 Success:** Built-in tiles load from pre-cached local storage without network requests
- **atmo-browser.AC2.2 Success:** Tile sandbox prevents network access beyond manifest-declared resources
- **atmo-browser.AC2.3 Success:** Tile context API delivers record, lexicon, engagement, and identity data to tiles
- **atmo-browser.AC2.4 Failure:** A malformed tile manifest fails to load with an error message rather than crashing the browser
- **atmo-browser.AC2.5 Edge:** Tile that throws a runtime error is caught; browser shows fallback rather than blank content

---

<!-- START_SUBCOMPONENT_A (tasks 1-2) -->
<!-- START_TASK_1 -->
### Task 1: Tile context types and interface definitions

**Verifies:** atmo-browser.AC2.3

**Files:**
- Create: `src/main/tile-context.ts`
- Modify: `src/main/types.ts`

**Implementation:**

Define the TileContext interface that bridges protocol layer data into the tile runtime. This matches the design plan's TileContext specification exactly.

Add to `src/main/types.ts`:

```typescript
export type EngagementData = {
  readonly likes: number
  readonly reposts: number
  readonly replies: number
  readonly backlinks: ReadonlyArray<BacklinkEntry>
}

export type BacklinkEntry = {
  readonly uri: string
  readonly cid: string
  readonly authorDid: string
  readonly collection: string
  readonly indexedAt: string
}

export type IdentityInfo = {
  readonly did: string
  readonly handle: string
  readonly pds: string
}

export type AuthChannel = {
  readonly did: string
  readonly handle: string
  readonly createRecord: (collection: string, record: unknown) => Promise<{ uri: string; cid: string }>
  readonly deleteRecord: (collection: string, rkey: string) => Promise<void>
}

export type TileContext = {
  readonly record: unknown
  readonly lexicon: unknown
  readonly engagement: EngagementData
  readonly identity: IdentityInfo
  readonly auth: AuthChannel | null
  readonly navigate: (atUri: string) => void
}
```

Create `src/main/tile-context.ts`:

```typescript
import type { EngagementData, IdentityInfo, TileContext } from './types.js'

export function createTileContext(options: {
  record: unknown
  lexicon: unknown
  identity: IdentityInfo
  engagement?: EngagementData
  navigate: (atUri: string) => void
}): TileContext {
  return {
    record: options.record,
    lexicon: options.lexicon,
    identity: options.identity,
    engagement: options.engagement ?? { likes: 0, reposts: 0, replies: 0, backlinks: [] },
    auth: null,
    navigate: options.navigate,
  }
}

export function createEmptyEngagement(): EngagementData {
  return { likes: 0, reposts: 0, replies: 0, backlinks: [] }
}
```

**Testing:**

Tests must verify:
- atmo-browser.AC2.3: `createTileContext` produces a complete TileContext with all required fields
- Default engagement data is zeroed when not provided
- navigate callback is passed through correctly

Test file: `src/main/tile-context.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: tile context types and factory`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Tile mothership configuration and loader setup

**Verifies:** atmo-browser.AC2.1

**Files:**
- Create: `src/main/tile-runtime.ts`

**Implementation:**

Configure TileMothership with loaders. MemoryTileLoader for built-in tiles (pre-cached at install). CARTileLoader for local cache. ATTileLoader for remote community tiles.

```typescript
import { TileMothership, MemoryTileLoader, CARTileLoader, ATTileLoader } from '@dasl/tiles'
import { join } from 'node:path'
import { app } from 'electron'

let mothership: TileMothership | null = null

export function getTileMothership(): TileMothership {
  if (!mothership) {
    mothership = new TileMothership()

    const memoryLoader = new MemoryTileLoader()
    const carLoader = new CARTileLoader({
      cacheDir: join(app.getPath('userData'), 'tile-cache'),
    })
    const atLoader = new ATTileLoader()

    mothership.registerLoader(memoryLoader)
    mothership.registerLoader(carLoader)
    mothership.registerLoader(atLoader)
  }

  return mothership
}

export async function loadTileForNsid(nsid: string): Promise<unknown> {
  const ms = getTileMothership()
  try {
    const tile = await ms.loadTile(nsid)
    return tile
  } catch (err) {
    console.warn(`[tile-runtime] Failed to load tile for ${nsid}:`, err)
    return null
  }
}
```

Note: The exact API of @dasl/tiles may differ from this implementation. The executor should verify the actual package API and adjust constructor arguments and method signatures accordingly. The key contract is: configure mothership with loaders, call loadTile with an identifier, get a renderable tile back.

**Testing:**

Tests must verify:
- atmo-browser.AC2.1: Mothership is created with MemoryTileLoader registered first (built-in tiles resolved without network)
- Loader registration order: memory → CAR → AT (local before remote)

Test file: `src/main/tile-runtime.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: tile mothership configuration with loaders`
<!-- END_TASK_2 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (tasks 3-4) -->
<!-- START_TASK_3 -->
### Task 3: Schema fallback renderer

**Verifies:** atmo-browser.AC2.3, atmo-browser.AC2.5

**Files:**
- Create: `src/renderer/components/schema-fallback.ts`

**Implementation:**

A Lit component that renders any record as a structured view from its data. Displays field names, types, and values in a human-readable format. Handles nested objects with collapsible sections. This serves as the fallback when no purpose-built tile exists for an NSID.

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('schema-fallback')
export class SchemaFallback extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 16px;
        font-family: monospace;
        font-size: 13px;
        line-height: 1.6;
      }

      .field {
        margin: 4px 0;
        padding: 4px 0;
      }

      .field-name {
        color: var(--shell-accent);
        font-weight: bold;
      }

      .field-value {
        color: var(--shell-fg);
        margin-left: 8px;
      }

      .field-type {
        color: var(--shell-text-muted);
        font-size: 11px;
        margin-left: 4px;
      }

      .nested {
        margin-left: 16px;
        padding-left: 12px;
        border-left: 1px solid var(--shell-border);
      }

      .collection-header {
        color: var(--shell-text-muted);
        font-size: 12px;
        margin-bottom: 8px;
      }

      .uri-link {
        color: var(--shell-accent);
        cursor: pointer;
        text-decoration: underline;
      }

      .uri-link:hover {
        opacity: 0.8;
      }

      .array-item {
        margin: 4px 0;
        padding: 4px 8px;
        background: var(--shell-surface);
        border-radius: 4px;
      }

      .error-boundary {
        color: var(--shell-error);
        padding: 8px;
        border: 1px solid var(--shell-error);
        border-radius: 4px;
      }
    `,
  ]

  @property({ attribute: false })
  record: unknown = null

  @property({ type: String })
  collection = ''

  @property({ type: String })
  uri = ''

  render() {
    if (!this.record) {
      return html`<p class="error-boundary">No record data</p>`
    }

    try {
      return html`
        ${this.collection ? html`<p class="collection-header">${this.collection}</p>` : ''}
        ${this.uri ? html`<p class="collection-header">${this.uri}</p>` : ''}
        ${this.renderValue(this.record, 0)}
      `
    } catch {
      return html`<p class="error-boundary">Error rendering record</p>`
    }
  }

  private renderValue(value: unknown, depth: number): unknown {
    if (depth > 10) return html`<span class="field-value">[max depth]</span>`

    if (value === null || value === undefined) {
      return html`<span class="field-value">null</span>`
    }

    if (typeof value === 'string') {
      if (value.startsWith('at://')) {
        return html`<span class="uri-link" @click="${() => this.handleLinkClick(value)}">${value}</span>`
      }
      return html`<span class="field-value">"${value}"</span>`
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return html`<span class="field-value">${String(value)}</span>`
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return html`<span class="field-value">[]</span>`
      return html`
        <div class="nested">
          ${value.map(
            (item, i) => html`
              <div class="array-item">
                <span class="field-type">[${i}]</span>
                ${this.renderValue(item, depth + 1)}
              </div>
            `,
          )}
        </div>
      `
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
      return html`
        <div class="${depth > 0 ? 'nested' : ''}">
          ${entries.map(
            ([key, val]) => html`
              <div class="field">
                <span class="field-name">${key}</span>
                <span class="field-type">(${this.getTypeName(val)})</span>
                ${typeof val === 'object' && val !== null
                  ? this.renderValue(val, depth + 1)
                  : html`<span class="field-value">${this.renderValue(val, depth + 1)}</span>`}
              </div>
            `,
          )}
        </div>
      `
    }

    return html`<span class="field-value">${String(value)}</span>`
  }

  private getTypeName(value: unknown): string {
    if (value === null || value === undefined) return 'null'
    if (Array.isArray(value)) return `array[${value.length}]`
    return typeof value
  }

  private handleLinkClick(uri: string): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri },
        bubbles: true,
        composed: true,
      }),
    )
  }
}
```

**Testing:**

Tests must verify:
- atmo-browser.AC2.3: Component receives record data and renders field names and values
- atmo-browser.AC2.5: If record is malformed (throws during render), error boundary catches it and shows fallback message

Test file: `src/renderer/components/schema-fallback.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: schema fallback renderer for unknown record types`
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Tile rendering integration in shell

**Verifies:** atmo-browser.AC2.1, atmo-browser.AC2.3, atmo-browser.AC2.4, atmo-browser.AC2.5

**Files:**
- Create: `src/renderer/components/tile-host.ts`
- Modify: `src/renderer/components/shell-window.ts`
- Modify: `src/renderer/main.ts`
- Create: `src/main/tile-ipc.ts`
- Modify: `src/main/index.ts`

**Implementation:**

Create a `tile-host` component that:
1. Receives record data and collection NSID from the shell
2. Attempts to load the appropriate tile via IPC to main process
3. If tile loads: renders it via `renderContent()`
4. If tile fails to load (AC2.4): shows error message
5. If tile throws at runtime (AC2.5): catches error, shows schema-fallback instead
6. Falls back to schema-fallback for unknown NSIDs

`src/main/tile-ipc.ts` — IPC handler for tile operations:

```typescript
import { ipcMain } from 'electron'
import { getTileMothership } from './tile-runtime.js'

export function registerTileIpc(): void {
  ipcMain.handle('load-tile', async (_event, nsid: string) => {
    try {
      const mothership = getTileMothership()
      const tile = await mothership.loadTile(nsid)
      return { success: true, tile: tile ? 'loaded' : null }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
```

`src/renderer/components/tile-host.ts`:

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('tile-host')
export class TileHost extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
      }

      .tile-error {
        color: var(--shell-error);
        padding: 12px;
        border: 1px solid var(--shell-error);
        border-radius: 4px;
        margin: 8px 0;
      }

      .tile-error code {
        font-size: 12px;
        display: block;
        margin-top: 4px;
        color: var(--shell-text-muted);
      }
    `,
  ]

  @property({ attribute: false })
  record: unknown = null

  @property({ type: String })
  collection = ''

  @property({ type: String })
  uri = ''

  @property({ attribute: false })
  identity: { did: string; handle: string; pds: string } | null = null

  @state()
  private tileError: string | null = null

  @state()
  private useFallback = true

  render() {
    if (this.tileError) {
      return html`
        <div class="tile-error">
          <p>Tile failed to load</p>
          <code>${this.tileError}</code>
        </div>
        <schema-fallback
          .record="${this.record}"
          .collection="${this.collection}"
          .uri="${this.uri}"
        ></schema-fallback>
      `
    }

    if (this.useFallback) {
      return html`
        <schema-fallback
          .record="${this.record}"
          .collection="${this.collection}"
          .uri="${this.uri}"
        ></schema-fallback>
      `
    }

    return html`<p>Tile rendering not yet implemented</p>`
  }
}
```

Update the shell-window content area to use `tile-host` instead of raw JSON pre:

Replace the content rendering section to dispatch to tile-host when record data is available.

Update `src/renderer/main.ts` to import new components:

```typescript
import './components/shell-window.js'
import './components/address-bar.js'
import './components/tab-bar.js'
import './components/nav-controls.js'
import './components/tile-host.js'
import './components/schema-fallback.js'
```

Update `src/main/index.ts` to register tile IPC:

```typescript
import { registerTileIpc } from './tile-ipc.js'
// ... in app.whenReady():
registerTileIpc()
```

**Testing:**

Tests must verify:
- atmo-browser.AC2.1: Tile loading attempts MemoryTileLoader first (mock confirms no network request for built-in NSIDs)
- atmo-browser.AC2.3: Tile context includes record, identity, and engagement data
- atmo-browser.AC2.4: When tile load fails (malformed manifest), tile-host shows error message without crashing
- atmo-browser.AC2.5: When tile render throws, schema-fallback is shown instead of blank content

Test file: `src/renderer/components/tile-host.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

Run: `npx electron-vite build`
Expected: Builds without errors.

Run: `npx electron-vite dev`
Expected: Navigating to any `at://` URI now renders records through the schema fallback (structured field view) instead of raw JSON.

**Commit:** `feat: tile rendering host with fallback to schema renderer`
<!-- END_TASK_4 -->
<!-- END_SUBCOMPONENT_B -->

<!-- START_TASK_5 -->
### Task 5: Tile sandbox security configuration

**Verifies:** atmo-browser.AC2.2

**Files:**
- Create: `src/main/tile-sandbox.ts`

**Implementation:**

Configure CSP and sandbox policies for tile rendering. Tiles get a unique origin and restricted network access. Only resources declared in the tile's MASL manifest are allowed.

```typescript
import { session } from 'electron'

export function configureTileSandbox(): void {
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['*://tile-sandbox/*'] },
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'none'; frame-src 'none';",
          ],
          'Cross-Origin-Opener-Policy': ['same-origin'],
          'Cross-Origin-Resource-Policy': ['same-origin'],
        },
      })
    },
  )
}

export type SandboxConfig = {
  readonly allowedOrigins: ReadonlyArray<string>
  readonly allowScripts: boolean
  readonly allowForms: boolean
}

export function createSandboxConfig(
  manifestResources: ReadonlyArray<string> = [],
): SandboxConfig {
  return {
    allowedOrigins: manifestResources,
    allowScripts: true,
    allowForms: false,
  }
}
```

**Testing:**

Tests must verify:
- atmo-browser.AC2.2: CSP headers block `connect-src` (no network access by default for tiles)
- CORP/COOP headers set to same-origin

Test file: `src/main/tile-sandbox.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: tile sandbox CSP and security configuration`
<!-- END_TASK_5 -->
