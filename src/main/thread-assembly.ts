// pattern: Functional Core (pure-ish thread building logic)
// Depends on resolveAtUri and getRecord for I/O

import { getRecord } from './xrpc-client.js'
import { resolveAtUri } from './identity.js'
import type { RecordEntry } from './xrpc-client.js'

export type ThreadNode = {
  readonly uri: string
  readonly record: RecordEntry
  readonly identity: { did: string; handle: string | null; pds: string }
  readonly parent: ThreadNode | null
}

export async function assembleThread(
  pds: string,
  did: string,
  collection: string,
  rkey: string,
): Promise<ThreadNode | null> {
  const record = await getRecord({
    pds,
    repo: did,
    collection,
    rkey,
  })

  if (!record) {
    return null
  }

  const node: ThreadNode = {
    uri: `at://${did}/${collection}/${rkey}`,
    record,
    identity: { did, handle: null, pds },
    parent: null,
  }

  const value = record.value as Record<string, unknown>
  const reply = value['reply'] as { parent?: { uri?: string }; root?: { uri?: string } } | undefined

  if (reply?.parent?.uri) {
    const parentResolved = await resolveAtUri(reply.parent.uri)
    if (parentResolved && parentResolved.collection && parentResolved.rkey) {
      const parentNode = await assembleThread(
        parentResolved.pds,
        parentResolved.did,
        parentResolved.collection,
        parentResolved.rkey,
      )
      if (parentNode) {
        return { ...node, parent: parentNode }
      }
    }
  }

  return node
}
