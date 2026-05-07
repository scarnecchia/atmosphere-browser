// pattern: Imperative Shell
// (Electron app lifecycle orchestration, window management, IPC handler registration)

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { registerAtProtocolScheme, registerAtProtocolHandler } from './protocol.js'
import { registerTileIpc } from './tile-ipc.js'
import { registerBlobIpc } from './blob-service.js'
import { registerEngagementIpc } from './engagement-ipc.js'
import { registerAuthIpc, restoreAuthOnStartup } from './auth/auth-ipc.js'
import { assembleThread } from './thread-assembly.js'
import { resolveAtUri } from './identity.js'
import { describeRepo, listRecords, getRecord } from './xrpc-client.js'
import { registerBookmarkIpc } from './bookmarks.js'
import { registerHistoryIpc } from './history.js'
import { registerFeedIpc } from './feed-service.js'
import { registerTileManagementIpc } from './tile-management.js'
import { registerLexiconIpc } from './lexicon-resolver.js'
import { registerTabPersistenceIpc } from './tab-persistence.js'

registerAtProtocolScheme()

async function createWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    await win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    await win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(async () => {
  registerAtProtocolHandler()
  registerTileIpc()
  registerBlobIpc()
  registerEngagementIpc()
  registerAuthIpc()
  registerBookmarkIpc()
  registerHistoryIpc()
  registerFeedIpc()
  registerTileManagementIpc()
  registerLexiconIpc()
  registerTabPersistenceIpc()
  await restoreAuthOnStartup()

  ipcMain.handle('open-external', async (_event, url: string): Promise<void> => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      await shell.openExternal(url)
    }
  })

  ipcMain.handle('resolve-did', async (_event, did: string) => {
    try {
      const resolved = await resolveAtUri(`at://${did}`)
      return { did, handle: resolved?.handle ?? null }
    } catch {
      return { did, handle: null }
    }
  })

  ipcMain.handle('get-identity-info', async (_event, did: string) => {
    try {
      const plcDoc = await fetch(`https://plc.directory/${encodeURIComponent(did)}`)
      const doc = plcDoc.ok ? (await plcDoc.json()) as Record<string, unknown> : null

      let createdAt: string | null = null
      try {
        const auditResp = await fetch(`https://plc.directory/${encodeURIComponent(did)}/log/audit`)
        if (auditResp.ok) {
          const audit = (await auditResp.json()) as Array<Record<string, unknown>>
          if (audit.length > 0) {
            createdAt = (audit[0]['createdAt'] as string) ?? null
          }
        }
      } catch {
        // Audit log is best-effort
      }

      const alsoKnownAs = (doc?.['alsoKnownAs'] as string[]) ?? []
      const services = (doc?.['service'] as Array<Record<string, unknown>>) ?? []
      const pds = services.find((s) => s['type'] === 'AtprotoPersonalDataServer')
      const pdsEndpoint = (pds?.['serviceEndpoint'] as string) ?? null

      return { did, createdAt, pdsEndpoint, alsoKnownAs }
    } catch {
      return { did, createdAt: null, pdsEndpoint: null, alsoKnownAs: [] }
    }
  })

  ipcMain.handle('resolve-uri', async (_event, uri: string) => {
    try {
      let resolved
      try {
        resolved = await resolveAtUri(uri)
      } catch (err) {
        return { error: `failed to resolve URI: ${String(err)}`, uri }
      }

      if (!resolved) return { error: 'failed to resolve URI', uri }

      const identity = { did: resolved.did, handle: resolved.handle, pds: resolved.pds }

      if (!resolved.collection && !resolved.rkey) {
        try {
          const repo = await describeRepo(resolved.pds, resolved.did)
          const collections = (repo?.collections ?? []).map((nsid) => ({ nsid }))

          let profile: unknown = null
          try {
            const profileRecord = await getRecord({
              pds: resolved.pds,
              repo: resolved.did,
              collection: 'app.bsky.actor.profile',
              rkey: 'self',
            })
            profile = profileRecord?.value ?? null
          } catch {
            // Profile is optional
          }

          return { type: 'repo', identity, profile, collections }
        } catch (err) {
          return { error: `failed to describe repository: ${String(err)}` }
        }
      }

      if (resolved.collection && !resolved.rkey) {
        try {
          const result = await listRecords({ pds: resolved.pds, repo: resolved.did, collection: resolved.collection, limit: 50 })
          return {
            type: 'collection',
            identity,
            collection: resolved.collection,
            records: result?.records ?? [],
            cursor: result?.cursor ?? null,
          }
        } catch (err) {
          return { error: `failed to list records: ${String(err)}` }
        }
      }

      if (resolved.collection && resolved.rkey) {
        try {
          const record = await getRecord({ pds: resolved.pds, repo: resolved.did, collection: resolved.collection, rkey: resolved.rkey })
          return { type: 'record', identity, collection: resolved.collection, rkey: resolved.rkey, record }
        } catch (err) {
          return { error: `failed to get record: ${String(err)}` }
        }
      }

      return { error: 'invalid URI format', uri }
    } catch (err) {
      return { error: `unexpected error: ${String(err)}` }
    }
  })

  ipcMain.handle('resolve-thread', async (_event, pds: string, did: string, collection: string, rkey: string) => {
    try {
      const thread = await assembleThread(pds, did, collection, rkey)
      if (!thread) {
        return { error: 'failed to assemble thread' }
      }
      return { type: 'thread', thread }
    } catch (err) {
      return { error: `failed to assemble thread: ${String(err)}` }
    }
  })

  ipcMain.handle('list-more-records', async (_event, pds: string, repo: string, collection: string, cursor: string) => {
    try {
      const result = await listRecords({ pds, repo, collection, limit: 50, cursor })
      return { records: result?.records ?? [], cursor: result?.cursor ?? null }
    } catch (err) {
      return { records: [], cursor: null, error: String(err) }
    }
  })

  await createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow()
  }
})
