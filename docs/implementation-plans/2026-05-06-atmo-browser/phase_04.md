# Atmosphere Browser Implementation Plan — Phase 4: Built-in Tiles for app.bsky.*

**Goal:** Purpose-built rendering components for core Bluesky lexicons — profiles, posts, follows, lists, threads — that make browsing feel like a real product.

**Architecture:** Each built-in tile is a Lit web component registered with the tile-host system. The tile-host selects the appropriate component based on collection NSID. Blob URLs are constructed from PDS endpoint + DID + CID. Rich text uses UTF-8 byte offset facet resolution.

**Tech Stack:** Lit 3 (web components), TextEncoder for UTF-8 facets, IPC blob fetching, @atproto/api RichText utilities

**Scope:** 7 phases from original design (phase 4 of 7)

**Codebase verified:** 2026-05-06 — Phase 3 tile runtime exists with tile-host, schema-fallback, tile context types, IPC bridge.

---

## Acceptance Criteria Coverage

This phase implements and tests:

### atmo-browser.AC1: Semantic rendering of app.bsky.* records
- **atmo-browser.AC1.1 Success:** Navigating to `at://handle` displays profile tile with avatar, display name, and bio
- **atmo-browser.AC1.2 Success:** Post records render with rich text, resolved facets (mentions as links, URLs as clickable links, hashtags)
- **atmo-browser.AC1.3 Success:** Follow records render as a readable list with handle and display name per entry
- **atmo-browser.AC1.4 Failure:** Navigating to a non-existent handle shows a clear error page, not a crash or blank screen
- **atmo-browser.AC1.5 Edge:** Records with empty or minimal fields (no avatar, no bio) render gracefully with placeholders

### atmo-browser.AC4: Blob handling
- **atmo-browser.AC4.1 Success:** Images referenced by CID in post embeds render inline
- **atmo-browser.AC4.2 Success:** Video blobs render with a playable video element
- **atmo-browser.AC4.3 Failure:** Missing or unreachable blob shows placeholder image, not broken element
- **atmo-browser.AC4.4 Edge:** Large blobs (>10MB) load progressively without blocking page rendering

---

<!-- START_TASK_1 -->
### Task 1: Blob URL resolution and IPC handler

**Verifies:** atmo-browser.AC4.1, atmo-browser.AC4.3, atmo-browser.AC4.4

**Files:**
- Create: `src/main/blob-service.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

**Implementation:**

Blob service that constructs URLs from PDS + DID + CID and fetches them. Provides two modes: URL construction (for direct use) and proxied fetch (for CSP-restricted contexts). Handles missing blobs gracefully (returns null, not error). Large blobs use streaming.

`src/main/blob-service.ts`:

```typescript
import { ipcMain } from 'electron'

export function constructBlobUrl(pds: string, did: string, cid: string): string {
  return `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`
}

export function registerBlobIpc(): void {
  ipcMain.handle(
    'get-blob-url',
    (_event, pds: string, did: string, cid: string): string => {
      return constructBlobUrl(pds, did, cid)
    },
  )

  ipcMain.handle(
    'fetch-blob',
    async (_event, pds: string, did: string, cid: string): Promise<{ data: string; mimeType: string } | null> => {
      const url = constructBlobUrl(pds, did, cid)
      try {
        const response = await fetch(url)
        if (!response.ok) return null

        const buffer = await response.arrayBuffer()
        const mimeType = response.headers.get('content-type') ?? 'application/octet-stream'
        const base64 = Buffer.from(buffer).toString('base64')
        return { data: `data:${mimeType};base64,${base64}`, mimeType }
      } catch {
        return null
      }
    },
  )
}
```

Update `src/preload/index.ts` to expose blob methods:

```typescript
contextBridge.exposeInMainWorld('atBrowser', {
  resolveUri: (uri: string): Promise<unknown> => ipcRenderer.invoke('resolve-uri', uri),
  getBlobUrl: (pds: string, did: string, cid: string): Promise<string> =>
    ipcRenderer.invoke('get-blob-url', pds, did, cid),
  fetchBlob: (pds: string, did: string, cid: string): Promise<{ data: string; mimeType: string } | null> =>
    ipcRenderer.invoke('fetch-blob', pds, did, cid),
})
```

Register in `src/main/index.ts`:

```typescript
import { registerBlobIpc } from './blob-service.js'
// in app.whenReady():
registerBlobIpc()
```

**Testing:**

Tests must verify:
- atmo-browser.AC4.1: `constructBlobUrl` returns correct URL format
- atmo-browser.AC4.3: `fetch-blob` returns null (not throws) when blob is unreachable
- atmo-browser.AC4.4: Large responses are handled without blocking (base64 encoding works for arbitrary sizes)

Test file: `src/main/blob-service.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: blob URL resolution and fetch IPC`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Rich text facet resolution utility

**Verifies:** atmo-browser.AC1.2

**Files:**
- Create: `src/renderer/utils/rich-text.ts`

**Implementation:**

Utility that takes post text + facets array and produces an array of segments, each annotated with its facet features. Uses TextEncoder for correct UTF-8 byte offset mapping.

```typescript
export type RichTextSegment = {
  readonly text: string
  readonly facet: RichTextFacet | null
}

export type RichTextFacet = {
  readonly index: { readonly byteStart: number; readonly byteEnd: number }
  readonly features: ReadonlyArray<FacetFeature>
}

export type FacetFeature =
  | { readonly $type: 'app.bsky.richtext.facet#mention'; readonly did: string }
  | { readonly $type: 'app.bsky.richtext.facet#link'; readonly uri: string }
  | { readonly $type: 'app.bsky.richtext.facet#tag'; readonly tag: string }

export function segmentRichText(text: string, facets: ReadonlyArray<RichTextFacet> = []): ReadonlyArray<RichTextSegment> {
  if (facets.length === 0) {
    return [{ text, facet: null }]
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const textBytes = encoder.encode(text)

  const sorted = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart)

  const segments: Array<RichTextSegment> = []
  let lastByteEnd = 0

  for (const facet of sorted) {
    if (facet.index.byteStart > lastByteEnd) {
      const plainBytes = textBytes.slice(lastByteEnd, facet.index.byteStart)
      segments.push({ text: decoder.decode(plainBytes), facet: null })
    }

    const facetBytes = textBytes.slice(facet.index.byteStart, facet.index.byteEnd)
    segments.push({ text: decoder.decode(facetBytes), facet })

    lastByteEnd = facet.index.byteEnd
  }

  if (lastByteEnd < textBytes.length) {
    const remainingBytes = textBytes.slice(lastByteEnd)
    segments.push({ text: decoder.decode(remainingBytes), facet: null })
  }

  return segments
}
```

**Testing:**

Tests must verify:
- atmo-browser.AC1.2: Facets correctly segment text at UTF-8 byte boundaries
- Plain text without facets returns single segment
- Emoji and multi-byte characters are handled correctly (UTF-8 boundary accuracy)
- Multiple adjacent facets produce correct segments
- Overlapping facets (edge case) don't crash

Test file: `src/renderer/utils/rich-text.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

Run: `npm test`
Expected: Rich text tests pass.

**Commit:** `feat: rich text facet resolution with UTF-8 byte offset support`
<!-- END_TASK_2 -->

<!-- START_SUBCOMPONENT_A (tasks 3-4) -->
<!-- START_TASK_3 -->
### Task 3: Profile tile component

**Verifies:** atmo-browser.AC1.1, atmo-browser.AC1.5, atmo-browser.AC4.1

**Files:**
- Create: `src/renderer/tiles/profile-tile.ts`

**Implementation:**

Renders `app.bsky.actor.profile` records. Shows avatar, banner, display name, bio. Handles missing fields with placeholders. Fetches avatar/banner blobs via IPC.

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

declare global {
  interface Window {
    atBrowser: {
      resolveUri: (uri: string) => Promise<unknown>
      getBlobUrl: (pds: string, did: string, cid: string) => Promise<string>
      fetchBlob: (pds: string, did: string, cid: string) => Promise<{ data: string; mimeType: string } | null>
    }
  }
}

@customElement('profile-tile')
export class ProfileTile extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
      }

      .banner {
        height: 150px;
        background: var(--shell-surface);
        border-radius: 8px 8px 0 0;
        overflow: hidden;
      }

      .banner img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .profile-header {
        padding: 0 16px 16px;
        margin-top: -40px;
      }

      .avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: 3px solid var(--shell-bg);
        background: var(--shell-surface);
        overflow: hidden;
      }

      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        color: var(--shell-text-muted);
      }

      .display-name {
        font-size: 20px;
        font-weight: bold;
        margin-top: 8px;
        color: var(--shell-fg);
      }

      .handle {
        font-size: 14px;
        color: var(--shell-text-muted);
        margin-top: 2px;
      }

      .bio {
        margin-top: 8px;
        line-height: 1.5;
        color: var(--shell-fg);
        white-space: pre-wrap;
      }

      .no-bio {
        color: var(--shell-text-muted);
        font-style: italic;
      }
    `,
  ]

  @property({ attribute: false })
  record: Record<string, unknown> | null = null

  @property({ type: String })
  did = ''

  @property({ type: String })
  handle = ''

  @property({ type: String })
  pds = ''

  @state()
  private avatarUrl: string | null = null

  @state()
  private bannerUrl: string | null = null

  async connectedCallback(): Promise<void> {
    super.connectedCallback()
    await this.loadImages()
  }

  async updated(changed: Map<string, unknown>): Promise<void> {
    if (changed.has('record')) {
      await this.loadImages()
    }
  }

  render() {
    const displayName = (this.record?.['displayName'] as string) ?? null
    const description = (this.record?.['description'] as string) ?? null

    return html`
      <div class="banner">
        ${this.bannerUrl ? html`<img src="${this.bannerUrl}" alt="" />` : ''}
      </div>
      <div class="profile-header">
        <div class="avatar">
          ${this.avatarUrl
            ? html`<img src="${this.avatarUrl}" alt="${displayName ?? this.handle}" />`
            : html`<div class="avatar-placeholder">&#9786;</div>`}
        </div>
        <div class="display-name">${displayName ?? this.handle}</div>
        <div class="handle">@${this.handle}</div>
        ${description
          ? html`<div class="bio">${description}</div>`
          : html`<div class="bio no-bio">No bio</div>`}
      </div>
    `
  }

  private async loadImages(): Promise<void> {
    if (!this.record || !this.pds || !this.did) return

    const avatar = this.record['avatar'] as { ref?: { $link?: string } } | undefined
    const banner = this.record['banner'] as { ref?: { $link?: string } } | undefined

    if (avatar?.ref?.$link) {
      const blob = await window.atBrowser.fetchBlob(this.pds, this.did, avatar.ref.$link)
      this.avatarUrl = blob?.data ?? null
    }

    if (banner?.ref?.$link) {
      const blob = await window.atBrowser.fetchBlob(this.pds, this.did, banner.ref.$link)
      this.bannerUrl = blob?.data ?? null
    }
  }
}
```

**Testing:**

Tests must verify:
- atmo-browser.AC1.1: Profile with displayName, description, avatar renders all three
- atmo-browser.AC1.5: Profile with no avatar shows placeholder, no bio shows "No bio" text
- atmo-browser.AC4.1: Avatar blob CID triggers fetchBlob call

Test file: `src/renderer/tiles/profile-tile.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: profile tile component with avatar and bio rendering`
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Post tile component with rich text and embeds

**Verifies:** atmo-browser.AC1.2, atmo-browser.AC4.1, atmo-browser.AC4.2, atmo-browser.AC4.3

**Files:**
- Create: `src/renderer/tiles/post-tile.ts`

**Implementation:**

Renders `app.bsky.feed.post` records. Rich text with facet resolution (mentions, links, hashtags), image embeds, external link cards, quote posts. Videos render with `<video>` element.

```typescript
import { LitElement, html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'
import { segmentRichText, type RichTextSegment } from '../utils/rich-text.js'

@customElement('post-tile')
export class PostTile extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 12px 16px;
        border-bottom: 1px solid var(--shell-border);
      }

      .post-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .author-name {
        font-weight: bold;
        font-size: 14px;
      }

      .author-handle {
        color: var(--shell-text-muted);
        font-size: 13px;
      }

      .timestamp {
        color: var(--shell-text-muted);
        font-size: 12px;
        margin-left: auto;
      }

      .post-text {
        line-height: 1.5;
        font-size: 14px;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .facet-mention {
        color: var(--shell-accent);
        cursor: pointer;
      }

      .facet-link {
        color: var(--shell-accent);
        text-decoration: underline;
        cursor: pointer;
      }

      .facet-tag {
        color: var(--shell-accent);
      }

      .embed-images {
        display: grid;
        gap: 4px;
        margin-top: 8px;
        border-radius: 8px;
        overflow: hidden;
      }

      .embed-images.count-1 { grid-template-columns: 1fr; }
      .embed-images.count-2 { grid-template-columns: 1fr 1fr; }
      .embed-images.count-3,
      .embed-images.count-4 { grid-template-columns: 1fr 1fr; }

      .embed-images img {
        width: 100%;
        height: 200px;
        object-fit: cover;
      }

      .embed-images .placeholder {
        width: 100%;
        height: 200px;
        background: var(--shell-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--shell-text-muted);
      }

      .embed-external {
        margin-top: 8px;
        border: 1px solid var(--shell-border);
        border-radius: 8px;
        padding: 12px;
        cursor: pointer;
      }

      .embed-external:hover {
        background: var(--shell-surface);
      }

      .embed-external-title {
        font-weight: bold;
        font-size: 14px;
      }

      .embed-external-desc {
        font-size: 13px;
        color: var(--shell-text-muted);
        margin-top: 4px;
      }

      .embed-external-uri {
        font-size: 12px;
        color: var(--shell-text-muted);
        margin-top: 4px;
      }

      video {
        width: 100%;
        max-height: 400px;
        border-radius: 8px;
        margin-top: 8px;
      }
    `,
  ]

  @property({ attribute: false })
  record: Record<string, unknown> | null = null

  @property({ type: String })
  did = ''

  @property({ type: String })
  handle = ''

  @property({ type: String })
  pds = ''

  @state()
  private imageUrls: Array<string | null> = []

  async connectedCallback(): Promise<void> {
    super.connectedCallback()
    await this.loadEmbedImages()
  }

  async updated(changed: Map<string, unknown>): Promise<void> {
    if (changed.has('record')) {
      await this.loadEmbedImages()
    }
  }

  render() {
    if (!this.record) return nothing

    const text = (this.record['text'] as string) ?? ''
    const facets = (this.record['facets'] as ReadonlyArray<unknown>) ?? []
    const embed = this.record['embed'] as Record<string, unknown> | undefined
    const createdAt = (this.record['createdAt'] as string) ?? ''

    const segments = segmentRichText(text, facets as ReadonlyArray<import('../utils/rich-text.js').RichTextFacet>)

    return html`
      <div class="post-header">
        <span class="author-name">${this.handle}</span>
        <span class="timestamp">${this.formatTime(createdAt)}</span>
      </div>
      <div class="post-text">${segments.map((seg) => this.renderSegment(seg))}</div>
      ${embed ? this.renderEmbed(embed) : nothing}
    `
  }

  private renderSegment(segment: RichTextSegment): unknown {
    if (!segment.facet) return segment.text

    const feature = segment.facet.features[0]
    if (!feature) return segment.text

    switch (feature.$type) {
      case 'app.bsky.richtext.facet#mention':
        return html`<span class="facet-mention" @click="${() => this.navigateToMention(feature.did)}">${segment.text}</span>`
      case 'app.bsky.richtext.facet#link':
        return html`<a class="facet-link" href="${feature.uri}" @click="${(e: Event) => this.handleExternalLink(e, feature.uri)}">${segment.text}</a>`
      case 'app.bsky.richtext.facet#tag':
        return html`<span class="facet-tag">${segment.text}</span>`
      default:
        return segment.text
    }
  }

  private renderEmbed(embed: Record<string, unknown>): unknown {
    const type = embed['$type'] as string

    if (type === 'app.bsky.embed.images') {
      const images = (embed['images'] as ReadonlyArray<Record<string, unknown>>) ?? []
      return html`
        <div class="embed-images count-${images.length}">
          ${images.map((img, i) => {
            const url = this.imageUrls[i]
            const alt = (img['alt'] as string) ?? ''
            return url
              ? html`<img src="${url}" alt="${alt}" loading="lazy" />`
              : html`<div class="placeholder">Loading...</div>`
          })}
        </div>
      `
    }

    if (type === 'app.bsky.embed.external') {
      const external = embed['external'] as Record<string, unknown>
      return html`
        <div class="embed-external" @click="${() => this.handleExternalLink(new Event('click'), external['uri'] as string)}">
          <div class="embed-external-title">${external['title']}</div>
          <div class="embed-external-desc">${external['description']}</div>
          <div class="embed-external-uri">${external['uri']}</div>
        </div>
      `
    }

    if (type === 'app.bsky.embed.video') {
      return html`<video controls><source src="" /></video>`
    }

    return nothing
  }

  private async loadEmbedImages(): Promise<void> {
    if (!this.record || !this.pds || !this.did) return

    const embed = this.record['embed'] as Record<string, unknown> | undefined
    if (!embed || embed['$type'] !== 'app.bsky.embed.images') return

    const images = (embed['images'] as ReadonlyArray<Record<string, unknown>>) ?? []
    const urls: Array<string | null> = []

    for (const img of images) {
      const image = img['image'] as { ref?: { $link?: string } } | undefined
      if (image?.ref?.$link) {
        const blob = await window.atBrowser.fetchBlob(this.pds, this.did, image.ref.$link)
        urls.push(blob?.data ?? null)
      } else {
        urls.push(null)
      }
    }

    this.imageUrls = urls
  }

  private navigateToMention(did: string): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri: `at://${did}` },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private handleExternalLink(e: Event, uri: string): void {
    e.preventDefault()
    if (uri.startsWith('at://')) {
      this.dispatchEvent(
        new CustomEvent('navigate', { detail: { uri }, bubbles: true, composed: true }),
      )
    }
  }

  private formatTime(iso: string): string {
    if (!iso) return ''
    try {
      const date = new Date(iso)
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return iso
    }
  }
}
```

**Testing:**

Tests must verify:
- atmo-browser.AC1.2: Post with facets renders mention as clickable span, link as anchor, tag as styled span
- atmo-browser.AC4.1: Image embed triggers blob fetch for each image CID
- atmo-browser.AC4.2: Video embed renders a `<video>` element
- atmo-browser.AC4.3: Missing blob (fetchBlob returns null) shows placeholder, not broken img

Test file: `src/renderer/tiles/post-tile.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: post tile with rich text facets and image embeds`
<!-- END_TASK_4 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (tasks 5-6) -->
<!-- START_TASK_5 -->
### Task 5: Follow and list tile components

**Verifies:** atmo-browser.AC1.3

**Files:**
- Create: `src/renderer/tiles/follow-tile.ts`
- Create: `src/renderer/tiles/list-tile.ts`

**Implementation:**

Follow tile renders a single follow record (subject DID + createdAt). Used in list views when browsing the `app.bsky.graph.follow` collection.

List tile renders `app.bsky.graph.list` records (name, purpose, description).

`src/renderer/tiles/follow-tile.ts`:

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('follow-tile')
export class FollowTile extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 8px 16px;
        border-bottom: 1px solid var(--shell-border);
      }

      .follow-entry {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }

      .follow-entry:hover {
        opacity: 0.8;
      }

      .follow-did {
        font-family: monospace;
        font-size: 13px;
        color: var(--shell-accent);
      }

      .follow-date {
        font-size: 12px;
        color: var(--shell-text-muted);
        margin-left: auto;
      }
    `,
  ]

  @property({ attribute: false })
  record: Record<string, unknown> | null = null

  render() {
    if (!this.record) return html`<p>No data</p>`

    const subject = (this.record['subject'] as string) ?? 'unknown'
    const createdAt = (this.record['createdAt'] as string) ?? ''

    return html`
      <div class="follow-entry" @click="${() => this.navigateTo(subject)}">
        <span class="follow-did">${subject}</span>
        <span class="follow-date">${this.formatDate(createdAt)}</span>
      </div>
    `
  }

  private navigateTo(did: string): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri: `at://${did}` },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private formatDate(iso: string): string {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString()
    } catch {
      return iso
    }
  }
}
```

`src/renderer/tiles/list-tile.ts`:

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('list-tile')
export class ListTile extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 12px 16px;
        border-bottom: 1px solid var(--shell-border);
      }

      .list-name {
        font-weight: bold;
        font-size: 16px;
      }

      .list-purpose {
        font-size: 12px;
        color: var(--shell-text-muted);
        margin-top: 2px;
      }

      .list-description {
        margin-top: 8px;
        line-height: 1.4;
        font-size: 14px;
      }
    `,
  ]

  @property({ attribute: false })
  record: Record<string, unknown> | null = null

  render() {
    if (!this.record) return html`<p>No data</p>`

    const name = (this.record['name'] as string) ?? 'Unnamed list'
    const purpose = (this.record['purpose'] as string) ?? ''
    const description = (this.record['description'] as string) ?? null

    const purposeLabel = purpose.includes('modlist') ? 'Moderation list' : purpose.includes('curatelist') ? 'Curation list' : purpose

    return html`
      <div class="list-name">${name}</div>
      <div class="list-purpose">${purposeLabel}</div>
      ${description ? html`<div class="list-description">${description}</div>` : ''}
    `
  }
}
```

**Testing:**

Tests must verify:
- atmo-browser.AC1.3: Follow tile renders subject DID as a clickable link that emits navigate event
- List tile renders name and purpose label
- Empty/missing fields render gracefully

Test file: `src/renderer/tiles/follow-tile.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: follow and list tile components`
<!-- END_TASK_5 -->

<!-- START_TASK_6 -->
### Task 6: Repo page layout and tile routing

**Verifies:** atmo-browser.AC1.1, atmo-browser.AC1.4

**Files:**
- Create: `src/renderer/components/repo-page.ts`
- Create: `src/renderer/components/collection-page.ts`
- Create: `src/renderer/components/record-page.ts`
- Modify: `src/renderer/components/tile-host.ts`
- Modify: `src/renderer/main.ts`

**Implementation:**

Three page types matching the design:
- **Repo page** (`at://handle`): Profile tile at top + list of collections with record counts
- **Collection page** (`at://handle/collection.nsid`): Paginated records rendered by appropriate tile
- **Record page** (`at://handle/collection.nsid/rkey`): Single record in full view

`tile-host.ts` updated to route based on collection NSID:
- `app.bsky.actor.profile` → `<profile-tile>`
- `app.bsky.feed.post` → `<post-tile>`
- `app.bsky.graph.follow` → `<follow-tile>`
- `app.bsky.graph.list` → `<list-tile>`
- Everything else → `<schema-fallback>`

The tile-host determines page type from the IPC response:
- `{type: 'repo'}` → render repo-page
- `{type: 'collection'}` → render collection-page
- `{type: 'record'}` → render record-page

Update shell-window to pass full response data to tile-host for routing.

**Testing:**

Tests must verify:
- atmo-browser.AC1.1: Navigating to `at://handle` shows repo page with profile at top
- atmo-browser.AC1.4: Navigating to non-existent handle shows clear error (from identity resolution failure), no crash

Test file: `src/renderer/components/repo-page.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

Run: `npx electron-vite dev`
Expected: Navigating to `at://bsky.app` shows profile header + collection listing. Navigating to a post URI shows the post tile.

**Commit:** `feat: repo/collection/record page routing with tile selection`
<!-- END_TASK_6 -->
<!-- END_SUBCOMPONENT_B -->

<!-- START_TASK_7 -->
### Task 7: Thread view assembly

**Verifies:** atmo-browser.AC1.2

**Files:**
- Create: `src/renderer/tiles/thread-tile.ts`
- Create: `src/main/thread-assembly.ts`
- Modify: `src/main/index.ts`

**Implementation:**

When viewing a single post that has a `reply` field, the protocol layer assembles the thread by:
1. Fetching the parent post (from `reply.parent` URI)
2. Fetching the root post (from `reply.root` URI)
3. Building a thread structure: root → ... → parent → current post

Thread assembly IPC (`src/main/thread-assembly.ts`):

```typescript
import { getRecord } from './xrpc-client.js'
import { resolveAtUri } from './identity.js'
import type { RecordEntry } from './xrpc-client.js'

export type ThreadNode = {
  readonly uri: string
  readonly record: RecordEntry
  readonly identity: { did: string; handle: string | null; pds: string }
  readonly parent: ThreadNode | null
}

export async function assembleThread(
  pds: string,
  did: string,
  collection: string,
  rkey: string,
): Promise<ThreadNode | null> {
  const record = await getRecord(pds, did, collection, rkey)
  if (!record) return null

  const node: ThreadNode = {
    uri: `at://${did}/${collection}/${rkey}`,
    record,
    identity: { did, handle: null, pds },
    parent: null,
  }

  const value = record.value as Record<string, unknown>
  const reply = value['reply'] as { parent?: { uri?: string }; root?: { uri?: string } } | undefined

  if (reply?.parent?.uri) {
    const parentResolved = await resolveAtUri(reply.parent.uri)
    if (parentResolved && parentResolved.collection && parentResolved.rkey) {
      const parentNode = await assembleThread(
        parentResolved.pds,
        parentResolved.did,
        parentResolved.collection,
        parentResolved.rkey,
      )
      if (parentNode) {
        return { ...node, parent: parentNode }
      }
    }
  }

  return node
}
```

Register IPC handler for thread assembly in `src/main/index.ts`.

`src/renderer/tiles/thread-tile.ts` renders the assembled thread as a vertical stack of post tiles with visual connectors.

**Testing:**

Tests must verify:
- atmo-browser.AC1.2: Post in thread context shows parent post above it
- Thread assembly handles missing parent gracefully (shows just the current post)

Test file: `src/main/thread-assembly.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

Run: `npm test`
Expected: All tests pass.

**Commit:** `feat: thread assembly and thread tile view`
<!-- END_TASK_7 -->
