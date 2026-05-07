// Test for lexicon resolver: schema caching and fetching

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolveLexicon, clearLexiconCacheForTesting } from './lexicon-resolver.js'

describe('lexicon-resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearLexiconCacheForTesting()
    global.fetch = vi.fn() as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
    clearLexiconCacheForTesting()
  })

  it('AC9.1: fetches and caches lexicon schema', async () => {
    const schema = { type: 'object', properties: { displayName: { type: 'string' } } }
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(schema),
    })

    const result = await resolveLexicon('https://pds.example', 'app.bsky.feed.post')

    expect(result).toEqual(schema)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns cached schema on second call without fetching', async () => {
    const schema = { type: 'object', properties: { displayName: { type: 'string' } } }
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(schema),
    })

    // First call
    const result1 = await resolveLexicon('https://pds.example', 'app.bsky.feed.post')

    // Second call should use cache
    const result2 = await resolveLexicon('https://pds.example', 'app.bsky.feed.post')

    expect(result1).toEqual(schema)
    expect(result2).toEqual(schema)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns null when fetch fails', async () => {
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

    const result = await resolveLexicon('https://pds.example', 'app.bsky.unknown')

    expect(result).toBeNull()
  })

  it('returns null when response status is not ok', async () => {
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    const result = await resolveLexicon('https://pds.example', 'app.bsky.unknown')

    expect(result).toBeNull()
  })

  it('constructs correct lexicon endpoint URL', async () => {
    const schema = { type: 'object' }
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(schema),
    })

    await resolveLexicon('https://pds.example.com', 'com.example.customrecord')

    const callUrl = ((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as string[])[0] as string
    expect(callUrl).toContain('https://pds.example.com/xrpc/com.atproto.lexicon.resolveLexicon')
    expect(callUrl).toContain('nsid=' + encodeURIComponent('com.example.customrecord'))
  })

  it('handles different NSID formats', async () => {
    const schema = { type: 'object' }
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(schema),
    })

    const result = await resolveLexicon('https://pds.example', 'app.bsky.richtext.facet')

    expect(result).toEqual(schema)
    const callUrl = ((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as string[])[0] as string
    expect(callUrl).toContain('nsid=' + encodeURIComponent('app.bsky.richtext.facet'))
  })

  it('cache is keyed by NSID only, not PDS', async () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } }
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(schema),
    })

    // Fetch from first PDS
    const result1 = await resolveLexicon('https://pds1.example', 'app.bsky.feed.post')

    // Fetch same NSID from different PDS should use cache
    const result2 = await resolveLexicon('https://pds2.example', 'app.bsky.feed.post')

    expect(result1).toEqual(schema)
    expect(result2).toEqual(schema)
    // Should still only fetch once (from first PDS)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('handles JSON parsing errors gracefully', async () => {
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
    })

    const result = await resolveLexicon('https://pds.example', 'app.bsky.unknown')

    expect(result).toBeNull()
  })
})
