// pattern: Imperative Shell

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('atBrowser', {
  resolveUri: (uri: string): Promise<unknown> => ipcRenderer.invoke('resolve-uri', uri),
  loadTile: (nsid: string): Promise<{ success: boolean; tile?: unknown; error?: string }> =>
    ipcRenderer.invoke('load-tile', nsid),
  getBlobUrl: (pds: string, did: string, cid: string): Promise<string> =>
    ipcRenderer.invoke('get-blob-url', pds, did, cid),
  fetchBlob: (pds: string, did: string, cid: string): Promise<{ data: string; mimeType: string } | null> =>
    ipcRenderer.invoke('fetch-blob', pds, did, cid),
})
