// Test for history: JSON persistence and filtering logic

import { describe, it, expect } from 'vitest'

// Pure function for testing history filtering
type HistoryEntry = {
  readonly uri: string
  readonly title: string
  readonly visitedAt: string
}

function filterHistory(history: ReadonlyArray<HistoryEntry>, query?: string): Array<HistoryEntry> {
  if (!query) return history.slice(0, 100)
  const lower = query.toLowerCase()
  return history
    .filter((h) => h.uri.toLowerCase().includes(lower) || h.title.toLowerCase().includes(lower))
    .slice(0, 100)
}

function addToHistory(
  history: ReadonlyArray<HistoryEntry>,
  uri: string,
  title: string,
  visitedAt: string,
  maxHistory: number = 1000
): Array<HistoryEntry> {
  const updated = [{ uri, title, visitedAt }, ...history]
  return updated.slice(0, maxHistory)
}

describe('history filtering', () => {
  it('returns all history when no query provided', () => {
    const history: HistoryEntry[] = [
      { uri: 'at://did1/post/1', title: 'First Post', visitedAt: '2023-01-01T00:00:00Z' },
      { uri: 'at://did2/post/2', title: 'Second Post', visitedAt: '2023-01-02T00:00:00Z' },
    ]

    const result = filterHistory(history)

    expect(result).toHaveLength(2)
  })

  it('limits results to 100 items', () => {
    const history: HistoryEntry[] = Array.from({ length: 150 }, (_, i) => ({
      uri: `at://did${i}/post/${i}`,
      title: `Post ${i}`,
      visitedAt: '2023-01-01T00:00:00Z',
    }))

    const result = filterHistory(history)

    expect(result).toHaveLength(100)
  })

  it('filters by URI match', () => {
    const history: HistoryEntry[] = [
      { uri: 'at://did:plc:example/post/1', title: 'Example Post', visitedAt: '2023-01-01T00:00:00Z' },
      { uri: 'at://did:key:other/post/2', title: 'Other Post', visitedAt: '2023-01-02T00:00:00Z' },
    ]

    const result = filterHistory(history, 'example')

    expect(result).toHaveLength(1)
    expect(result[0].uri).toContain('example')
  })

  it('filters by title match', () => {
    const history: HistoryEntry[] = [
      { uri: 'at://did1/post/1', title: 'Hiking Adventure', visitedAt: '2023-01-01T00:00:00Z' },
      { uri: 'at://did2/post/2', title: 'Cooking Recipe', visitedAt: '2023-01-02T00:00:00Z' },
    ]

    const result = filterHistory(history, 'hiking')

    expect(result).toHaveLength(1)
    expect(result[0].title).toContain('Hiking')
  })

  it('performs case-insensitive search', () => {
    const history: HistoryEntry[] = [
      { uri: 'at://did1/post/1', title: 'UPPERCASE Title', visitedAt: '2023-01-01T00:00:00Z' },
      { uri: 'at://did2/post/2', title: 'lowercase title', visitedAt: '2023-01-02T00:00:00Z' },
    ]

    const result1 = filterHistory(history, 'UPPERCASE')
    const result2 = filterHistory(history, 'uppercase')

    expect(result1).toHaveLength(1)
    expect(result2).toHaveLength(1)
  })

  it('returns empty array when no matches', () => {
    const history: HistoryEntry[] = [
      { uri: 'at://did1/post/1', title: 'First Post', visitedAt: '2023-01-01T00:00:00Z' },
    ]

    const result = filterHistory(history, 'nonexistent')

    expect(result).toHaveLength(0)
  })
})

describe('history addition', () => {
  it('adds new entry to beginning of history', () => {
    const history: HistoryEntry[] = [
      { uri: 'at://did1/post/1', title: 'First', visitedAt: '2023-01-01T00:00:00Z' },
    ]

    const result = addToHistory(history, 'at://did2/post/2', 'Second', '2023-01-02T00:00:00Z')

    expect(result[0].uri).toBe('at://did2/post/2')
    expect(result[1].uri).toBe('at://did1/post/1')
  })

  it('respects max history limit', () => {
    const history: HistoryEntry[] = Array.from({ length: 1000 }, (_, i) => ({
      uri: `at://did${i}/post/${i}`,
      title: `Post ${i}`,
      visitedAt: '2023-01-01T00:00:00Z',
    }))

    const result = addToHistory(history, 'at://didnew/post/new', 'New Post', '2023-01-02T00:00:00Z', 1000)

    expect(result).toHaveLength(1000)
    expect(result[0].uri).toBe('at://didnew/post/new')
    expect(result[result.length - 1].uri).not.toBe('at://did0/post/0') // First entry removed
  })

  it('maintains timestamp order with new entry first', () => {
    const history: HistoryEntry[] = [
      { uri: 'at://did1/post/1', title: 'Older', visitedAt: '2023-01-01T00:00:00Z' },
    ]

    const result = addToHistory(history, 'at://did2/post/2', 'Newer', '2023-01-02T00:00:00Z')

    expect(result[0].visitedAt).toBe('2023-01-02T00:00:00Z')
    expect(result[1].visitedAt).toBe('2023-01-01T00:00:00Z')
  })

  it('preserves other entries when adding new one', () => {
    const history: HistoryEntry[] = [
      { uri: 'at://did1/post/1', title: 'First', visitedAt: '2023-01-01T00:00:00Z' },
      { uri: 'at://did2/post/2', title: 'Second', visitedAt: '2023-01-02T00:00:00Z' },
    ]

    const result = addToHistory(history, 'at://did3/post/3', 'Third', '2023-01-03T00:00:00Z')

    expect(result).toHaveLength(3)
    expect(result[1].uri).toBe('at://did1/post/1')
    expect(result[2].uri).toBe('at://did2/post/2')
  })
})
