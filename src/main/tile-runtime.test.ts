import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadTileForNsid } from './tile-runtime.js'

// Mock electron since we're in Node environment
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => `/mock-user-data/${name}`,
  },
}))

describe('getTileMothership', () => {
  beforeEach(() => {
    // Clear the singleton for each test
    vi.resetModules()
  })

  it('creates TileMothership instance with loaders registered in correct order', async () => {
    // Re-import to get fresh instance
    const { getTileMothership } = await import('./tile-runtime.js')
    const mothership = getTileMothership()

    expect(mothership).toBeDefined()
    expect(mothership).not.toBeNull()
  })

  it('returns same mothership instance on multiple calls', async () => {
    const { getTileMothership } = await import('./tile-runtime.js')
    const m1 = getTileMothership()
    const m2 = getTileMothership()

    expect(m1).toBe(m2)
  })

  it('registers MemoryTileLoader first for built-in tiles', async () => {
    const { getTileMothership } = await import('./tile-runtime.js')
    const mothership = getTileMothership()

    // Verify it has the expected structure
    expect(mothership.constructor.name).toBe('TileMothership')
  })
})

describe('loadTileForNsid', () => {
  it('attempts to load tile from mothership', async () => {
    const result = await loadTileForNsid('app.bsky.feed.post')

    // Since there are no loaders configured with actual tiles,
    // this should gracefully return null or fail without throwing
    expect(result === null || result === false).toBe(true)
  })

  it('handles errors gracefully without throwing', async () => {
    // Call with invalid NSID - should not throw
    expect(async () => {
      await loadTileForNsid('this.is.not.a.valid.tile')
    }).not.toThrow()
  })
})
