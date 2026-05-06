import { describe, it, expect } from 'vitest'
import { isValidNsid, extractNsidFromUri } from '../utils/at-uri.js'

/**
 * Tests for tile-host helper utilities.
 *
 * These tests verify the pure utility functions that tile-host uses:
 * - NSID validation for tile loading
 * - AT-URI parsing to extract collection identifiers
 *
 * tile-host component orchestrates:
 * 1. Tile loading via IPC (AC2.1)
 * 2. Tile context with record and identity data (AC2.3)
 * 3. Error handling for failed tile loads (AC2.4)
 * 4. Fallback to schema-fallback on tile render failure (AC2.5)
 */

describe('tile-host NSID validation', () => {
  it('accepts valid NSIDs', () => {
    expect(isValidNsid('app.bsky.feed.post')).toBe(true)
    expect(isValidNsid('com.example.custom')).toBe(true)
    expect(isValidNsid('a.b')).toBe(true)
  })

  it('rejects invalid NSIDs', () => {
    expect(isValidNsid('')).toBe(false)
    expect(isValidNsid('single')).toBe(false)
    expect(isValidNsid('..dots')).toBe(false)
    expect(isValidNsid('example..')).toBe(false)
  })

  it('rejects non-string NSIDs', () => {
    expect(isValidNsid(null as unknown as string)).toBe(false)
    expect(isValidNsid(undefined as unknown as string)).toBe(false)
    expect(isValidNsid(42 as unknown as string)).toBe(false)
  })
})

describe('tile-host URI parsing', () => {
  it('extracts NSID from complete AT-URIs', () => {
    expect(extractNsidFromUri('at://did:plc:example/app.bsky.feed.post/abc123')).toBe(
      'app.bsky.feed.post',
    )
    expect(extractNsidFromUri('at://did:key:example/com.example.custom/rkey')).toBe(
      'com.example.custom',
    )
  })

  it('handles AT-URIs with collection but no rkey', () => {
    expect(extractNsidFromUri('at://did:plc:example/app.bsky.feed.post')).toBe(
      'app.bsky.feed.post',
    )
  })

  it('rejects non-AT-URIs', () => {
    expect(extractNsidFromUri('http://example.com')).toBeNull()
    expect(extractNsidFromUri('https://example.com')).toBeNull()
    expect(extractNsidFromUri('regular string')).toBeNull()
  })

  it('rejects malformed AT-URIs', () => {
    expect(extractNsidFromUri('at://')).toBeNull()
    expect(extractNsidFromUri('at://did-only')).toBeNull()
  })
})

