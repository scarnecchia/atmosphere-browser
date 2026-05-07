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
        max-width: var(--content-narrow);
        margin: 0 auto;
      }

      .thread {
        position: relative;
      }

      .thread-node {
        position: relative;
        padding: 12px 16px;
        border-bottom: 1px solid var(--shell-border-subtle);
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
        background: var(--shell-surface-sunken);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--shell-text-tertiary);
        font-size: 0.8125rem;
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
        border-bottom: 1px solid var(--shell-border-subtle);
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

  @state()
  private resolvedHandles: Map<string, string> = new Map()

  @state()
  private engagementMap: Map<string, { likes: number; reposts: number; replies: number }> = new Map()

  @state()
  private expandedBacklinks: { uri: string; type: string } | null = null

  @state()
  private backlinkRecords: Array<{ did: string; collection: string; rkey: string }> = []

  @state()
  private backlinkHandles: Map<string, string> = new Map()

  @state()
  private loadingBacklinks = false

  async updated(changed: Map<string, unknown>): Promise<void> {
    if (changed.has('thread')) {
      await this.loadImages()
      await this.resolveHandles()
      await this.loadEngagement()
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
          <div class="thread-node" data-uri="${node.uri}" @click="${() => this.navigateToPost(node.uri)}" style="cursor:pointer">
            ${index > 0 ? html`<div class="thread-connector"></div>` : nothing}
            ${this.renderNode(node)}
            ${index === nodes.length - 1 && node.replies.length > 0
              ? html`<div class="replies-section">${node.replies.map((reply) => html`
                  <div class="reply-node" data-uri="${reply.uri}" @click="${(e: Event) => { e.stopPropagation(); this.navigateToPost(reply.uri) }}" style="cursor:pointer">
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

  private extractValue(node: ThreadNode): Record<string, unknown> {
    const rec = node.record as Record<string, unknown>
    return (rec['value'] as Record<string, unknown>) ?? rec
  }

  private renderNode(node: ThreadNode): unknown {
    const record = this.extractValue(node)
    const text = (record['text'] as string) ?? ''
    const facets = (record['facets'] as ReadonlyArray<unknown>) ?? []
    const embed = record['embed'] as Record<string, unknown> | undefined
    const createdAt = (record['createdAt'] as string) ?? ''
    const handle = node.identity.handle
      ?? this.resolvedHandles.get(node.identity.did)
      ?? node.identity.did

    const segments = segmentRichText(text, facets as ReadonlyArray<RichTextFacet>)

    return html`
      <div class="post-header">
        <span class="author-name" style="cursor:pointer;color:var(--shell-accent)" @click="${(e: Event) => { e.stopPropagation(); this.navigateToMention(node.identity.did) }}">${handle}</span>
        <span class="timestamp">${formatTime(createdAt)}</span>
      </div>
      <div class="post-text">${segments.map((seg) => this.renderSegment(seg))}</div>
      ${embed ? this.renderEmbed(node, embed) : nothing}
      ${this.renderNodeEngagement(node.uri)}
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
              ? html`<img src="${url}" alt="${alt}" title="${alt}" loading="lazy" />`
              : html`<div class="placeholder">Loading...</div>`
          })}
        </div>
      `
    }

    if (type === 'app.bsky.embed.external') {
      const external = embed['external'] as Record<string, unknown> | undefined
      if (!external) return nothing
      const title = (external['title'] as string) ?? ''
      const description = (external['description'] as string) ?? ''
      const uri = (external['uri'] as string) ?? ''
      return html`
        <div style="margin-top:8px;border:1px solid var(--shell-border);border-radius:8px;padding:12px;cursor:pointer"
             @click="${(e: Event) => { e.stopPropagation(); this.handleExternalLink(e, uri) }}">
          <div style="font-weight:600;font-size:0.875rem">${title}</div>
          ${description ? html`<div style="font-size:0.8125rem;color:var(--shell-text-muted);margin-top:4px">${description}</div>` : nothing}
          <div style="font-size:0.75rem;color:var(--shell-text-tertiary);margin-top:4px">${uri}</div>
        </div>
      `
    }

    if (type === 'app.bsky.embed.record') {
      const rec = embed['record'] as Record<string, unknown> | undefined
      const recUri = (rec?.['uri'] as string) ?? ''
      if (!recUri) return nothing
      return html`
        <div style="margin-top:8px;border:1px solid var(--shell-border);border-radius:8px;padding:12px;cursor:pointer;font-size:0.8125rem;color:var(--shell-accent)"
             @click="${(e: Event) => { e.stopPropagation(); this.navigateToPost(recUri) }}">
          Quoted: ${recUri}
        </div>
      `
    }

    if (type === 'app.bsky.embed.recordWithMedia') {
      const media = embed['media'] as Record<string, unknown> | undefined
      const rec = embed['record'] as Record<string, unknown> | undefined
      return html`
        ${media ? this.renderEmbed(node, media) : nothing}
        ${rec ? this.renderEmbed(node, rec) : nothing}
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

    // Also include reply nodes of the last node
    const lastNode = nodes[nodes.length - 1]
    if (lastNode && lastNode.replies.length > 0) {
      nodes.push(...lastNode.replies)
    }

    for (const node of nodes) {
      const record = this.extractValue(node)
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

  private async resolveHandles(): Promise<void> {
    if (!this.thread) return

    const allNodes: ThreadNode[] = []
    let current: ThreadNode | null = this.thread
    while (current) {
      allNodes.push(current)
      current = current.parent
    }
    const lastNode = allNodes[0]
    if (lastNode) {
      allNodes.push(...lastNode.replies)
    }

    const didsToResolve = allNodes
      .filter((n) => !n.identity.handle && !this.resolvedHandles.has(n.identity.did))
      .map((n) => n.identity.did)

    const uniqueDids = [...new Set(didsToResolve)]
    const results = await Promise.all(
      uniqueDids.map((did) => window.atBrowser.resolveDid(did)),
    )

    let changed = false
    for (const result of results) {
      if (result.handle) {
        this.resolvedHandles.set(result.did, result.handle)
        changed = true
      }
    }

    if (changed) {
      this.resolvedHandles = new Map(this.resolvedHandles)
    }
  }

  private renderNodeEngagement(uri: string): unknown {
    const counts = this.engagementMap.get(uri)
    if (!counts) return nothing

    const isExpanded = this.expandedBacklinks?.uri === uri

    return html`
      <div style="display:flex;gap:16px;margin-top:6px;font-size:0.8125rem;color:var(--shell-text-muted)">
        <span style="cursor:pointer" @click="${(e: Event) => { e.stopPropagation(); this.toggleBacklinks(uri, 'replies') }}">
          <strong style="color:var(--shell-fg)">${counts.replies}</strong> replies
        </span>
        <span style="cursor:pointer" @click="${(e: Event) => { e.stopPropagation(); this.toggleBacklinks(uri, 'reposts') }}">
          <strong style="color:var(--shell-fg)">${counts.reposts}</strong> reposts
        </span>
        <span style="cursor:pointer" @click="${(e: Event) => { e.stopPropagation(); this.toggleBacklinks(uri, 'likes') }}">
          <strong style="color:var(--shell-fg)">${counts.likes}</strong> likes
        </span>
      </div>
      ${isExpanded ? this.renderBacklinkPanel() : nothing}
    `
  }

  private renderBacklinkPanel(): unknown {
    if (!this.expandedBacklinks) return nothing

    if (this.loadingBacklinks) {
      return html`<div style="padding:8px 0;font-size:0.8125rem;color:var(--shell-text-muted)">Loading ${this.expandedBacklinks.type}...</div>`
    }

    if (this.backlinkRecords.length === 0) {
      return html`<div style="padding:8px 0;font-size:0.8125rem;color:var(--shell-text-muted)">No ${this.expandedBacklinks.type} found</div>`
    }

    return html`
      <div style="padding:8px 0;border-top:1px solid var(--shell-border-subtle, var(--shell-border))">
        <div style="font-size:0.75rem;font-weight:600;color:var(--shell-text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.03em">${this.expandedBacklinks.type}</div>
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

  private async toggleBacklinks(uri: string, type: string): Promise<void> {
    if (this.expandedBacklinks?.uri === uri && this.expandedBacklinks.type === type) {
      this.expandedBacklinks = null
      this.backlinkRecords = []
      return
    }

    this.expandedBacklinks = { uri, type }
    this.loadingBacklinks = true
    this.backlinkRecords = []

    const sourceMap: Record<string, string> = {
      likes: 'app.bsky.feed.like:subject.uri',
      reposts: 'app.bsky.feed.repost:subject.uri',
      replies: 'app.bsky.feed.post:reply.parent.uri',
    }

    const source = sourceMap[type]
    if (!source) {
      this.loadingBacklinks = false
      return
    }

    try {
      const result = (await window.atBrowser.getBacklinks(uri, source, 50)) as {
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
      console.error('[thread-tile] Failed to load backlinks:', err)
    } finally {
      this.loadingBacklinks = false
    }
  }

  private async loadEngagement(): Promise<void> {
    if (!this.thread) return

    const allNodes: ThreadNode[] = []
    let current: ThreadNode | null = this.thread
    while (current) {
      allNodes.push(current)
      current = current.parent
    }
    const lastNode = allNodes[0]
    if (lastNode) {
      allNodes.push(...lastNode.replies)
    }

    const uris = allNodes.map((n) => n.uri)
    const results = await Promise.all(
      uris.map((uri) => window.atBrowser.getEngagement(uri)),
    )

    let changed = false
    for (let i = 0; i < uris.length; i++) {
      const counts = results[i]
      if (counts) {
        this.engagementMap.set(uris[i], counts)
        changed = true
      }
    }

    if (changed) {
      this.engagementMap = new Map(this.engagementMap)
    }
  }

  private navigateToPost(uri: string): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri },
        bubbles: true,
        composed: true,
      }),
    )
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

