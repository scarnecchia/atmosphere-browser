// pattern: Functional Core
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getEngagementCounts,
  getBacklinks,
  getReplyBacklinks,
} from './constellation-client.js'

describe('constellation-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEngagementCounts', () => {
    it('returns engagement counts for a valid URI', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      // Mock responses for likes, reposts, replies
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 42 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 15 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 8 }) })

      const result = await getEngagementCounts('at://did:plc:example/app.bsky.feed.post/rkey123')

      expect(result).toEqual({
        likes: 42,
        reposts: 15,
        replies: 8,
      })
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('returns null when all three fetches fail', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      // Mock all three requests failing
      mockFetch
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))

      const result = await getEngagementCounts('at://did:plc:example/app.bsky.feed.post/rkey123')

      expect(result).toBeNull()
    })

    it('returns partial results with 0 for failed fields', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      // Mock likes succeeds, reposts and replies fail
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 42 }) })
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))

      const result = await getEngagementCounts('at://did:plc:example/app.bsky.feed.post/rkey123')

      expect(result).toEqual({
        likes: 42,
        reposts: 0,
        replies: 0,
      })
    })

    it('returns null if response is not ok', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      // Mock all three requests returning non-ok status
      mockFetch
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: false })

      const result = await getEngagementCounts('at://did:plc:example/app.bsky.feed.post/rkey123')

      expect(result).toBeNull()
    })

    it('shows zero counts when all counts are zero', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 0 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 0 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 0 }) })

      const result = await getEngagementCounts('at://did:plc:example/app.bsky.feed.post/rkey123')

      expect(result).toEqual({
        likes: 0,
        reposts: 0,
        replies: 0,
      })
    })
  })

  describe('getBacklinks', () => {
    it('returns backlinks result for valid subject and source', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      const mockBacklinks = {
        total: 2,
        records: [
          { did: 'did:plc:user1', collection: 'app.bsky.feed.post', rkey: 'abc123' },
          { did: 'did:plc:user2', collection: 'app.bsky.feed.post', rkey: 'def456' },
        ],
        cursor: 'next_cursor',
      }

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockBacklinks })

      const result = await getBacklinks(
        'at://did:plc:example/app.bsky.feed.post/rkey123',
        'app.bsky.feed.post:reply.parent.uri',
      )

      expect(result).toEqual({
        total: 2,
        records: mockBacklinks.records,
        cursor: 'next_cursor',
      })
    })

    it('returns null when fetch fails', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await getBacklinks(
        'at://did:plc:example/app.bsky.feed.post/rkey123',
        'app.bsky.feed.post:reply.parent.uri',
      )

      expect(result).toBeNull()
    })

    it('returns null when response is not ok', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch.mockResolvedValueOnce({ ok: false })

      const result = await getBacklinks(
        'at://did:plc:example/app.bsky.feed.post/rkey123',
        'app.bsky.feed.post:reply.parent.uri',
      )

      expect(result).toBeNull()
    })

    it('includes cursor in URL when provided', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ total: 0, records: [], cursor: null }) })

      await getBacklinks(
        'at://did:plc:example/app.bsky.feed.post/rkey123',
        'app.bsky.feed.post:reply.parent.uri',
        25,
        'test_cursor',
      )

      const url = mockFetch.mock.calls[0]?.[0] as string
      expect(url).toContain('cursor=test_cursor')
    })

    it('returns null cursor when cursor is undefined', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total: 1,
          records: [{ did: 'did:plc:user', collection: 'app.bsky.feed.post', rkey: 'key' }],
          // no cursor property
        }),
      })

      const result = await getBacklinks(
        'at://did:plc:example/app.bsky.feed.post/rkey123',
        'app.bsky.feed.post:reply.parent.uri',
      )

      expect(result?.cursor).toBeNull()
    })
  })

  describe('getReplyBacklinks', () => {
    it('calls getBacklinks with reply source', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 1, records: [], cursor: null }),
      })

      const result = await getReplyBacklinks('at://did:plc:example/app.bsky.feed.post/rkey123')

      expect(result).toEqual({
        total: 1,
        records: [],
        cursor: null,
      })

      const url = mockFetch.mock.calls[0]?.[0] as string
      // Check for URL-encoded version of the source
      expect(url).toContain('source=app.bsky.feed.post%3Areply.parent.uri')
    })

    it('uses default limit of 50', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 0, records: [], cursor: null }),
      })

      await getReplyBacklinks('at://did:plc:example/app.bsky.feed.post/rkey123')

      const url = mockFetch.mock.calls[0]?.[0] as string
      expect(url).toContain('limit=50')
    })

    it('uses custom limit when provided', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 0, records: [], cursor: null }),
      })

      await getReplyBacklinks('at://did:plc:example/app.bsky.feed.post/rkey123', 100)

      const url = mockFetch.mock.calls[0]?.[0] as string
      expect(url).toContain('limit=100')
    })
  })
})
