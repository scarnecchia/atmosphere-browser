// pattern: Imperative Shell
// (Electron app lifecycle orchestration, window management, IPC handler registration)

import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { registerAtProtocolScheme, registerAtProtocolHandler } from './protocol.js'
import { registerTileIpc } from './tile-ipc.js'
import { registerBlobIpc } from './blob-service.js'

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

  ipcMain.handle('resolve-uri', async (_event, uri: string) => {
    try {
      const { resolveAtUri } = await import('./identity.js')
      const { describeRepo, listRecords, getRecord } = await import('./xrpc-client.js')

      let resolved
      try {
        resolved = await resolveAtUri(uri)
      } catch (err) {
        return { error: `failed to resolve URI: ${String(err)}`, uri }
      }

      if (!resolved) return { error: 'failed to resolve URI', uri }

      if (!resolved.collection && !resolved.rkey) {
        try {
          const repo = await describeRepo(resolved.pds, resolved.did)
          return { type: 'repo', resolved, repo }
        } catch (err) {
          return { error: `failed to describe repository: ${String(err)}` }
        }
      }

      if (resolved.collection && !resolved.rkey) {
        try {
          const records = await listRecords({ pds: resolved.pds, repo: resolved.did, collection: resolved.collection })
          return { type: 'collection', resolved, records }
        } catch (err) {
          return { error: `failed to list records: ${String(err)}` }
        }
      }

      if (resolved.collection && resolved.rkey) {
        try {
          const record = await getRecord({ pds: resolved.pds, repo: resolved.did, collection: resolved.collection, rkey: resolved.rkey })
          return { type: 'record', resolved, record }
        } catch (err) {
          return { error: `failed to get record: ${String(err)}` }
        }
      }

      return { error: 'invalid URI format', uri }
    } catch (err) {
      return { error: `unexpected error: ${String(err)}` }
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
