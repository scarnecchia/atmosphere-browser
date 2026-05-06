import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('atBrowser', {
  resolveUri: (uri: string): Promise<unknown> => ipcRenderer.invoke('resolve-uri', uri),
})
