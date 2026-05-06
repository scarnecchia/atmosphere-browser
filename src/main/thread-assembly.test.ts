// Tests for thread assembly: recursive parent fetching and thread building

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { assembleThread } from './thread-assembly.js'

// Mock the dependencies
vi.mock('./xrpc-client.js')
vi.mock('./identity.js')
vi.mock('./constellation-client.js')

describe('assembleThread', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('AC1.2: assembles thread with parent post above current post', async () => {
    const { getRecord } = await import('./xrpc-client.js')
    const { resolveAtUri } = await import('./identity.js')

    // Mock getRecord to return parent post without reply, then child post with reply
    vi.mocked(getRecord).mockImplementation(async (options) => {
      if (options.rkey === 'parent-rkey') {
        return {
          uri: 'at://did:plc:parent/app.bsky.feed.post/parent-rkey',
          cid: 'bafy-parent',
          value: { text: 'Parent post' },
        }
      }
      if (options.rkey === 'child-rkey') {
        return {
          uri: 'at://did:plc:child/app.bsky.feed.post/child-rkey',
          cid: 'bafy-child',
          value: {
            text: 'Child post',
            reply: {
              parent: { uri: 'at://did:plc:parent/app.bsky.feed.post/parent-rkey' },
              root: { uri: 'at://did:plc:parent/app.bsky.feed.post/parent-rkey' },
            },
          },
        }
      }
      return null
    })

    // Mock resolveAtUri to return parent identity
    vi.mocked(resolveAtUri).mockImplementation(async (uri) => {
      if (uri === 'at://did:plc:parent/app.bsky.feed.post/parent-rkey') {
        return {
          did: 'did:plc:parent',
          handle: 'parent.bsky.social',
          pds: 'https://pds.example',
          collection: 'app.bsky.feed.post',
          rkey: 'parent-rkey',
        }
      }
      return null
    })

    const thread = await assembleThread(
      'https://pds.example',
      'did:plc:child',
      'app.bsky.feed.post',
      'child-rkey',
    )

    expect(thread).not.toBeNull()
    expect(thread?.uri).toContain('child-rkey')
    expect(thread?.parent).not.toBeNull()
    expect(thread?.parent?.uri).toContain('parent-rkey')
    expect(thread?.parent?.parent).toBeNull()
  })

  it('handles missing parent gracefully (shows just the current post)', async () => {
    const { getRecord } = await import('./xrpc-client.js')
    await import('./identity.js')

    // Mock getRecord to return a post without reply
    vi.mocked(getRecord).mockResolvedValue({
      uri: 'at://did:plc:test/app.bsky.feed.post/test-rkey',
      cid: 'bafy-test',
      value: { text: 'Standalone post' },
    })

    const thread = await assembleThread(
      'https://pds.example',
      'did:plc:test',
      'app.bsky.feed.post',
      'test-rkey',
    )

    expect(thread).not.toBeNull()
    expect(thread?.uri).toContain('test-rkey')
    expect(thread?.parent).toBeNull()
    expect(thread?.record.value).toEqual({ text: 'Standalone post' })
  })

  it('returns null when getRecord fails', async () => {
    const { getRecord } = await import('./xrpc-client.js')

    vi.mocked(getRecord).mockResolvedValue(null)

    const thread = await assembleThread(
      'https://pds.example',
      'did:plc:test',
      'app.bsky.feed.post',
      'test-rkey',
    )

    expect(thread).toBeNull()
  })

  it('stops recursion when resolveAtUri fails for parent', async () => {
    const { getRecord } = await import('./xrpc-client.js')
    const { resolveAtUri } = await import('./identity.js')

    // Mock getRecord to return a post with reply
    vi.mocked(getRecord).mockResolvedValue({
      uri: 'at://did:plc:test/app.bsky.feed.post/test-rkey',
      cid: 'bafy-test',
      value: {
        text: 'Post with unreachable parent',
        reply: {
          parent: { uri: 'at://did:plc:unknown/app.bsky.feed.post/unknown-rkey' },
          root: { uri: 'at://did:plc:unknown/app.bsky.feed.post/unknown-rkey' },
        },
      },
    })

    // resolveAtUri fails
    vi.mocked(resolveAtUri).mockResolvedValue(null)

    const thread = await assembleThread(
      'https://pds.example',
      'did:plc:test',
      'app.bsky.feed.post',
      'test-rkey',
    )

    expect(thread).not.toBeNull()
    expect(thread?.parent).toBeNull()
  })

  it('sets identity on ThreadNode from resolved authority', async () => {
    const { getRecord } = await import('./xrpc-client.js')

    vi.mocked(getRecord).mockResolvedValue({
      uri: 'at://did:plc:test/app.bsky.feed.post/test-rkey',
      cid: 'bafy-test',
      value: { text: 'Test post' },
    })

    const thread = await assembleThread(
      'https://pds.example',
      'did:plc:test',
      'app.bsky.feed.post',
      'test-rkey',
    )

    expect(thread?.identity.did).toBe('did:plc:test')
    expect(thread?.identity.pds).toBe('https://pds.example')
  })

  it('constructs correct URI for ThreadNode', async () => {
    const { getRecord } = await import('./xrpc-client.js')

    vi.mocked(getRecord).mockResolvedValue({
      uri: 'at://did:plc:test/app.bsky.feed.post/test-rkey',
      cid: 'bafy-test',
      value: { text: 'Test post' },
    })

    const thread = await assembleThread(
      'https://pds.example',
      'did:plc:test',
      'app.bsky.feed.post',
      'test-rkey',
    )

    expect(thread?.uri).toBe('at://did:plc:test/app.bsky.feed.post/test-rkey')
  })

  it('AC5.2: includes replies in thread structure via Constellation backlinks', async () => {
    const { getRecord } = await import('./xrpc-client.js')
    const { getReplyBacklinks } = await import('./constellation-client.js')
    const { resolveAtUri } = await import('./identity.js')

    // Mock getRecord to return a root post
    vi.mocked(getRecord).mockImplementation(async (options) => {
      if (options.rkey === 'root-rkey') {
        return {
          uri: 'at://did:plc:root/app.bsky.feed.post/root-rkey',
          cid: 'bafy-root',
          value: { text: 'Root post' },
        }
      }
      if (options.rkey === 'reply-rkey-1') {
        return {
          uri: 'at://did:plc:reply1/app.bsky.feed.post/reply-rkey-1',
          cid: 'bafy-reply1',
          value: { text: 'First reply' },
        }
      }
      if (options.rkey === 'reply-rkey-2') {
        return {
          uri: 'at://did:plc:reply2/app.bsky.feed.post/reply-rkey-2',
          cid: 'bafy-reply2',
          value: { text: 'Second reply' },
        }
      }
      return null
    })

    // Mock getReplyBacklinks to return backlinks for the root post
    vi.mocked(getReplyBacklinks).mockResolvedValue({
      total: 2,
      records: [
        { did: 'did:plc:reply1', collection: 'app.bsky.feed.post', rkey: 'reply-rkey-1' },
        { did: 'did:plc:reply2', collection: 'app.bsky.feed.post', rkey: 'reply-rkey-2' },
      ],
      cursor: null,
    })

    // Mock resolveAtUri for replies
    vi.mocked(resolveAtUri).mockImplementation(async (uri) => {
      if (uri === 'at://did:plc:reply1/app.bsky.feed.post/reply-rkey-1') {
        return {
          did: 'did:plc:reply1',
          handle: 'reply1.bsky.social',
          pds: 'https://pds.example',
          collection: 'app.bsky.feed.post',
          rkey: 'reply-rkey-1',
        }
      }
      if (uri === 'at://did:plc:reply2/app.bsky.feed.post/reply-rkey-2') {
        return {
          did: 'did:plc:reply2',
          handle: 'reply2.bsky.social',
          pds: 'https://pds.example',
          collection: 'app.bsky.feed.post',
          rkey: 'reply-rkey-2',
        }
      }
      return null
    })

    const thread = await assembleThread(
      'https://pds.example',
      'did:plc:root',
      'app.bsky.feed.post',
      'root-rkey',
    )

    expect(thread).not.toBeNull()
    expect(thread?.replies).toBeDefined()
    expect(thread?.replies.length).toBe(2)
    expect(thread?.replies[0]?.uri).toContain('reply-rkey-1')
    expect(thread?.replies[1]?.uri).toContain('reply-rkey-2')
  })

  it('AC5.2: handles Constellation unavailability gracefully (returns thread without replies)', async () => {
    const { getRecord } = await import('./xrpc-client.js')
    const { getReplyBacklinks } = await import('./constellation-client.js')

    // Mock getRecord to return a root post
    vi.mocked(getRecord).mockResolvedValue({
      uri: 'at://did:plc:root/app.bsky.feed.post/root-rkey',
      cid: 'bafy-root',
      value: { text: 'Root post' },
    })

    // Mock getReplyBacklinks to return null (Constellation unavailable)
    vi.mocked(getReplyBacklinks).mockResolvedValue(null)

    const thread = await assembleThread(
      'https://pds.example',
      'did:plc:root',
      'app.bsky.feed.post',
      'root-rkey',
    )

    expect(thread).not.toBeNull()
    expect(thread?.replies).toBeDefined()
    expect(thread?.replies.length).toBe(0)
  })

  it('AC5.2: handles empty reply backlinks', async () => {
    const { getRecord } = await import('./xrpc-client.js')
    const { getReplyBacklinks } = await import('./constellation-client.js')

    // Mock getRecord to return a root post
    vi.mocked(getRecord).mockResolvedValue({
      uri: 'at://did:plc:root/app.bsky.feed.post/root-rkey',
      cid: 'bafy-root',
      value: { text: 'Root post' },
    })

    // Mock getReplyBacklinks to return empty records
    vi.mocked(getReplyBacklinks).mockResolvedValue({
      total: 0,
      records: [],
      cursor: null,
    })

    const thread = await assembleThread(
      'https://pds.example',
      'did:plc:root',
      'app.bsky.feed.post',
      'root-rkey',
    )

    expect(thread).not.toBeNull()
    expect(thread?.replies).toBeDefined()
    expect(thread?.replies.length).toBe(0)
  })

  it('skips reply when resolveAtUri fails', async () => {
    const { getRecord } = await import('./xrpc-client.js')
    const { getReplyBacklinks } = await import('./constellation-client.js')
    const { resolveAtUri } = await import('./identity.js')

    // Mock getRecord to return a root post
    vi.mocked(getRecord).mockResolvedValue({
      uri: 'at://did:plc:root/app.bsky.feed.post/root-rkey',
      cid: 'bafy-root',
      value: { text: 'Root post' },
    })

    // Mock getReplyBacklinks to return backlinks
    vi.mocked(getReplyBacklinks).mockResolvedValue({
      total: 1,
      records: [{ did: 'did:plc:reply1', collection: 'app.bsky.feed.post', rkey: 'reply-rkey-1' }],
      cursor: null,
    })

    // Mock resolveAtUri to fail
    vi.mocked(resolveAtUri).mockResolvedValue(null)

    const thread = await assembleThread(
      'https://pds.example',
      'did:plc:root',
      'app.bsky.feed.post',
      'root-rkey',
    )

    expect(thread).not.toBeNull()
    expect(thread?.replies.length).toBe(0)
  })

  it('skips reply when getRecord fails for reply', async () => {
    const { getRecord } = await import('./xrpc-client.js')
    const { getReplyBacklinks } = await import('./constellation-client.js')
    const { resolveAtUri } = await import('./identity.js')

    // Mock getRecord to return root post but null for reply
    vi.mocked(getRecord).mockImplementation(async (options) => {
      if (options.rkey === 'root-rkey') {
        return {
          uri: 'at://did:plc:root/app.bsky.feed.post/root-rkey',
          cid: 'bafy-root',
          value: { text: 'Root post' },
        }
      }
      // Return null for reply attempt
      return null
    })

    // Mock getReplyBacklinks to return backlinks
    vi.mocked(getReplyBacklinks).mockResolvedValue({
      total: 1,
      records: [{ did: 'did:plc:reply1', collection: 'app.bsky.feed.post', rkey: 'reply-rkey-1' }],
      cursor: null,
    })

    // Mock resolveAtUri to succeed
    vi.mocked(resolveAtUri).mockResolvedValue({
      did: 'did:plc:reply1',
      handle: 'reply1.bsky.social',
      pds: 'https://pds.example',
      collection: 'app.bsky.feed.post',
      rkey: 'reply-rkey-1',
    })

    const thread = await assembleThread(
      'https://pds.example',
      'did:plc:root',
      'app.bsky.feed.post',
      'root-rkey',
    )

    expect(thread).not.toBeNull()
    expect(thread?.replies.length).toBe(0)
  })
})
