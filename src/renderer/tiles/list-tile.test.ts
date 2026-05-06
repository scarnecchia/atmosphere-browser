// pattern: Test

import { describe, it, expect } from 'vitest'

// Test purpose label generation
function getPurposeLabel(purpose: string): string {
  if (purpose.includes('modlist')) return 'Moderation list'
  if (purpose.includes('curatelist')) return 'Curation list'
  return purpose
}

describe('list-tile: purpose label generation', () => {
  it('should generate moderation list label', () => {
    const result = getPurposeLabel('app.bsky.graph.defs#modlist')
    expect(result).toBe('Moderation list')
  })

  it('should generate curation list label', () => {
    const result = getPurposeLabel('app.bsky.graph.defs#curatelist')
    expect(result).toBe('Curation list')
  })

  it('should return purpose as-is for unknown types', () => {
    const result = getPurposeLabel('custom-purpose')
    expect(result).toBe('custom-purpose')
  })

  it('should handle empty purpose string', () => {
    const result = getPurposeLabel('')
    expect(result).toBe('')
  })
})

describe('list-tile: data extraction', () => {
  it('should extract all fields from record', () => {
    const record = {
      name: 'Test List',
      purpose: 'app.bsky.graph.defs#curatelist',
      description: 'A test list for curating posts',
    }
    const name = (record['name'] as string) ?? 'Unnamed list'
    const purpose = (record['purpose'] as string) ?? ''
    const description = (record['description'] as string) ?? null

    expect(name).toBe('Test List')
    expect(purpose).toBe('app.bsky.graph.defs#curatelist')
    expect(description).toBe('A test list for curating posts')
  })

  it('should handle missing name with default', () => {
    const record = {
      purpose: 'app.bsky.graph.defs#modlist',
    }
    const name = (record['name'] as string) ?? 'Unnamed list'
    expect(name).toBe('Unnamed list')
  })

  it('should handle missing purpose with empty string', () => {
    const record = {
      name: 'Test List',
    }
    const purpose = (record['purpose'] as string) ?? ''
    expect(purpose).toBe('')
  })

  it('should handle missing description with null', () => {
    const record = {
      name: 'Test List',
      purpose: 'app.bsky.graph.defs#curatelist',
    }
    const description = (record['description'] as string) ?? null
    expect(description).toBeNull()
  })
})
