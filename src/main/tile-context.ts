// pattern: Functional Core
// (Pure factory functions for constructing tile context objects)

import type { EngagementData, IdentityInfo, TileContext } from './types.js'

export function createTileContext(options: {
  record: unknown
  lexicon: unknown
  identity: IdentityInfo
  engagement?: EngagementData
  navigate: (atUri: string) => void
}): TileContext {
  return {
    record: options.record,
    lexicon: options.lexicon,
    identity: options.identity,
    engagement: options.engagement ?? createEmptyEngagement(),
    auth: null,
    navigate: options.navigate,
  }
}

export function createEmptyEngagement(): EngagementData {
  return { likes: 0, reposts: 0, replies: 0, backlinks: [] }
}
