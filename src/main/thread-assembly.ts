// pattern: Functional Core (pure-ish thread building logic)
// Depends on resolveAtUri and getRecord for I/O

import { getRecord } from './xrpc-client.js'
import { resolveAtUri } from './identity.js'
import { getReplyBacklinks } from './constellation-client.js'
import type { RecordEntry } from './xrpc-client.js'

export type ThreadNode = {
  readonly uri: string
  readonly record: RecordEntry
  readonly identity: { did: string; handle: string | null; pds: string }
  readonly parent: ThreadNode | null
  readonly replies: ReadonlyArray<ThreadNode>
}

async function discoverReplies(postUri: string): Promise<ReadonlyArray<ThreadNode>> {
  const backlinks = await getReplyBacklinks(postUri)
  if (!backlinks || backlinks.records.length === 0) return []

  const replies: Array<ThreadNode> = []
  for (const backlink of backlinks.records) {
    const replyUri = `at://${backlink.did}/${backlink.collection}/${backlink.rkey}`
    const resolved = await resolveAtUri(replyUri)
    if (!resolved || !resolved.collection || !resolved.rkey) continue

    const record = await getRecord({
      pds: resolved.pds,
      repo: resolved.did,
      collection: resolved.collection,
      rkey: resolved.rkey,
    })
    if (!record) continue

    replies.push({
      uri: replyUri,
      record,
      identity: { did: resolved.did, handle: resolved.handle, pds: resolved.pds },
      parent: null,
      replies: [],
    })
  }

  return replies
}

export async function assembleThread(
  pds: string,
  did: string,
  collection: string,
  rkey: string,
  maxDepth = 50,
): Promise<ThreadNode | null> {
  // Stop recursion at max depth to prevent stack overflow on untrusted data
  if (maxDepth <= 0) return null

  const record = await getRecord({
    pds,
    repo: did,
    collection,
    rkey,
  })

  if (!record) {
    return null
  }

  const uri = `at://${did}/${collection}/${rkey}`

  let handle: string | null = null
  try {
    const resolved = await resolveAtUri(`at://${did}`)
    handle = resolved?.handle ?? null
  } catch {
    // Handle resolution is best-effort
  }

  const replies = await discoverReplies(uri)

  const node: ThreadNode = {
    uri,
    record,
    identity: { did, handle, pds },
    parent: null,
    replies,
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
        maxDepth - 1,
      )
      if (parentNode) {
        return { ...node, parent: parentNode }
      }
    }
  }

  return node
}
