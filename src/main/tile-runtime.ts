// pattern: Imperative Shell
// (Singleton TileMothership initialization and configuration)

import { TileMothership } from '@dasl/tiles/loader'
import { MemoryTileLoader } from '@dasl/tiles/loader/memory'
import { CARTileLoader } from '@dasl/tiles/loader/car'
import { ATTileLoader } from '@dasl/tiles/loader/at'

let mothership: TileMothership | null = null

export function getTileMothership(): TileMothership {
  if (!mothership) {
    mothership = new TileMothership()

    const memoryLoader = new MemoryTileLoader()
    const carLoader = new CARTileLoader(['http', 'https', 'file'])
    const atLoader = new ATTileLoader()

    // Register loaders in priority order: local-first, then remote
    mothership.addLoader(memoryLoader)
    mothership.addLoader(carLoader)
    mothership.addLoader(atLoader)
  }

  return mothership
}

export type TileLoadResult = { success: true; tile: unknown } | { success: false; error: string }

export async function loadTileForNsid(nsid: string): Promise<TileLoadResult> {
  const ms = getTileMothership()
  try {
    const tile = await ms.loadTile(nsid)
    return { success: true, tile }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.warn(`[tile-runtime] Failed to load tile for ${nsid}:`, err)
    return { success: false, error: errorMessage }
  }
}
