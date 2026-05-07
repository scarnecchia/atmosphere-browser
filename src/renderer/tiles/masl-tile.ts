// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'
import { TileMothership } from '@dasl/tiles/loader'
import { ATTileLoader } from '@dasl/tiles/loader/at'

interface TileManifest {
  readonly name: string
  readonly description?: string
  readonly icons?: ReadonlyArray<{ readonly src: string }>
  readonly screenshots?: ReadonlyArray<{ readonly src: string }>
  readonly sizing?: { readonly width: number; readonly height: number }
  readonly resources: Readonly<Record<string, unknown>>
}

let mothership: TileMothership | null = null

function getMothership(): TileMothership {
  if (!mothership) {
    mothership = new TileMothership()
    mothership.init()
    mothership.addLoader(new ATTileLoader())
  }
  return mothership
}

@customElement('masl-tile')
export class MaslTile extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        max-width: var(--content-narrow);
        margin: 0 auto;
      }

      .tile-card {
        border: 1px solid var(--shell-border-subtle);
        border-radius: 8px;
        overflow: hidden;
        background: var(--shell-surface);
      }

      .tile-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: var(--shell-text-muted);
        font-size: 0.875rem;
        background: var(--shell-surface-sunken);
      }

      .tile-error {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100px;
        color: var(--shell-error);
        font-size: 0.875rem;
        padding: 16px;
        background: var(--shell-surface-sunken);
      }

      .tile-body {
        padding: 16px;
      }

      .tile-header {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .tile-icon {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        background: var(--shell-surface-sunken);
        overflow: hidden;
        flex-shrink: 0;
      }

      .tile-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .tile-icon-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: var(--shell-text-tertiary);
      }

      .tile-info {
        min-width: 0;
      }

      .tile-name {
        font-family: var(--font-display);
        font-size: 1.25rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--shell-fg);
      }

      .tile-description {
        margin-top: 8px;
        font-size: 0.9375rem;
        line-height: 1.55;
        color: var(--shell-text-muted);
        max-width: 65ch;
      }

      .tile-meta {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--shell-border-subtle);
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        font-size: 0.8125rem;
        color: var(--shell-text-tertiary);
      }

      .tile-meta-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .tile-creator {
        color: var(--shell-accent);
        cursor: pointer;
      }

      .tile-creator:hover {
        color: var(--shell-accent-hover);
        text-decoration: underline;
      }

      ::slotted(iframe) {
        display: block;
        width: 100%;
        border: none;
      }
    `,
  ]

  @property({ attribute: false })
  record: Record<string, unknown> | null = null

  @property({ type: String })
  did = ''

  @property({ type: String })
  handle = ''

  @property({ type: String })
  pds = ''

  @property({ type: String })
  uri = ''

  @state()
  private tileState: 'loading' | 'loaded' | 'error' = 'loading'

  @state()
  private errorMessage = ''

  @state()
  private iconUrl: string | null = null

  private currentUri = ''

  async updated(changed: Map<string, unknown>): Promise<void> {
    if (changed.has('record') || changed.has('uri')) {
      await this.loadTile()
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.clearLightDomIframe()
  }

  render() {
    if (!this.record) return nothing

    const tile = this.record['tile'] as TileManifest | undefined
    if (!tile) return nothing

    const name = tile.name ?? 'Unnamed Tile'
    const description = tile.description ?? null
    const sizing = tile.sizing
    const createdAt = this.record['createdAt'] as string | undefined

    return html`
      <div class="tile-card">
        ${this.tileState === 'loading'
          ? html`<div class="tile-loading">Loading tile…</div>`
          : nothing}
        ${this.tileState === 'error'
          ? html`<div class="tile-error">${this.errorMessage}</div>`
          : nothing}
        <slot></slot>

        <div class="tile-body">
          <div class="tile-header">
            <div class="tile-icon">
              ${this.iconUrl
                ? html`<img src="${this.iconUrl}" alt="${name}" />`
                : html`<div class="tile-icon-placeholder">&#9642;</div>`}
            </div>
            <div class="tile-info">
              <div class="tile-name">${name}</div>
            </div>
          </div>

          ${description ? html`<div class="tile-description">${description}</div>` : nothing}

          <div class="tile-meta">
            ${this.handle || this.did
              ? html`<div class="tile-meta-item">
                  by
                  <span class="tile-creator" @click="${this.navigateToCreator}">
                    ${this.handle ? `@${this.handle}` : this.did}
                  </span>
                </div>`
              : nothing}
            ${sizing
              ? html`<div class="tile-meta-item">${sizing.width} × ${sizing.height}</div>`
              : nothing}
            ${createdAt
              ? html`<div class="tile-meta-item">
                  ${new Date(createdAt).toLocaleDateString('en-CA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>`
              : nothing}
          </div>
        </div>
      </div>
    `
  }

  private clearLightDomIframe(): void {
    const existing = this.querySelector('iframe')
    if (existing) existing.remove()
  }

  private async loadTile(): Promise<void> {
    if (!this.record || !this.uri) return
    if (this.uri === this.currentUri) return

    this.currentUri = this.uri
    this.tileState = 'loading'
    this.errorMessage = ''
    this.clearLightDomIframe()

    await this.loadIcon()

    try {
      const ms = getMothership()
      const tile = await ms.loadTile(this.uri)

      if (!tile) {
        this.tileState = 'error'
        this.errorMessage = 'Failed to load tile'
        return
      }

      const manifest = this.record['tile'] as TileManifest | undefined
      const height = manifest?.sizing?.height ?? 400
      const contentEl = tile.renderContent(height) as HTMLIFrameElement

      this.tileState = 'loaded'
      await this.updateComplete

      // Append iframe to light DOM so it slots into the shadow DOM layout.
      // Cross-origin iframes in shadow DOM have contentWindow === null
      // in Chromium, which breaks postMessage communication with the
      // tile shuttle. Light DOM iframes work correctly.
      this.appendChild(contentEl)
    } catch (err) {
      this.tileState = 'error'
      this.errorMessage = err instanceof Error ? err.message : 'Failed to load tile'
    }
  }

  private async loadIcon(): Promise<void> {
    if (!this.record || !this.pds || !this.did) return

    const tile = this.record['tile'] as TileManifest | undefined
    if (!tile?.icons?.[0]?.src) return

    const resources = tile.resources ?? {}
    const iconResource = resources[tile.icons[0].src] as
      | { src: { ref: { $link: string } } }
      | undefined
    const cid = iconResource?.src?.ref?.['$link']
    if (!cid) return

    const blob = await window.atBrowser.fetchBlob(this.pds, this.did, cid)
    this.iconUrl = blob?.data ?? null
  }

  private navigateToCreator(): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri: `at://${this.handle || this.did}` },
        bubbles: true,
        composed: true,
      }),
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'masl-tile': MaslTile
  }
}
