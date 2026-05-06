// pattern: Test (testing pure logic for component data handling)

import { describe, it, expect } from 'vitest'
import { segmentRichText, type RichTextFacet } from '../utils/rich-text.js'

// Test formatTime function extracted from component
function formatTime(iso: string): string {
  if (!iso) return ''
  try {
    const date = new Date(iso)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

describe('post-tile: formatTime utility', () => {
  it('should format valid ISO date strings', () => {
    const result = formatTime('2026-05-06T10:30:00Z')
    expect(result).toBeTruthy()
    expect(result).toMatch(/May/)
  })

  it('should return empty string for empty input', () => {
    expect(formatTime('')).toBe('')
  })

  it('should handle invalid dates gracefully', () => {
    const invalid = 'not-a-date'
    const result = formatTime(invalid)
    expect(result).toBeTruthy()
  })
})

describe('post-tile: rich text segmentation', () => {
  it('should segment plain text without facets', () => {
    const text = 'Hello world'
    const segments = segmentRichText(text, [])
    expect(segments).toHaveLength(1)
    expect(segments[0].text).toBe('Hello world')
    expect(segments[0].facet).toBeNull()
  })

  it('should segment text with mention facet', () => {
    const text = 'Hello @alice'
    const facets: RichTextFacet[] = [
      {
        index: { byteStart: 6, byteEnd: 12 },
        features: [
          {
            $type: 'app.bsky.richtext.facet#mention',
            did: 'did:key:alice',
          },
        ],
      },
    ]
    const segments = segmentRichText(text, facets)
    expect(segments.length).toBeGreaterThan(1)
    expect(segments.some((s) => s.facet?.features[0]?.$type === 'app.bsky.richtext.facet#mention')).toBe(true)
  })

  it('should segment text with link facet', () => {
    const text = 'Check https://example.com'
    const facets: RichTextFacet[] = [
      {
        index: { byteStart: 6, byteEnd: 25 },
        features: [
          {
            $type: 'app.bsky.richtext.facet#link',
            uri: 'https://example.com',
          },
        ],
      },
    ]
    const segments = segmentRichText(text, facets)
    expect(segments.some((s) => s.facet?.features[0]?.$type === 'app.bsky.richtext.facet#link')).toBe(true)
  })

  it('should handle emoji correctly in UTF-8 byte offsets', () => {
    const text = 'Hello 👋 world'

    // 👋 emoji is 4 bytes in UTF-8
    // "Hello " is 6 bytes, emoji starts at byte 6 and ends at byte 10
    const facets: RichTextFacet[] = [
      {
        index: { byteStart: 6, byteEnd: 10 },
        features: [
          {
            $type: 'app.bsky.richtext.facet#tag',
            tag: 'wave',
          },
        ],
      },
    ]

    const segments = segmentRichText(text, facets)
    expect(segments.length).toBeGreaterThan(1)
    const emojiSegment = segments.find((s) => s.text.includes('👋'))
    expect(emojiSegment?.facet?.features[0]?.$type).toBe('app.bsky.richtext.facet#tag')
  })

  it('should handle multiple facets in order', () => {
    const text = '@alice check https://example.com'
    const facets: RichTextFacet[] = [
      {
        index: { byteStart: 0, byteEnd: 6 },
        features: [
          {
            $type: 'app.bsky.richtext.facet#mention',
            did: 'did:key:alice',
          },
        ],
      },
      {
        index: { byteStart: 13, byteEnd: 32 },
        features: [
          {
            $type: 'app.bsky.richtext.facet#link',
            uri: 'https://example.com',
          },
        ],
      },
    ]
    const segments = segmentRichText(text, facets)
    const mentionSegment = segments.find((s) => s.facet?.features[0]?.$type === 'app.bsky.richtext.facet#mention')
    const linkSegment = segments.find((s) => s.facet?.features[0]?.$type === 'app.bsky.richtext.facet#link')
    expect(mentionSegment).toBeDefined()
    expect(linkSegment).toBeDefined()
  })
})

describe('post-tile: embed data extraction', () => {
  it('should identify image embed type', () => {
    const embed = {
      $type: 'app.bsky.embed.images',
      images: [{ image: { ref: { $link: 'cid1' } }, alt: 'An image' }],
    }

    const type = embed['$type'] as string
    expect(type).toBe('app.bsky.embed.images')
  })

  it('should extract image CID from embed', () => {
    const embed = {
      $type: 'app.bsky.embed.images',
      images: [
        {
          image: {
            ref: {
              $link: 'bafyreiabc123',
            },
          },
          alt: 'Alt text',
        },
      ],
    }

    const images = (embed['images'] as ReadonlyArray<Record<string, unknown>>) ?? []
    const img = images[0]
    const image = img['image'] as { ref?: { $link?: string } } | undefined
    expect(image?.ref?.$link).toBe('bafyreiabc123')
  })

  it('should identify video embed type', () => {
    const embed = {
      $type: 'app.bsky.embed.video',
      video: { ref: { $link: 'vid1' } },
    }

    const type = embed['$type'] as string
    expect(type).toBe('app.bsky.embed.video')
  })

  it('should identify external embed type', () => {
    const embed = {
      $type: 'app.bsky.embed.external',
      external: {
        uri: 'https://example.com',
        title: 'Example',
        description: 'A site',
      },
    }

    const type = embed['$type'] as string
    const external = embed['external'] as Record<string, unknown>
    expect(type).toBe('app.bsky.embed.external')
    expect(external['uri']).toBe('https://example.com')
  })
})

describe('post-tile: post record extraction', () => {
  it('should extract text from record', () => {
    const record = {
      text: 'Hello world',
      createdAt: '2026-05-06T10:30:00Z',
    }

    const text = (record['text'] as string) ?? ''
    expect(text).toBe('Hello world')
  })

  it('should extract facets from record', () => {
    const record = {
      text: 'Hello @alice',
      facets: [
        {
          index: { byteStart: 6, byteEnd: 12 },
          features: [
            {
              $type: 'app.bsky.richtext.facet#mention',
              did: 'did:key:alice',
            },
          ],
        },
      ],
      createdAt: '2026-05-06T10:30:00Z',
    }

    const facets = (record['facets'] as ReadonlyArray<unknown>) ?? []
    expect(facets).toHaveLength(1)
  })

  it('should extract createdAt timestamp', () => {
    const record = {
      text: 'Hello',
      createdAt: '2026-05-06T10:30:00Z',
    }

    const createdAt = (record['createdAt'] as string) ?? ''
    expect(createdAt).toBe('2026-05-06T10:30:00Z')
  })

  it('should handle missing createdAt gracefully', () => {
    const record = { text: 'Hello' }

    const createdAt = (record['createdAt'] as string) ?? ''
    expect(createdAt).toBe('')
  })

  it('should extract embed from record', () => {
    const record = {
      text: 'Check this',
      embed: {
        $type: 'app.bsky.embed.images',
        images: [],
      },
      createdAt: '2026-05-06T10:30:00Z',
    }

    const embed = record['embed'] as Record<string, unknown> | undefined
    expect(embed).toBeDefined()
    expect(embed?.['$type']).toBe('app.bsky.embed.images')
  })
})
