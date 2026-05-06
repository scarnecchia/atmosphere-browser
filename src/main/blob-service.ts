// pattern: Functional Core + Imperative Shell
// - constructBlobUrl: pure function (testable)
// - handleGetBlobUrl, handleFetchBlob: handler logic (testable separately from IPC)
// - registerBlobIpc: wires handlers to electron IPC (integration only)

import { ipcMain } from 'electron'

/**
 * Constructs a blob URL from PDS endpoint, DID, and CID.
 * Returns the XRPC endpoint URL for fetching the blob.
 */
export function constructBlobUrl(pds: string, did: string, cid: string): string {
  // Ensure PDS doesn't have trailing slash to avoid double slashes
  const basePds = pds.endsWith('/') ? pds.slice(0, -1) : pds
  return `${basePds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`
}

/**
 * IPC handler for getting a blob URL.
 * Can be tested independently of Electron IPC.
 */
export async function handleGetBlobUrl(
  _event: unknown,
  pds: string,
  did: string,
  cid: string,
): Promise<string> {
  return constructBlobUrl(pds, did, cid)
}

/**
 * IPC handler for fetching blob data.
 * Fetches blob from constructed URL and returns as base64 data URL.
 * Returns null if blob is unreachable (not error).
 */
export async function handleFetchBlob(
  _event: unknown,
  pds: string,
  did: string,
  cid: string,
): Promise<{ data: string; mimeType: string } | null> {
  const url = constructBlobUrl(pds, did, cid)
  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const buffer = await response.arrayBuffer()
    const mimeType = response.headers.get('content-type') ?? 'application/octet-stream'
    const base64 = Buffer.from(buffer).toString('base64')
    return { data: `data:${mimeType};base64,${base64}`, mimeType }
  } catch {
    return null
  }
}

/**
 * Register blob IPC handlers with Electron.
 */
export function registerBlobIpc(): void {
  ipcMain.handle('get-blob-url', handleGetBlobUrl)
  ipcMain.handle('fetch-blob', handleFetchBlob)
}
