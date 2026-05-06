// pattern: Imperative Shell (IPC event handler registration)

import { ipcMain } from 'electron'
import { getTileMothership } from './tile-runtime.js'

export function registerTileIpc(): void {
  ipcMain.handle('load-tile', async (_event, nsid: string) => {
    try {
      const mothership = getTileMothership()
      const tile = await mothership.loadTile(nsid)
      return { success: true, tile: tile ? 'loaded' : null }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
