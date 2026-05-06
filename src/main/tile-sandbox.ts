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

/**
 * Generate a CSP policy for a specific sandbox configuration.
 * Incorporates the config's allowedOrigins into the connect-src directive.
 */
export function getCspPolicyForConfig(config: SandboxConfig): string {
  const connectSrcList = config.allowedOrigins.length > 0 ? config.allowedOrigins.join(' ') : "'none'"
  return `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src ${connectSrcList}; frame-src 'none';`
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
