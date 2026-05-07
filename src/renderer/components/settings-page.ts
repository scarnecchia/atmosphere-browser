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
        padding: 24px;
        max-width: 600px;
      }

      h2 {
        font-size: 18px;
        margin-bottom: 16px;
        color: var(--shell-fg);
      }

      .section {
        margin-bottom: 24px;
        padding: 16px;
        background: var(--shell-surface);
        border-radius: 8px;
        border: 1px solid var(--shell-border);
      }

      .section h3 {
        font-size: 14px;
        margin-top: 0;
        margin-bottom: 8px;
        color: var(--shell-fg);
      }

      .section p {
        margin: 4px 0;
        font-size: 13px;
        color: var(--shell-fg);
      }

      button {
        padding: 6px 12px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: var(--shell-surface);
        color: var(--shell-fg);
        cursor: pointer;
        font-size: 13px;
      }

      button:hover {
        background: var(--shell-border);
      }

      button:active {
        opacity: 0.8;
      }

      .status {
        font-size: 12px;
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
    await window.atBrowser.historyClear()
    this.clearStatus = 'History cleared'
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'settings-page': SettingsPage
  }
}
