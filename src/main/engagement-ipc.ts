// pattern: Imperative Shell (IPC handler registration)

import { ipcMain } from 'electron'
import { getEngagementCounts, getReplyBacklinks } from './constellation-client.js'

// Extracted as testable functions (Functional Core logic)
export async function handleGetEngagement(atUri: string): Promise<{ likes: number; reposts: number; replies: number } | null> {
  const counts = await getEngagementCounts(atUri)
  return counts
}

export async function handleGetReplyBacklinks(
  postUri: string,
  limit?: number,
): Promise<unknown> {
  const backlinks = await getReplyBacklinks(postUri, limit)
  return backlinks
}

// IPC handler registration (Imperative Shell)
export function registerEngagementIpc(): void {
  ipcMain.handle('get-engagement', async (_event, atUri: string) => {
    return handleGetEngagement(atUri)
  })

  ipcMain.handle('get-reply-backlinks', async (_event, postUri: string, limit?: number) => {
    return handleGetReplyBacklinks(postUri, limit)
  })
}
