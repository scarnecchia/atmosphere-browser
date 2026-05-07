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
        font-family: var(--font-body);
        font-size: 0.9375rem;
        line-height: 1.55;
      }

      .toolbar {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        background: var(--shell-bg);
        border-bottom: 1px solid var(--shell-border);
        gap: 4px;
      }

      .toolbar > *:last-child {
        margin-left: auto;
      }

      .content {
        flex: 1;
        overflow: auto;
        background: var(--shell-bg);
        padding: 0 var(--content-pad);
      }

      .content pre {
        white-space: pre-wrap;
        word-break: break-word;
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        line-height: 1.5;
        padding: 16px 0;
        max-width: var(--content-wide);
        margin: 0 auto;
      }

      .error-message {
        color: var(--shell-error);
        padding: 24px 0;
        font-size: 0.9375rem;
        max-width: var(--content-narrow);
        margin: 0 auto;
      }

      .loading {
        color: var(--shell-text-muted);
        padding: 24px 0;
        font-size: 0.9375rem;
        max-width: var(--content-narrow);
        margin: 0 auto;
      }
    `,
  ]

  @state()
  private tabState: TabManagerState = createInitialState()

  @state()
  private pageContentMap: Map<string, unknown> = new Map()

  @state()
  private bookmarks: Array<{ uri: string; title: string }> = []

  @state()
  private unavailableUris: Array<string> = []

  async connectedCallback(): Promise<void> {
    super.connectedCallback()
    await this.loadBookmarks()
    await this.restoreTabs()
  }

  private async loadBookmarks(): Promise<void> {
    try {
      const loaded = await window.atBrowser.bookmarksList()
      if (Array.isArray(loaded)) {
        this.bookmarks = loaded as Array<{ uri: string; title: string }>
      }
    } catch (err) {
      console.error('failed to load bookmarks:', err)
    }
  }

  render() {
    const activeTab = getActiveTab(this.tabState)
    const pageContent = activeTab ? this.pageContentMap.get(activeTab.id) : null

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
          .hasError="${activeTab?.error != null}"
          @navigate="${this.handleNavigate}"
        ></address-bar>
        <account-widget></account-widget>
      </div>
      <bookmark-bar
        .bookmarks="${this.bookmarks}"
        .unavailableUris="${this.unavailableUris}"
        @navigate="${this.handleNavigate}"
      ></bookmark-bar>
      <div class="content" @navigate="${this.handleNavigate}">
        ${activeTab?.isLoading
          ? html`<p class="loading">Resolving...</p>`
          : activeTab?.error
            ? html`<p class="error-message">${activeTab.error}</p>`
            : pageContent
              ? this.renderContent(pageContent, activeTab.uri)
              : html`<p class="loading">Navigate to an at:// URI to get started</p>`}
      </div>
    `
  }

  private renderContent(content: unknown, uri: string): unknown {
    const data = content as Record<string, unknown> | null
    if (data?.type) {
      return html`
        <tile-host
          .responseData="${data}"
          .uri="${uri}"
        ></tile-host>
      `
    }

    return html`<pre>${JSON.stringify(content, null, 2)}</pre>`
  }

  private handleNavigate(e: CustomEvent<{ uri: string }>): void {
    const { uri } = e.detail
    const activeTab = getActiveTab(this.tabState)
    if (!activeTab) return

    this.tabState = navigateTab(this.tabState, activeTab.id, uri)
    this.saveTabs()
    this.resolveCurrentUri(uri, activeTab.id)
  }

  private handleBack(): void {
    const activeTab = getActiveTab(this.tabState)
    if (!activeTab) return

    this.tabState = goBack(this.tabState, activeTab.id)
    this.saveTabs()
    const updated = getActiveTab(this.tabState)
    if (updated?.uri) {
      this.resolveCurrentUri(updated.uri, updated.id)
    }
  }

  private handleForward(): void {
    const activeTab = getActiveTab(this.tabState)
    if (!activeTab) return

    this.tabState = goForward(this.tabState, activeTab.id)
    this.saveTabs()
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
    this.saveTabs()
  }

  private handleTabClose(e: CustomEvent<{ tabId: string }>): void {
    const closedTabId = e.detail.tabId
    this.pageContentMap.delete(closedTabId)
    this.tabState = closeTab(this.tabState, closedTabId)
    this.saveTabs()
  }

  private handleTabNew(): void {
    this.tabState = addTab(this.tabState)
    this.saveTabs()
  }

  private async restoreTabs(): Promise<void> {
    try {
      const saved = (await window.atBrowser.tabsRestore()) as TabManagerState | null
      if (saved?.tabs?.length) {
        this.tabState = {
          tabs: saved.tabs.map((t) => ({ ...t, isLoading: false, error: null })),
          activeTabId: saved.activeTabId,
        }
        const activeTab = getActiveTab(this.tabState)
        if (activeTab?.uri) {
          this.resolveCurrentUri(activeTab.uri, activeTab.id)
        }
      }
    } catch {
      // Use default state
    }
  }

  private saveTabs(): void {
    const persistable = {
      tabs: this.tabState.tabs.map(({ id, title, uri, history, historyIndex }) => ({
        id, title, uri, history, historyIndex,
      })),
      activeTabId: this.tabState.activeTabId,
    }
    window.atBrowser.tabsSave(persistable).catch(() => {})
  }

  private async resolveCurrentUri(uri: string, tabId: string): Promise<void> {
    try {
      const result = await window.atBrowser.resolveUri(uri)
      const data = result as { error?: string }

      if (data.error) {
        this.tabState = setTabError(this.tabState, tabId, data.error)
        this.pageContentMap.delete(tabId)
      } else {
        this.tabState = setTabLoaded(this.tabState, tabId, uri)
        this.pageContentMap.set(tabId, result)
      }
    } catch (err) {
      this.tabState = setTabError(this.tabState, tabId, `Resolution failed: ${String(err)}`)
      this.pageContentMap.delete(tabId)
    }
  }
}
