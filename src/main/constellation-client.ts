// pattern: Imperative Shell (network I/O for Constellation API)

const CONSTELLATION_BASE = 'https://constellation.microcosm.blue'

export type EngagementCounts = {
  readonly likes: number
  readonly reposts: number
  readonly replies: number
}

export type BacklinkRecord = {
  readonly did: string
  readonly collection: string
  readonly rkey: string
}

export type BacklinksResult = {
  readonly total: number
  readonly records: ReadonlyArray<BacklinkRecord>
  readonly cursor: string | null
}

async function getBacklinksCount(subject: string, source: string): Promise<number | null> {
  const url = `${CONSTELLATION_BASE}/xrpc/blue.microcosm.links.getBacklinksCount?subject=${encodeURIComponent(subject)}&source=${encodeURIComponent(source)}`

  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const data = (await response.json()) as { total: number }
    return data.total
  } catch {
    return null
  }
}

export async function getEngagementCounts(atUri: string): Promise<EngagementCounts | null> {
  const results = await Promise.allSettled([
    getBacklinksCount(atUri, 'app.bsky.feed.like:subject.uri'),
    getBacklinksCount(atUri, 'app.bsky.feed.repost:subject.uri'),
    getBacklinksCount(atUri, 'app.bsky.feed.post:reply.parent.uri'),
  ])

  const likes = results[0]?.status === 'fulfilled' ? results[0].value : null
  const reposts = results[1]?.status === 'fulfilled' ? results[1].value : null
  const replies = results[2]?.status === 'fulfilled' ? results[2].value : null

  if (likes === null && reposts === null && replies === null) {
    return null
  }

  return {
    likes: likes ?? 0,
    reposts: reposts ?? 0,
    replies: replies ?? 0,
  }
}

export async function getBacklinks(
  subject: string,
  source: string,
  limit: number = 25,
  cursor: string | null = null,
): Promise<BacklinksResult | null> {
  let url = `${CONSTELLATION_BASE}/xrpc/blue.microcosm.links.getBacklinks?subject=${encodeURIComponent(subject)}&source=${encodeURIComponent(source)}&limit=${limit}`
  if (cursor) {
    url += `&cursor=${encodeURIComponent(cursor)}`
  }

  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const data = (await response.json()) as {
      total: number
      records: ReadonlyArray<BacklinkRecord>
      cursor?: string
    }
    return {
      total: data.total,
      records: data.records,
      cursor: data.cursor ?? null,
    }
  } catch {
    return null
  }
}

export async function getReplyBacklinks(
  postUri: string,
  limit: number = 50,
): Promise<BacklinksResult | null> {
  return getBacklinks(postUri, 'app.bsky.feed.post:reply.parent.uri', limit)
}
