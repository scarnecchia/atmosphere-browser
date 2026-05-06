# Atmosphere Browser Implementation Plan — Phase 5: Engagement Integration

**Goal:** Display engagement counts (likes, reposts, replies) alongside records, and use Constellation backlinks for thread reply discovery.

**Architecture:** Constellation client in main process queries engagement counts via parallel HTTP requests. Results are passed to tiles via TileContext.engagement. Thread assembly enhanced with Constellation backlinks for reply discovery. Graceful degradation when Constellation is unavailable.

**Tech Stack:** Constellation API (microcosm.blue), Promise.allSettled for parallel queries, TypeScript

**Scope:** 7 phases from original design (phase 5 of 7)

**Codebase verified:** 2026-05-06 — Phase 4 provides built-in tiles (profile, post, follow, list), thread assembly, blob service. TileContext.engagement field exists but is always zeroed.

---

## Acceptance Criteria Coverage

This phase implements and tests:

### atmo-browser.AC5: Engagement via Constellation
- **atmo-browser.AC5.1 Success:** Posts display like, repost, and reply counts
- **atmo-browser.AC5.2 Success:** Thread view discovers replies via Constellation backlinks
- **atmo-browser.AC5.3 Failure:** Constellation unavailability shows "counts unavailable" rather than crash or zero
- **atmo-browser.AC5.4 Edge:** Records with zero engagement show counts as 0, not absent

---

<!-- START_SUBCOMPONENT_A (tasks 1-3) -->
<!-- START_TASK_1 -->
### Task 1: Constellation client module

**Verifies:** atmo-browser.AC5.1, atmo-browser.AC5.3

**Files:**
- Create: `src/main/constellation-client.ts`

**Implementation:**

Client for the Constellation backlink index API. Queries engagement counts and backlinks for AT-URIs. Uses parallel requests (no batch endpoint available). Handles service unavailability gracefully — returns null rather than throwing.

```typescript
const CONSTELLATION_BASE = 'https://constellation.microcosm.blue'

export type EngagementCounts = {
  readonly likes: number
  readonly reposts: number
  readonly replies: number
}

export type BacklinkRecord = {
  readonly did: string
  readonly collection: string
  readonly rkey: string
}

export type BacklinksResult = {
  readonly total: number
  readonly records: ReadonlyArray<BacklinkRecord>
  readonly cursor: string | null
}

async function getBacklinksCount(subject: string, source: string): Promise<number | null> {
  const url = `${CONSTELLATION_BASE}/xrpc/blue.microcosm.links.getBacklinksCount?subject=${encodeURIComponent(subject)}&source=${encodeURIComponent(source)}`

  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const data = (await response.json()) as { total: number }
    return data.total
  } catch {
    return null
  }
}

export async function getEngagementCounts(atUri: string): Promise<EngagementCounts | null> {
  const results = await Promise.allSettled([
    getBacklinksCount(atUri, 'app.bsky.feed.like:subject.uri'),
    getBacklinksCount(atUri, 'app.bsky.feed.repost:subject.uri'),
    getBacklinksCount(atUri, 'app.bsky.feed.post:reply.parent.uri'),
  ])

  const likes = results[0]?.status === 'fulfilled' ? results[0].value : null
  const reposts = results[1]?.status === 'fulfilled' ? results[1].value : null
  const replies = results[2]?.status === 'fulfilled' ? results[2].value : null

  if (likes === null && reposts === null && replies === null) {
    return null
  }

  return {
    likes: likes ?? 0,
    reposts: reposts ?? 0,
    replies: replies ?? 0,
  }
}

export async function getBacklinks(
  subject: string,
  source: string,
  limit: number = 25,
  cursor: string | null = null,
): Promise<BacklinksResult | null> {
  let url = `${CONSTELLATION_BASE}/xrpc/blue.microcosm.links.getBacklinks?subject=${encodeURIComponent(subject)}&source=${encodeURIComponent(source)}&limit=${limit}`
  if (cursor) {
    url += `&cursor=${encodeURIComponent(cursor)}`
  }

  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const data = (await response.json()) as { total: number; records: ReadonlyArray<BacklinkRecord>; cursor?: string }
    return {
      total: data.total,
      records: data.records,
      cursor: data.cursor ?? null,
    }
  } catch {
    return null
  }
}

export async function getReplyBacklinks(
  postUri: string,
  limit: number = 50,
): Promise<BacklinksResult | null> {
  return getBacklinks(postUri, 'app.bsky.feed.post:reply.parent.uri', limit)
}
```

**Testing:**

Tests must verify:
- atmo-browser.AC5.1: `getEngagementCounts` returns likes/reposts/replies from parallel requests
- atmo-browser.AC5.3: When all three fetches fail (network error), returns null (not throws)
- atmo-browser.AC5.3: When some fetches fail, returns partial results with 0 for failed fields

Test file: `src/main/constellation-client.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: Constellation client for engagement counts and backlinks`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Engagement IPC and tile context enrichment

**Verifies:** atmo-browser.AC5.1, atmo-browser.AC5.4

**Files:**
- Create: `src/main/engagement-ipc.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

**Implementation:**

IPC handler that fetches engagement counts for a given AT-URI and returns them to the renderer. The shell passes engagement data into the tile context.

`src/main/engagement-ipc.ts`:

```typescript
import { ipcMain } from 'electron'
import { getEngagementCounts, getReplyBacklinks } from './constellation-client.js'

export function registerEngagementIpc(): void {
  ipcMain.handle('get-engagement', async (_event, atUri: string) => {
    const counts = await getEngagementCounts(atUri)
    return counts
  })

  ipcMain.handle('get-reply-backlinks', async (_event, postUri: string, limit?: number) => {
    const backlinks = await getReplyBacklinks(postUri, limit)
    return backlinks
  })
}
```

Update `src/preload/index.ts` to expose engagement methods:

```typescript
getEngagement: (atUri: string): Promise<{ likes: number; reposts: number; replies: number } | null> =>
  ipcRenderer.invoke('get-engagement', atUri),
getReplyBacklinks: (postUri: string, limit?: number): Promise<unknown> =>
  ipcRenderer.invoke('get-reply-backlinks', postUri, limit),
```

Register in `src/main/index.ts`:

```typescript
import { registerEngagementIpc } from './engagement-ipc.js'
// in app.whenReady():
registerEngagementIpc()
```

**Testing:**

Tests must verify:
- atmo-browser.AC5.1: IPC handler returns engagement counts structure
- atmo-browser.AC5.4: Zero engagement returns `{likes: 0, reposts: 0, replies: 0}` not null

Test file: `src/main/engagement-ipc.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: engagement IPC handlers for Constellation data`
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: Post tile engagement display

**Verifies:** atmo-browser.AC5.1, atmo-browser.AC5.3, atmo-browser.AC5.4

**Files:**
- Modify: `src/renderer/tiles/post-tile.ts`

**Implementation:**

Update the post tile to:
1. Fetch engagement counts after mounting (via IPC)
2. Display like/repost/reply counts below the post content
3. Show "counts unavailable" when Constellation returns null (AC5.3)
4. Show "0" explicitly for zero counts (AC5.4)

Add to post-tile styles:

```css
.engagement-bar {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--shell-border);
  font-size: 13px;
  color: var(--shell-text-muted);
}

.engagement-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.engagement-count {
  font-weight: bold;
  color: var(--shell-fg);
}

.engagement-unavailable {
  font-style: italic;
  color: var(--shell-text-muted);
  font-size: 12px;
  margin-top: 8px;
}
```

Add state for engagement:

```typescript
@state()
private engagement: { likes: number; reposts: number; replies: number } | null = null

@state()
private engagementUnavailable = false
```

Fetch engagement in `connectedCallback` (after the component is initialized with a URI):

```typescript
private async loadEngagement(): Promise<void> {
  if (!this.uri) return
  const counts = await window.atBrowser.getEngagement(this.uri)
  if (counts === null) {
    this.engagementUnavailable = true
  } else {
    this.engagement = counts
    this.engagementUnavailable = false
  }
}
```

Render engagement bar:

```typescript
private renderEngagement() {
  if (this.engagementUnavailable) {
    return html`<p class="engagement-unavailable">Engagement counts unavailable</p>`
  }
  if (!this.engagement) return nothing
  return html`
    <div class="engagement-bar">
      <span class="engagement-item">
        <span class="engagement-count">${this.engagement.replies}</span> replies
      </span>
      <span class="engagement-item">
        <span class="engagement-count">${this.engagement.reposts}</span> reposts
      </span>
      <span class="engagement-item">
        <span class="engagement-count">${this.engagement.likes}</span> likes
      </span>
    </div>
  `
}
```

Add a `uri` property to post-tile so it knows its own AT-URI for engagement queries.

**Testing:**

Tests must verify:
- atmo-browser.AC5.1: Post with engagement data renders counts in the engagement bar
- atmo-browser.AC5.3: When engagement is null, shows "Engagement counts unavailable" message
- atmo-browser.AC5.4: When counts are all 0, shows "0 replies", "0 reposts", "0 likes" (not hidden)

Test file: `src/renderer/tiles/post-tile.test.ts` (extend existing)

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: engagement counts display in post tile`
<!-- END_TASK_3 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_TASK_4 -->
### Task 4: Thread reply discovery via Constellation backlinks

**Verifies:** atmo-browser.AC5.2

**Files:**
- Modify: `src/main/thread-assembly.ts`
- Modify: `src/renderer/tiles/thread-tile.ts`

**Implementation:**

Enhance thread assembly to discover replies using Constellation backlinks. When viewing a post, query Constellation for `app.bsky.feed.post:reply.parent.uri` backlinks to find who replied. Fetch each reply record and include them in the thread structure.

Update `ThreadNode` type to include replies:

```typescript
export type ThreadNode = {
  readonly uri: string
  readonly record: RecordEntry
  readonly identity: { did: string; handle: string | null; pds: string }
  readonly parent: ThreadNode | null
  readonly replies: ReadonlyArray<ThreadNode>
}
```

Add reply discovery to thread assembly:

```typescript
import { getReplyBacklinks } from './constellation-client.js'

async function discoverReplies(postUri: string): Promise<ReadonlyArray<ThreadNode>> {
  const backlinks = await getReplyBacklinks(postUri)
  if (!backlinks || backlinks.records.length === 0) return []

  const replies: Array<ThreadNode> = []
  for (const backlink of backlinks.records) {
    const replyUri = `at://${backlink.did}/${backlink.collection}/${backlink.rkey}`
    const resolved = await resolveAtUri(replyUri)
    if (!resolved || !resolved.collection || !resolved.rkey) continue

    const record = await getRecord(resolved.pds, resolved.did, resolved.collection, resolved.rkey)
    if (!record) continue

    replies.push({
      uri: replyUri,
      record,
      identity: { did: resolved.did, handle: resolved.handle, pds: resolved.pds },
      parent: null,
      replies: [],
    })
  }

  return replies
}
```

Update the IPC handler for thread assembly to include reply discovery.

Update the thread-tile component to render replies below the current post.

**Testing:**

Tests must verify:
- atmo-browser.AC5.2: Thread with Constellation backlinks shows reply posts below the viewed post
- When Constellation returns no backlinks, thread renders without replies (no error)
- When Constellation is unavailable, thread still renders parent chain (graceful degradation)

Test file: `src/main/thread-assembly.test.ts` (extend existing)

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

Run: `npm test`
Expected: All tests pass.

Run: `npx electron-vite dev`
Expected: Viewing a post shows engagement counts. Viewing a post with replies shows them in the thread view.

**Commit:** `feat: thread reply discovery via Constellation backlinks`
<!-- END_TASK_4 -->
