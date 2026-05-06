export type PreloadApi = {
  resolveUri: (uri: string) => Promise<unknown>
  loadTile: (nsid: string) => Promise<{ success: boolean; tile?: unknown; error?: string }>
  getBlobUrl: (pds: string, did: string, cid: string) => Promise<string>
  fetchBlob: (pds: string, did: string, cid: string) => Promise<{ data: string; mimeType: string } | null>
  resolveThread: (pds: string, did: string, collection: string, rkey: string) => Promise<unknown>
  getEngagement: (atUri: string) => Promise<{ likes: number; reposts: number; replies: number } | null>
  getReplyBacklinks: (postUri: string, limit?: number) => Promise<unknown>
}

declare global {
  interface Window {
    atBrowser: PreloadApi
  }
}
