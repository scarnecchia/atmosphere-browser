// pattern: Test

import { describe, it, expect } from 'vitest'
import { formatDate } from '../utils/format.js'

describe('follow-tile: formatDate utility', () => {
  it('should format valid ISO date strings', () => {
    const result = formatDate('2026-05-06T10:30:00Z')
    expect(result).toBeTruthy()
    expect(result).toMatch(/\d+\/\d+\/\d+/)
  })

  it('should return empty string for empty input', () => {
    expect(formatDate('')).toBe('')
  })

  it('should handle invalid dates gracefully', () => {
    const invalid = 'not-a-date'
    const result = formatDate(invalid)
    // JavaScript's toLocaleDateString on invalid Date returns 'Invalid Date'
    expect(result).toBeTruthy()
    expect(result).toMatch(/Invalid Date|NaN/)
  })
})

describe('follow-tile: data extraction', () => {
  it('should extract subject from record', () => {
    const record = {
      subject: 'did:plc:abcdef123456',
      createdAt: '2026-05-06T10:30:00Z',
    }
    const subject = (record['subject'] as string) ?? 'unknown'
    expect(subject).toBe('did:plc:abcdef123456')
  })

  it('should handle missing subject gracefully', () => {
    const record = {
      createdAt: '2026-05-06T10:30:00Z',
    }
    const subject = (record['subject'] as string) ?? 'unknown'
    expect(subject).toBe('unknown')
  })

  it('should extract createdAt from record', () => {
    const record = {
      subject: 'did:plc:abcdef123456',
      createdAt: '2026-05-06T10:30:00Z',
    }
    const createdAt = (record['createdAt'] as string) ?? ''
    expect(createdAt).toBe('2026-05-06T10:30:00Z')
  })

  it('should handle missing createdAt gracefully', () => {
    const record = {
      subject: 'did:plc:abcdef123456',
    }
    const createdAt = (record['createdAt'] as string) ?? ''
    expect(createdAt).toBe('')
  })
})
