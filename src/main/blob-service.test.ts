// Test for blob service: URL construction and IPC handlers

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { constructBlobUrl, handleGetBlobUrl, handleFetchBlob } from './blob-service.js'

describe('constructBlobUrl', () => {
  it('AC4.1: constructs correct URL format with PDS, DID, and CID', () => {
    const pds = 'https://bsky.social'
    const did = 'did:plc:example123'
    const cid = 'bafy456'

    const url = constructBlobUrl(pds, did, cid)

    expect(url).toContain('https://bsky.social/xrpc/com.atproto.sync.getBlob')
    expect(url).toContain(`did=${encodeURIComponent(did)}`)
    expect(url).toContain(`cid=${encodeURIComponent(cid)}`)
  })

  it('properly encodes DID and CID parameters', () => {
    const url = constructBlobUrl('https://pds.example', 'did:plc:with/slash', 'cid:with:colon')

    expect(url).toContain('did=' + encodeURIComponent('did:plc:with/slash'))
    expect(url).toContain('cid=' + encodeURIComponent('cid:with:colon'))
  })

  it('returns URL without trailing slash from PDS', () => {
    const url1 = constructBlobUrl('https://pds.example', 'did:test', 'cid:test')
    const url2 = constructBlobUrl('https://pds.example/', 'did:test', 'cid:test')

    // Both should work, but URL format should be consistent
    expect(url1).toContain('xrpc/com.atproto.sync.getBlob')
    expect(url2).toContain('xrpc/com.atproto.sync.getBlob')
  })
})

describe('handleGetBlobUrl', () => {
  it('returns result of constructBlobUrl', async () => {
    const result = await handleGetBlobUrl(undefined, 'https://pds.example', 'did:test', 'cid:test')

    expect(result).toContain('https://pds.example/xrpc/com.atproto.sync.getBlob')
    expect(result).toContain('did=' + encodeURIComponent('did:test'))
    expect(result).toContain('cid=' + encodeURIComponent('cid:test'))
  })
})

describe('handleFetchBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('AC4.3: returns null when blob is unreachable (not throw)', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

    const result = await handleFetchBlob(undefined, 'https://pds.example', 'did:test', 'cid:test')

    expect(result).toBeNull()
  })

  it('AC4.3: returns null when response status is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    const result = await handleFetchBlob(undefined, 'https://pds.example', 'did:test', 'cid:test')

    expect(result).toBeNull()
  })

  it('returns data URL with base64 content on success', async () => {
    const mockBuffer = new ArrayBuffer(4)
    const mockView = new Uint8Array(mockBuffer)
    mockView[0] = 72 // H
    mockView[1] = 101 // e
    mockView[2] = 108 // l
    mockView[3] = 108 // l

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValueOnce(mockBuffer),
      headers: new Map([['content-type', 'image/png']]),
    })

    const result = await handleFetchBlob(undefined, 'https://pds.example', 'did:test', 'cid:test')

    expect(result).not.toBeNull()
    expect(result?.data).toContain('data:image/png;base64,')
    expect(result?.mimeType).toBe('image/png')
  })

  it('AC4.4: handles large responses without blocking', async () => {
    // Create a 5MB buffer
    const largeBuffer = new ArrayBuffer(5 * 1024 * 1024)

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValueOnce(largeBuffer),
      headers: new Map([['content-type', 'application/octet-stream']]),
    })

    const result = await handleFetchBlob(undefined, 'https://pds.example', 'did:test', 'cid:large')

    // Should complete without hanging and return proper data URL
    expect(result).not.toBeNull()
    expect(result?.data).toContain('data:application/octet-stream;base64,')
    expect(result?.mimeType).toBe('application/octet-stream')
  })

  it('defaults to application/octet-stream when content-type header missing', async () => {
    const mockBuffer = new ArrayBuffer(2)

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValueOnce(mockBuffer),
      headers: new Map(), // No content-type
    })

    const result = await handleFetchBlob(undefined, 'https://pds.example', 'did:test', 'cid:test')

    expect(result?.mimeType).toBe('application/octet-stream')
    expect(result?.data).toContain('data:application/octet-stream;base64,')
  })
})
