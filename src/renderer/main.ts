// pattern: Imperative Shell

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

    const header = document.createElement('h1')
    header.textContent = 'Atmosphere Browser'

    const pre = document.createElement('pre')
    pre.textContent = JSON.stringify(result, null, 2)

    app.innerHTML = ''
    app.appendChild(header)
    app.appendChild(pre)
  } catch (err) {
    console.error('[renderer] Resolution failed:', err)

    const header = document.createElement('h1')
    header.textContent = 'Atmosphere Browser'

    const para = document.createElement('p')
    para.textContent = `Resolution failed: ${String(err)}`

    app.innerHTML = ''
    app.appendChild(header)
    app.appendChild(para)
  }
}

testResolution()
