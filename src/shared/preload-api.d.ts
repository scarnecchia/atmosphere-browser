export type PreloadApi = {
  resolveUri: (uri: string) => Promise<unknown>
  loadTile: (nsid: string) => Promise<{ success: boolean; tile?: unknown; error?: string }>
}

declare global {
  interface Window {
    atBrowser: PreloadApi
  }
}
