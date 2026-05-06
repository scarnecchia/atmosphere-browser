import { describe, it, expect } from 'vitest'
import { segmentRichText, type RichTextFacet } from './rich-text.js'

describe('segmentRichText', () => {
  it('returns single segment for plain text without facets', () => {
    const text = 'Hello world'
    const result = segmentRichText(text)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      text: 'Hello world',
      facet: null,
    })
  })

  it('returns single segment when facets array is empty', () => {
    const text = 'Hello world'
    const result = segmentRichText(text, [])

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      text: 'Hello world',
      facet: null,
    })
  })

  it('segments text with a single facet', () => {
    const text = 'Hello world'
    const facets: ReadonlyArray<RichTextFacet> = [
      {
        index: { byteStart: 0, byteEnd: 5 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:123' }],
      },
    ]

    const result = segmentRichText(text, facets)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      text: 'Hello',
      facet: facets[0],
    })
    expect(result[1]).toEqual({
      text: ' world',
      facet: null,
    })
  })

  it('segments text with multiple non-overlapping facets', () => {
    const text = 'Hello @user check link'
    const facets: ReadonlyArray<RichTextFacet> = [
      {
        index: { byteStart: 6, byteEnd: 11 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:456' }],
      },
      {
        index: { byteStart: 18, byteEnd: 22 },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'https://example.com' }],
      },
    ]

    const result = segmentRichText(text, facets)

    expect(result).toHaveLength(4)
    expect(result[0].text).toBe('Hello ')
    expect(result[0].facet).toBeNull()
    expect(result[1].text).toBe('@user')
    expect(result[1].facet).toBe(facets[0])
    expect(result[2].text).toBe(' check ')
    expect(result[2].facet).toBeNull()
    expect(result[3].text).toBe('link')
    expect(result[3].facet).toBe(facets[1])
  })

  it('handles facets at start of text', () => {
    const text = 'Hello world'
    const facets: ReadonlyArray<RichTextFacet> = [
      {
        index: { byteStart: 0, byteEnd: 5 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:789' }],
      },
    ]

    const result = segmentRichText(text, facets)

    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('Hello')
    expect(result[0].facet).toBe(facets[0])
    expect(result[1].text).toBe(' world')
    expect(result[1].facet).toBeNull()
  })

  it('handles facets at end of text', () => {
    const text = 'Hello world'
    const facets: ReadonlyArray<RichTextFacet> = [
      {
        index: { byteStart: 6, byteEnd: 11 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:999' }],
      },
    ]

    const result = segmentRichText(text, facets)

    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('Hello ')
    expect(result[0].facet).toBeNull()
    expect(result[1].text).toBe('world')
    expect(result[1].facet).toBe(facets[0])
  })

  it('correctly handles emoji (multi-byte UTF-8)', () => {
    const text = 'Hello 👋 world'
    // '👋' is 4 bytes in UTF-8
    // 'Hello ' = 6 bytes
    // '👋' = bytes 6-10
    // ' world' = bytes 10-15
    const facets: ReadonlyArray<RichTextFacet> = [
      {
        index: { byteStart: 6, byteEnd: 10 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:emoji' }],
      },
    ]

    const result = segmentRichText(text, facets)

    expect(result).toHaveLength(3)
    expect(result[0].text).toBe('Hello ')
    expect(result[0].facet).toBeNull()
    expect(result[1].text).toBe('👋')
    expect(result[1].facet).toBe(facets[0])
    expect(result[2].text).toBe(' world')
    expect(result[2].facet).toBeNull()
  })

  it('correctly handles multiple emoji', () => {
    const text = '👋 Hello 🌍'
    // '👋' = bytes 0-4
    // ' Hello ' = bytes 4-11
    // '🌍' = bytes 11-15
    const facets: ReadonlyArray<RichTextFacet> = [
      {
        index: { byteStart: 0, byteEnd: 4 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:emoji1' }],
      },
      {
        index: { byteStart: 11, byteEnd: 15 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:emoji2' }],
      },
    ]

    const result = segmentRichText(text, facets)

    expect(result).toHaveLength(3)
    expect(result[0].text).toBe('👋')
    expect(result[0].facet).toBe(facets[0])
    expect(result[1].text).toBe(' Hello ')
    expect(result[1].facet).toBeNull()
    expect(result[2].text).toBe('🌍')
    expect(result[2].facet).toBe(facets[1])
  })

  it('handles consecutive facets with no gap', () => {
    const text = '@hello@world'
    const facets: ReadonlyArray<RichTextFacet> = [
      {
        index: { byteStart: 0, byteEnd: 6 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:first' }],
      },
      {
        index: { byteStart: 6, byteEnd: 12 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:second' }],
      },
    ]

    const result = segmentRichText(text, facets)

    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('@hello')
    expect(result[0].facet).toBe(facets[0])
    expect(result[1].text).toBe('@world')
    expect(result[1].facet).toBe(facets[1])
  })

  it('ignores facets that would be out of order and sorts them', () => {
    const text = 'one two three'
    const facets: ReadonlyArray<RichTextFacet> = [
      {
        index: { byteStart: 8, byteEnd: 13 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:three' }],
      },
      {
        index: { byteStart: 0, byteEnd: 3 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:one' }],
      },
      {
        index: { byteStart: 4, byteEnd: 7 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:two' }],
      },
    ]

    const result = segmentRichText(text, facets)

    // Should be sorted by byteStart: one, two, three
    expect(result).toHaveLength(5)
    expect(result[0].text).toBe('one')
    expect(result[1].text).toBe(' ')
    expect(result[2].text).toBe('two')
    expect(result[3].text).toBe(' ')
    expect(result[4].text).toBe('three')
  })

  it('handles overlapping facets by processing in order (edge case)', () => {
    // This is an edge case - overlapping facets shouldn't normally occur
    // but the implementation should handle them gracefully
    const text = 'hello world'
    const facets: ReadonlyArray<RichTextFacet> = [
      {
        index: { byteStart: 0, byteEnd: 8 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:first' }],
      },
      {
        index: { byteStart: 5, byteEnd: 11 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:second' }],
      },
    ]

    // Should handle without crashing
    const result = segmentRichText(text, facets)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles facet with multiple features', () => {
    const text = 'Hello world'
    const features = [
      { $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:123' },
      { $type: 'app.bsky.richtext.facet#tag', tag: '#hello' },
    ] as const

    const facets: ReadonlyArray<RichTextFacet> = [
      {
        index: { byteStart: 0, byteEnd: 5 },
        features,
      },
    ]

    const result = segmentRichText(text, facets)

    expect(result[0].facet?.features).toEqual(features)
  })

  it('handles empty text', () => {
    const result = segmentRichText('')

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      text: '',
      facet: null,
    })
  })

  it('handles text with only emoji', () => {
    const text = '👋'
    const facets: ReadonlyArray<RichTextFacet> = [
      {
        index: { byteStart: 0, byteEnd: 4 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:wave' }],
      },
    ]

    const result = segmentRichText(text, facets)

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('👋')
    expect(result[0].facet).toBe(facets[0])
  })
})
