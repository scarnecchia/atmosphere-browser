# Atmosphere Browser Implementation Plan — Phase 2: Browser Shell

**Goal:** Functional browser chrome with address bar, tabs, navigation, and IPC bridge to the protocol layer.

**Architecture:** Lit 3 web components in the Electron renderer process. Shell communicates with main process via IPC (preload contextBridge). Tab manager maintains per-tab navigation history.

**Tech Stack:** Lit 3 (web components, decorators), Electron IPC (contextBridge/ipcMain), TypeScript

**Scope:** 7 phases from original design (phase 2 of 7)

**Codebase verified:** 2026-05-06 — Phase 1 scaffold exists with main process, preload, renderer entry, identity resolution, XRPC client

---

## Acceptance Criteria Coverage

This phase implements and tests:

### atmo-browser.AC3: Navigation
- **atmo-browser.AC3.1 Success:** Typing `at://handle.bsky.social` in address bar resolves and navigates to repo page
- **atmo-browser.AC3.2 Success:** Typing bare handle (no `at://` prefix) auto-prefixes and resolves
- **atmo-browser.AC3.3 Success:** Back/forward buttons traverse per-tab history
- **atmo-browser.AC3.4 Success:** Clicking an AT-URI link in a tile navigates within the browser
- **atmo-browser.AC3.5 Success:** Multiple tabs maintain independent navigation state
- **atmo-browser.AC3.6 Failure:** Navigating to an unresolvable handle shows error, address bar retains input for correction
- **atmo-browser.AC3.7 Edge:** Navigating to `at://did:plc:xyz` directly (without handle) resolves via PLC

---

<!-- START_SUBCOMPONENT_A (tasks 1-2) -->
<!-- START_TASK_1 -->
### Task 1: Shell component scaffold and shared styles

**Files:**
- Create: `src/renderer/styles/shared.ts`
- Create: `src/renderer/components/shell-window.ts`
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/main.ts`

**Step 1: Create src/renderer/styles/shared.ts**

```typescript
import { css } from 'lit'

export const resetStyles = css`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
`

export const shellColors = css`
  :host {
    --shell-bg: #1e1e2e;
    --shell-fg: #cdd6f4;
    --shell-surface: #313244;
    --shell-border: #45475a;
    --shell-accent: #89b4fa;
    --shell-error: #f38ba8;
    --shell-text-muted: #a6adc8;
    --shell-input-bg: #11111b;
    --shell-tab-active: #313244;
    --shell-tab-inactive: #1e1e2e;
  }
`
```

**Step 2: Create src/renderer/components/shell-window.ts**

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

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

      .content {
        flex: 1;
        overflow: auto;
        padding: 16px;
      }
    `,
  ]

  @state()
  private placeholder = 'Shell loading...'

  render() {
    return html`
      <div class="content">
        <p>${this.placeholder}</p>
      </div>
    `
  }
}
```

**Step 3: Update src/renderer/index.html**

Replace the body content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" />
  <title>Atmosphere Browser</title>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
  </style>
</head>
<body>
  <shell-window></shell-window>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

**Step 4: Update src/renderer/main.ts**

```typescript
import './components/shell-window.js'
```

**Step 5: Verify operationally**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Step 6: Commit**

```bash
git add src/renderer/
git commit -m "feat: shell window scaffold with shared styles"
```
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Address bar component

**Verifies:** atmo-browser.AC3.1, atmo-browser.AC3.2, atmo-browser.AC3.6

**Files:**
- Create: `src/renderer/components/address-bar.ts`

**Implementation:**

The address bar accepts `at://` URIs and bare handles. On Enter, it emits a `navigate` custom event. If input doesn't start with `at://` or `did:`, auto-prefix with `at://`. On navigation error, the input retains the original text for correction.

```typescript
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
        border-radius: 6px;
        background: var(--shell-input-bg);
        color: var(--shell-fg);
        font-size: 14px;
        font-family: monospace;
        outline: none;
      }

      input:focus {
        border-color: var(--shell-accent);
      }

      input.error {
        border-color: var(--shell-error);
      }

      .resolved-info {
        font-size: 11px;
        color: var(--shell-text-muted);
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
```

**Testing:**

Tests must verify:
- atmo-browser.AC3.1: Input `at://handle.bsky.social` emits navigate event with same URI
- atmo-browser.AC3.2: Input `handle.bsky.social` emits navigate event with `at://handle.bsky.social`
- atmo-browser.AC3.6: When `hasError` is true, input has error styling and retains text

Test file: `src/renderer/components/address-bar.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: address bar component with auto-prefix and error state`
<!-- END_TASK_2 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (tasks 3-4) -->
<!-- START_TASK_3 -->
### Task 3: Tab manager data model

**Verifies:** atmo-browser.AC3.3, atmo-browser.AC3.5

**Files:**
- Create: `src/renderer/state/tab-manager.ts`

**Implementation:**

Pure data model for tab state. Each tab has an independent navigation history stack. Supports create, close, switch, navigate, back, forward operations.

```typescript
export type TabState = {
  readonly id: string
  readonly title: string
  readonly uri: string
  readonly history: ReadonlyArray<string>
  readonly historyIndex: number
  readonly isLoading: boolean
  readonly error: string | null
}

export type TabManagerState = {
  readonly tabs: ReadonlyArray<TabState>
  readonly activeTabId: string
}

let nextId = 1

function generateId(): string {
  return `tab-${nextId++}`
}

export function createTab(uri: string = ''): TabState {
  return {
    id: generateId(),
    title: uri || 'New Tab',
    uri,
    history: uri ? [uri] : [],
    historyIndex: uri ? 0 : -1,
    isLoading: false,
    error: null,
  }
}

export function createInitialState(): TabManagerState {
  const tab = createTab()
  return { tabs: [tab], activeTabId: tab.id }
}

export function addTab(state: TabManagerState, uri: string = ''): TabManagerState {
  const tab = createTab(uri)
  return {
    tabs: [...state.tabs, tab],
    activeTabId: tab.id,
  }
}

export function closeTab(state: TabManagerState, tabId: string): TabManagerState {
  if (state.tabs.length <= 1) return state

  const index = state.tabs.findIndex((t) => t.id === tabId)
  const newTabs = state.tabs.filter((t) => t.id !== tabId)

  let newActiveId = state.activeTabId
  if (state.activeTabId === tabId) {
    const newIndex = Math.min(index, newTabs.length - 1)
    newActiveId = newTabs[newIndex]?.id ?? newTabs[0]!.id
  }

  return { tabs: newTabs, activeTabId: newActiveId }
}

export function switchTab(state: TabManagerState, tabId: string): TabManagerState {
  if (!state.tabs.some((t) => t.id === tabId)) return state
  return { ...state, activeTabId: tabId }
}

export function navigateTab(state: TabManagerState, tabId: string, uri: string): TabManagerState {
  return updateTab(state, tabId, (tab) => {
    const newHistory = [...tab.history.slice(0, tab.historyIndex + 1), uri]
    return {
      ...tab,
      uri,
      title: uri,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isLoading: true,
      error: null,
    }
  })
}

export function goBack(state: TabManagerState, tabId: string): TabManagerState {
  return updateTab(state, tabId, (tab) => {
    if (tab.historyIndex <= 0) return tab
    const newIndex = tab.historyIndex - 1
    return {
      ...tab,
      uri: tab.history[newIndex]!,
      title: tab.history[newIndex]!,
      historyIndex: newIndex,
      isLoading: true,
      error: null,
    }
  })
}

export function goForward(state: TabManagerState, tabId: string): TabManagerState {
  return updateTab(state, tabId, (tab) => {
    if (tab.historyIndex >= tab.history.length - 1) return tab
    const newIndex = tab.historyIndex + 1
    return {
      ...tab,
      uri: tab.history[newIndex]!,
      title: tab.history[newIndex]!,
      historyIndex: newIndex,
      isLoading: true,
      error: null,
    }
  })
}

export function setTabLoaded(
  state: TabManagerState,
  tabId: string,
  title: string,
): TabManagerState {
  return updateTab(state, tabId, (tab) => ({
    ...tab,
    title,
    isLoading: false,
    error: null,
  }))
}

export function setTabError(
  state: TabManagerState,
  tabId: string,
  error: string,
): TabManagerState {
  return updateTab(state, tabId, (tab) => ({
    ...tab,
    isLoading: false,
    error,
  }))
}

export function getActiveTab(state: TabManagerState): TabState | null {
  return state.tabs.find((t) => t.id === state.activeTabId) ?? null
}

function updateTab(
  state: TabManagerState,
  tabId: string,
  updater: (tab: TabState) => TabState,
): TabManagerState {
  return {
    ...state,
    tabs: state.tabs.map((t) => (t.id === tabId ? updater(t) : t)),
  }
}
```

**Testing:**

Tests must verify:
- atmo-browser.AC3.3: `goBack` and `goForward` traverse per-tab history correctly
- atmo-browser.AC3.5: Multiple tabs with independent navigation state — navigating in one doesn't affect the other

Test file: `src/renderer/state/tab-manager.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: tab manager data model with history stack`
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Tab bar component

**Verifies:** atmo-browser.AC3.5

**Files:**
- Create: `src/renderer/components/tab-bar.ts`

**Implementation:**

Tab bar renders tabs from TabManagerState, supports switching, creating, and closing tabs via custom events.

```typescript
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
```

**Testing:**

Tests must verify:
- atmo-browser.AC3.5: Renders multiple tabs, switching emits correct tabId, each tab shows its own title

Test file: `src/renderer/components/tab-bar.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: tab bar component with create/close/switch`
<!-- END_TASK_4 -->
<!-- END_SUBCOMPONENT_B -->

<!-- START_SUBCOMPONENT_C (tasks 5-6) -->
<!-- START_TASK_5 -->
### Task 5: Navigation controls component

**Verifies:** atmo-browser.AC3.3

**Files:**
- Create: `src/renderer/components/nav-controls.ts`

**Implementation:**

Back, forward, and reload buttons. Disabled states based on history position.

```typescript
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
        border: none;
        background: none;
        color: var(--shell-fg);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 16px;
      }

      button:hover:not(:disabled) {
        background: var(--shell-surface);
      }

      button:disabled {
        opacity: 0.3;
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
        ${this.isLoading ? '&#10005;' : '&#8635;'}
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
```

**Testing:**

Tests must verify:
- atmo-browser.AC3.3: Back button disabled when canGoBack=false, forward disabled when canGoForward=false, clicking enabled buttons emits correct events

Test file: `src/renderer/components/nav-controls.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

**Commit:** `feat: navigation controls component`
<!-- END_TASK_5 -->

<!-- START_TASK_6 -->
### Task 6: Assemble shell window with all components and IPC

**Verifies:** atmo-browser.AC3.1, atmo-browser.AC3.2, atmo-browser.AC3.3, atmo-browser.AC3.5, atmo-browser.AC3.6, atmo-browser.AC3.7

**Files:**
- Modify: `src/renderer/components/shell-window.ts`
- Modify: `src/renderer/main.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`

**Implementation:**

Wire the shell-window component to orchestrate address bar, tab bar, nav controls, and content area. Connect to IPC for URI resolution. Handle navigation events, update tab state, display results or errors.

The shell-window becomes the top-level orchestrator:
- Listens for `navigate` events from address-bar → calls IPC `resolve-uri` → updates tab state
- Listens for `tab-select`, `tab-close`, `tab-new` from tab-bar → updates TabManagerState
- Listens for `nav-back`, `nav-forward`, `nav-reload` from nav-controls → updates history
- Renders content area with resolution results (JSON for now, tiles in Phase 3)
- On error: sets tab error state, address bar shows error styling

Update `src/preload/index.ts` to also expose blob URL generation:

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('atBrowser', {
  resolveUri: (uri: string): Promise<unknown> => ipcRenderer.invoke('resolve-uri', uri),
})
```

Update `src/renderer/main.ts` to import all components:

```typescript
import './components/shell-window.js'
import './components/address-bar.js'
import './components/tab-bar.js'
import './components/nav-controls.js'
```

The shell-window.ts should be updated to include the complete orchestration:

```typescript
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
```

**Testing:**

Tests must verify:
- atmo-browser.AC3.1: Typing `at://handle.bsky.social` triggers resolve-uri IPC call
- atmo-browser.AC3.2: Bare handle gets `at://` prefix before resolution
- atmo-browser.AC3.3: Back/forward traverses history within the active tab
- atmo-browser.AC3.5: Opening new tab doesn't affect other tabs' history/content
- atmo-browser.AC3.6: Failed resolution shows error, address bar retains input
- atmo-browser.AC3.7: `at://did:plc:xyz` triggers resolution correctly

Test file: `src/renderer/components/shell-window.test.ts`

**Verification:**

Run: `npx tsc --noEmit`
Expected: Compiles without errors.

Run: `npx electron-vite build`
Expected: Builds without errors.

Run: `npx electron-vite dev`
Expected: App launches with full browser chrome — tab bar, address bar, nav controls. Typing a handle and pressing Enter attempts resolution.

**Commit:** `feat: assemble browser shell with navigation and IPC`
<!-- END_TASK_6 -->
<!-- END_SUBCOMPONENT_C -->

<!-- START_TASK_7 -->
### Task 7: Add test infrastructure and write shell tests

**Verifies:** atmo-browser.AC3.1, atmo-browser.AC3.2, atmo-browser.AC3.3, atmo-browser.AC3.5, atmo-browser.AC3.6, atmo-browser.AC3.7

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add test script and vitest deps)
- Create: `src/renderer/state/tab-manager.test.ts`

**Implementation:**

Add vitest for testing. The tab-manager is a pure data model and can be tested without DOM. Component tests (address-bar, shell-window) would need a DOM environment — defer those to integration testing during Phase 7 polish. Focus on the pure logic tests here.

Add to package.json devDependencies:
```json
"vitest": "^3.0.0",
"@vitest/coverage-v8": "^3.0.0"
```

Add to package.json scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
```

Tests for tab-manager must cover:
- `navigateTab` builds history correctly
- `goBack` decrements historyIndex, returns to previous URI
- `goForward` increments historyIndex, returns to next URI
- `goBack` at index 0 is a no-op
- `goForward` at end of history is a no-op
- Multiple tabs maintain independent state
- `closeTab` with single tab is a no-op
- `addTab` creates tab and switches to it

**Verification:**

Run: `npm install`
Expected: vitest installs.

Run: `npm test`
Expected: All tab-manager tests pass.

**Commit:** `feat: test infrastructure and tab manager tests`
<!-- END_TASK_7 -->
