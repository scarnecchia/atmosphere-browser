// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { shellColors } from '../styles/shared.js'

@customElement('json-viewer')
export class JsonViewer extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        padding: 16px;
        font-family: monospace;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
        overflow: auto;
      }

      pre {
        margin: 0;
        color: var(--shell-fg);
      }

      .key {
        color: var(--shell-accent);
        font-weight: bold;
      }

      .string {
        color: #a6e3a1;
      }

      .number {
        color: #fab387;
      }

      .boolean {
        color: #f9e2af;
      }

      .null {
        color: var(--shell-text-muted);
      }

      .bracket {
        color: var(--shell-text-muted);
      }
    `,
  ]

  @property({ attribute: false })
  data: unknown = null

  render() {
    if (this.data === null || this.data === undefined) {
      return html`<pre><span class="null">null</span></pre>`
    }

    try {
      const formatted = JSON.stringify(this.data, null, 2)
      // Escape HTML entities BEFORE applying syntax highlighting
      const escaped = this.escapeHtml(formatted)
      const highlighted = this.syntaxHighlight(escaped)
      return html`<pre>${unsafeHTML(highlighted)}</pre>`
    } catch {
      return html`<pre class="null">[Unable to display]</pre>`
    }
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  private syntaxHighlight(json: string): string {
    return json
      .replace(/&quot;([^&]+)&quot;:/g, '<span class="key">&quot;$1&quot;</span>:')
      .replace(/: &quot;([^&]*?)&quot;/g, ': <span class="string">&quot;$1&quot;</span>')
      .replace(/: (\d+)/g, ': <span class="number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="boolean">$1</span>')
      .replace(/: null/g, ': <span class="null">null</span>')
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'json-viewer': JsonViewer
  }
}
