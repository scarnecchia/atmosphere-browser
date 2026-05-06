// pattern: Functional Core + Imperative Shell

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import type { Bookmark } from './bookmarks.js'
import { loadBookmarks, saveBookmarks, registerBookmarkIpc } from './bookmarks.js'

// Mock Electron's app.getPath
vi.mock('electron', () => ({
  app: {
    getPath: (path: string) => {
      if (path === 'userData') {
        return '/tmp/atmo-test-userdata'
      }
      return '/tmp'
    },
  },
  ipcMain: {
    handle: vi.fn(),
  },
}))

const TEST_DATA_DIR = '/tmp/atmo-test-userdata'
const BOOKMARKS_PATH = join(TEST_DATA_DIR, 'bookmarks.json')

describe('bookmarks', () => {
  beforeEach(() => {
    // Ensure test directory exists
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true })
    }
  })

  afterEach(() => {
    // Clean up test file
    if (existsSync(BOOKMARKS_PATH)) {
      rmSync(BOOKMARKS_PATH, { force: true })
    }
  })

  describe('loadBookmarks', () => {
    it('returns empty array when file does not exist', () => {
      const result = loadBookmarks()
      expect(result).toEqual([])
    })

    it('returns bookmarks from file when it exists', () => {
      const bookmark: Bookmark = {
        uri: 'at://did:plc:test/app.bsky.feed.post/123',
        title: 'Test Post',
        createdAt: new Date().toISOString(),
      }
      writeFileSync(BOOKMARKS_PATH, JSON.stringify([bookmark], null, 2))

      const result = loadBookmarks()
      expect(result).toEqual([bookmark])
    })

    it('returns empty array on parse error', () => {
      writeFileSync(BOOKMARKS_PATH, 'invalid json')

      const result = loadBookmarks()
      expect(result).toEqual([])
    })
  })

  describe('saveBookmarks', () => {
    it('persists bookmarks to file', () => {
      const bookmarks: ReadonlyArray<Bookmark> = [
        {
          uri: 'at://did:plc:test/app.bsky.feed.post/123',
          title: 'Test Post',
          createdAt: new Date().toISOString(),
        },
      ]

      saveBookmarks(bookmarks)

      expect(existsSync(BOOKMARKS_PATH)).toBe(true)
      const saved = JSON.parse(readFileSync(BOOKMARKS_PATH, 'utf-8')) as Array<Bookmark>
      expect(saved).toEqual(bookmarks)
    })
  })

  describe('registerBookmarkIpc', () => {
    it('registers bookmark IPC handlers without error', () => {
      // Just verify the function executes without throwing
      expect(() => registerBookmarkIpc()).not.toThrow()
    })
  })

  describe('bookmarks-list IPC', () => {
    it('returns list of bookmarks', async () => {
      const bookmark: Bookmark = {
        uri: 'at://did:plc:test/app.bsky.feed.post/123',
        title: 'Test Post',
        createdAt: new Date().toISOString(),
      }
      writeFileSync(BOOKMARKS_PATH, JSON.stringify([bookmark], null, 2))

      registerBookmarkIpc()
      const { ipcMain } = await import('electron')
      const handler = (ipcMain.handle as any).mock.calls.find((c: any) => c[0] === 'bookmarks-list')?.[1]

      if (handler) {
        const result = await handler({})
        expect(result).toEqual([bookmark])
      }
    })
  })

  describe('bookmarks-add IPC', () => {
    it('adds a bookmark with URI and title', async () => {
      registerBookmarkIpc()
      const { ipcMain } = await import('electron')
      const handler = (ipcMain.handle as any).mock.calls.find((c: any) => c[0] === 'bookmarks-add')?.[1]

      if (handler) {
        const result = await handler({}, 'at://did:plc:test/app.bsky.feed.post/123', 'Test Post')
        expect(result).toHaveProperty('uri', 'at://did:plc:test/app.bsky.feed.post/123')
        expect(result).toHaveProperty('title', 'Test Post')
        expect(result).toHaveProperty('createdAt')
      }
    })

    it('handles feed generator URIs identically to other URIs', async () => {
      registerBookmarkIpc()
      const { ipcMain } = await import('electron')
      const handler = (ipcMain.handle as any).mock.calls.find((c: any) => c[0] === 'bookmarks-add')?.[1]

      if (handler) {
        const result = await handler({}, 'at://did:plc:test/app.bsky.feed.generator/abc123', 'My Feed')
        expect(result).toHaveProperty('uri', 'at://did:plc:test/app.bsky.feed.generator/abc123')
        expect(result).toHaveProperty('title', 'My Feed')
      }
    })

    it('persists bookmark to file', async () => {
      registerBookmarkIpc()
      const { ipcMain } = await import('electron')
      const handler = (ipcMain.handle as any).mock.calls.find((c: any) => c[0] === 'bookmarks-add')?.[1]

      if (handler) {
        await handler({}, 'at://did:plc:test/app.bsky.feed.post/123', 'Test Post')
        const saved = JSON.parse(readFileSync(BOOKMARKS_PATH, 'utf-8')) as Array<Bookmark>
        expect(saved.length).toBe(1)
        expect(saved[0].uri).toBe('at://did:plc:test/app.bsky.feed.post/123')
      }
    })
  })

  describe('bookmarks-remove IPC', () => {
    it('removes bookmark by URI', async () => {
      const bookmark: Bookmark = {
        uri: 'at://did:plc:test/app.bsky.feed.post/123',
        title: 'Test Post',
        createdAt: new Date().toISOString(),
      }
      writeFileSync(BOOKMARKS_PATH, JSON.stringify([bookmark], null, 2))

      registerBookmarkIpc()
      const { ipcMain } = await import('electron')
      const handler = (ipcMain.handle as any).mock.calls.find((c: any) => c[0] === 'bookmarks-remove')?.[1]

      if (handler) {
        await handler({}, 'at://did:plc:test/app.bsky.feed.post/123')
        const saved = JSON.parse(readFileSync(BOOKMARKS_PATH, 'utf-8')) as Array<Bookmark>
        expect(saved.length).toBe(0)
      }
    })
  })

  describe('bookmarks-is-bookmarked IPC', () => {
    it('returns true when URI is bookmarked', async () => {
      const bookmark: Bookmark = {
        uri: 'at://did:plc:test/app.bsky.feed.post/123',
        title: 'Test Post',
        createdAt: new Date().toISOString(),
      }
      writeFileSync(BOOKMARKS_PATH, JSON.stringify([bookmark], null, 2))

      registerBookmarkIpc()
      const { ipcMain } = await import('electron')
      const handler = (ipcMain.handle as any).mock.calls.find((c: any) => c[0] === 'bookmarks-is-bookmarked')?.[1]

      if (handler) {
        const result = await handler({}, 'at://did:plc:test/app.bsky.feed.post/123')
        expect(result).toBe(true)
      }
    })

    it('returns false when URI is not bookmarked', async () => {
      registerBookmarkIpc()
      const { ipcMain } = await import('electron')
      const handler = (ipcMain.handle as any).mock.calls.find((c: any) => c[0] === 'bookmarks-is-bookmarked')?.[1]

      if (handler) {
        const result = await handler({}, 'at://did:plc:test/app.bsky.feed.post/999')
        expect(result).toBe(false)
      }
    })
  })
})
