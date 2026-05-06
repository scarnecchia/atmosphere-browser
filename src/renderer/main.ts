declare global {
  interface Window {
    atBrowser: {
      resolveUri: (uri: string) => Promise<unknown>
    }
  }
}

async function testResolution(): Promise<void> {
  const app = document.getElementById('app')
  if (!app) {
    console.error('[renderer] Failed to find app element')
    return
  }

  app.innerHTML = '<h1>Atmosphere Browser</h1><p>Resolving at://bsky.app ...</p>'

  try {
    const result = await window.atBrowser.resolveUri('at://bsky.app')
    console.log('[renderer] Resolution result:', result)
    app.innerHTML = `<h1>Atmosphere Browser</h1><pre>${JSON.stringify(result, null, 2)}</pre>`
  } catch (err) {
    console.error('[renderer] Resolution failed:', err)
    app.innerHTML = `<h1>Atmosphere Browser</h1><p>Resolution failed: ${String(err)}</p>`
  }
}

testResolution()
