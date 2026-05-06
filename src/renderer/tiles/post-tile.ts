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

  @state()
  private videoUrl: string | null = null

  async connectedCallback(): Promise<void> {
    super.connectedCallback()
    await this.loadEmbeds()
  }

  async updated(changed: Map<string, unknown>): Promise<void> {
    if (changed.has('record')) {
      await this.loadEmbeds()
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

}


declare global {
  interface HTMLElementTagNameMap {
    'post-tile': PostTile
  }
}
