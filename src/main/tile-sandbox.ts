// pattern: Functional Core

export type SandboxConfig = {
  readonly allowedOrigins: ReadonlyArray<string>
  readonly allowScripts: boolean
  readonly allowForms: boolean
}

export function createSandboxConfig(
  manifestResources: ReadonlyArray<string> = [],
): SandboxConfig {
  return {
    allowedOrigins: manifestResources,
    allowScripts: true,
    allowForms: false,
  }
}

export function getCspPolicy(): string {
  return "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'none'; frame-src 'none';"
}

export type SecurityHeaders = {
  readonly 'Content-Security-Policy': string
  readonly 'Cross-Origin-Opener-Policy': string
  readonly 'Cross-Origin-Resource-Policy': string
}

export function createSecurityHeaders(): SecurityHeaders {
  return {
    'Content-Security-Policy': getCspPolicy(),
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  }
}
