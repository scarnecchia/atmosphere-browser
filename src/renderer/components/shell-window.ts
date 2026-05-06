// pattern: Imperative Shell

import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'
import {
  createInitialState,
  addTab,
  closeTab,
  switchTab,
  navigateTab,
  goBack,
  goForward,
  setTabLoaded,
  setTabError,
  getActiveTab,
  type TabManagerState,
} from '../state/tab-manager.js'

declare global {
  interface Window {
    atBrowser: {
      resolveUri: (uri: string) => Promise<unknown>
    }
  }
}

@customElement('shell-window')
export class ShellWindow extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: var(--shell-bg);
        color: var(--shell-fg);
        font-family: system-ui, -apple-system, sans-serif;
      }

      .toolbar {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        background: var(--shell-surface);
        border-bottom: 1px solid var(--shell-border);
      }

      .content {
        flex: 1;
        overflow: auto;
        padding: 16px;
      }

      .content pre {
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 13px;
        line-height: 1.5;
      }

      .error-message {
        color: var(--shell-error);
        padding: 16px;
      }

      .loading {
        color: var(--shell-text-muted);
        padding: 16px;
      }
    `,
  ]

  @state()
  private tabState: TabManagerState = createInitialState()

  @state()
  private pageContent: unknown = null

  render() {
    const activeTab = getActiveTab(this.tabState)

    return html`
      <tab-bar
        .tabs="${this.tabState.tabs}"
        .activeTabId="${this.tabState.activeTabId}"
        @tab-select="${this.handleTabSelect}"
        @tab-close="${this.handleTabClose}"
        @tab-new="${this.handleTabNew}"
      ></tab-bar>
      <div class="toolbar">
        <nav-controls
          .canGoBack="${(activeTab?.historyIndex ?? 0) > 0}"
          .canGoForward="${(activeTab?.historyIndex ?? 0) < (activeTab?.history.length ?? 1) - 1}"
          .isLoading="${activeTab?.isLoading ?? false}"
          @nav-back="${this.handleBack}"
          @nav-forward="${this.handleForward}"
          @nav-reload="${this.handleReload}"
        ></nav-controls>
        <address-bar
          .currentUri="${activeTab?.uri ?? ''}"
          .resolvedDid="${''}"
          .hasError="${activeTab?.error !== null && activeTab?.error !== undefined}"
          @navigate="${this.handleNavigate}"
        ></address-bar>
      </div>
      <div class="content">
        ${activeTab?.isLoading
          ? html`<p class="loading">Resolving...</p>`
          : activeTab?.error
            ? html`<p class="error-message">${activeTab.error}</p>`
            : this.pageContent
              ? html`<pre>${JSON.stringify(this.pageContent, null, 2)}</pre>`
              : html`<p class="loading">Navigate to an at:// URI to get started</p>`}
      </div>
    `
  }

  private handleNavigate(e: CustomEvent<{ uri: string }>): void {
    const { uri } = e.detail
    const activeTab = getActiveTab(this.tabState)
    if (!activeTab) return

    this.tabState = navigateTab(this.tabState, activeTab.id, uri)
    this.resolveCurrentUri(uri, activeTab.id)
  }

  private handleBack(): void {
    const activeTab = getActiveTab(this.tabState)
    if (!activeTab) return

    this.tabState = goBack(this.tabState, activeTab.id)
    const updated = getActiveTab(this.tabState)
    if (updated?.uri) {
      this.resolveCurrentUri(updated.uri, updated.id)
    }
  }

  private handleForward(): void {
    const activeTab = getActiveTab(this.tabState)
    if (!activeTab) return

    this.tabState = goForward(this.tabState, activeTab.id)
    const updated = getActiveTab(this.tabState)
    if (updated?.uri) {
      this.resolveCurrentUri(updated.uri, updated.id)
    }
  }

  private handleReload(): void {
    const activeTab = getActiveTab(this.tabState)
    if (!activeTab?.uri) return

    this.tabState = navigateTab(this.tabState, activeTab.id, activeTab.uri)
    this.resolveCurrentUri(activeTab.uri, activeTab.id)
  }

  private handleTabSelect(e: CustomEvent<{ tabId: string }>): void {
    this.tabState = switchTab(this.tabState, e.detail.tabId)
    this.pageContent = null
  }

  private handleTabClose(e: CustomEvent<{ tabId: string }>): void {
    this.tabState = closeTab(this.tabState, e.detail.tabId)
    this.pageContent = null
  }

  private handleTabNew(): void {
    this.tabState = addTab(this.tabState)
    this.pageContent = null
  }

  private async resolveCurrentUri(uri: string, tabId: string): Promise<void> {
    try {
      const result = await window.atBrowser.resolveUri(uri)
      const data = result as { error?: string }

      if (data.error) {
        this.tabState = setTabError(this.tabState, tabId, data.error)
        this.pageContent = null
      } else {
        this.tabState = setTabLoaded(this.tabState, tabId, uri)
        this.pageContent = result
      }
    } catch (err) {
      this.tabState = setTabError(this.tabState, tabId, `Resolution failed: ${String(err)}`)
      this.pageContent = null
    }
  }
}
