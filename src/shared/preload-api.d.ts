export type PreloadApi = {
  resolveUri: (uri: string) => Promise<unknown>
  loadTile: (nsid: string) => Promise<{ success: boolean; tile?: unknown; error?: string }>
  getBlobUrl: (pds: string, did: string, cid: string) => Promise<string>
  fetchBlob: (pds: string, did: string, cid: string) => Promise<{ data: string; mimeType: string } | null>
}

declare global {
  interface Window {
    atBrowser: PreloadApi
  }
}
