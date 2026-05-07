// pattern: Imperative Shell

import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'
import type { TabState } from '../state/tab-manager.js'

@customElement('tab-bar')
export class TabBar extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: flex;
        align-items: stretch;
        background: var(--shell-bg);
        border-bottom: 1px solid var(--shell-border);
        padding: 0;
        gap: 0;
        -webkit-app-region: drag;
      }

      .tab {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 8px 16px;
        border: none;
        border-bottom: 2px solid transparent;
        background: none;
        color: var(--shell-text-muted);
        font-family: var(--font-body);
        font-size: 0.8125rem;
        font-weight: 500;
        letter-spacing: 0.01em;
        cursor: pointer;
        max-width: 200px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        transition: color var(--duration-fast) var(--ease-snappy),
                    border-color var(--duration-fast) var(--ease-snappy);
        -webkit-app-region: no-drag;
      }

      .tab:hover {
        color: var(--shell-fg);
      }

      .tab.active {
        color: var(--shell-fg);
        border-bottom-color: var(--shell-accent);
      }

      .tab-title {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tab-close {
        opacity: 0;
        border: none;
        background: none;
        color: var(--shell-text-tertiary);
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 4px;
        font-size: 10px;
        line-height: 1;
        transition: opacity var(--duration-fast) var(--ease-snappy);
      }

      .tab:hover .tab-close {
        opacity: 1;
      }

      .tab-close:hover {
        background: var(--shell-surface-sunken);
        color: var(--shell-fg);
      }

      .new-tab {
        display: flex;
        align-items: center;
        padding: 8px;
        border: none;
        background: none;
        color: var(--shell-text-tertiary);
        cursor: pointer;
        border-radius: 4px;
        font-size: 14px;
        transition: color var(--duration-fast) var(--ease-snappy);
        -webkit-app-region: no-drag;
      }

      .new-tab:hover {
        color: var(--shell-fg);
      }
    `,
  ]

  @property({ attribute: false })
  tabs: ReadonlyArray<TabState> = []

  @property({ type: String })
  activeTabId = ''

  render() {
    return html`
      ${this.tabs.map(
        (tab) => html`
          <div
            class="tab ${tab.id === this.activeTabId ? 'active' : ''}"
            @click="${() => this.selectTab(tab.id)}"
          >
            <span class="tab-title">${tab.title || 'New Tab'}</span>
            <button class="tab-close" @click="${(e: Event) => this.closeTabClick(e, tab.id)}">
              &times;
            </button>
          </div>
        `,
      )}
      <button class="new-tab" @click="${this.newTab}">+</button>
    `
  }

  private selectTab(tabId: string): void {
    this.dispatchEvent(
      new CustomEvent('tab-select', { detail: { tabId }, bubbles: true, composed: true }),
    )
  }

  private closeTabClick(e: Event, tabId: string): void {
    e.stopPropagation()
    this.dispatchEvent(
      new CustomEvent('tab-close', { detail: { tabId }, bubbles: true, composed: true }),
    )
  }

  private newTab(): void {
    this.dispatchEvent(new CustomEvent('tab-new', { bubbles: true, composed: true }))
  }
}
