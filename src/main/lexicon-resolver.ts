// pattern: Functional Core (pure schema caching) + Imperative Shell (IPC registration)

import { ipcMain } from 'electron'

const lexiconCache = new Map<string, unknown>()

export async function resolveLexicon(pds: string, nsid: string): Promise<unknown | null> {
  const cached = lexiconCache.get(nsid)
  if (cached !== undefined) return cached

  try {
    const url = `${pds}/xrpc/com.atproto.lexicon.resolveLexicon?nsid=${encodeURIComponent(nsid)}`
    const response = await fetch(url)
    if (!response.ok) return null

    const schema = await response.json()
    lexiconCache.set(nsid, schema)
    return schema
  } catch {
    return null
  }
}

export function registerLexiconIpc(): void {
  ipcMain.handle('resolve-lexicon', async (_event, pds: string, nsid: string) => {
    return resolveLexicon(pds, nsid)
  })
}

// Testing helper: clear cache
export function clearLexiconCacheForTesting(): void {
  lexiconCache.clear()
}
