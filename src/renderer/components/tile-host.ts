// pattern: Imperative Shell (Lit component lifecycle and tile loading orchestration)

import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

declare global {
  interface Window {
    atBrowser: {
      resolveUri: (uri: string) => Promise<unknown>
      loadTile?: (nsid: string) => Promise<{ success: boolean; tile?: unknown; error?: string }>
    }
  }
}

@customElement('tile-host')
export class TileHost extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
      }

      .tile-error {
        color: var(--shell-error);
        padding: 12px;
        border: 1px solid var(--shell-error);
        border-radius: 4px;
        margin: 8px 0;
      }

      .tile-error p {
        margin: 0 0 4px 0;
      }

      .tile-error code {
        font-size: 12px;
        display: block;
        margin-top: 4px;
        color: var(--shell-text-muted);
        word-break: break-word;
      }
    `,
  ]

  @property({ attribute: false })
  record: unknown = null

  @property({ type: String })
  collection = ''

  @property({ type: String })
  uri = ''

  @property({ attribute: false })
  identity: { did: string; handle: string; pds: string } | null = null

  @state()
  private tileError: string | null = null

  @state()
  private useFallback = true

  render() {
    if (this.tileError) {
      return html`
        <div class="tile-error">
          <p>Tile failed to load</p>
          <code>${this.tileError}</code>
        </div>
        <schema-fallback
          .record="${this.record}"
          .collection="${this.collection}"
          .uri="${this.uri}"
        ></schema-fallback>
      `
    }

    if (this.useFallback) {
      return html`
        <schema-fallback
          .record="${this.record}"
          .collection="${this.collection}"
          .uri="${this.uri}"
        ></schema-fallback>
      `
    }

    return html`<p>Tile rendering not yet implemented</p>`
  }

  connectedCallback(): void {
    super.connectedCallback()
    // Attempt to load tile for this collection
    if (this.collection) {
      this.attemptTileLoad(this.collection)
    }
  }

  private async attemptTileLoad(_nsid: string): Promise<void> {
    try {
      // For now, always fall back to schema-fallback since tile rendering
      // infrastructure is not yet fully implemented
      this.tileError = null
      this.useFallback = true
    } catch (err) {
      this.tileError = String(err)
      this.useFallback = true
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tile-host': TileHost
  }
}
