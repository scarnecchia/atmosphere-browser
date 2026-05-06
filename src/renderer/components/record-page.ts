// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('record-page')
export class RecordPage extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        overflow-y: auto;
      }

      .record-header {
        padding: 16px;
        border-bottom: 1px solid var(--shell-border);
        background: var(--shell-surface);
      }

      .record-uri {
        font-family: monospace;
        font-size: 12px;
        color: var(--shell-text-muted);
      }

      .record-content {
        padding: 0;
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

  @property({ type: String })
  rkey = ''

  render() {
    if (!this.responseData) {
      return html`<div class="error-section">No data</div>`
    }

    const responseType = (this.responseData['type'] as string) ?? ''

    if (responseType !== 'record') {
      return html`<div class="error-section">Expected record response type</div>`
    }

    const record = this.responseData['record'] as Record<string, unknown> | undefined
    const identity = this.responseData['identity'] as Record<string, unknown> | undefined

    if (!record || !identity) {
      return html`<div class="error-section">Missing record or identity data</div>`
    }

    const did = (identity['did'] as string) ?? ''
    const pds = (identity['pds'] as string) ?? ''
    const uri = `at://${did}/${this.collection}/${this.rkey}`

    return html`
      <div class="record-header">
        <div class="record-uri">${uri}</div>
      </div>

      <div class="record-content">${this.renderRecord(record, did, this.collection, this.handle, pds)}</div>
    `
  }

  private renderRecord(
    record: Record<string, unknown>,
    did: string,
    collection: string,
    handle: string,
    pds: string,
  ): unknown {
    // Route to appropriate tile based on collection NSID
    if (collection === 'app.bsky.actor.profile') {
      return html`<profile-tile .record="${record}" .did="${did}" .handle="${handle}" .pds="${pds}"></profile-tile>`
    }

    if (collection === 'app.bsky.feed.post') {
      return html`<post-tile .record="${record}" .did="${did}" .handle="${handle}" .pds="${pds}"></post-tile>`
    }

    if (collection === 'app.bsky.graph.follow') {
      return html`<follow-tile .record="${record}"></follow-tile>`
    }

    if (collection === 'app.bsky.graph.list') {
      return html`<list-tile .record="${record}"></list-tile>`
    }

    return html`
      <schema-fallback
        .record="${record}"
        .collection="${collection}"
        .uri="${`at://${did}/${collection}/${this.rkey}`}"
      ></schema-fallback>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'record-page': RecordPage
  }
}
