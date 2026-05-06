import { protocol } from 'electron'

export function registerAtProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'at',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ])
}

export function registerAtProtocolHandler(): void {
  protocol.handle('at', async (request) => {
    const url = request.url
    console.log(`[protocol] Handling at:// request: ${url}`)
    return new Response(JSON.stringify({ status: 'resolving', uri: url }), {
      headers: { 'Content-Type': 'application/json' },
    })
  })
}
