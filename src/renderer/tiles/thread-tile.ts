// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'
import { segmentRichText, type RichTextFacet } from '../utils/rich-text.js'
import { formatTime } from '../utils/format.js'

// Window.atBrowser is globally declared in src/shared/preload-api.d.ts
// no need to redeclare it here

export type ThreadNode = {
  readonly uri: string
  readonly record: unknown
  readonly identity: { did: string; handle: string | null; pds: string }
  readonly parent: ThreadNode | null
  readonly replies: ReadonlyArray<ThreadNode>
}

@customElement('thread-tile')
export class ThreadTile extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
      }

      .thread {
        position: relative;
      }

      .thread-node {
        position: relative;
        padding: 12px 16px;
        border-bottom: 1px solid var(--shell-border);
      }

      .thread-node:not(:last-child)::after {
        content: '';
        position: absolute;
        left: 20px;
        top: 100%;
        bottom: -1px;
        width: 2px;
        background: var(--shell-border);
      }

      .thread-connector {
        position: absolute;
        left: 16px;
        top: -8px;
        width: 10px;
        height: 8px;
        border: 2px solid var(--shell-border);
        border-top: none;
        border-right: none;
        border-radius: 0 0 0 4px;
      }

      .thread-node:first-child .thread-connector {
        display: none;
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

      .embed-images.count-1 {
        grid-template-columns: 1fr;
      }
      .embed-images.count-2 {
        grid-template-columns: 1fr 1fr;
      }
      .embed-images.count-3,
      .embed-images.count-4 {
        grid-template-columns: 1fr 1fr;
      }

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

      .replies-section {
        position: relative;
        margin-top: 12px;
        padding-left: 16px;
      }

      .reply-node {
        position: relative;
        padding: 12px 0 12px 16px;
        border-left: 2px solid var(--shell-border);
        margin-left: 4px;
      }

      .reply-node:not(:last-child) {
        border-bottom: 1px solid var(--shell-border);
      }

      .reply-connector {
        position: absolute;
        left: -10px;
        top: -8px;
        width: 10px;
        height: 8px;
        border: 2px solid var(--shell-border);
        border-top: none;
        border-right: none;
        border-radius: 0 0 0 4px;
      }

      .reply-node:first-child .reply-connector {
        display: block;
      }
    `,
  ]

  @property({ attribute: false })
  thread: ThreadNode | null = null

  @state()
  private imageUrls: Map<string, Array<string | null>> = new Map()

  async connectedCallback(): Promise<void> {
    super.connectedCallback()
    await this.loadImages()
  }

  async updated(changed: Map<string, unknown>): Promise<void> {
    if (changed.has('thread')) {
      await this.loadImages()
    }
  }

  render() {
    if (!this.thread) return nothing

    const nodes: ThreadNode[] = []
    let current: ThreadNode | null = this.thread
    while (current) {
      nodes.unshift(current)
      current = current.parent
    }

    return html`
      <div class="thread">
        ${nodes.map((node, index) => html`
          <div class="thread-node" data-uri="${node.uri}">
            ${index > 0 ? html`<div class="thread-connector"></div>` : nothing}
            ${this.renderNode(node)}
            ${index === nodes.length - 1 && node.replies.length > 0
              ? html`<div class="replies-section">${node.replies.map((reply) => html`
                  <div class="reply-node" data-uri="${reply.uri}">
                    <div class="reply-connector"></div>
                    ${this.renderNode(reply)}
                  </div>
                `)}</div>`
              : nothing}
          </div>
        `)}
      </div>
    `
  }

  private renderNode(node: ThreadNode): unknown {
    const record = node.record as Record<string, unknown>
    const text = (record['text'] as string) ?? ''
    const facets = (record['facets'] as ReadonlyArray<unknown>) ?? []
    const embed = record['embed'] as Record<string, unknown> | undefined
    const createdAt = (record['createdAt'] as string) ?? ''
    const handle = node.identity.handle ?? node.identity.did

    const segments = segmentRichText(text, facets as ReadonlyArray<RichTextFacet>)

    return html`
      <div class="post-header">
        <span class="author-name">${handle}</span>
        <span class="timestamp">${formatTime(createdAt)}</span>
      </div>
      <div class="post-text">${segments.map((seg) => this.renderSegment(seg))}</div>
      ${embed ? this.renderEmbed(node, embed) : nothing}
    `
  }

  private renderSegment(segment: { text: string; facet: unknown }): unknown {
    if (!segment.facet) return segment.text

    const facet = segment.facet as {
      features: ReadonlyArray<{
        $type: string
        did?: string
        uri?: string
        tag?: string
      }>
    }
    const feature = facet.features[0]
    if (!feature) return segment.text

    switch (feature.$type) {
      case 'app.bsky.richtext.facet#mention': {
        const did = feature.did ?? ''
        return html`<span class="facet-mention" @click="${() => this.navigateToMention(did)}">${segment.text}</span>`
      }
      case 'app.bsky.richtext.facet#link': {
        const uri = feature.uri ?? ''
        return html`<a class="facet-link" href="${uri}" @click="${(e: Event) => this.handleExternalLink(e, uri)}">${segment.text}</a>`
      }
      case 'app.bsky.richtext.facet#tag':
        return html`<span class="facet-tag">${segment.text}</span>`
      default:
        return segment.text
    }
  }

  private renderEmbed(node: ThreadNode, embed: Record<string, unknown>): unknown {
    const type = embed['$type'] as string

    if (type === 'app.bsky.embed.images') {
      const images = (embed['images'] as ReadonlyArray<Record<string, unknown>>) ?? []
      const urls = this.imageUrls.get(node.uri) ?? []
      return html`
        <div class="embed-images count-${images.length}">
          ${images.map((img, i) => {
            const url = urls[i]
            const alt = (img['alt'] as string) ?? ''
            return url
              ? html`<img src="${url}" alt="${alt}" loading="lazy" />`
              : html`<div class="placeholder">Loading...</div>`
          })}
        </div>
      `
    }

    return nothing
  }

  private async loadImages(): Promise<void> {
    if (!this.thread) return

    const nodes: ThreadNode[] = []
    let current: ThreadNode | null = this.thread
    while (current) {
      nodes.unshift(current)
      current = current.parent
    }

    for (const node of nodes) {
      const record = node.record as Record<string, unknown>
      const embed = record['embed'] as Record<string, unknown> | undefined
      if (!embed || embed['$type'] !== 'app.bsky.embed.images') continue

      const images = (embed['images'] as ReadonlyArray<Record<string, unknown>>) ?? []
      const urls: Array<string | null> = []

      for (const img of images) {
        const image = img['image'] as { ref?: { $link?: string } } | undefined
        if (image?.ref?.$link) {
          const blob = await window.atBrowser.fetchBlob(node.identity.pds, node.identity.did, image.ref.$link)
          urls.push(blob?.data ?? null)
        } else {
          urls.push(null)
        }
      }

      this.imageUrls.set(node.uri, urls)
    }

    this.requestUpdate()
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

