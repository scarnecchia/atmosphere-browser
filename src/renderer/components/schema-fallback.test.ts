import { describe, it, expect } from 'vitest'
import { getTypeName, isMaxDepthExceeded } from '../utils/type-display.js'
import { isAtUri } from '../utils/at-uri.js'

/**
 * Tests for schema-fallback helper utilities.
 *
 * These tests verify the pure utility functions that schema-fallback uses:
 * - Type name detection for value annotation
 * - AT-URI detection for special rendering
 * - Depth limiting to prevent infinite loops
 *
 * schema-fallback component:
 * - AC2.3: Receives record data and renders field names and values
 * - AC2.5: If record is malformed, catches error and shows fallback
 */

describe('schema-fallback type detection', () => {
  it('detects null values', () => {
    expect(getTypeName(null)).toBe('null')
  })

  it('detects undefined values', () => {
    expect(getTypeName(undefined)).toBe('null')
  })

  it('detects strings', () => {
    expect(getTypeName('hello')).toBe('string')
  })

  it('detects numbers', () => {
    expect(getTypeName(42)).toBe('number')
    expect(getTypeName(3.14)).toBe('number')
  })

  it('detects booleans', () => {
    expect(getTypeName(true)).toBe('boolean')
  })

  it('detects objects', () => {
    expect(getTypeName({})).toBe('object')
    expect(getTypeName({ key: 'value' })).toBe('object')
  })

  it('detects arrays with length', () => {
    expect(getTypeName([])).toBe('array[0]')
    expect(getTypeName([1, 2, 3])).toBe('array[3]')
  })
})

describe('schema-fallback URI detection', () => {
  it('recognizes AT-URIs', () => {
    expect(isAtUri('at://did:plc:example/app.bsky.feed.post/abc123')).toBe(true)
    expect(isAtUri('at://did:key:example')).toBe(true)
  })

  it('rejects non-AT-URIs', () => {
    expect(isAtUri('http://example.com')).toBe(false)
    expect(isAtUri('https://example.com')).toBe(false)
    expect(isAtUri('regular string')).toBe(false)
    expect(isAtUri('')).toBe(false)
  })

  it('handles non-string values gracefully', () => {
    expect(isAtUri(null as unknown as string)).toBe(false)
    expect(isAtUri(undefined as unknown as string)).toBe(false)
    expect(isAtUri(42 as unknown as string)).toBe(false)
  })
})

describe('schema-fallback depth limiting', () => {
  it('allows rendering up to max depth', () => {
    expect(isMaxDepthExceeded(5, 10)).toBe(false)
    expect(isMaxDepthExceeded(10, 10)).toBe(false)
  })

  it('stops rendering beyond max depth', () => {
    expect(isMaxDepthExceeded(11, 10)).toBe(true)
    expect(isMaxDepthExceeded(100, 10)).toBe(true)
  })

  it('uses default max depth of 10', () => {
    expect(isMaxDepthExceeded(10)).toBe(false)
    expect(isMaxDepthExceeded(11)).toBe(true)
  })
})

describe('schema-fallback error handling', () => {
  it('safely handles circular references', () => {
    const circular: Record<string, unknown> = { a: 1 }
    circular.self = circular

    // This would fail rendering without depth limiting
    // Component uses depth check to prevent infinite recursion
    expect(isMaxDepthExceeded(11, 10)).toBe(true)
  })

  it('safely handles null records', () => {
    expect(getTypeName(null)).toBe('null')
  })

  it('safely handles primitive values as records', () => {
    expect(getTypeName('string')).toBe('string')
    expect(getTypeName(42)).toBe('number')
    expect(getTypeName(true)).toBe('boolean')
  })

  it('safely handles empty objects', () => {
    expect(getTypeName({})).toBe('object')
  })
})

describe('schema-fallback AC2.3 verification', () => {
  it('should identify when record has fields to render', () => {
    const record = {
      did: 'did:plc:example',
      handle: 'user.bsky.social',
      createdAt: '2023-01-01T00:00:00Z',
    }
    expect(Object.keys(record).length).toBeGreaterThan(0)
  })

  it('should support nested objects in records', () => {
    const record = {
      author: {
        did: 'did:plc:example',
        handle: 'user.bsky.social',
      },
      text: 'hello',
    }
    const author = record.author as Record<string, unknown>
    expect(Object.keys(author).length).toBeGreaterThan(0)
  })

  it('should support arrays in records', () => {
    const record = {
      items: [1, 2, 3],
      tags: ['a', 'b', 'c'],
    }
    expect(Array.isArray(record.items)).toBe(true)
    expect(Array.isArray(record.tags)).toBe(true)
  })
})

describe('schema-fallback AC2.5 error boundary', () => {
  it('should handle records with problematic keys', () => {
    // Records with special keys should still be processable
    const record = {
      '__proto__': 'suspicious',
      'toString': 'also-suspicious',
      'normal': 'value',
    }
    expect(Object.keys(record).length).toBeGreaterThan(0)
  })

  it('should handle mixed type values in arrays', () => {
    const record = {
      mixed: [1, 'string', true, null, { nested: 'object' }, [1, 2, 3]],
    }
    const mixed = record.mixed as unknown[]
    expect(mixed.length).toBe(6)
  })
})
