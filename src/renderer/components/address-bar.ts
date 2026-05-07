// pattern: Imperative Shell

import { LitElement, html, css } from 'lit'
import { customElement, property, state, query } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('address-bar')
export class AddressBar extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        flex: 1;
      }

      input {
        flex: 1;
        padding: 6px 12px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: var(--shell-input-bg);
        color: var(--shell-fg);
        font-size: 0.8125rem;
        font-family: var(--font-mono);
        line-height: 1.5;
        outline: none;
        transition: background var(--duration-fast) var(--ease-snappy),
                    border-color var(--duration-fast) var(--ease-snappy);
      }

      input:focus {
        background: var(--shell-surface);
        border-color: var(--shell-accent);
        box-shadow: 0 0 0 2px oklch(54% 0.22 260 / 0.15);
      }

      input.error {
        border-color: var(--shell-error);
      }

      .resolved-info {
        font-size: 0.6875rem;
        color: var(--shell-text-tertiary);
        font-family: var(--font-mono);
        padding: 0 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }
    `,
  ]

  @property({ type: String })
  currentUri = ''

  @property({ type: String })
  resolvedDid = ''

  @property({ type: Boolean })
  hasError = false

  @state()
  private inputValue = ''

  @query('input')
  private inputEl!: HTMLInputElement

  connectedCallback(): void {
    super.connectedCallback()
    this.inputValue = this.currentUri
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('currentUri') && !this.inputEl?.matches(':focus')) {
      this.inputValue = this.currentUri
    }
  }

  render() {
    return html`
      <input
        type="text"
        class="${this.hasError ? 'error' : ''}"
        .value="${this.inputValue}"
        placeholder="at://handle.bsky.social or just handle.bsky.social"
        @input="${this.handleInput}"
        @keydown="${this.handleKeydown}"
        @focus="${this.handleFocus}"
      />
      ${this.resolvedDid ? html`<span class="resolved-info">${this.resolvedDid}</span>` : ''}
    `
  }

  private handleInput(e: Event): void {
    this.inputValue = (e.target as HTMLInputElement).value
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      this.navigate()
    }
  }

  private handleFocus(): void {
    this.inputEl.select()
  }

  private navigate(): void {
    let uri = this.inputValue.trim()
    if (!uri) return

    if (!uri.startsWith('at://') && !uri.startsWith('did:')) {
      uri = `at://${uri}`
    }

    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri },
        bubbles: true,
        composed: true,
      }),
    )
  }

  focus(): void {
    this.inputEl?.focus()
  }
}
