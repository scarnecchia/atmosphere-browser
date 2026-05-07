export type AuthState = {
  readonly did: string
  readonly handle: string
  readonly isAuthenticated: boolean
}

export type WriteResult = {
  readonly success: boolean
  readonly uri?: string
  readonly cid?: string
  readonly error?: string
}

export type PreloadApi = {
  resolveDid: (did: string) => Promise<{ did: string; handle: string | null }>
  getIdentityInfo: (did: string) => Promise<{ did: string; createdAt: string | null; pdsEndpoint: string | null; alsoKnownAs: string[] }>
  resolveUri: (uri: string) => Promise<unknown>
  loadTile: (nsid: string) => Promise<{ success: boolean; tile?: unknown; error?: string }>
  getBlobUrl: (pds: string, did: string, cid: string) => Promise<string>
  fetchBlob: (pds: string, did: string, cid: string) => Promise<{ data: string; mimeType: string } | null>
  resolveThread: (pds: string, did: string, collection: string, rkey: string) => Promise<unknown>
  getEngagement: (atUri: string) => Promise<{ likes: number; reposts: number; replies: number } | null>
  getReplyBacklinks: (postUri: string, limit?: number) => Promise<unknown>
  getBacklinks: (subject: string, source: string, limit?: number) => Promise<unknown>
  authLogin: (handle: string) => Promise<AuthState | null>
  authLogout: () => Promise<void>
  authState: () => Promise<AuthState | null>
  authCancel: () => Promise<void>
  writeLike: (subjectUri: string, subjectCid: string) => Promise<WriteResult>
  writeRepost: (subjectUri: string, subjectCid: string) => Promise<WriteResult>
  writeReply: (text: string, parentUri: string, parentCid: string, rootUri: string, rootCid: string) => Promise<WriteResult>
  writeDelete: (collection: string, rkey: string) => Promise<WriteResult>
  bookmarksList: () => Promise<unknown>
  bookmarksAdd: (uri: string, title: string) => Promise<unknown>
  bookmarksRemove: (uri: string) => Promise<void>
  bookmarksIsBookmarked: (uri: string) => Promise<boolean>
  openExternal: (url: string) => Promise<void>
  historyList: (query?: string) => Promise<unknown>
  historyAdd: (uri: string, title: string) => Promise<void>
  historyClear: () => Promise<void>
  getFeedGenerator: (uri: string) => Promise<unknown>
  tilesListInstalled: () => Promise<unknown>
  tilesClearCache: () => Promise<void>
  resolveLexicon: (pds: string, nsid: string) => Promise<unknown>
  listMoreRecords: (pds: string, repo: string, collection: string, cursor: string) => Promise<unknown>
  tabsSave: (state: unknown) => Promise<void>
  tabsRestore: () => Promise<unknown>
}

declare global {
  interface Window {
    atBrowser: PreloadApi
  }
}
