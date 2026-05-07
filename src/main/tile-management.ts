// pattern: Functional Core + Imperative Shell

import { ipcMain, app } from 'electron'
import { join } from 'node:path'
import { readdirSync, rmSync, existsSync } from 'node:fs'

export type InstalledTile = {
  readonly nsid: string
  readonly source: 'built-in' | 'community'
  readonly cachedAt: string | null
}

const BUILT_IN_TILES: ReadonlyArray<InstalledTile> = [
  { nsid: 'app.bsky.actor.profile', source: 'built-in', cachedAt: null },
  { nsid: 'app.bsky.feed.post', source: 'built-in', cachedAt: null },
  { nsid: 'app.bsky.graph.follow', source: 'built-in', cachedAt: null },
  { nsid: 'app.bsky.graph.list', source: 'built-in', cachedAt: null },
  { nsid: 'app.bsky.feed.generator', source: 'built-in', cachedAt: null },
]

export function generateInstalledTilesList(cachedFiles: ReadonlyArray<string>): ReadonlyArray<InstalledTile> {
  const community: Array<InstalledTile> = cachedFiles
    .filter((f) => f.endsWith('.car'))
    .map((f) => ({
      nsid: f.replace('.car', ''),
      source: 'community' as const,
      cachedAt: new Date().toISOString(),
    }))

  return [...BUILT_IN_TILES, ...community]
}

function getTileCacheDir(): string {
  return join(app.getPath('userData'), 'tile-cache')
}

export function registerTileManagementIpc(): void {
  ipcMain.handle('tiles-list-installed', (): ReadonlyArray<InstalledTile> => {
    const tileCacheDir = getTileCacheDir()
    if (!existsSync(tileCacheDir)) {
      return BUILT_IN_TILES
    }

    try {
      const files = readdirSync(tileCacheDir)
      return generateInstalledTilesList(files)
    } catch {
      return BUILT_IN_TILES
    }
  })

  ipcMain.handle('tiles-clear-cache', (): void => {
    const tileCacheDir = getTileCacheDir()
    if (existsSync(tileCacheDir)) {
      rmSync(tileCacheDir, { recursive: true, force: true })
    }
  })
}
