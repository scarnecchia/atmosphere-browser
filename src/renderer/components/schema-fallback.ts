// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'
import { getTypeName, isMaxDepthExceeded } from '../utils/type-display.js'
import { isAtUri } from '../utils/at-uri.js'

@customElement('schema-fallback')
export class SchemaFallback extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 16px;
        font-family: monospace;
        font-size: 13px;
        line-height: 1.6;
      }

      .field {
        margin: 4px 0;
        padding: 4px 0;
      }

      .field-name {
        color: var(--shell-accent);
        font-weight: bold;
      }

      .field-value {
        color: var(--shell-fg);
        margin-left: 8px;
      }

      .field-type {
        color: var(--shell-text-muted);
        font-size: 11px;
        margin-left: 4px;
      }

      .nested {
        margin-left: 16px;
        padding-left: 12px;
        border-left: 1px solid var(--shell-border);
      }

      .collection-header {
        color: var(--shell-text-muted);
        font-size: 12px;
        margin-bottom: 8px;
      }

      .uri-link {
        color: var(--shell-accent);
        cursor: pointer;
        text-decoration: underline;
      }

      .uri-link:hover {
        opacity: 0.8;
      }

      .array-item {
        margin: 4px 0;
        padding: 4px 8px;
        background: var(--shell-surface);
        border-radius: 4px;
      }

      .error-boundary {
        color: var(--shell-error);
        padding: 8px;
        border: 1px solid var(--shell-error);
        border-radius: 4px;
      }

      .collapsible-header {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        user-select: none;
      }

      .collapsible-header:hover {
        opacity: 0.8;
      }

      .toggle-icon {
        display: inline-block;
        width: 12px;
        height: 12px;
        line-height: 12px;
        font-size: 10px;
      }

      .collapsible-content {
        margin-top: 4px;
      }
    `,
  ]

  @property({ attribute: false })
  record: unknown = null

  @property({ type: String })
  collection = ''

  @property({ type: String })
  uri = ''

  @state()
  private collapsed: Map<string, boolean> = new Map()

  render() {
    if (!this.record) {
      return html`<p class="error-boundary">No record data</p>`
    }

    try {
      return html`
        ${this.collection ? html`<p class="collection-header">${this.collection}</p>` : ''}
        ${this.uri ? html`<p class="collection-header">${this.uri}</p>` : ''}
        ${this.renderValue(this.record, 0, 'root')}
      `
    } catch {
      return html`<p class="error-boundary">Error rendering record</p>`
    }
  }

  private renderValue(value: unknown, depth: number, path: string): unknown {
    if (isMaxDepthExceeded(depth)) return html`<span class="field-value">[max depth]</span>`

    if (value === null || value === undefined) {
      return html`<span class="field-value">null</span>`
    }

    if (typeof value === 'string') {
      if (isAtUri(value)) {
        return html`<span class="uri-link" @click="${() => this.handleLinkClick(value)}">${value}</span>`
      }
      return html`<span class="field-value">"${value}"</span>`
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return html`<span class="field-value">${String(value)}</span>`
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return html`<span class="field-value">[]</span>`
      return html`
        <div class="nested">
          ${value.map(
            (item, i) => html`
              <div class="array-item">
                <span class="field-type">[${i}]</span>
                ${this.renderValue(item, depth + 1, `${path}[${i}]`)}
              </div>
            `,
          )}
        </div>
      `
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
      return html`
        <div class="${depth > 0 ? 'nested' : ''}">
          ${entries.map(
            ([key, val]) => html`
              <div class="field">
                ${typeof val === 'object' && val !== null && depth > 0
                  ? this.renderCollapsibleField(key, val, depth, `${path}.${key}`)
                  : this.renderSimpleField(key, val, depth, `${path}.${key}`)}
              </div>
            `,
          )}
        </div>
      `
    }

    return html`<span class="field-value">${String(value)}</span>`
  }

  private renderCollapsibleField(key: string, val: unknown, depth: number, path: string): unknown {
    const isCollapsedState = this.collapsed.get(path) ?? true
    const icon = isCollapsedState ? '▶' : '▼'

    return html`
      <div class="collapsible-header" @click="${() => this.toggleCollapsed(path)}">
        <span class="toggle-icon">${icon}</span>
        <span class="field-name">${key}</span>
        <span class="field-type">(${getTypeName(val)})</span>
      </div>
      ${!isCollapsedState ? html`<div class="collapsible-content">${this.renderValue(val, depth + 1, path)}</div>` : ''}
    `
  }

  private renderSimpleField(key: string, val: unknown, depth: number, path: string): unknown {
    return html`
      <span class="field-name">${key}</span>
      <span class="field-type">(${getTypeName(val)})</span>
      ${typeof val === 'object' && val !== null
        ? this.renderValue(val, depth + 1, path)
        : html`<span class="field-value">${this.renderValue(val, depth + 1, path)}</span>`}
    `
  }

  private toggleCollapsed(path: string): void {
    const current = this.collapsed.get(path) ?? true
    this.collapsed.set(path, !current)
    this.requestUpdate()
  }

  private handleLinkClick(uri: string): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri },
        bubbles: true,
        composed: true,
      }),
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'schema-fallback': SchemaFallback
  }
}
