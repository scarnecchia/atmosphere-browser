// pattern: Functional Core
// (Pure logic for extracting feed generator record data; IPC registration is Imperative Shell)

import { ipcMain } from 'electron'
import { resolveAtUri } from './identity.js'
import { getRecord } from './xrpc-client.js'

export type FeedGeneratorResponse = {
  readonly record: Record<string, unknown>
  readonly identity: {
    readonly did: string
    readonly handle: string | null
    readonly pds: string
  }
}

export async function extractFeedGeneratorRecord(uri: string): Promise<FeedGeneratorResponse | null> {
  if (!uri?.trim()) {
    return null
  }

  const resolved = await resolveAtUri(uri)
  if (!resolved || !resolved.collection || !resolved.rkey) {
    return null
  }

  const record = await getRecord({
    pds: resolved.pds,
    repo: resolved.did,
    collection: resolved.collection,
    rkey: resolved.rkey,
  })

  if (!record || !record.value) {
    return null
  }

  return {
    record: record.value as Record<string, unknown>,
    identity: {
      did: resolved.did,
      handle: resolved.handle,
      pds: resolved.pds,
    },
  }
}

export function registerFeedIpc(): void {
  ipcMain.handle('get-feed-generator', async (_event, uri: string) => {
    return extractFeedGeneratorRecord(uri)
  })
}
