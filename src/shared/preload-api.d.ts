export type PreloadApi = {
  resolveUri: (uri: string) => Promise<unknown>
}

declare global {
  interface Window {
    atBrowser: PreloadApi
  }
}
