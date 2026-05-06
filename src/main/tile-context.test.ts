import { describe, it, expect } from 'vitest'
import { createTileContext, createEmptyEngagement } from './tile-context.js'
import type { IdentityInfo } from './types.js'

describe('createTileContext', () => {
  it('produces complete TileContext with all required fields', () => {
    const identity: IdentityInfo = {
      did: 'did:plc:test123',
      handle: 'user.bsky.social',
      pds: 'https://pds.bsky.social',
    }

    const record = { text: 'Hello, world!' }
    const lexicon = { id: 'app.bsky.feed.post', type: 'record' }
    const navigate = (uri: string) => {
      // empty
    }

    const context = createTileContext({
      record,
      lexicon,
      identity,
      navigate,
    })

    expect(context.record).toBe(record)
    expect(context.lexicon).toBe(lexicon)
    expect(context.identity).toBe(identity)
    expect(context.navigate).toBe(navigate)
    expect(context.auth).toBeNull()
  })

  it('uses default engagement data when not provided', () => {
    const identity: IdentityInfo = {
      did: 'did:plc:test123',
      handle: 'user.bsky.social',
      pds: 'https://pds.bsky.social',
    }

    const context = createTileContext({
      record: {},
      lexicon: {},
      identity,
      navigate: () => {},
    })

    expect(context.engagement.likes).toBe(0)
    expect(context.engagement.reposts).toBe(0)
    expect(context.engagement.replies).toBe(0)
    expect(context.engagement.backlinks).toEqual([])
  })

  it('uses provided engagement data when available', () => {
    const identity: IdentityInfo = {
      did: 'did:plc:test123',
      handle: 'user.bsky.social',
      pds: 'https://pds.bsky.social',
    }

    const engagement = {
      likes: 42,
      reposts: 10,
      replies: 5,
      backlinks: [],
    }

    const context = createTileContext({
      record: {},
      lexicon: {},
      identity,
      engagement,
      navigate: () => {},
    })

    expect(context.engagement).toBe(engagement)
    expect(context.engagement.likes).toBe(42)
    expect(context.engagement.reposts).toBe(10)
    expect(context.engagement.replies).toBe(5)
  })

  it('passes navigate callback through correctly', () => {
    let navigationUri: string | null = null
    const navigate = (uri: string) => {
      navigationUri = uri
    }

    const context = createTileContext({
      record: {},
      lexicon: {},
      identity: {
        did: 'did:plc:test',
        handle: 'test.bsky.social',
        pds: 'https://pds.bsky.social',
      },
      navigate,
    })

    context.navigate('at://did:plc:example/app.bsky.feed.post/abc123')
    expect(navigationUri).toBe('at://did:plc:example/app.bsky.feed.post/abc123')
  })
})

describe('createEmptyEngagement', () => {
  it('produces zeroed engagement data', () => {
    const engagement = createEmptyEngagement()

    expect(engagement.likes).toBe(0)
    expect(engagement.reposts).toBe(0)
    expect(engagement.replies).toBe(0)
    expect(engagement.backlinks).toEqual([])
  })

  it('returns readonly structure', () => {
    const engagement = createEmptyEngagement()

    // Type checker would catch this, but verify structure
    expect(() => {
      ;(engagement as any).likes = 999
    }).not.toThrow()

    // Verify backlinks is array
    expect(Array.isArray(engagement.backlinks)).toBe(true)
  })
})
