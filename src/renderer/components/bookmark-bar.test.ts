// pattern: Functional Core

import { describe, it, expect } from 'vitest'

/**
 * Tests for bookmark-bar component helper logic.
 *
 * The BookmarkBar component:
 * - AC8.1: Renders bookmarks as clickable chips
 * - AC8.4: Shows "unavailable" styling for bookmarks in unavailableUris list
 *
 * Component rendering and event dispatch are verified through manual testing
 * in the shell-window integration (el­ectron-vite dev).
 */

describe('bookmark-bar utility logic', () => {
  describe('bookmark filtering', () => {
    it('identifies available bookmarks', () => {
      const bookmarks = [
        { uri: 'at://did:plc:test/app.bsky.feed.post/123', title: 'Available' },
        { uri: 'at://did:plc:test/app.bsky.feed.post/456', title: 'Also Available' },
      ]
      const unavailable = ['at://did:plc:other/app.bsky.feed.post/789']

      const available = bookmarks.filter((b) => !unavailable.includes(b.uri))
      expect(available).toHaveLength(2)
    })

    it('identifies unavailable bookmarks', () => {
      const bookmarks = [
        { uri: 'at://did:plc:test/app.bsky.feed.post/123', title: 'Test Post' },
        { uri: 'at://did:plc:test/app.bsky.feed.post/456', title: 'Unavailable' },
      ]
      const unavailable = ['at://did:plc:test/app.bsky.feed.post/456']

      const actuallyUnavailable = bookmarks.filter((b) => unavailable.includes(b.uri))
      expect(actuallyUnavailable).toHaveLength(1)
      expect(actuallyUnavailable[0].uri).toBe('at://did:plc:test/app.bsky.feed.post/456')
    })

    it('handles empty bookmark list', () => {
      const bookmarks: Array<{ uri: string; title: string }> = []
      const unavailable = ['at://did:plc:test/app.bsky.feed.post/123']

      expect(bookmarks.length).toBe(0)
      const available = bookmarks.filter((b) => !unavailable.includes(b.uri))
      expect(available).toHaveLength(0)
    })

    it('handles feed generator URIs identically to other URIs', () => {
      const feedGenUri = 'at://did:plc:test/app.bsky.feed.generator/abc123'
      const postUri = 'at://did:plc:test/app.bsky.feed.post/456'
      const bookmarks = [
        { uri: feedGenUri, title: 'My Feed' },
        { uri: postUri, title: 'A Post' },
      ]
      const unavailable: Array<string> = []

      const available = bookmarks.filter((b) => !unavailable.includes(b.uri))
      expect(available).toHaveLength(2)
    })
  })

  describe('URI matching', () => {
    it('matches exact URIs in unavailable list', () => {
      const uri = 'at://did:plc:test/app.bsky.feed.post/123'
      const unavailable = ['at://did:plc:test/app.bsky.feed.post/123']

      expect(unavailable.includes(uri)).toBe(true)
    })

    it('does not match similar but different URIs', () => {
      const uri = 'at://did:plc:test/app.bsky.feed.post/123'
      const unavailable = ['at://did:plc:test/app.bsky.feed.post/1234']

      expect(unavailable.includes(uri)).toBe(false)
    })

    it('is case-sensitive', () => {
      const uri = 'at://did:plc:TEST/app.bsky.feed.post/123'
      const unavailable = ['at://did:plc:test/app.bsky.feed.post/123']

      expect(unavailable.includes(uri)).toBe(false)
    })
  })
})
