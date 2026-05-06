// pattern: Imperative Shell (Lit component lifecycle and tile loading orchestration)

import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('tile-host')
export class TileHost extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
      }

      .tile-error {
        color: var(--shell-error);
        padding: 12px;
        border: 1px solid var(--shell-error);
        border-radius: 4px;
        margin: 8px 0;
      }

      .tile-error p {
        margin: 0 0 4px 0;
      }

      .tile-error code {
        font-size: 12px;
        display: block;
        margin-top: 4px;
        color: var(--shell-text-muted);
        word-break: break-word;
      }
    `,
  ]

  @property({ attribute: false })
  responseData: Record<string, unknown> | null = null

  @property({ type: String })
  uri = ''

  render() {
    if (!this.responseData) {
      return html`<p>No data</p>`
    }

    const responseType = (this.responseData['type'] as string) ?? ''

    // Route based on response type
    if (responseType === 'repo') {
      return html`<repo-page .responseData="${this.responseData}"></repo-page>`
    }

    if (responseType === 'collection') {
      const identity = this.responseData['identity'] as Record<string, unknown> | undefined
      const handle = (identity?.['handle'] as string) ?? ''
      const collectionNsid = (this.responseData['collection'] as string) ?? ''

      return html`
        <collection-page
          .responseData="${this.responseData}"
          .collection="${collectionNsid}"
          .handle="${handle}"
        ></collection-page>
      `
    }

    if (responseType === 'record') {
      const identity = this.responseData['identity'] as Record<string, unknown> | undefined
      const handle = (identity?.['handle'] as string) ?? ''
      const collectionNsid = (this.responseData['collection'] as string) ?? ''
      const rkey = (this.responseData['rkey'] as string) ?? ''

      return html`
        <record-page
          .responseData="${this.responseData}"
          .collection="${collectionNsid}"
          .handle="${handle}"
          .rkey="${rkey}"
        ></record-page>
      `
    }

    if (responseType === 'error') {
      const errorMsg = (this.responseData['error'] as string) ?? 'Unknown error'
      return html`
        <div class="tile-error">
          <p>Failed to load data</p>
          <code>${errorMsg}</code>
        </div>
      `
    }

    return html`<p>Unknown response type: ${responseType}</p>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tile-host': TileHost
  }
}
