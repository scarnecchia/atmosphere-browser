// pattern: Imperative Shell

import { app, ipcMain } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

type PersistedTab = {
  readonly id: string
  readonly title: string
  readonly uri: string
  readonly history: ReadonlyArray<string>
  readonly historyIndex: number
}

type PersistedTabState = {
  readonly tabs: ReadonlyArray<PersistedTab>
  readonly activeTabId: string
}

const TABS_PATH = join(app.getPath('userData'), 'tabs.json')

function loadTabs(): PersistedTabState | null {
  if (!existsSync(TABS_PATH)) return null
  try {
    const data = JSON.parse(readFileSync(TABS_PATH, 'utf-8')) as PersistedTabState
    if (!Array.isArray(data.tabs) || data.tabs.length === 0) return null
    return data
  } catch {
    return null
  }
}

function saveTabs(state: PersistedTabState): void {
  writeFileSync(TABS_PATH, JSON.stringify(state, null, 2))
}

export function registerTabPersistenceIpc(): void {
  ipcMain.handle('tabs-save', (_event, state: PersistedTabState): void => {
    saveTabs(state)
  })

  ipcMain.handle('tabs-restore', (): PersistedTabState | null => {
    return loadTabs()
  })
}
