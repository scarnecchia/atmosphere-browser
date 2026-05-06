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
        align-items: center;
        background: var(--shell-bg);
        border-bottom: 1px solid var(--shell-border);
        padding: 4px 4px 0;
        gap: 2px;
        -webkit-app-region: drag;
      }

      .tab {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border-radius: 6px 6px 0 0;
        background: var(--shell-tab-inactive);
        color: var(--shell-text-muted);
        font-size: 12px;
        cursor: pointer;
        max-width: 200px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        -webkit-app-region: no-drag;
      }

      .tab.active {
        background: var(--shell-tab-active);
        color: var(--shell-fg);
      }

      .tab-title {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tab-close {
        opacity: 0;
        border: none;
        background: none;
        color: var(--shell-text-muted);
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 10px;
        line-height: 1;
      }

      .tab:hover .tab-close {
        opacity: 1;
      }

      .tab-close:hover {
        background: var(--shell-border);
        color: var(--shell-fg);
      }

      .new-tab {
        padding: 4px 8px;
        border: none;
        background: none;
        color: var(--shell-text-muted);
        cursor: pointer;
        border-radius: 4px;
        font-size: 16px;
        -webkit-app-region: no-drag;
      }

      .new-tab:hover {
        background: var(--shell-surface);
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
