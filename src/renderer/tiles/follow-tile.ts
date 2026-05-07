// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('follow-tile')
export class FollowTile extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 10px 0;
        border-bottom: 1px solid var(--shell-border-subtle);
        max-width: var(--content-narrow);
        margin: 0 auto;
      }

      .follow-entry {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: opacity var(--duration-fast) var(--ease-snappy);
      }

      .follow-entry:hover {
        opacity: 0.8;
      }

      .follow-did {
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        color: var(--shell-accent);
      }

      .follow-date {
        font-size: 0.8125rem;
        color: var(--shell-text-tertiary);
        margin-left: auto;
      }
    `,
  ]

  @property({ attribute: false })
  record: Record<string, unknown> | null = null

  render() {
    if (!this.record) return html`<p>No data</p>`

    const subject = (this.record['subject'] as string) ?? 'unknown'
    const createdAt = (this.record['createdAt'] as string) ?? ''

    return html`
      <div class="follow-entry" @click="${() => this.navigateTo(subject)}">
        <span class="follow-did">${subject}</span>
        <span class="follow-date">${this.formatDate(createdAt)}</span>
      </div>
    `
  }

  private navigateTo(did: string): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri: `at://${did}` },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private formatDate(iso: string): string {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString()
    } catch {
      return iso
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'follow-tile': FollowTile
  }
}
