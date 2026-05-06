// pattern: Imperative Shell

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('atBrowser', {
  resolveUri: (uri: string): Promise<unknown> => ipcRenderer.invoke('resolve-uri', uri),
  loadTile: (nsid: string): Promise<{ success: boolean; tile?: unknown; error?: string }> =>
    ipcRenderer.invoke('load-tile', nsid),
})
