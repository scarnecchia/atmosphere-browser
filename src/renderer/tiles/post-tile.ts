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

      .interaction-bar {
        display: flex;
        gap: 12px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--shell-border);
      }

      .interaction-btn {
        padding: 4px 8px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: none;
        color: var(--shell-text-muted);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .interaction-btn:hover {
        background: var(--shell-surface);
        color: var(--shell-fg);
        border-color: var(--shell-fg);
      }

      .interaction-btn.success {
        color: var(--shell-accent);
        border-color: var(--shell-accent);
      }

      .reply-input {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 12px;
        padding: 12px;
        background: var(--shell-surface);
        border-radius: 4px;
        border: 1px solid var(--shell-border);
      }

      .reply-textarea {
        flex: 1;
        padding: 8px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: var(--shell-input-bg);
        color: var(--shell-fg);
        font-family: inherit;
        font-size: 13px;
        resize: vertical;
        min-height: 60px;
      }

      .reply-buttons {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      .reply-buttons button {
        padding: 4px 12px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: var(--shell-surface);
        color: var(--shell-fg);
        font-size: 12px;
        cursor: pointer;
      }

      .reply-buttons button:hover {
        background: var(--shell-border);
      }

      .write-error {
        color: var(--shell-error);
        font-size: 12px;
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

  private handleExternalLink(e: Event, uri: string): void {
    if (uri.startsWith('at://')) {
      e.preventDefault()
      this.dispatchEvent(
        new CustomEvent('navigate', { detail: { uri }, bubbles: true, composed: true }),
      )
    }
    // For non-AT URIs, let the default browser behavior handle the link
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

    try {
      const result = (await window.atBrowser.writeReply(
        this.replyText,
        this.uri,
        this.postCid,
        this.uri,
        this.postCid,
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
