// pattern: Imperative Shell

import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('nav-controls')
export class NavControls extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 0 8px;
      }

      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: none;
        color: var(--shell-fg);
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
        font-size: 16px;
        transition: background var(--duration-fast) var(--ease-snappy);
      }

      button:hover:not(:disabled) {
        background: var(--shell-surface-sunken);
      }

      button:focus-visible {
        outline: none;
        box-shadow: var(--shadow-focus);
      }

      button:disabled {
        color: var(--shell-text-tertiary);
        cursor: default;
      }
    `,
  ]

  @property({ type: Boolean })
  canGoBack = false

  @property({ type: Boolean })
  canGoForward = false

  @property({ type: Boolean })
  isLoading = false

  render() {
    return html`
      <button ?disabled="${!this.canGoBack}" @click="${this.goBack}" title="Back">&#8592;</button>
      <button ?disabled="${!this.canGoForward}" @click="${this.goForward}" title="Forward">
        &#8594;
      </button>
      <button @click="${this.reload}" title="${this.isLoading ? 'Stop' : 'Reload'}">
        ${this.isLoading ? '✕' : '↻'}
      </button>
    `
  }

  private goBack(): void {
    this.dispatchEvent(new CustomEvent('nav-back', { bubbles: true, composed: true }))
  }

  private goForward(): void {
    this.dispatchEvent(new CustomEvent('nav-forward', { bubbles: true, composed: true }))
  }

  private reload(): void {
    this.dispatchEvent(new CustomEvent('nav-reload', { bubbles: true, composed: true }))
  }
}
