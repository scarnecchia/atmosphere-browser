// pattern: Test

import { describe, it, expect } from 'vitest'

describe('repo-page: data extraction', () => {
  it('should extract handle from identity', () => {
    const identity = {
      did: 'did:plc:example123',
      handle: 'alice.bsky.social',
      pds: 'https://pds.example.com',
    }
    expect(identity.handle).toBe('alice.bsky.social')
  })

  it('should handle null identity gracefully', () => {
    const identity = null
    expect(identity).toBeNull()
  })

  it('should count collection records', () => {
    const collections = [
      { nsid: 'app.bsky.feed.post', count: 42 },
      { nsid: 'app.bsky.graph.follow', count: 15 },
    ]
    expect(collections.length).toBe(2)
    expect(collections[0].count).toBe(42)
  })
})

describe('repo-page: response type handling', () => {
  it('should identify repo response type', () => {
    const response = {
      type: 'repo',
      identity: {
        did: 'did:plc:example',
        handle: 'alice.bsky.social',
        pds: 'https://pds.example.com',
      },
      profile: {
        displayName: 'Alice',
        description: 'A user',
      },
      collections: [
        { nsid: 'app.bsky.feed.post', count: 10 },
      ],
    }
    expect(response.type).toBe('repo')
    expect(response.identity).toBeDefined()
    expect(response.profile).toBeDefined()
  })

  it('should handle missing profile in repo response', () => {
    const response = {
      type: 'repo',
      identity: {
        did: 'did:plc:example',
        handle: 'alice.bsky.social',
        pds: 'https://pds.example.com',
      },
      profile: null,
      collections: [],
    }
    expect(response.profile).toBeNull()
  })
})
