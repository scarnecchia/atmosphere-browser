// pattern: Imperative Shell
// (Contains async network calls via fetch(); parseAtUri is pure but depends on I/O functions)
import type { MiniDoc, ParsedAtUri, ResolvedUri } from './types.js'

const SLINGSHOT_BASE = 'https://slingshot.microcosm.blue'
const PLC_DIRECTORY = 'https://plc.directory'

export function parseAtUri(uri: string): ParsedAtUri {
  const normalized = uri.startsWith('at://') ? uri : `at://${uri}`
  const withoutScheme = normalized.slice(5)
  const parts = withoutScheme.split('/')

  return {
    authority: parts[0] ?? '',
    collection: parts[1] ?? null,
    rkey: parts[2] ?? null,
  }
}

export async function resolveMiniDoc(identifier: string): Promise<MiniDoc | null> {
  if (!identifier?.trim()) {
    return null
  }

  const url = `${SLINGSHOT_BASE}/xrpc/blue.microcosm.identity.resolveMiniDoc?identifier=${encodeURIComponent(identifier)}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`[identity] Slingshot resolveMiniDoc failed for ${identifier}: ${response.status}`)
      return null
    }

    const data = (await response.json()) as MiniDoc
    if (!data.did || !data.pds) {
      console.warn(`[identity] Invalid MiniDoc from Slingshot for ${identifier}`)
      return null
    }
    return data
  } catch (error) {
    console.warn(`[identity] Error fetching MiniDoc for ${identifier}:`, error)
    return null
  }
}

export async function resolveHandleViaDns(handle: string): Promise<string | null> {
  if (!handle?.trim()) {
    return null
  }

  try {
    const response = await fetch(`https://dns.google/resolve?name=_atproto.${handle}&type=TXT`)

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as { Answer?: ReadonlyArray<{ data: string }> }
    const answer = data.Answer?.find((a) => a.data.startsWith('"did='))
    if (!answer) {
      return null
    }

    return answer.data.replace(/^"did=/, '').replace(/"$/, '')
  } catch (error) {
    console.warn(`[identity] Error resolving handle via DNS for ${handle}:`, error)
    return null
  }
}

export async function resolveIdentity(identifier: string): Promise<ResolvedUri | null> {
  if (!identifier?.trim()) {
    return null
  }

  const miniDoc = await resolveMiniDoc(identifier)
  if (miniDoc) {
    return {
      did: miniDoc.did,
      handle: miniDoc.handle,
      pds: miniDoc.pds,
      collection: null,
      rkey: null,
    }
  }

  if (identifier.startsWith('did:')) {
    try {
      const plcResponse = await fetch(`${PLC_DIRECTORY}/${encodeURIComponent(identifier)}`)
      if (!plcResponse.ok) {
        return null
      }

      const doc = (await plcResponse.json()) as {
        alsoKnownAs?: ReadonlyArray<string>
        service?: ReadonlyArray<{ id: string; serviceEndpoint: string }>
      }

      const handle =
        doc.alsoKnownAs?.find((aka) => aka.startsWith('at://'))?.slice(5) ?? null
      const pds =
        doc.service?.find((s) => s.id === '#atproto_pds')?.serviceEndpoint ?? null

      if (!pds) {
        return null
      }

      return { did: identifier, handle, pds, collection: null, rkey: null }
    } catch (error) {
      console.warn(`[identity] Error resolving DID via PLC for ${identifier}:`, error)
      return null
    }
  }

  const did = await resolveHandleViaDns(identifier)
  if (!did) {
    return null
  }

  return resolveIdentity(did)
}

export async function resolveAtUri(uri: string): Promise<ResolvedUri | null> {
  if (!uri?.trim()) {
    return null
  }

  const parsed = parseAtUri(uri)
  if (!parsed.authority) {
    return null
  }

  const resolved = await resolveIdentity(parsed.authority)
  if (!resolved) {
    return null
  }

  return {
    ...resolved,
    collection: parsed.collection,
    rkey: parsed.rkey,
  }
}
