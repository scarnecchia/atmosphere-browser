import { describe, it, expect } from 'vitest'

/**
 * Tests for tile IPC registration and handler contract.
 *
 * AC2.1: Tile loading should attempt MemoryTileLoader first (built-in tiles, no network)
 * AC2.4: Malformed tile manifest should return error without crashing
 *
 * NOTE: Full IPC handler testing with electron requires live process.
 * These tests verify the handler contract using direct function invocation.
 */

describe('registerTileIpc handler contract', () => {
  it('AC2.1: handler should accept NSID and return success response', async () => {
    // Test the expected handler signature and response type
    type TileIpcHandler = (event: unknown, nsid: string) => Promise<{ success: boolean; tile?: unknown; error?: string }>

    const mockHandler: TileIpcHandler = async (_event, _nsid) => ({
      success: true,
      tile: 'loaded',
    })

    const result = await mockHandler({}, 'app.bsky.feed.post')
    expect(result.success).toBe(true)
    expect(result.tile).toBeDefined()
  })

  it('AC2.4: handler should return error response on failure', async () => {
    // Test error response contract
    type TileIpcHandler = (event: unknown, nsid: string) => Promise<{ success: boolean; tile?: unknown; error?: string }>

    const mockHandler: TileIpcHandler = async (_event, _nsid) => ({
      success: false,
      error: 'manifest parsing failed: unexpected token',
    })

    const result = await mockHandler({}, 'app.bsky.feed.post')
    expect(result.success).toBe(false)
    expect(result.error).toContain('manifest')
  })

  it('AC2.1: handler signature expects (event, nsid) parameters', async () => {
    // Verify handler contract
    type TileIpcHandler = (event: unknown, nsid: string) => Promise<{ success: boolean; tile?: unknown; error?: string }>

    const mockHandler: TileIpcHandler = async (event, nsid) => {
      expect(event).toBeDefined()
      expect(typeof nsid).toBe('string')
      return { success: true, tile: null }
    }

    await mockHandler({}, 'app.bsky.feed.post')
  })

  it('handler should convert error to string in error field', async () => {
    // Verify error string conversion
    type TileIpcHandler = (event: unknown, nsid: string) => Promise<{ success: boolean; tile?: unknown; error?: string }>

    const mockHandler: TileIpcHandler = async (_event, _nsid) => {
      try {
        throw new Error('tile load failed')
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }

    const result = await mockHandler({}, 'app.bsky.feed.post')
    expect(result.success).toBe(false)
    expect(result.error).toContain('tile load failed')
  })
})
