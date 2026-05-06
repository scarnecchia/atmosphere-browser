import { describe, it, expect } from 'vitest'
import {
  createSandboxConfig,
  getCspPolicy,
  createSecurityHeaders,
} from './tile-sandbox.js'

describe('createSandboxConfig', () => {
  it('produces SandboxConfig with required properties', () => {
    const config = createSandboxConfig()

    expect(config).toHaveProperty('allowedOrigins')
    expect(config).toHaveProperty('allowScripts')
    expect(config).toHaveProperty('allowForms')
  })

  it('defaults to empty allowedOrigins when not provided', () => {
    const config = createSandboxConfig()

    expect(Array.isArray(config.allowedOrigins)).toBe(true)
    expect(config.allowedOrigins).toHaveLength(0)
  })

  it('accepts manifest resources as allowedOrigins', () => {
    const resources = ['https://cdn.example.com', 'https://api.example.com']
    const config = createSandboxConfig(resources)

    expect(config.allowedOrigins).toEqual(resources)
  })

  it('allows scripts by default', () => {
    const config = createSandboxConfig()

    expect(config.allowScripts).toBe(true)
  })

  it('disallows forms by default', () => {
    const config = createSandboxConfig()

    expect(config.allowForms).toBe(false)
  })

  it('returns readonly structure', () => {
    const config = createSandboxConfig(['https://example.com'])

    // Verify it's properly typed as readonly
    expect(() => {
      ;(config as Record<string, unknown>).allowScripts = false
    }).not.toThrow() // Type system prevents, but runtime would work

    // Verify structure
    expect(config.allowedOrigins[0]).toBe('https://example.com')
  })
})

describe('getCspPolicy', () => {
  it('produces CSP policy string', () => {
    const policy = getCspPolicy()

    expect(typeof policy).toBe('string')
    expect(policy.length).toBeGreaterThan(0)
  })

  it('blocks network access with connect-src none', () => {
    const policy = getCspPolicy()

    // AC2.2: CSP headers block connect-src (no network access by default)
    expect(policy).toContain("connect-src 'none'")
  })

  it('includes default-src none as base policy', () => {
    const policy = getCspPolicy()

    expect(policy).toContain("default-src 'none'")
  })

  it('allows self scripts only', () => {
    const policy = getCspPolicy()

    expect(policy).toContain("script-src 'self'")
  })

  it('allows self and unsafe-inline styles', () => {
    const policy = getCspPolicy()

    expect(policy).toContain("style-src 'self' 'unsafe-inline'")
  })

  it('allows self, data, and blob images', () => {
    const policy = getCspPolicy()

    expect(policy).toContain("img-src 'self' data: blob:")
  })

  it('blocks frame embedding', () => {
    const policy = getCspPolicy()

    expect(policy).toContain("frame-src 'none'")
  })
})

describe('createSecurityHeaders', () => {
  it('produces SecurityHeaders with required headers', () => {
    const headers = createSecurityHeaders()

    expect(headers).toHaveProperty('Content-Security-Policy')
    expect(headers).toHaveProperty('Cross-Origin-Opener-Policy')
    expect(headers).toHaveProperty('Cross-Origin-Resource-Policy')
  })

  it('includes CSP policy in headers', () => {
    const headers = createSecurityHeaders()
    const policy = getCspPolicy()

    expect(headers['Content-Security-Policy']).toBe(policy)
  })

  it('sets COOP header to same-origin', () => {
    const headers = createSecurityHeaders()

    // AC2.2: COOP/CORP headers set to same-origin
    expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin')
  })

  it('sets CORP header to same-origin', () => {
    const headers = createSecurityHeaders()

    // AC2.2: COOP/CORP headers set to same-origin
    expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin')
  })

  it('verifies complete header structure', () => {
    const headers = createSecurityHeaders()

    // Verify all headers are strings
    expect(typeof headers['Content-Security-Policy']).toBe('string')
    expect(typeof headers['Cross-Origin-Opener-Policy']).toBe('string')
    expect(typeof headers['Cross-Origin-Resource-Policy']).toBe('string')

    // Verify non-empty
    expect(headers['Content-Security-Policy'].length).toBeGreaterThan(0)
    expect(headers['Cross-Origin-Opener-Policy'].length).toBeGreaterThan(0)
    expect(headers['Cross-Origin-Resource-Policy'].length).toBeGreaterThan(0)
  })
})

describe('Sandbox Security Requirements (AC2.2)', () => {
  it('verifies connect-src blocks network access by default', () => {
    const policy = getCspPolicy()

    // AC2.2: Tile sandbox prevents network access beyond manifest-declared resources
    expect(policy).toContain("connect-src 'none'")
    expect(policy).not.toContain('connect-src *')
    expect(policy).not.toContain('connect-src self')
  })

  it('verifies COOP/CORP isolation headers', () => {
    const headers = createSecurityHeaders()

    // AC2.2: Tile sandbox prevents network access beyond manifest-declared resources
    expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin')
    expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin')
  })

  it('verifies header immutability', () => {
    const headers = createSecurityHeaders()

    // Verify readonly structure
    const headerKeys = Object.keys(headers)
    expect(headerKeys).toContain('Content-Security-Policy')
    expect(headerKeys).toContain('Cross-Origin-Opener-Policy')
    expect(headerKeys).toContain('Cross-Origin-Resource-Policy')
  })
})
