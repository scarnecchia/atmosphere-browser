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
