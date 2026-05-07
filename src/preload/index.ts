// pattern: Imperative Shell

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('atBrowser', {
  resolveDid: (did: string): Promise<{ did: string; handle: string | null }> =>
    ipcRenderer.invoke('resolve-did', did),
  getIdentityInfo: (did: string): Promise<{ did: string; createdAt: string | null; pdsEndpoint: string | null; alsoKnownAs: string[] }> =>
    ipcRenderer.invoke('get-identity-info', did),
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
  getBacklinks: (subject: string, source: string, limit?: number): Promise<unknown> =>
    ipcRenderer.invoke('get-backlinks', subject, source, limit),
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
  bookmarksList: (): Promise<unknown> => ipcRenderer.invoke('bookmarks-list'),
  bookmarksAdd: (uri: string, title: string): Promise<unknown> => ipcRenderer.invoke('bookmarks-add', uri, title),
  bookmarksRemove: (uri: string): Promise<void> => ipcRenderer.invoke('bookmarks-remove', uri),
  bookmarksIsBookmarked: (uri: string): Promise<boolean> => ipcRenderer.invoke('bookmarks-is-bookmarked', uri),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
  historyList: (query?: string): Promise<unknown> => ipcRenderer.invoke('history-list', query),
  historyAdd: (uri: string, title: string): Promise<void> => ipcRenderer.invoke('history-add', uri, title),
  historyClear: (): Promise<void> => ipcRenderer.invoke('history-clear'),
  getFeedGenerator: (uri: string): Promise<unknown> => ipcRenderer.invoke('get-feed-generator', uri),
  tilesListInstalled: (): Promise<unknown> => ipcRenderer.invoke('tiles-list-installed'),
  tilesClearCache: (): Promise<void> => ipcRenderer.invoke('tiles-clear-cache'),
  resolveLexicon: (pds: string, nsid: string): Promise<unknown> => ipcRenderer.invoke('resolve-lexicon', pds, nsid),
  listMoreRecords: (pds: string, repo: string, collection: string, cursor: string): Promise<unknown> =>
    ipcRenderer.invoke('list-more-records', pds, repo, collection, cursor),
  tabsSave: (state: unknown): Promise<void> => ipcRenderer.invoke('tabs-save', state),
  tabsRestore: (): Promise<unknown> => ipcRenderer.invoke('tabs-restore'),
})
