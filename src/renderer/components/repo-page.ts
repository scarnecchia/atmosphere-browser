// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('repo-page')
export class RepoPage extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        overflow-y: auto;
      }

      .repo-header {
        padding: 20px 16px;
        border-bottom: 1px solid var(--shell-border);
      }

      .profile-tile-wrapper {
        margin-bottom: 20px;
      }

      .collections-section {
        padding: 16px;
      }

      .collections-title {
        font-weight: bold;
        font-size: 16px;
        margin-bottom: 12px;
        color: var(--shell-fg);
      }

      .collection-item {
        padding: 12px;
        background: var(--shell-surface);
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        margin-bottom: 8px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .collection-item:hover {
        background: var(--shell-surface);
        opacity: 0.8;
      }

      .collection-nsid {
        font-family: monospace;
        font-size: 13px;
        color: var(--shell-accent);
      }

      .collection-count {
        font-size: 12px;
        color: var(--shell-text-muted);
      }

      .error-section {
        padding: 20px;
        color: var(--shell-error);
      }
    `,
  ]

  @property({ attribute: false })
  responseData: Record<string, unknown> | null = null

  render() {
    if (!this.responseData) {
      return html`<div class="error-section">No data</div>`
    }

    const responseType = (this.responseData['type'] as string) ?? ''

    if (responseType !== 'repo') {
      return html`<div class="error-section">Expected repo response type</div>`
    }

    const identity = this.responseData['identity'] as Record<string, unknown> | undefined
    const profile = this.responseData['profile'] as Record<string, unknown> | undefined | null
    const collections = (this.responseData['collections'] as Array<Record<string, unknown>>) ?? []

    if (!identity) {
      return html`<div class="error-section">Missing identity data</div>`
    }

    const did = (identity['did'] as string) ?? ''
    const handle = (identity['handle'] as string) ?? ''
    const pds = (identity['pds'] as string) ?? ''

    return html`
      <div class="repo-header">
        ${profile
          ? html`
              <div class="profile-tile-wrapper">
                <profile-tile
                  .record="${profile}"
                  .did="${did}"
                  .handle="${handle}"
                  .pds="${pds}"
                ></profile-tile>
              </div>
            `
          : html`<div><strong>${handle}</strong></div>`}
      </div>

      <div class="collections-section">
        <div class="collections-title">Collections (${collections.length})</div>
        ${collections.map(
          (col) => html`
            <div class="collection-item" @click="${() => this.navigateToCollection(handle, col)}">
              <span class="collection-nsid">${(col['nsid'] as string) ?? ''}</span>
              <span class="collection-count">${(col['count'] as number) ?? 0} records</span>
            </div>
          `,
        )}
      </div>
    `
  }

  private navigateToCollection(handle: string, collection: Record<string, unknown>): void {
    const nsid = (collection['nsid'] as string) ?? ''
    if (nsid) {
      this.dispatchEvent(
        new CustomEvent('navigate', {
          detail: { uri: `at://${handle}/${nsid}` },
          bubbles: true,
          composed: true,
        }),
      )
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'repo-page': RepoPage
  }
}
