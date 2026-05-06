// pattern: Imperative Shell
// (All functions perform HTTP network I/O via fetch())

export type RepoDescription = {
  readonly handle: string
  readonly did: string
  readonly collections: ReadonlyArray<string>
}

export type RecordEntry = {
  readonly uri: string
  readonly cid: string
  readonly value: unknown
}

export type RecordListResult = {
  readonly records: ReadonlyArray<RecordEntry>
  readonly cursor: string | null
}

export type ListRecordsOptions = {
  readonly pds: string
  readonly repo: string
  readonly collection: string
  readonly limit?: number
  readonly cursor?: string | null
}

export type GetRecordOptions = {
  readonly pds: string
  readonly repo: string
  readonly collection: string
  readonly rkey: string
}

export async function describeRepo(pds: string, repo: string): Promise<RepoDescription | null> {
  if (!pds?.trim() || !repo?.trim()) {
    return null
  }

  try {
    const url = `${pds}/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(repo)}`
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`[xrpc] describeRepo failed for ${repo}: ${response.status}`)
      return null
    }

    const data = (await response.json()) as {
      handle: string
      did: string
      collections: ReadonlyArray<string>
    }

    if (!data.handle || !data.did || !Array.isArray(data.collections)) {
      console.warn(`[xrpc] Invalid describeRepo response for ${repo}`)
      return null
    }

    return {
      handle: data.handle,
      did: data.did,
      collections: data.collections,
    }
  } catch (error) {
    console.warn(`[xrpc] Error describing repo ${repo}:`, error)
    return null
  }
}

export async function listRecords(options: ListRecordsOptions): Promise<RecordListResult | null> {
  const { pds, repo, collection, limit = 25, cursor = null } = options

  if (!pds?.trim() || !repo?.trim() || !collection?.trim()) {
    return null
  }

  if (limit < 1 || limit > 100) {
    console.warn(`[xrpc] Invalid limit for listRecords: ${limit}`)
    return null
  }

  try {
    let url = `${pds}/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(repo)}&collection=${encodeURIComponent(collection)}&limit=${limit}`
    if (cursor?.trim()) {
      url += `&cursor=${encodeURIComponent(cursor)}`
    }

    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`[xrpc] listRecords failed for ${repo}/${collection}: ${response.status}`)
      return null
    }

    const data = (await response.json()) as {
      records: ReadonlyArray<RecordEntry>
      cursor?: string
    }

    if (!Array.isArray(data.records)) {
      console.warn(`[xrpc] Invalid listRecords response for ${repo}/${collection}`)
      return null
    }

    return {
      records: data.records,
      cursor: data.cursor ?? null,
    }
  } catch (error) {
    console.warn(`[xrpc] Error listing records from ${repo}/${collection}:`, error)
    return null
  }
}

export async function getRecord(options: GetRecordOptions): Promise<RecordEntry | null> {
  const { pds, repo, collection, rkey } = options

  if (!pds?.trim() || !repo?.trim() || !collection?.trim() || !rkey?.trim()) {
    return null
  }

  try {
    const url = `${pds}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(repo)}&collection=${encodeURIComponent(collection)}&rkey=${encodeURIComponent(rkey)}`
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`[xrpc] getRecord failed for ${repo}/${collection}/${rkey}: ${response.status}`)
      return null
    }

    const data = (await response.json()) as RecordEntry

    if (!data.uri || !data.cid) {
      console.warn(`[xrpc] Invalid getRecord response for ${repo}/${collection}/${rkey}`)
      return null
    }

    return data
  } catch (error) {
    console.warn(`[xrpc] Error getting record ${repo}/${collection}/${rkey}:`, error)
    return null
  }
}

export async function getBlob(pds: string, did: string, cid: string): Promise<ArrayBuffer | null> {
  if (!pds?.trim() || !did?.trim() || !cid?.trim()) {
    return null
  }

  try {
    const url = `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`[xrpc] getBlob failed for ${did}/${cid}: ${response.status}`)
      return null
    }

    return response.arrayBuffer()
  } catch (error) {
    console.warn(`[xrpc] Error getting blob ${did}/${cid}:`, error)
    return null
  }
}
