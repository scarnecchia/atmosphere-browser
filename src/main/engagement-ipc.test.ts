// pattern: Functional Core
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleGetEngagement, handleGetReplyBacklinks } from './engagement-ipc.js'

describe('engagement-ipc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleGetEngagement', () => {
    it('returns engagement counts for a valid URI', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 42 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 15 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 8 }) })

      const result = await handleGetEngagement(
        'at://did:plc:example/app.bsky.feed.post/rkey123'
      )

      expect(result).toEqual({
        likes: 42,
        reposts: 15,
        replies: 8,
      })
    })

    it('returns null when Constellation is unavailable', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))

      const result = await handleGetEngagement(
        'at://did:plc:example/app.bsky.feed.post/rkey123'
      )

      expect(result).toBeNull()
    })

    it('returns partial results with 0 for failed fields', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 10 }) })
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 5 }) })

      const result = await handleGetEngagement(
        'at://did:plc:example/app.bsky.feed.post/rkey123'
      )

      expect(result).toEqual({
        likes: 10,
        reposts: 0,
        replies: 5,
      })
    })

    it('shows zero counts when all engagement is zero', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 0 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 0 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 0 }) })

      const result = await handleGetEngagement(
        'at://did:plc:example/app.bsky.feed.post/rkey123'
      )

      expect(result).toEqual({
        likes: 0,
        reposts: 0,
        replies: 0,
      })
    })
  })

  describe('handleGetReplyBacklinks', () => {
    it('returns backlinks result for a valid post URI', async () => {
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

      const result = await handleGetReplyBacklinks(
        'at://did:plc:example/app.bsky.feed.post/rkey123'
      )

      expect(result).toEqual({
        total: 2,
        records: mockBacklinks.records,
        cursor: 'next_cursor',
      })
    })

    it('returns null when Constellation is unavailable', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await handleGetReplyBacklinks(
        'at://did:plc:example/app.bsky.feed.post/rkey123'
      )

      expect(result).toBeNull()
    })

    it('uses custom limit when provided', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 0, records: [], cursor: null }),
      })

      await handleGetReplyBacklinks(
        'at://did:plc:example/app.bsky.feed.post/rkey123',
        100
      )

      const url = mockFetch.mock.calls[0]?.[0] as string
      expect(url).toContain('limit=100')
    })

    it('uses default limit of 50 when not provided', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 0, records: [], cursor: null }),
      })

      await handleGetReplyBacklinks(
        'at://did:plc:example/app.bsky.feed.post/rkey123'
      )

      const url = mockFetch.mock.calls[0]?.[0] as string
      expect(url).toContain('limit=50')
    })
  })
})
