// pattern: Imperative Shell
// (Electron IPC handlers for history persistence)

import { app, ipcMain } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

export type HistoryEntry = {
  readonly uri: string
  readonly title: string
  readonly visitedAt: string
}

const HISTORY_PATH = join(app.getPath('userData'), 'history.json')
const MAX_HISTORY = 1000

function loadHistory(): Array<HistoryEntry> {
  if (!existsSync(HISTORY_PATH)) return []
  try {
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf-8')) as Array<HistoryEntry>
  } catch {
    return []
  }
}

function saveHistory(history: ReadonlyArray<HistoryEntry>): void {
  writeFileSync(HISTORY_PATH, JSON.stringify(history.slice(0, MAX_HISTORY), null, 2))
}

export function registerHistoryIpc(): void {
  ipcMain.handle('history-list', (_event, query?: string): ReadonlyArray<HistoryEntry> => {
    const history = loadHistory()
    if (!query) return history.slice(0, 100)
    const lower = query.toLowerCase()
    return history
      .filter((h) => h.uri.toLowerCase().includes(lower) || h.title.toLowerCase().includes(lower))
      .slice(0, 100)
  })

  ipcMain.handle('history-add', (_event, uri: string, title: string): void => {
    const history = loadHistory()
    history.unshift({ uri, title, visitedAt: new Date().toISOString() })
    saveHistory(history)
  })

  ipcMain.handle('history-clear', (): void => {
    saveHistory([])
  })
}
