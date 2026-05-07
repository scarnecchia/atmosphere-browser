// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('feed-tile')
export class FeedTile extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 16px;
        border-bottom: 1px solid var(--shell-border);
      }

      .feed-header {
        margin-bottom: 12px;
      }

      .feed-name {
        font-size: 18px;
        font-weight: bold;
      }

      .feed-description {
        margin-top: 4px;
        font-size: 14px;
        color: var(--shell-text-muted);
      }

      .feed-creator {
        margin-top: 4px;
        font-size: 12px;
        color: var(--shell-accent);
        cursor: pointer;
      }

      .feed-creator:hover {
        text-decoration: underline;
      }
    `,
  ]

  @property({ attribute: false })
  record: Record<string, unknown> | null = null

  @property({ type: String })
  creatorDid = ''

  render() {
    if (!this.record) return html`<p>Loading feed...</p>`

    const displayName = (this.record['displayName'] as string) ?? 'Unnamed Feed'
    const description = (this.record['description'] as string) ?? null

    return html`
      <div class="feed-header">
        <div class="feed-name">${displayName}</div>
        ${description ? html`<div class="feed-description">${description}</div>` : ''}
        <div class="feed-creator" @click="${this.navigateToCreator}">
          by ${this.creatorDid}
        </div>
      </div>
    `
  }

  private navigateToCreator(): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri: `at://${this.creatorDid}` },
        bubbles: true,
        composed: true,
      }),
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'feed-tile': FeedTile
  }
}
