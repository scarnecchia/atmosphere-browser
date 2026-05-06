# Atmosphere Browser Implementation Plan — Phase 7: Bookmarks, Settings, and Polish

**Goal:** Complete browser experience with bookmarks, settings, tile management, feed browsing, history, and external link handling.

**Architecture:** Bookmarks and history persisted to local JSON files in userData. Bookmark bar integrated into shell. Settings page as a dedicated Lit component. External links dispatched to system browser via Electron shell.openExternal(). Feed URIs treated as first-class browsable AT-URIs.

**Tech Stack:** Lit 3, Electron (shell.openExternal, app.getPath), filesystem persistence, TypeScript

**Scope:** 7 phases from original design (phase 7 of 7)

**Codebase verified:** 2026-05-06 — Phase 6 provides auth, write actions, full tile rendering, engagement. Shell window has toolbar, tabs, address bar, tile-host, account widget.

---

## Acceptance Criteria Coverage

This phase implements and tests:

### atmo-browser.AC8: Bookmarks and feeds
- **atmo-browser.AC8.1 Success:** User can bookmark any AT-URI
- **atmo-browser.AC8.2 Success:** Feed generator AT-URIs are bookmarkable and navigable
- **atmo-browser.AC8.3 Success:** Bookmarks persist across app restart
- **atmo-browser.AC8.4 Edge:** Bookmarked URI that no longer resolves shows "unavailable" indicator

### atmo-browser.AC9: Unknown lexicon fallback
- **atmo-browser.AC9.1 Success:** Records with unknown lexicon NSID render as auto-generated structured view from resolved schema
- **atmo-browser.AC9.2 Success:** Schema fallback shows field names, types, and values in human-readable format
- **atmo-browser.AC9.3 Failure:** Unresolvable lexicon schema falls back to raw JSON display with syntax highlighting
- **atmo-browser.AC9.4 Edge:** Record with deeply nested objects renders with collapsible sections

---

<!-- START_SUBCOMPONENT_A (tasks 1-3) -->
<!-- START_TASK_1 -->
### Task 1: Bookmark data model and persistence

**Verifies:** atmo-browser.AC8.1, atmo-browser.AC8.2, atmo-browser.AC8.3

**Files:**
- Create: `src/main/bookmarks.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

**Implementation:**

Bookmark manager that persists bookmarks to a JSON file in Electron's userData directory. Each bookmark stores the AT-URI, a user-provided title, and creation timestamp. Feed generator URIs are treated identically to any other AT-URI.

`src/main/bookmarks.ts`:

```typescript
import { app, ipcMain } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

export type Bookmark = {
  readonly uri: string
  readonly title: string
  readonly createdAt: string
}

const BOOKMARKS_PATH = join(app.getPath('userData'), 'bookmarks.json')

function loadBookmarks(): Array<Bookmark> {
  if (!existsSync(BOOKMARKS_PATH)) return []
  try {
    const data = readFileSync(BOOKMARKS_PATH, 'utf-8')
    return JSON.parse(data) as Array<Bookmark>
  } catch {
    return []
  }
}

function saveBookmarks(bookmarks: ReadonlyArray<Bookmark>): void {
  writeFileSync(BOOKMARKS_PATH, JSON.stringify(bookmarks, null, 2))
}

export function registerBookmarkIpc(): void {
  ipcMain.handle('bookmarks-list', (): ReadonlyArray<Bookmark> => {
    return loadBookmarks()
  })

  ipcMain.handle('bookmarks-add', (_event, uri: string, title: string): Bookmark => {
    const bookmarks = loadBookmarks()
    const bookmark: Bookmark = {
      uri,
      title: title || uri,
      createdAt: new Date().toISOString(),
    }
    bookmarks.push(bookmark)
    saveBookmarks(bookmarks)
    return bookmark
  })

  ipcMain.handle('bookmarks-remove', (_event, uri: string): void => {
    const bookmarks = loadBookmarks()
    const filtered = bookmarks.filter((b) => b.uri !== uri)
    saveBookmarks(filtered)
  })

  ipcMain.handle('bookmarks-is-bookmarked', (_event, uri: string): boolean => {
    const bookmarks = loadBookmarks()
    return bookmarks.some((b) => b.uri === uri)
  })
}
```

Update preload:

```typescript
bookmarksList: (): Promise<unknown> => ipcRenderer.invoke('bookmarks-list'),
bookmarksAdd: (uri: string, title: string): Promise<unknown> => ipcRenderer.invoke('bookmarks-add', uri, title),
bookmarksRemove: (uri: string): Promise<void> => ipcRenderer.invoke('bookmarks-remove', uri),
bookmarksIsBookmarked: (uri: string): Promise<boolean> => ipcRenderer.invoke('bookmarks-is-bookmarked', uri),
```

Register in `src/main/index.ts`:

```typescript
import { registerBookmarkIpc } from './bookmarks.js'
// in app.whenReady():
registerBookmarkIpc()
```

**Testing:**

Tests must verify:
- atmo-browser.AC8.1: `bookmarks-add` saves a bookmark with URI and title
- atmo-browser.AC8.2: Feed generator URI (`at://did/app.bsky.feed.generator/rkey`) is saved identically to any other URI
- atmo-browser.AC8.3: After add, `bookmarks-list` returns the saved bookmark (persisted to file)
- Remove operation filters out the matching URI

Test file: `src/main/bookmarks.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: bookmark persistence with add/remove/list`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Bookmark bar component

**Verifies:** atmo-browser.AC8.1, atmo-browser.AC8.4

**Files:**
- Create: `src/renderer/components/bookmark-bar.ts`
- Modify: `src/renderer/components/shell-window.ts`
- Modify: `src/renderer/main.ts`

**Implementation:**

Bookmark bar renders saved bookmarks as clickable chips. Clicking navigates to the bookmark URI. Shows "unavailable" indicator if last navigation to that URI failed. Includes a bookmark button in the toolbar that adds/removes the current page.

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

type BookmarkItem = {
  uri: string
  title: string
}

@customElement('bookmark-bar')
export class BookmarkBar extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: var(--shell-bg);
        border-bottom: 1px solid var(--shell-border);
        min-height: 28px;
        flex-wrap: wrap;
      }

      .bookmark-chip {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        color: var(--shell-fg);
        background: var(--shell-surface);
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 150px;
      }

      .bookmark-chip:hover {
        background: var(--shell-border);
      }

      .bookmark-chip.unavailable {
        opacity: 0.5;
        text-decoration: line-through;
      }

      .empty {
        font-size: 11px;
        color: var(--shell-text-muted);
        font-style: italic;
      }
    `,
  ]

  @property({ attribute: false })
  bookmarks: ReadonlyArray<BookmarkItem> = []

  @property({ attribute: false })
  unavailableUris: ReadonlyArray<string> = []

  render() {
    if (this.bookmarks.length === 0) {
      return html`<span class="empty">No bookmarks yet</span>`
    }

    return html`
      ${this.bookmarks.map(
        (bm) => html`
          <span
            class="bookmark-chip ${this.unavailableUris.includes(bm.uri) ? 'unavailable' : ''}"
            title="${bm.uri}"
            @click="${() => this.navigateTo(bm.uri)}"
          >
            ${bm.title}
          </span>
        `,
      )}
    `
  }

  private navigateTo(uri: string): void {
    this.dispatchEvent(
      new CustomEvent('navigate', { detail: { uri }, bubbles: true, composed: true }),
    )
  }
}
```

Add bookmark bar to shell-window between toolbar and content. Shell-window loads bookmarks on startup and refreshes after add/remove.

Add a bookmark toggle button to the address bar area.

**Testing:**

Tests must verify:
- atmo-browser.AC8.1: Clicking bookmark chip emits navigate event with the URI
- atmo-browser.AC8.4: Bookmark with URI in unavailableUris list shows unavailable styling

Test file: `src/renderer/components/bookmark-bar.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: bookmark bar with unavailable indicators`
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: External link handling

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/tiles/post-tile.ts`

**Implementation:**

Non-AT-URI links (https://, http://) open in the system default browser via `shell.openExternal()`. Add IPC handler for opening external URLs. Update post tile's external link handler to use this IPC.

Add to main process:

```typescript
import { shell } from 'electron'

ipcMain.handle('open-external', async (_event, url: string): Promise<void> => {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    await shell.openExternal(url)
  }
})
```

Add to preload:

```typescript
openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
```

Update post-tile `handleExternalLink` to call `window.atBrowser.openExternal(uri)` for non-AT-URI links.

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: external link handling via shell.openExternal`
<!-- END_TASK_3 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (tasks 4-5) -->
<!-- START_TASK_4 -->
### Task 4: Enhanced schema fallback with collapsible sections and JSON fallback

**Verifies:** atmo-browser.AC9.1, atmo-browser.AC9.2, atmo-browser.AC9.3, atmo-browser.AC9.4

**Files:**
- Modify: `src/renderer/components/schema-fallback.ts`
- Create: `src/renderer/components/json-viewer.ts`

**Implementation:**

Enhance the schema-fallback renderer (from Phase 3) to:
1. Show collapsible sections for deeply nested objects (AC9.4)
2. Display field names and types prominently (AC9.2)
3. When lexicon schema is available, use it to annotate types (AC9.1)

Create a json-viewer component as the ultimate fallback when even schema information is unavailable (AC9.3):

`src/renderer/components/json-viewer.ts`:

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('json-viewer')
export class JsonViewer extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 16px;
        font-family: monospace;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .key { color: var(--shell-accent); }
      .string { color: #a6e3a1; }
      .number { color: #fab387; }
      .boolean { color: #f9e2af; }
      .null { color: var(--shell-text-muted); }
      .bracket { color: var(--shell-text-muted); }
    `,
  ]

  @property({ attribute: false })
  data: unknown = null

  render() {
    if (this.data === null || this.data === undefined) {
      return html`<span class="null">null</span>`
    }

    try {
      const formatted = JSON.stringify(this.data, null, 2)
      return html`<pre>${this.syntaxHighlight(formatted)}</pre>`
    } catch {
      return html`<pre class="null">[Unable to display]</pre>`
    }
  }

  private syntaxHighlight(json: string): string {
    return json
      .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
      .replace(/: "([^"]*?)"/g, ': <span class="string">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="boolean">$1</span>')
      .replace(/: null/g, ': <span class="null">null</span>')
  }
}
```

Update schema-fallback to add collapsible sections for nested objects:

- Add a `collapsed` state map tracking which paths are collapsed
- Nested objects (depth > 1) start collapsed with a toggle button
- Toggle shows/hides the nested content

**Testing:**

Tests must verify:
- atmo-browser.AC9.1: Unknown record renders with field names and values visible
- atmo-browser.AC9.2: Schema fallback shows field type annotations (string, number, array, etc.)
- atmo-browser.AC9.3: When no schema available, json-viewer shows syntax-highlighted JSON
- atmo-browser.AC9.4: Deeply nested objects have collapsible sections (toggle hides/shows)

Test file: `src/renderer/components/schema-fallback.test.ts` (extend), `src/renderer/components/json-viewer.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: enhanced schema fallback with collapsible sections and JSON viewer`
<!-- END_TASK_4 -->

<!-- START_TASK_5 -->
### Task 5: Browsing history and settings page

**Files:**
- Create: `src/main/history.ts`
- Create: `src/renderer/components/settings-page.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/main.ts`

**Implementation:**

Browsing history stored as a JSON file. Each entry records URI, title, and timestamp. Settings page provides cache clearing and basic display preferences.

`src/main/history.ts`:

```typescript
import { app, ipcMain } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

export type HistoryEntry = {
  readonly uri: string
  readonly title: string
  readonly visitedAt: string
}

const HISTORY_PATH = join(app.getPath('userData'), 'history.json')
const MAX_HISTORY = 1000

function loadHistory(): Array<HistoryEntry> {
  if (!existsSync(HISTORY_PATH)) return []
  try {
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf-8')) as Array<HistoryEntry>
  } catch {
    return []
  }
}

function saveHistory(history: ReadonlyArray<HistoryEntry>): void {
  writeFileSync(HISTORY_PATH, JSON.stringify(history.slice(0, MAX_HISTORY), null, 2))
}

export function registerHistoryIpc(): void {
  ipcMain.handle('history-list', (_event, query?: string): ReadonlyArray<HistoryEntry> => {
    const history = loadHistory()
    if (!query) return history.slice(0, 100)
    const lower = query.toLowerCase()
    return history.filter((h) => h.uri.toLowerCase().includes(lower) || h.title.toLowerCase().includes(lower)).slice(0, 100)
  })

  ipcMain.handle('history-add', (_event, uri: string, title: string): void => {
    const history = loadHistory()
    history.unshift({ uri, title, visitedAt: new Date().toISOString() })
    saveHistory(history)
  })

  ipcMain.handle('history-clear', (): void => {
    saveHistory([])
  })
}
```

Settings page component:

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('settings-page')
export class SettingsPage extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 24px;
        max-width: 600px;
      }

      h2 {
        font-size: 18px;
        margin-bottom: 16px;
      }

      .section {
        margin-bottom: 24px;
        padding: 16px;
        background: var(--shell-surface);
        border-radius: 8px;
      }

      .section h3 {
        font-size: 14px;
        margin-bottom: 8px;
      }

      button {
        padding: 6px 12px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: var(--shell-surface);
        color: var(--shell-fg);
        cursor: pointer;
        font-size: 13px;
      }

      button:hover {
        background: var(--shell-border);
      }

      .status {
        font-size: 12px;
        color: var(--shell-text-muted);
        margin-top: 8px;
      }
    `,
  ]

  @state()
  private clearStatus = ''

  render() {
    return html`
      <h2>Settings</h2>
      <div class="section">
        <h3>History</h3>
        <button @click="${this.clearHistory}">Clear Browsing History</button>
        ${this.clearStatus ? html`<p class="status">${this.clearStatus}</p>` : ''}
      </div>
      <div class="section">
        <h3>About</h3>
        <p>Atmosphere Browser v0.1.0</p>
        <p>Browse the AT Protocol atmosphere.</p>
      </div>
    `
  }

  private async clearHistory(): Promise<void> {
    await window.atBrowser.historyClear()
    this.clearStatus = 'History cleared'
  }
}
```

Register history IPC and add preload methods.

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

Run: `npx electron-vite build`
Expected: Full build succeeds.

Run: `npx electron-vite dev`
Expected: Bookmarks persist across restart. History records navigation. Settings page accessible. External links open in system browser. Unknown records render with schema fallback.

**Commit:** `feat: browsing history, settings page, and final polish`
<!-- END_TASK_5 -->
<!-- END_SUBCOMPONENT_B -->

<!-- START_TASK_6 -->
### Task 6: Feed generator browsing

**Verifies:** atmo-browser.AC8.2

**Files:**
- Create: `src/renderer/tiles/feed-tile.ts`
- Create: `src/main/feed-service.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/components/tile-host.ts`
- Modify: `src/renderer/main.ts`

**Implementation:**

Feed generator AT-URIs (`at://did/app.bsky.feed.generator/rkey`) are first-class browsable resources. When navigating to a feed generator URI:
1. Fetch the generator record (name, description, avatar, creator DID)
2. Render a feed-tile header showing the feed's metadata
3. Fetch feed content via the generator's service endpoint
4. Render the feed's posts as a list of post-tiles

`src/main/feed-service.ts`:

```typescript
import { ipcMain } from 'electron'
import { resolveAtUri } from './identity.js'
import { getRecord } from './xrpc-client.js'

export function registerFeedIpc(): void {
  ipcMain.handle('get-feed-generator', async (_event, uri: string) => {
    const resolved = await resolveAtUri(uri)
    if (!resolved || !resolved.collection || !resolved.rkey) return null

    const record = await getRecord(resolved.pds, resolved.did, resolved.collection, resolved.rkey)
    if (!record) return null

    return {
      record: record.value,
      identity: { did: resolved.did, handle: resolved.handle, pds: resolved.pds },
    }
  })
}
```

`src/renderer/tiles/feed-tile.ts`:

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('feed-tile')
export class FeedTile extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 16px;
        border-bottom: 1px solid var(--shell-border);
      }

      .feed-header {
        margin-bottom: 12px;
      }

      .feed-name {
        font-size: 18px;
        font-weight: bold;
      }

      .feed-description {
        margin-top: 4px;
        font-size: 14px;
        color: var(--shell-text-muted);
      }

      .feed-creator {
        margin-top: 4px;
        font-size: 12px;
        color: var(--shell-accent);
        cursor: pointer;
      }
    `,
  ]

  @property({ attribute: false })
  record: Record<string, unknown> | null = null

  @property({ type: String })
  creatorDid = ''

  render() {
    if (!this.record) return html`<p>Loading feed...</p>`

    const displayName = (this.record['displayName'] as string) ?? 'Unnamed Feed'
    const description = (this.record['description'] as string) ?? null

    return html`
      <div class="feed-header">
        <div class="feed-name">${displayName}</div>
        ${description ? html`<div class="feed-description">${description}</div>` : ''}
        <div class="feed-creator" @click="${this.navigateToCreator}">
          by ${this.creatorDid}
        </div>
      </div>
    `
  }

  private navigateToCreator(): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri: `at://${this.creatorDid}` },
        bubbles: true,
        composed: true,
      }),
    )
  }
}
```

Update tile-host routing to recognize `app.bsky.feed.generator` → `<feed-tile>`.

**Testing:**

Tests must verify:
- atmo-browser.AC8.2: Navigating to a feed generator URI renders the feed-tile with name and description

Test file: `src/renderer/tiles/feed-tile.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: feed generator browsing with feed-tile renderer`
<!-- END_TASK_6 -->

<!-- START_TASK_7 -->
### Task 7: Tile manager page

**Files:**
- Create: `src/renderer/components/tile-manager-page.ts`
- Create: `src/main/tile-management.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/main.ts`

**Implementation:**

Tile manager page lets users view installed tiles, clear tile cache, and browse available community tiles.

`src/main/tile-management.ts`:

```typescript
import { ipcMain, app } from 'electron'
import { join } from 'node:path'
import { readdirSync, rmSync, existsSync } from 'node:fs'

const TILE_CACHE_DIR = join(app.getPath('userData'), 'tile-cache')

export type InstalledTile = {
  readonly nsid: string
  readonly source: 'built-in' | 'community'
  readonly cachedAt: string | null
}

export function registerTileManagementIpc(): void {
  ipcMain.handle('tiles-list-installed', (): ReadonlyArray<InstalledTile> => {
    const builtIn: Array<InstalledTile> = [
      { nsid: 'app.bsky.actor.profile', source: 'built-in', cachedAt: null },
      { nsid: 'app.bsky.feed.post', source: 'built-in', cachedAt: null },
      { nsid: 'app.bsky.graph.follow', source: 'built-in', cachedAt: null },
      { nsid: 'app.bsky.graph.list', source: 'built-in', cachedAt: null },
      { nsid: 'app.bsky.feed.generator', source: 'built-in', cachedAt: null },
    ]

    if (!existsSync(TILE_CACHE_DIR)) return builtIn

    try {
      const files = readdirSync(TILE_CACHE_DIR)
      const community: Array<InstalledTile> = files
        .filter((f) => f.endsWith('.car'))
        .map((f) => ({
          nsid: f.replace('.car', ''),
          source: 'community' as const,
          cachedAt: new Date().toISOString(),
        }))

      return [...builtIn, ...community]
    } catch {
      return builtIn
    }
  })

  ipcMain.handle('tiles-clear-cache', (): void => {
    if (existsSync(TILE_CACHE_DIR)) {
      rmSync(TILE_CACHE_DIR, { recursive: true, force: true })
    }
  })
}
```

`src/renderer/components/tile-manager-page.ts`:

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

type InstalledTile = {
  nsid: string
  source: 'built-in' | 'community'
  cachedAt: string | null
}

@customElement('tile-manager-page')
export class TileManagerPage extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 24px;
        max-width: 600px;
      }

      h2 { font-size: 18px; margin-bottom: 16px; }

      .tile-list { list-style: none; padding: 0; }

      .tile-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: var(--shell-surface);
        border-radius: 4px;
        margin-bottom: 4px;
      }

      .tile-nsid { font-family: monospace; font-size: 13px; }

      .tile-source {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 3px;
        background: var(--shell-border);
        color: var(--shell-text-muted);
      }

      .tile-source.built-in { background: var(--shell-accent); color: #000; }

      button {
        padding: 6px 12px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: var(--shell-surface);
        color: var(--shell-fg);
        cursor: pointer;
        font-size: 13px;
        margin-top: 16px;
      }

      button:hover { background: var(--shell-border); }
    `,
  ]

  @state()
  private tiles: Array<InstalledTile> = []

  @state()
  private status = ''

  async connectedCallback(): Promise<void> {
    super.connectedCallback()
    await this.loadTiles()
  }

  render() {
    return html`
      <h2>Tile Manager</h2>
      <ul class="tile-list">
        ${this.tiles.map(
          (tile) => html`
            <li class="tile-item">
              <span class="tile-nsid">${tile.nsid}</span>
              <span class="tile-source ${tile.source}">${tile.source}</span>
            </li>
          `,
        )}
      </ul>
      <button @click="${this.clearCache}">Clear Tile Cache</button>
      ${this.status ? html`<p style="font-size:12px;color:var(--shell-text-muted);margin-top:8px">${this.status}</p>` : ''}
    `
  }

  private async loadTiles(): Promise<void> {
    this.tiles = (await window.atBrowser.tilesListInstalled()) as Array<InstalledTile>
  }

  private async clearCache(): Promise<void> {
    await window.atBrowser.tilesClearCache()
    await this.loadTiles()
    this.status = 'Cache cleared'
  }
}
```

Update preload:
```typescript
tilesListInstalled: (): Promise<unknown> => ipcRenderer.invoke('tiles-list-installed'),
tilesClearCache: (): Promise<void> => ipcRenderer.invoke('tiles-clear-cache'),
```

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: tile manager page with installed tiles list and cache clear`
<!-- END_TASK_7 -->

<!-- START_TASK_8 -->
### Task 8: Lexicon resolution and request queuing

**Verifies:** atmo-browser.AC9.1

**Files:**
- Create: `src/main/lexicon-resolver.ts`
- Create: `src/main/request-queue.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/components/schema-fallback.ts`

**Implementation:**

Lexicon resolution fetches the schema for any NSID at runtime via `com.atproto.lexicon.resolveLexicon` XRPC call. The schema fallback renderer uses this to annotate fields with their declared types.

Request queue provides rate-limiting and backoff for all XRPC calls to prevent PDS rate limiting.

`src/main/request-queue.ts`:

```typescript
type QueuedRequest = {
  readonly execute: () => Promise<unknown>
  readonly resolve: (value: unknown) => void
  readonly reject: (reason: unknown) => void
}

const queue: Array<QueuedRequest> = []
let activeRequests = 0
const MAX_CONCURRENT = 5
const BACKOFF_MS = 1000
let backoffUntil = 0

export async function enqueue<T>(execute: () => Promise<T>): Promise<T> {
  if (Date.now() < backoffUntil) {
    await new Promise((r) => setTimeout(r, backoffUntil - Date.now()))
  }

  return new Promise<T>((resolve, reject) => {
    queue.push({ execute: execute as () => Promise<unknown>, resolve: resolve as (v: unknown) => void, reject })
    processQueue()
  })
}

function processQueue(): void {
  while (activeRequests < MAX_CONCURRENT && queue.length > 0) {
    const request = queue.shift()!
    activeRequests++

    request
      .execute()
      .then((result) => {
        activeRequests--
        request.resolve(result)
        processQueue()
      })
      .catch((err) => {
        activeRequests--
        if (err instanceof Response && err.status === 429) {
          backoffUntil = Date.now() + BACKOFF_MS
        }
        request.reject(err)
        processQueue()
      })
  }
}
```

`src/main/lexicon-resolver.ts`:

```typescript
import { ipcMain } from 'electron'

const lexiconCache = new Map<string, unknown>()

export async function resolveLexicon(pds: string, nsid: string): Promise<unknown | null> {
  if (lexiconCache.has(nsid)) return lexiconCache.get(nsid)!

  try {
    const url = `${pds}/xrpc/com.atproto.repo.describeFeedGenerator`
    const response = await fetch(
      `${pds}/xrpc/com.atproto.lexicon.resolveLexicon?nsid=${encodeURIComponent(nsid)}`,
    )
    if (!response.ok) return null

    const schema = await response.json()
    lexiconCache.set(nsid, schema)
    return schema
  } catch {
    return null
  }
}

export function registerLexiconIpc(): void {
  ipcMain.handle('resolve-lexicon', async (_event, pds: string, nsid: string) => {
    return resolveLexicon(pds, nsid)
  })
}
```

Update schema-fallback to optionally receive and use lexicon schema data for type annotations.

Update preload:
```typescript
resolveLexicon: (pds: string, nsid: string): Promise<unknown> => ipcRenderer.invoke('resolve-lexicon', pds, nsid),
```

**Note:** `com.atproto.lexicon.resolveLexicon` may not be available on all PDSes. If unavailable, the fallback gracefully renders without schema annotations (using the existing field-type inference from Phase 3). The UFOs service (ufos.microcosm.blue) can be queried for lexicon discovery but is not required for MVP rendering.

**Testing:**

Tests must verify:
- atmo-browser.AC9.1: When lexicon resolves, schema-fallback annotates fields with declared types from schema
- When lexicon is unresolvable, schema-fallback still renders with inferred types (no crash)
- Request queue limits concurrent requests to MAX_CONCURRENT

Test file: `src/main/lexicon-resolver.test.ts`, `src/main/request-queue.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

Run: `npm test`
Expected: All tests pass.

**Commit:** `feat: lexicon resolution and request queue with backoff`
<!-- END_TASK_8 -->

---

## Architectural Note: Built-in Tiles as Lit Components

Built-in tiles (profile, post, follow, list, feed) are implemented as direct Lit web components rather than DASL tile CARball bundles. This is a deliberate MVP decision:

1. **Built-in tiles** are Lit components routed by tile-host based on collection NSID
2. **Community tiles** use the full DASL tile runtime (TileMothership → ATTileLoader → CARTileLoader)
3. **Schema fallback** handles any NSID without a dedicated tile

This approach provides faster development iteration for built-in tiles while preserving the DASL tile infrastructure for community extensibility. Converting built-in tiles to DASL bundles is a future optimization that doesn't affect functionality.

## Note on AC3.4 (In-Tile Navigation)

AC3.4 ("Clicking an AT-URI link in a tile navigates within the browser") is implemented via CustomEvent('navigate') dispatched by tiles and caught by shell-window. Full end-to-end verification of this event path is covered during manual testing in the `electron-vite dev` verification steps. The event propagation (bubbles: true, composed: true) ensures events cross Shadow DOM boundaries.

## Note on app.bsky.feed.threadgate

The `app.bsky.feed.threadgate` lexicon is handled by the schema-fallback renderer (Phase 3). Threadgate records contain configuration data (who can reply) that doesn't require a purpose-built visual tile — the structured field view is appropriate for this record type.
