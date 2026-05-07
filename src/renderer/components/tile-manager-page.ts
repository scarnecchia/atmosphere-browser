// pattern: Imperative Shell (Lit component lifecycle and IPC communication)

import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

type InstalledTile = {
  nsid: string
  source: 'built-in' | 'community'
  cachedAt: string | null
}

@customElement('tile-manager-page')
export class TileManagerPage extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 24px;
        max-width: 600px;
      }

      h2 {
        font-size: 18px;
        margin-bottom: 16px;
      }

      .tile-list {
        list-style: none;
        padding: 0;
        margin: 0 0 16px 0;
      }

      .tile-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: var(--shell-surface);
        border-radius: 4px;
        margin-bottom: 4px;
      }

      .tile-nsid {
        font-family: monospace;
        font-size: 13px;
        flex: 1;
      }

      .tile-source {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 3px;
        background: var(--shell-border);
        color: var(--shell-text-muted);
        margin-left: 8px;
      }

      .tile-source.built-in {
        background: var(--shell-accent);
        color: #000;
      }

      button {
        padding: 6px 12px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: var(--shell-surface);
        color: var(--shell-fg);
        cursor: pointer;
        font-size: 13px;
        margin-top: 16px;
      }

      button:hover {
        background: var(--shell-border);
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .status {
        font-size: 12px;
        color: var(--shell-text-muted);
        margin-top: 8px;
      }
    `,
  ]

  @state()
  private tiles: Array<InstalledTile> = []

  @state()
  private status = ''

  @state()
  private isLoading = false

  async connectedCallback(): Promise<void> {
    super.connectedCallback()
    await this.loadTiles()
  }

  render() {
    return html`
      <h2>Tile Manager</h2>
      <ul class="tile-list">
        ${this.tiles.map(
          (tile) => html`
            <li class="tile-item">
              <span class="tile-nsid">${tile.nsid}</span>
              <span class="tile-source ${tile.source}">${tile.source}</span>
            </li>
          `,
        )}
      </ul>
      <button @click="${this.clearCache}" ?disabled="${this.isLoading}">
        ${this.isLoading ? 'Clearing...' : 'Clear Tile Cache'}
      </button>
      ${this.status ? html`<p class="status">${this.status}</p>` : ''}
    `
  }

  private async loadTiles(): Promise<void> {
    try {
      this.tiles = (await window.atBrowser.tilesListInstalled()) as Array<InstalledTile>
    } catch (error) {
      this.status = `failed to load tiles: ${String(error)}`
    }
  }

  private async clearCache(): Promise<void> {
    this.isLoading = true
    try {
      await window.atBrowser.tilesClearCache()
      await this.loadTiles()
      this.status = 'Cache cleared'
    } catch (error) {
      this.status = `failed to clear cache: ${String(error)}`
    } finally {
      this.isLoading = false
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tile-manager-page': TileManagerPage
  }
}
