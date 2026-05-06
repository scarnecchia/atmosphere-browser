// pattern: Functional Core

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
