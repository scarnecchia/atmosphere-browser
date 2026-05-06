// pattern: Functional Core + Imperative Shell
// - handleLoadTile: pure handler logic (testable)
// - registerTileIpc: wires handler to electron IPC (integration)

import { ipcMain } from 'electron'
import { getTileMothership } from './tile-runtime.js'

/**
 * Tile load handler that can be tested independently.
 * Returns { success, tile? } on success, { success: false, error } on failure.
 */
export async function handleLoadTile(
  _event: unknown,
  nsid: string,
): Promise<{ success: boolean; tile?: unknown; error?: string }> {
  try {
    const mothership = getTileMothership()
    const tile = await mothership.loadTile(nsid)
    return { success: true, tile: tile ? 'loaded' : null }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export function registerTileIpc(): void {
  ipcMain.handle('load-tile', handleLoadTile)
}
