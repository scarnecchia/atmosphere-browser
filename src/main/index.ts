import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { registerAtProtocolScheme, registerAtProtocolHandler } from './protocol.js'

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

  ipcMain.handle('resolve-uri', async (_event, uri: string) => {
    const { resolveAtUri } = await import('./identity.js')
    const { describeRepo, listRecords, getRecord } = await import('./xrpc-client.js')

    const resolved = await resolveAtUri(uri)
    if (!resolved) return { error: 'Failed to resolve URI', uri }

    if (!resolved.collection && !resolved.rkey) {
      const repo = await describeRepo(resolved.pds, resolved.did)
      return { type: 'repo', resolved, repo }
    }

    if (resolved.collection && !resolved.rkey) {
      const records = await listRecords(resolved.pds, resolved.did, resolved.collection)
      return { type: 'collection', resolved, records }
    }

    if (resolved.collection && resolved.rkey) {
      const record = await getRecord(resolved.pds, resolved.did, resolved.collection, resolved.rkey)
      return { type: 'record', resolved, record }
    }

    return { error: 'Invalid URI format', uri }
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
