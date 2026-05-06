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
