import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the dependencies
vi.mock('./identity.js', () => ({
  resolveAtUri: vi.fn(),
}))

vi.mock('./xrpc-client.js', () => ({
  getRecord: vi.fn(),
}))

import { resolveAtUri } from './identity.js'
import { getRecord } from './xrpc-client.js'

// Import the function we're testing
const { extractFeedGeneratorRecord } = await import('./feed-service.js')

describe('extractFeedGeneratorRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when URI resolution fails', async () => {
    ;(resolveAtUri as any).mockResolvedValue(null)

    const result = await extractFeedGeneratorRecord('at://did:plc:example/app.bsky.feed.generator/abc123')

    expect(result).toBeNull()
  })

  it('returns null when missing collection in resolution', async () => {
    ;(resolveAtUri as any).mockResolvedValue({
      did: 'did:plc:example',
      handle: 'user.bsky.social',
      pds: 'https://pds.bsky.social',
      collection: null,
      rkey: 'abc123',
    })

    const result = await extractFeedGeneratorRecord('at://did:plc:example/app.bsky.feed.generator/abc123')

    expect(result).toBeNull()
  })

  it('returns null when missing rkey in resolution', async () => {
    ;(resolveAtUri as any).mockResolvedValue({
      did: 'did:plc:example',
      handle: 'user.bsky.social',
      pds: 'https://pds.bsky.social',
      collection: 'app.bsky.feed.generator',
      rkey: null,
    })

    const result = await extractFeedGeneratorRecord('at://did:plc:example/app.bsky.feed.generator/abc123')

    expect(result).toBeNull()
  })

  it('returns null when getRecord returns null', async () => {
    ;(resolveAtUri as any).mockResolvedValue({
      did: 'did:plc:example',
      handle: 'user.bsky.social',
      pds: 'https://pds.bsky.social',
      collection: 'app.bsky.feed.generator',
      rkey: 'abc123',
    })

    ;(getRecord as any).mockResolvedValue(null)

    const result = await extractFeedGeneratorRecord('at://did:plc:example/app.bsky.feed.generator/abc123')

    expect(result).toBeNull()
  })

  it('returns null when getRecord returns record without value', async () => {
    ;(resolveAtUri as any).mockResolvedValue({
      did: 'did:plc:example',
      handle: 'user.bsky.social',
      pds: 'https://pds.bsky.social',
      collection: 'app.bsky.feed.generator',
      rkey: 'abc123',
    })

    ;(getRecord as any).mockResolvedValue({
      uri: 'at://did:plc:example/app.bsky.feed.generator/abc123',
      cid: 'bafy123',
      // no value
    })

    const result = await extractFeedGeneratorRecord('at://did:plc:example/app.bsky.feed.generator/abc123')

    expect(result).toBeNull()
  })

  it('returns feed record with identity when successful', async () => {
    const resolvedUri = {
      did: 'did:plc:example',
      handle: 'user.bsky.social',
      pds: 'https://pds.bsky.social',
      collection: 'app.bsky.feed.generator',
      rkey: 'abc123',
    }

    const recordValue = {
      displayName: 'My Feed',
      description: 'A test feed',
    }

    ;(resolveAtUri as any).mockResolvedValue(resolvedUri)
    ;(getRecord as any).mockResolvedValue({
      uri: 'at://did:plc:example/app.bsky.feed.generator/abc123',
      cid: 'bafy123',
      value: recordValue,
    })

    const result = await extractFeedGeneratorRecord('at://did:plc:example/app.bsky.feed.generator/abc123')

    expect(result).not.toBeNull()
    expect(result?.record).toEqual(recordValue)
    expect(result?.identity.did).toBe('did:plc:example')
    expect(result?.identity.handle).toBe('user.bsky.social')
    expect(result?.identity.pds).toBe('https://pds.bsky.social')
  })

  it('calls getRecord with correct parameters', async () => {
    const resolvedUri = {
      did: 'did:plc:example',
      handle: 'user.bsky.social',
      pds: 'https://pds.bsky.social',
      collection: 'app.bsky.feed.generator',
      rkey: 'abc123',
    }

    ;(resolveAtUri as any).mockResolvedValue(resolvedUri)
    ;(getRecord as any).mockResolvedValue({
      uri: 'at://did:plc:example/app.bsky.feed.generator/abc123',
      cid: 'bafy123',
      value: { displayName: 'Test' },
    })

    await extractFeedGeneratorRecord('at://did:plc:example/app.bsky.feed.generator/abc123')

    expect(getRecord).toHaveBeenCalledWith({
      pds: 'https://pds.bsky.social',
      repo: 'did:plc:example',
      collection: 'app.bsky.feed.generator',
      rkey: 'abc123',
    })
  })
})
