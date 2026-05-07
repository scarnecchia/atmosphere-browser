// pattern: Imperative Shell (file system I/O)

import { app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs'
import type { NodeSavedSession, NodeSavedSessionStore } from '@atproto/oauth-client-node'

const SESSION_DIR = join(app.getPath('userData'), 'auth-sessions')

function ensureDir(): void {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true })
  }
}

function sessionPath(sub: string): string {
  const safe = sub.replace(/[^a-zA-Z0-9_:-]/g, '_')
  return join(SESSION_DIR, `${safe}.json`)
}

export const sessionStore: NodeSavedSessionStore = {
  async set(sub: string, session: NodeSavedSession): Promise<void> {
    ensureDir()
    writeFileSync(sessionPath(sub), JSON.stringify(session))
  },

  async get(sub: string): Promise<NodeSavedSession | undefined> {
    const path = sessionPath(sub)
    if (!existsSync(path)) return undefined
    try {
      return JSON.parse(readFileSync(path, 'utf-8')) as NodeSavedSession
    } catch {
      return undefined
    }
  },

  async del(sub: string): Promise<void> {
    const path = sessionPath(sub)
    if (existsSync(path)) {
      unlinkSync(path)
    }
  },
}
