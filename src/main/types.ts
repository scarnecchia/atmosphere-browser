export type MiniDoc = {
  readonly did: string
  readonly handle: string
  readonly pds: string
  readonly signingKey: string | null
}

export type ResolvedUri = {
  readonly did: string
  readonly handle: string | null
  readonly pds: string
  readonly collection: string | null
  readonly rkey: string | null
}

export type ParsedAtUri = {
  readonly authority: string
  readonly collection: string | null
  readonly rkey: string | null
}

export type EngagementData = {
  readonly likes: number
  readonly reposts: number
  readonly replies: number
  readonly backlinks: ReadonlyArray<BacklinkEntry>
}

export type BacklinkEntry = {
  readonly uri: string
  readonly cid: string
  readonly authorDid: string
  readonly collection: string
  readonly indexedAt: string
}

export type IdentityInfo = {
  readonly did: string
  readonly handle: string
  readonly pds: string
}

export type AuthChannel = {
  readonly did: string
  readonly handle: string
  readonly createRecord: (collection: string, record: unknown) => Promise<{ uri: string; cid: string }>
  readonly deleteRecord: (collection: string, rkey: string) => Promise<void>
}

export type TileContext = {
  readonly record: unknown
  readonly lexicon: unknown
  readonly engagement: EngagementData
  readonly identity: IdentityInfo
  readonly auth: AuthChannel | null
  readonly navigate: (atUri: string) => void
}
