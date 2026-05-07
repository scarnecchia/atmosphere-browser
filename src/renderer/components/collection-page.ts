// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('collection-page')
export class CollectionPage extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        overflow-y: auto;
        max-width: var(--content-medium);
        margin: 0 auto;
      }

      .collection-header {
        padding: 16px 0;
        border-bottom: 1px solid var(--shell-border);
        background: var(--shell-bg);
      }

      .collection-title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 1.25rem;
        letter-spacing: -0.01em;
        margin-bottom: 4px;
        color: var(--shell-fg);
      }

      .collection-subtitle {
        font-size: 0.8125rem;
        color: var(--shell-text-muted);
      }

      .records-container {
        padding: 0;
      }

      .record-item {
        border-bottom: 1px solid var(--shell-border-subtle);
        padding: 12px 0;
        cursor: pointer;
        transition: background var(--duration-fast) var(--ease-snappy);
      }

      .record-item:hover {
        background: var(--shell-surface-sunken);
      }

      .record-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.8125rem;
        color: var(--shell-text-muted);
        margin-bottom: 4px;
      }

      .record-rkey {
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        color: var(--shell-accent);
      }

      .record-text {
        font-size: 0.9375rem;
        line-height: 1.55;
        white-space: pre-wrap;
        word-break: break-word;
        color: var(--shell-fg);
      }

      .record-json-preview {
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        color: var(--shell-text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .load-more {
        display: flex;
        justify-content: center;
        padding: 16px;
        border-top: 1px solid var(--shell-border-subtle);
      }

      .load-more button {
        padding: 8px 24px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: transparent;
        color: var(--shell-fg);
        cursor: pointer;
        font-family: var(--font-body);
        font-size: 0.8125rem;
        font-weight: 500;
        transition: background var(--duration-fast) var(--ease-snappy),
                    border-color var(--duration-fast) var(--ease-snappy);
      }

      .load-more button:hover {
        background: var(--shell-surface-sunken);
        border-color: #c8c5c0;
      }

      .load-more button:focus-visible {
        outline: none;
        box-shadow: var(--shadow-focus);
      }

      .load-more button:disabled {
        opacity: 0.4;
        cursor: default;
      }

      .error-section {
        padding: 24px;
        color: var(--shell-error);
      }
    `,
  ]

  @property({ attribute: false })
  responseData: Record<string, unknown> | null = null

  @property({ type: String })
  collection = ''

  @property({ type: String })
  handle = ''

  @state()
  private extraRecords: Array<Record<string, unknown>> = []

  @state()
  private currentCursor: string | null = null

  @state()
  private loadingMore = false

  @state()
  private initialized = false

  updated(changed: Map<string, unknown>): void {
    if (changed.has('responseData') && this.responseData) {
      this.extraRecords = []
      const recordsData = this.responseData['records'] as unknown
      const cursor = (this.responseData['cursor'] as string) ?? null
      this.currentCursor = Array.isArray(recordsData) && recordsData.length > 0 ? cursor : null
      this.initialized = true
    }
  }

  render() {
    if (!this.responseData) {
      return html`<div class="error-section">No data</div>`
    }

    const responseType = (this.responseData['type'] as string) ?? ''
    if (responseType !== 'collection') {
      return html`<div class="error-section">Expected collection response type</div>`
    }

    const initialRecords = (this.responseData['records'] as Array<Record<string, unknown>>) ?? []
    const allRecords = [...initialRecords, ...this.extraRecords]
    const identity = this.responseData['identity'] as Record<string, unknown> | undefined

    if (!identity) {
      return html`<div class="error-section">Missing identity data</div>`
    }

    const did = (identity['did'] as string) ?? ''
    const pds = (identity['pds'] as string) ?? ''

    return html`
      <div class="collection-header">
        <div class="collection-title" style="cursor:pointer;color:var(--shell-accent)" @click="${() => this.navigateToProfile()}">${this.handle}</div>
        <div class="collection-subtitle">${this.collection} (${allRecords.length} loaded)</div>
      </div>

      <div class="records-container">
        ${allRecords.length === 0 && this.initialized
          ? html`<div class="error-section">No records in this collection</div>`
          : allRecords.map((entry) => {
              const uri = (entry['uri'] as string) ?? ''
              const rkey = uri.split('/').pop() ?? ''
              const value = (entry['value'] as Record<string, unknown>) ?? entry
              return this.renderRecordItem(value, did, this.collection, rkey, pds)
            })}
      </div>

      ${this.currentCursor
        ? html`
            <div class="load-more">
              <button ?disabled="${this.loadingMore}" @click="${() => this.loadMore(pds, did)}">
                ${this.loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          `
        : nothing}
    `
  }

  private renderRecordItem(
    record: Record<string, unknown>,
    did: string,
    collection: string,
    rkey: string,
    pds: string,
  ): unknown {
    return html`
      <div class="record-item" @click="${() => this.navigateToRecord(did, collection, rkey)}">
        <div class="record-meta">
          <span class="record-rkey">${rkey}</span>
          ${this.renderTimestamp(record)}
        </div>
        ${this.renderRecordContent(record, did, collection, pds)}
      </div>
    `
  }

  private renderRecordContent(
    record: Record<string, unknown>,
    did: string,
    collection: string,
    pds: string,
  ): unknown {
    if (collection === 'app.bsky.feed.post') {
      const text = (record['text'] as string) ?? ''
      return html`<div class="record-text">${text}</div>`
    }

    if (collection === 'app.bsky.actor.profile') {
      return html`
        <profile-tile .record="${record}" .did="${did}" .handle="${this.handle}" .pds="${pds}"></profile-tile>
      `
    }

    if (collection === 'app.bsky.graph.follow') {
      const subject = (record['subject'] as string) ?? ''
      return html`<div class="record-text">Follows: ${subject}</div>`
    }

    if (collection === 'app.bsky.feed.like') {
      const subject = record['subject'] as Record<string, unknown> | undefined
      const subjectUri = (subject?.['uri'] as string) ?? ''
      return html`<div class="record-text">Liked: ${subjectUri}</div>`
    }

    if (collection === 'app.bsky.feed.repost') {
      const subject = record['subject'] as Record<string, unknown> | undefined
      const subjectUri = (subject?.['uri'] as string) ?? ''
      return html`<div class="record-text">Reposted: ${subjectUri}</div>`
    }

    if (collection === 'ing.dasl.masl') {
      const tile = record['tile'] as Record<string, unknown> | undefined
      const name = (tile?.['name'] as string) ?? 'Unnamed Tile'
      const description = (tile?.['description'] as string) ?? ''
      return html`<div class="record-text">${name}${description ? ` — ${description}` : ''}</div>`
    }

    const preview = JSON.stringify(record).slice(0, 200)
    return html`<div class="record-json-preview">${preview}</div>`
  }

  private renderTimestamp(record: Record<string, unknown>): unknown {
    const createdAt = (record['createdAt'] as string) ?? null
    if (!createdAt) return nothing
    try {
      const date = new Date(createdAt)
      return html`<span>${date.toLocaleString()}</span>`
    } catch {
      return nothing
    }
  }

  private async loadMore(pds: string, did: string): Promise<void> {
    if (!this.currentCursor || this.loadingMore) return
    this.loadingMore = true

    try {
      const result = (await window.atBrowser.listMoreRecords(
        pds,
        did,
        this.collection,
        this.currentCursor,
      )) as { records: Array<Record<string, unknown>>; cursor: string | null }

      this.extraRecords = [...this.extraRecords, ...(result.records ?? [])]
      this.currentCursor = result.cursor
    } catch (err) {
      console.error('[collection] Failed to load more:', err)
    } finally {
      this.loadingMore = false
    }
  }

  private navigateToProfile(): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri: `at://${this.handle}` },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private navigateToRecord(did: string, collection: string, rkey: string): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri: `at://${did}/${collection}/${rkey}` },
        bubbles: true,
        composed: true,
      }),
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'collection-page': CollectionPage
  }
}
