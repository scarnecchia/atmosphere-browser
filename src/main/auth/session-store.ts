// pattern: Functional Core

import { app, safeStorage } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs'

const SESSION_DIR = join(app.getPath('userData'), 'auth-sessions')

function ensureDir(): void {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true })
  }
}

function sessionPath(sub: string): string {
  const safe = sub.replace(/[^a-zA-Z0-9_:-]/g, '_')
  return join(SESSION_DIR, `${safe}.enc`)
}

export const sessionStore = {
  async set(sub: string, session: unknown): Promise<void> {
    ensureDir()
    const json = JSON.stringify(session)
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(json)
      writeFileSync(sessionPath(sub), encrypted)
    } else {
      writeFileSync(sessionPath(sub), json)
    }
  },

  async get(sub: string): Promise<unknown | undefined> {
    const path = sessionPath(sub)
    if (!existsSync(path)) return undefined

    const data = readFileSync(path)
    if (safeStorage.isEncryptionAvailable()) {
      const decrypted = safeStorage.decryptString(data)
      return JSON.parse(decrypted)
    }
    return JSON.parse(data.toString())
  },

  async del(sub: string): Promise<void> {
    const path = sessionPath(sub)
    if (existsSync(path)) {
      unlinkSync(path)
    }
  },
}
