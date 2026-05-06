import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleLoadTile } from './tile-ipc.js'

// Mock the tile-runtime module
vi.mock('./tile-runtime.js', () => ({
  getTileMothership: vi.fn(() => ({
    loadTile: vi.fn(),
  })),
}))

import { getTileMothership } from './tile-runtime.js'

type MockTileMothership = {
  loadTile: ReturnType<typeof vi.fn>
}

/**
 * Tests for tile IPC handler logic.
 *
 * AC2.1: Tile loading should attempt MemoryTileLoader first (built-in tiles, no network)
 * AC2.4: Malformed tile manifest should return error without crashing
 *
 * These tests verify the handler logic by importing and testing the actual
 * handleLoadTile function, with mocked tile-runtime dependencies.
 */

describe('handleLoadTile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AC2.1: returns success response when mothership loads tile', async () => {
    const mockTileMothership: MockTileMothership = {
      loadTile: vi.fn().mockResolvedValue('loaded'),
    }
    vi.mocked(getTileMothership).mockReturnValue(mockTileMothership as unknown as ReturnType<typeof getTileMothership>)

    const result = await handleLoadTile({}, 'app.bsky.feed.post')

    expect(result.success).toBe(true)
    expect(result.tile).toBe('loaded')
    expect(mockTileMothership.loadTile).toHaveBeenCalledWith('app.bsky.feed.post')
  })

  it('AC2.4: returns error response when mothership throws', async () => {
    const mockTileMothership: MockTileMothership = {
      loadTile: vi.fn().mockRejectedValue(new Error('manifest parsing failed')),
    }
    vi.mocked(getTileMothership).mockReturnValue(mockTileMothership as unknown as ReturnType<typeof getTileMothership>)

    const result = await handleLoadTile({}, 'app.bsky.feed.post')

    expect(result.success).toBe(false)
    expect(result.error).toContain('manifest parsing failed')
  })

  it('handler accepts event and nsid parameters', async () => {
    const mockTileMothership: MockTileMothership = {
      loadTile: vi.fn().mockResolvedValue(null),
    }
    vi.mocked(getTileMothership).mockReturnValue(mockTileMothership as unknown as ReturnType<typeof getTileMothership>)

    const eventObj = { someData: 'test' }
    const nsid = 'com.example.custom'

    await handleLoadTile(eventObj, nsid)

    expect(mockTileMothership.loadTile).toHaveBeenCalledWith(nsid)
  })

  it('converts Error objects to strings in error field', async () => {
    const testError = new Error('tile load failed')
    const mockTileMothership: MockTileMothership = {
      loadTile: vi.fn().mockRejectedValue(testError),
    }
    vi.mocked(getTileMothership).mockReturnValue(mockTileMothership as unknown as ReturnType<typeof getTileMothership>)

    const result = await handleLoadTile({}, 'app.bsky.feed.post')

    expect(result.success).toBe(false)
    expect(result.error).toContain('tile load failed')
  })

  it('returns null tile when mothership returns falsy value', async () => {
    const mockTileMothership: MockTileMothership = {
      loadTile: vi.fn().mockResolvedValue(null),
    }
    vi.mocked(getTileMothership).mockReturnValue(mockTileMothership as unknown as ReturnType<typeof getTileMothership>)

    const result = await handleLoadTile({}, 'app.bsky.feed.post')

    expect(result.success).toBe(true)
    expect(result.tile).toBe(null)
  })
})
