/**
 * Pure functions to build AT Protocol write record objects.
 * Extracted for testability; tile components use these to construct records.
 */

export type StrongRef = {
  readonly uri: string
  readonly cid: string
}

export type LikeRecord = {
  readonly $type: 'app.bsky.feed.like'
  readonly subject: StrongRef
  readonly createdAt: string
}

export type RepostRecord = {
  readonly $type: 'app.bsky.feed.repost'
  readonly subject: StrongRef
  readonly createdAt: string
}

export type ReplyRecord = {
  readonly $type: 'app.bsky.feed.post'
  readonly text: string
  readonly reply: {
    readonly parent: StrongRef
    readonly root: StrongRef
  }
  readonly createdAt: string
}

export function buildLikeRecord(subjectUri: string, subjectCid: string): LikeRecord {
  return {
    $type: 'app.bsky.feed.like',
    subject: { uri: subjectUri, cid: subjectCid },
    createdAt: new Date().toISOString(),
  }
}

export function buildRepostRecord(subjectUri: string, subjectCid: string): RepostRecord {
  return {
    $type: 'app.bsky.feed.repost',
    subject: { uri: subjectUri, cid: subjectCid },
    createdAt: new Date().toISOString(),
  }
}

export function buildReplyRecord(
  text: string,
  parentUri: string,
  parentCid: string,
  rootUri: string,
  rootCid: string,
): ReplyRecord {
  return {
    $type: 'app.bsky.feed.post',
    text,
    reply: {
      parent: { uri: parentUri, cid: parentCid },
      root: { uri: rootUri, cid: rootCid },
    },
    createdAt: new Date().toISOString(),
  }
}
