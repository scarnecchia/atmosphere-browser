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

// TEST-ONLY: clear cache for testing
// This export is internal test infrastructure. Tests should use vi.resetModules()
// for module-level isolation when needed. This is acceptable as pragmatic
// choice for pure state modules without better alternatives.
export function _clearLexiconCacheForTesting(): void {
  lexiconCache.clear()
}
