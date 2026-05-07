// pattern: Imperative Shell

import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

type BookmarkItem = {
  readonly uri: string
  readonly title: string
}

export function getBookmarkChipClass(
  uri: string,
  unavailableUris: ReadonlyArray<string>,
): string {
  return unavailableUris.includes(uri) ? 'unavailable' : ''
}

export function getNavigateUri(bookmarkUri: string): string {
  return bookmarkUri
}

@customElement('bookmark-bar')
export class BookmarkBar extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: var(--shell-bg);
        border-bottom: 1px solid var(--shell-border-subtle);
        min-height: 28px;
        flex-wrap: wrap;
      }

      .bookmark-chip {
        padding: 2px 8px;
        border-radius: 4px;
        font-family: var(--font-body);
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--shell-fg);
        background: var(--shell-surface-sunken);
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 150px;
        user-select: none;
        transition: background var(--duration-fast) var(--ease-snappy);
      }

      .bookmark-chip:hover {
        background: var(--shell-border);
      }

      .bookmark-chip.unavailable {
        opacity: 0.5;
        text-decoration: line-through;
        cursor: not-allowed;
      }

      .empty {
        font-size: 0.8125rem;
        color: var(--shell-text-tertiary);
      }
    `,
  ]

  @property({ attribute: false })
  bookmarks: ReadonlyArray<BookmarkItem> = []

  @property({ attribute: false })
  unavailableUris: ReadonlyArray<string> = []

  render() {
    if (this.bookmarks.length === 0) {
      return html`<span class="empty">No bookmarks yet</span>`
    }

    return html`
      ${this.bookmarks.map(
        (bm) => html`
          <span
            class="bookmark-chip ${getBookmarkChipClass(bm.uri, this.unavailableUris)}"
            title="${bm.uri}"
            @click="${() => this.navigateTo(getNavigateUri(bm.uri))}"
          >
            ${bm.title}
          </span>
        `,
      )}
    `
  }

  private navigateTo(uri: string): void {
    this.dispatchEvent(
      new CustomEvent('navigate', { detail: { uri }, bubbles: true, composed: true }),
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bookmark-bar': BookmarkBar
  }
}
