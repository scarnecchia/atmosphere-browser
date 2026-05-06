// pattern: Functional Core

import { app, ipcMain } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

export type Bookmark = {
  readonly uri: string
  readonly title: string
  readonly createdAt: string
}

const BOOKMARKS_PATH = join(app.getPath('userData'), 'bookmarks.json')

export function loadBookmarks(): Array<Bookmark> {
  if (!existsSync(BOOKMARKS_PATH)) return []
  try {
    const data = readFileSync(BOOKMARKS_PATH, 'utf-8')
    return JSON.parse(data) as Array<Bookmark>
  } catch {
    return []
  }
}

export function saveBookmarks(bookmarks: ReadonlyArray<Bookmark>): void {
  writeFileSync(BOOKMARKS_PATH, JSON.stringify(bookmarks, null, 2))
}

export function registerBookmarkIpc(): void {
  ipcMain.handle('bookmarks-list', (): ReadonlyArray<Bookmark> => {
    return loadBookmarks()
  })

  ipcMain.handle('bookmarks-add', (_event, uri: string, title: string): Bookmark => {
    const bookmarks = loadBookmarks()
    const bookmark: Bookmark = {
      uri,
      title: title || uri,
      createdAt: new Date().toISOString(),
    }
    bookmarks.push(bookmark)
    saveBookmarks(bookmarks)
    return bookmark
  })

  ipcMain.handle('bookmarks-remove', (_event, uri: string): void => {
    const bookmarks = loadBookmarks()
    const filtered = bookmarks.filter((b) => b.uri !== uri)
    saveBookmarks(filtered)
  })

  ipcMain.handle('bookmarks-is-bookmarked', (_event, uri: string): boolean => {
    const bookmarks = loadBookmarks()
    return bookmarks.some((b) => b.uri === uri)
  })
}
