// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('settings-page')
export class SettingsPage extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 24px 0;
        max-width: var(--content-narrow);
        margin: 0 auto;
      }

      h2 {
        font-family: var(--font-display);
        font-size: 1.25rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        margin-bottom: 24px;
        color: var(--shell-fg);
      }

      .section {
        margin-bottom: 24px;
        padding: 16px;
        background: var(--shell-surface);
        border-radius: 8px;
        border: 1px solid var(--shell-border-subtle);
      }

      .section h3 {
        font-family: var(--font-body);
        font-size: 0.9375rem;
        font-weight: 600;
        margin-top: 0;
        margin-bottom: 8px;
        color: var(--shell-fg);
      }

      .section p {
        margin: 4px 0;
        font-size: 0.9375rem;
        color: var(--shell-fg);
        line-height: 1.55;
      }

      button {
        padding: 8px 16px;
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

      button:hover {
        background: var(--shell-surface-sunken);
        border-color: #c8c5c0;
      }

      button:focus-visible {
        outline: none;
        box-shadow: var(--shadow-focus);
      }

      .status {
        font-size: 0.8125rem;
        color: var(--shell-accent);
        margin-top: 8px;
      }
    `,
  ]

  @state()
  private clearStatus = ''

  render() {
    return html`
      <h2>Settings</h2>
      <div class="section">
        <h3>History</h3>
        <button @click="${this.clearHistory}">Clear Browsing History</button>
        ${this.clearStatus ? html`<p class="status">${this.clearStatus}</p>` : ''}
      </div>
      <div class="section">
        <h3>About</h3>
        <p>Atmosphere Browser v0.1.0</p>
        <p>Browse the AT Protocol atmosphere.</p>
      </div>
    `
  }

  private async clearHistory(): Promise<void> {
    try {
      await window.atBrowser.historyClear()
      this.clearStatus = 'History cleared'
    } catch (error) {
      console.error('failed to clear history:', error)
      this.clearStatus = 'Error clearing history'
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'settings-page': SettingsPage
  }
}
