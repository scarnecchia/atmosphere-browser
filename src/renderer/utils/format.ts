// pattern: Functional Core (pure formatting utilities)

export function formatTime(iso: string): string {
  if (!iso) return ''
  try {
    const date = new Date(iso)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}

export function getPurposeLabel(purpose: string): string {
  if (purpose.includes('modlist')) return 'Moderation list'
  if (purpose.includes('curatelist')) return 'Curation list'
  return purpose
}

export type EngagementCounts = {
  readonly likes: number
  readonly reposts: number
  readonly replies: number
}

export function formatEngagementCount(count: number, label: string): string {
  if (count === 1) {
    // Handle singular forms
    if (label === 'replies') return '1 reply'
    if (label === 'reposts') return '1 repost'
    if (label === 'likes') return '1 like'
  }
  return `${count} ${label}`
}

export function getEngagementDisplayState(
  counts: EngagementCounts | null,
  unavailable: boolean,
): 'unavailable' | 'loading' | 'ready' {
  if (unavailable) return 'unavailable'
  if (counts === null) return 'loading'
  return 'ready'
}
