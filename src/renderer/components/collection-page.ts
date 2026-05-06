// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('collection-page')
export class CollectionPage extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        overflow-y: auto;
      }

      .collection-header {
        padding: 16px;
        border-bottom: 1px solid var(--shell-border);
        background: var(--shell-surface);
      }

      .collection-title {
        font-weight: bold;
        font-size: 18px;
        margin-bottom: 4px;
      }

      .collection-subtitle {
        font-size: 13px;
        color: var(--shell-text-muted);
      }

      .records-container {
        padding: 0;
      }

      .record-item {
        border-bottom: 1px solid var(--shell-border);
        cursor: pointer;
      }

      .record-item:hover {
        background: var(--shell-surface);
      }

      .pagination {
        padding: 16px;
        text-align: center;
        color: var(--shell-text-muted);
        font-size: 12px;
      }

      .error-section {
        padding: 20px;
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

  render() {
    if (!this.responseData) {
      return html`<div class="error-section">No data</div>`
    }

    const responseType = (this.responseData['type'] as string) ?? ''

    if (responseType !== 'collection') {
      return html`<div class="error-section">Expected collection response type</div>`
    }

    const records = (this.responseData['records'] as Array<Record<string, unknown>>) ?? []
    const identity = this.responseData['identity'] as Record<string, unknown> | undefined

    if (!identity) {
      return html`<div class="error-section">Missing identity data</div>`
    }

    const did = (identity['did'] as string) ?? ''
    const pds = (identity['pds'] as string) ?? ''

    return html`
      <div class="collection-header">
        <div class="collection-title">${this.handle}</div>
        <div class="collection-subtitle">${this.collection} (${records.length} records)</div>
      </div>

      <div class="records-container">
        ${records.length === 0
          ? html`<div class="error-section">No records in this collection</div>`
          : records.map((record, idx) =>
              this.renderRecord(
                record,
                did,
                this.collection,
                (record['rkey'] as string) ?? `record-${idx}`,
                handle,
                pds,
              ),
            )}
      </div>
    `
  }

  private renderRecord(
    record: Record<string, unknown>,
    did: string,
    collection: string,
    rkey: string,
    handle: string,
    pds: string,
  ): unknown {
    // Route to appropriate tile based on collection NSID
    let tileElement: unknown

    if (collection === 'app.bsky.actor.profile') {
      tileElement = html`
        <profile-tile .record="${record}" .did="${did}" .handle="${handle}" .pds="${pds}"></profile-tile>
      `
    } else if (collection === 'app.bsky.feed.post') {
      tileElement = html`
        <post-tile .record="${record}" .did="${did}" .handle="${handle}" .pds="${pds}"></post-tile>
      `
    } else if (collection === 'app.bsky.graph.follow') {
      tileElement = html`<follow-tile .record="${record}"></follow-tile>`
    } else if (collection === 'app.bsky.graph.list') {
      tileElement = html`<list-tile .record="${record}"></list-tile>`
    } else {
      tileElement = html`
        <schema-fallback
          .record="${record}"
          .collection="${collection}"
          .uri="${`at://${did}/${collection}/${rkey}`}"
        ></schema-fallback>
      `
    }

    return html`
      <div class="record-item" @click="${() => this.navigateToRecord(did, collection, rkey)}">
        ${tileElement}
      </div>
    `
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
