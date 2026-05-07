// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'
import { segmentRichText, type RichTextSegment, type RichTextFacet } from '../utils/rich-text.js'
import { formatTime } from '../utils/format.js'

@customElement('post-tile')
export class PostTile extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 12px 0;
        border-bottom: 1px solid var(--shell-border-subtle);
        max-width: var(--content-narrow);
        margin: 0 auto;
      }

      .post-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .author-name {
        font-weight: 600;
        font-size: 0.9375rem;
        color: var(--shell-fg);
      }

      .author-handle {
        color: var(--shell-text-muted);
        font-size: 0.8125rem;
      }

      .timestamp {
        color: var(--shell-text-tertiary);
        font-size: 0.8125rem;
        margin-left: auto;
      }

      .post-text {
        line-height: 1.55;
        font-size: 0.9375rem;
        white-space: pre-wrap;
        word-break: break-word;
        color: var(--shell-fg);
        max-width: 65ch;
      }

      .facet-mention {
        color: var(--shell-accent);
        cursor: pointer;
      }

      .facet-mention:hover {
        color: var(--shell-accent-hover);
      }

      .facet-link {
        color: var(--shell-accent);
        text-decoration: underline;
        cursor: pointer;
      }

      .facet-link:hover {
        color: var(--shell-accent-hover);
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
        background: var(--shell-surface-sunken);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--shell-text-tertiary);
        font-size: 0.8125rem;
      }

      .embed-external {
        margin-top: 8px;
        border: 1px solid var(--shell-border-subtle);
        border-radius: 8px;
        padding: 12px;
        cursor: pointer;
        transition: border-color var(--duration-fast) var(--ease-snappy);
      }

      .embed-external:hover {
        border-color: var(--shell-border);
      }

      .embed-external-title {
        font-weight: 600;
        font-size: 0.9375rem;
        color: var(--shell-fg);
      }

      .embed-external-desc {
        font-size: 0.8125rem;
        color: var(--shell-text-muted);
        margin-top: 4px;
        line-height: 1.4;
      }

      .embed-external-uri {
        font-size: 0.8125rem;
        font-family: var(--font-mono);
        color: var(--shell-text-tertiary);
        margin-top: 4px;
      }

      video {
        width: 100%;
        max-height: 400px;
        border-radius: 8px;
        margin-top: 8px;
      }

      .engagement-bar {
        display: flex;
        gap: 16px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--shell-border-subtle);
        font-size: 0.8125rem;
        color: var(--shell-text-muted);
      }

      .engagement-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .engagement-count {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: var(--shell-fg);
      }

      .engagement-unavailable {
        color: var(--shell-text-tertiary);
        font-size: 0.8125rem;
        margin-top: 8px;
      }

      .interaction-bar {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--shell-border-subtle);
      }

      .interaction-btn {
        padding: 4px 8px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: none;
        color: var(--shell-text-muted);
        font-family: var(--font-body);
        font-size: 0.8125rem;
        cursor: pointer;
        transition: background var(--duration-fast) var(--ease-snappy),
                    color var(--duration-fast) var(--ease-snappy),
                    border-color var(--duration-fast) var(--ease-snappy);
      }

      .interaction-btn:hover {
        background: var(--shell-surface-sunken);
        color: var(--shell-fg);
      }

      .interaction-btn:focus-visible {
        outline: none;
        box-shadow: var(--shadow-focus);
      }

      .interaction-btn.success {
        color: var(--shell-accent);
        border-color: var(--shell-accent);
        background: var(--shell-accent-subtle);
      }

      .reply-input {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 12px;
        padding: 12px;
        background: var(--shell-surface-sunken);
        border-radius: 8px;
      }

      .reply-textarea {
        flex: 1;
        padding: 8px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: var(--shell-surface);
        color: var(--shell-fg);
        font-family: var(--font-body);
        font-size: 0.9375rem;
        line-height: 1.55;
        resize: vertical;
        min-height: 60px;
        outline: none;
        transition: border-color var(--duration-fast) var(--ease-snappy);
      }

      .reply-textarea:focus {
        border-color: var(--shell-accent);
        box-shadow: 0 0 0 2px oklch(54% 0.22 260 / 0.15);
      }

      .reply-buttons {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      .reply-buttons button {
        padding: 6px 16px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: transparent;
        color: var(--shell-fg);
        font-family: var(--font-body);
        font-size: 0.8125rem;
        font-weight: 500;
        cursor: pointer;
        transition: background var(--duration-fast) var(--ease-snappy);
      }

      .reply-buttons button:hover {
        background: var(--shell-surface-sunken);
      }

      .reply-buttons button:first-child {
        background: var(--shell-accent);
        color: white;
        border-color: var(--shell-accent);
      }

      .reply-buttons button:first-child:hover {
        background: var(--shell-accent-hover);
      }

      .write-error {
        color: var(--shell-error);
        font-size: 0.8125rem;
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

  @property({ type: String })
  uri = ''

  @property({ type: String })
  postCid = ''

  @property({ type: String })
  rootUri = ''

  @property({ type: String })
  rootCid = ''

  @property({ type: Boolean })
  isAuthenticated = false

  @state()
  private imageUrls: Array<string | null> = []

  @state()
  private videoUrl: string | null = null

  @state()
  private engagement: { likes: number; reposts: number; replies: number } | null = null

  @state()
  private engagementUnavailable = false

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

  @state()
  private expandedBacklinks: string | null = null

  @state()
  private backlinkRecords: Array<{ did: string; collection: string; rkey: string }> = []

  @state()
  private backlinkHandles: Map<string, string> = new Map()

  @state()
  private loadingBacklinks = false

  async connectedCallback(): Promise<void> {
    super.connectedCallback()
    await this.loadEmbeds()
    await this.loadEngagement()
  }

  async updated(changed: Map<string, unknown>): Promise<void> {
    if (changed.has('record')) {
      await this.loadEmbeds()
    }
    if (changed.has('uri')) {
      await this.loadEngagement()
    }
  }

  render() {
    if (!this.record) return nothing

    const text = (this.record['text'] as string) ?? ''
    const facets = (this.record['facets'] as ReadonlyArray<unknown>) ?? []
    const embed = this.record['embed'] as Record<string, unknown> | undefined
    const createdAt = (this.record['createdAt'] as string) ?? ''

    const segments = segmentRichText(text, facets as ReadonlyArray<RichTextFacet>)

    return html`
      <div class="post-header">
        <span class="author-name">${this.handle}</span>
        <span class="timestamp">${formatTime(createdAt)}</span>
      </div>
      <div class="post-text">${segments.map((seg) => this.renderSegment(seg))}</div>
      ${embed ? this.renderEmbed(embed) : nothing}
      ${this.renderEngagement()}
      ${this.renderInteractions()}
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
              ? html`<img src="${url}" alt="${alt}" title="${alt}" loading="lazy" />`
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
      return this.videoUrl
        ? html`<video controls><source src="${this.videoUrl}" /></video>`
        : html`<div class="placeholder">Loading video...</div>`
    }

    return nothing
  }

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

  private renderEngagement(): unknown {
    if (this.engagementUnavailable) {
      return html`<p class="engagement-unavailable">Engagement counts unavailable</p>`
    }
    if (!this.engagement) return nothing
    return html`
      <div class="engagement-bar">
        <span class="engagement-item" style="cursor:pointer" @click="${(e: Event) => { e.stopPropagation(); this.toggleBacklinks('replies') }}">
          <span class="engagement-count">${this.engagement.replies}</span> replies
        </span>
        <span class="engagement-item" style="cursor:pointer" @click="${(e: Event) => { e.stopPropagation(); this.toggleBacklinks('reposts') }}">
          <span class="engagement-count">${this.engagement.reposts}</span> reposts
        </span>
        <span class="engagement-item" style="cursor:pointer" @click="${(e: Event) => { e.stopPropagation(); this.toggleBacklinks('likes') }}">
          <span class="engagement-count">${this.engagement.likes}</span> likes
        </span>
      </div>
      ${this.renderBacklinks()}
    `
  }

  private renderBacklinks(): unknown {
    if (!this.expandedBacklinks) return nothing

    if (this.loadingBacklinks) {
      return html`<div style="padding:8px 0;font-size:0.8125rem;color:var(--shell-text-muted)">Loading ${this.expandedBacklinks}...</div>`
    }

    if (this.backlinkRecords.length === 0) {
      return html`<div style="padding:8px 0;font-size:0.8125rem;color:var(--shell-text-muted)">No ${this.expandedBacklinks} found</div>`
    }

    return html`
      <div style="padding:8px 0;border-top:1px solid var(--shell-border-subtle, var(--shell-border))">
        <div style="font-size:0.75rem;font-weight:600;color:var(--shell-text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.03em">${this.expandedBacklinks}</div>
        ${this.backlinkRecords.map((bl) => {
          const handle = this.backlinkHandles.get(bl.did) ?? bl.did
          return html`
            <div style="padding:3px 0;font-size:0.8125rem">
              <span style="cursor:pointer;color:var(--shell-accent)" @click="${(e: Event) => { e.stopPropagation(); this.navigateToMention(bl.did) }}">${handle}</span>
            </div>
          `
        })}
      </div>
    `
  }

  private async toggleBacklinks(type: string): Promise<void> {
    if (this.expandedBacklinks === type) {
      this.expandedBacklinks = null
      this.backlinkRecords = []
      return
    }

    this.expandedBacklinks = type
    this.loadingBacklinks = true
    this.backlinkRecords = []

    const sourceMap: Record<string, string> = {
      likes: 'app.bsky.feed.like:subject.uri',
      reposts: 'app.bsky.feed.repost:subject.uri',
      replies: 'app.bsky.feed.post:reply.parent.uri',
    }

    const source = sourceMap[type]
    if (!source || !this.uri) {
      this.loadingBacklinks = false
      return
    }

    try {
      const result = (await window.atBrowser.getBacklinks(this.uri, source, 50)) as {
        records: Array<{ did: string; collection: string; rkey: string }>
        total: number
      } | null

      this.backlinkRecords = result?.records ?? []

      const dids = [...new Set(this.backlinkRecords.map((r) => r.did))]
      const resolved = await Promise.all(dids.map((did) => window.atBrowser.resolveDid(did)))
      for (const r of resolved) {
        if (r.handle) this.backlinkHandles.set(r.did, r.handle)
      }
      this.backlinkHandles = new Map(this.backlinkHandles)
    } catch (err) {
      console.error('[post-tile] Failed to load backlinks:', err)
    } finally {
      this.loadingBacklinks = false
    }
  }

  private async loadEmbeds(): Promise<void> {
    if (!this.record || !this.pds || !this.did) return

    const embed = this.record['embed'] as Record<string, unknown> | undefined
    if (!embed) return

    const embedType = embed['$type'] as string

    // Load images
    if (embedType === 'app.bsky.embed.images') {
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

    // Load video
    if (embedType === 'app.bsky.embed.video') {
      const video = embed['video'] as { ref?: { $link?: string } } | undefined
      if (video?.ref?.$link) {
        try {
          const videoUrl = await window.atBrowser.getBlobUrl(this.pds, this.did, video.ref.$link)
          this.videoUrl = videoUrl
        } catch {
          // Video loading failed, remain loading state
        }
      }
    }
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

  private async handleExternalLink(e: Event, uri: string): Promise<void> {
    if (uri.startsWith('at://')) {
      e.preventDefault()
      this.dispatchEvent(
        new CustomEvent('navigate', { detail: { uri }, bubbles: true, composed: true }),
      )
    } else if (uri.startsWith('https://') || uri.startsWith('http://')) {
      e.preventDefault()
      try {
        await window.atBrowser.openExternal(uri)
      } catch (err) {
        console.error('failed to open external link:', err)
      }
    }
  }

  private renderInteractions(): unknown {
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

  private renderReplyInput(): unknown {
    return html`
      <div class="reply-input">
        <textarea
          class="reply-textarea"
          placeholder="Write your reply..."
          .value="${this.replyText}"
          @input="${(e: Event) => { this.replyText = (e.target as HTMLTextAreaElement).value }}"
        ></textarea>
        <div class="reply-buttons">
          <button @click="${this.handleReply}">Send Reply</button>
          <button @click="${() => { this.showReplyInput = false; this.replyText = '' }}">Cancel</button>
        </div>
      </div>
    `
  }

  private async handleLike(): Promise<void> {
    if (!this.uri || !this.postCid) return
    this.writeError = null

    try {
      const result = (await window.atBrowser.writeLike(this.uri, this.postCid)) as { success: boolean; error?: string }
      if (result.success) {
        this.likeSuccess = true
      } else {
        this.writeError = result.error || 'Failed to like post'
      }
    } catch (err) {
      this.writeError = `Error: ${String(err)}`
    }
  }

  private async handleRepost(): Promise<void> {
    if (!this.uri || !this.postCid) return
    this.writeError = null

    try {
      const result = (await window.atBrowser.writeRepost(this.uri, this.postCid)) as { success: boolean; error?: string }
      if (result.success) {
        this.repostSuccess = true
      } else {
        this.writeError = result.error || 'Failed to repost'
      }
    } catch (err) {
      this.writeError = `Error: ${String(err)}`
    }
  }

  private async handleReply(): Promise<void> {
    if (!this.uri || !this.postCid || !this.replyText.trim()) return
    this.writeError = null

    // Use rootUri/rootCid if set (for nested replies), otherwise use this post's URI/CID
    const rootUri = this.rootUri || this.uri
    const rootCid = this.rootCid || this.postCid

    try {
      const result = (await window.atBrowser.writeReply(
        this.replyText,
        this.uri,
        this.postCid,
        rootUri,
        rootCid,
      )) as { success: boolean; error?: string }

      if (result.success) {
        this.replyText = ''
        this.showReplyInput = false
        this.dispatchEvent(new CustomEvent('reply-sent', { bubbles: true, composed: true }))
      } else {
        this.writeError = result.error || 'Failed to send reply'
      }
    } catch (err) {
      this.writeError = `Error: ${String(err)}`
    }
  }

}


declare global {
  interface HTMLElementTagNameMap {
    'post-tile': PostTile
  }
}
