// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'
import type { ThreadNode } from '../tiles/thread-tile.js'

@customElement('record-page')
export class RecordPage extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        overflow-y: auto;
        max-width: var(--content-medium);
        margin: 0 auto;
      }

      .record-header {
        padding: 12px 0;
        border-bottom: 1px solid var(--shell-border-subtle);
        background: var(--shell-bg);
      }

      .record-uri {
        font-family: var(--font-mono);
        font-size: 0.6875rem;
        color: var(--shell-text-tertiary);
      }

      .record-content {
        padding: 0;
      }

      .error-section {
        padding: 24px;
        color: var(--shell-error);
      }

      .thread-loading {
        padding: 12px 16px;
        color: var(--shell-text-muted);
        font-size: 0.9375rem;
        border-top: 1px solid var(--shell-border-subtle);
      }
    `,
  ]

  @property({ attribute: false })
  responseData: Record<string, unknown> | null = null

  @property({ type: String })
  collection = ''

  @property({ type: String })
  handle = ''

  @property({ type: String })
  rkey = ''

  @state()
  private thread: ThreadNode | null = null

  @state()
  private threadLoading = false

  updated(changed: Map<string, unknown>): void {
    if (changed.has('responseData') && this.responseData) {
      this.thread = null
      this.loadThreadIfPost()
    }
  }

  render() {
    if (!this.responseData) {
      return html`<div class="error-section">No data</div>`
    }

    const responseType = (this.responseData['type'] as string) ?? ''

    if (responseType !== 'record') {
      return html`<div class="error-section">Expected record response type</div>`
    }

    const recordWrapper = this.responseData['record'] as Record<string, unknown> | undefined
    const identity = this.responseData['identity'] as Record<string, unknown> | undefined

    if (!recordWrapper || !identity) {
      return html`<div class="error-section">Missing record or identity data</div>`
    }

    const record = (recordWrapper['value'] as Record<string, unknown>) ?? recordWrapper
    const recordCid = (recordWrapper['cid'] as string) ?? ''
    const did = (identity['did'] as string) ?? ''
    const pds = (identity['pds'] as string) ?? ''
    const uri = `at://${did}/${this.collection}/${this.rkey}`

    return html`
      <div class="record-header">
        <div class="record-uri">
          <span style="cursor:pointer;color:var(--shell-accent)" @click="${() => this.navigateTo(`at://${this.handle || did}`)}">${this.handle || did}</span>
          <span> / </span>
          <span style="cursor:pointer;color:var(--shell-accent)" @click="${() => this.navigateTo(`at://${this.handle || did}/${this.collection}`)}">${this.collection}</span>
          <span> / ${this.rkey}</span>
        </div>
      </div>

      <div class="record-content">
        ${this.collection === 'app.bsky.feed.post' && this.thread
          ? html`<thread-tile .thread="${this.thread}"></thread-tile>`
          : this.renderRecord(record, did, this.collection, this.handle, pds, uri, recordCid)}
        ${this.threadLoading ? html`<div class="thread-loading">Loading thread...</div>` : nothing}
      </div>
    `
  }

  private navigateTo(uri: string): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private async loadThreadIfPost(): Promise<void> {
    if (this.collection !== 'app.bsky.feed.post') return

    const identity = this.responseData?.['identity'] as Record<string, unknown> | undefined
    if (!identity) return

    const did = (identity['did'] as string) ?? ''
    const pds = (identity['pds'] as string) ?? ''

    this.threadLoading = true
    try {
      const result = (await window.atBrowser.resolveThread(pds, did, this.collection, this.rkey)) as {
        type?: string
        thread?: ThreadNode
        error?: string
      }
      if (result?.thread) {
        this.thread = result.thread
      }
    } catch (err) {
      console.error('[record-page] Thread load failed:', err)
    } finally {
      this.threadLoading = false
    }
  }

  private renderRecord(
    record: Record<string, unknown>,
    did: string,
    collection: string,
    handle: string,
    pds: string,
    uri: string,
    cid: string,
  ): unknown {
    if (collection === 'app.bsky.actor.profile') {
      return html`<profile-tile .record="${record}" .did="${did}" .handle="${handle}" .pds="${pds}"></profile-tile>`
    }

    if (collection === 'app.bsky.feed.post') {
      const reply = record['reply'] as Record<string, unknown> | undefined
      const root = reply?.['root'] as Record<string, unknown> | undefined
      return html`
        <post-tile
          .record="${record}"
          .did="${did}"
          .handle="${handle}"
          .pds="${pds}"
          .uri="${uri}"
          .postCid="${cid}"
          .rootUri="${(root?.['uri'] as string) ?? ''}"
          .rootCid="${(root?.['cid'] as string) ?? ''}"
        ></post-tile>
      `
    }

    if (collection === 'app.bsky.graph.follow') {
      return html`<follow-tile .record="${record}"></follow-tile>`
    }

    if (collection === 'app.bsky.graph.list') {
      return html`<list-tile .record="${record}"></list-tile>`
    }

    if (collection === 'app.bsky.feed.generator') {
      return html`<feed-tile .record="${record}" .creatorDid="${did}"></feed-tile>`
    }

    if (collection === 'ing.dasl.masl') {
      return html`<masl-tile .record="${record}" .did="${did}" .handle="${handle}" .pds="${pds}" .uri="${uri}"></masl-tile>`
    }

    return html`
      <schema-fallback
        .record="${record}"
        .collection="${collection}"
        .uri="${uri}"
      ></schema-fallback>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'record-page': RecordPage
  }
}
