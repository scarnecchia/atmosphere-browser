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
  resolveThread: (pds: string, did: string, collection: string, rkey: string): Promise<unknown> =>
    ipcRenderer.invoke('resolve-thread', pds, did, collection, rkey),
  getEngagement: (atUri: string): Promise<{ likes: number; reposts: number; replies: number } | null> =>
    ipcRenderer.invoke('get-engagement', atUri),
  getReplyBacklinks: (postUri: string, limit?: number): Promise<unknown> =>
    ipcRenderer.invoke('get-reply-backlinks', postUri, limit),
  authLogin: (handle: string): Promise<unknown> => ipcRenderer.invoke('auth-login', handle),
  authLogout: (): Promise<void> => ipcRenderer.invoke('auth-logout'),
  authState: (): Promise<unknown> => ipcRenderer.invoke('auth-state'),
  authCancel: (): Promise<void> => ipcRenderer.invoke('auth-cancel'),
  writeLike: (subjectUri: string, subjectCid: string): Promise<unknown> =>
    ipcRenderer.invoke('write-like', subjectUri, subjectCid),
  writeRepost: (subjectUri: string, subjectCid: string): Promise<unknown> =>
    ipcRenderer.invoke('write-repost', subjectUri, subjectCid),
  writeReply: (text: string, parentUri: string, parentCid: string, rootUri: string, rootCid: string): Promise<unknown> =>
    ipcRenderer.invoke('write-reply', text, parentUri, parentCid, rootUri, rootCid),
  writeDelete: (collection: string, rkey: string): Promise<unknown> =>
    ipcRenderer.invoke('write-delete', collection, rkey),
})
