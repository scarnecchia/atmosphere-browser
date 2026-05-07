// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('list-tile')
export class ListTile extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 12px 0;
        border-bottom: 1px solid var(--shell-border-subtle);
        max-width: var(--content-narrow);
        margin: 0 auto;
      }

      .list-name {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 1.25rem;
        letter-spacing: -0.01em;
        color: var(--shell-fg);
      }

      .list-purpose {
        font-size: 0.8125rem;
        color: var(--shell-text-muted);
        margin-top: 2px;
      }

      .list-description {
        margin-top: 8px;
        line-height: 1.55;
        font-size: 0.9375rem;
        color: var(--shell-fg);
        max-width: 65ch;
      }
    `,
  ]

  @property({ attribute: false })
  record: Record<string, unknown> | null = null

  render() {
    if (!this.record) return html`<p>No data</p>`

    const name = (this.record['name'] as string) ?? 'Unnamed list'
    const purpose = (this.record['purpose'] as string) ?? ''
    const description = (this.record['description'] as string) ?? null

    const purposeLabel = purpose.includes('modlist')
      ? 'Moderation list'
      : purpose.includes('curatelist')
        ? 'Curation list'
        : purpose

    return html`
      <div class="list-name">${name}</div>
      <div class="list-purpose">${purposeLabel}</div>
      ${description ? html`<div class="list-description">${description}</div>` : ''}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'list-tile': ListTile
  }
}
