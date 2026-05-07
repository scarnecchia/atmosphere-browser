// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css, unsafeHTML } from 'lit'
import { customElement, property } from 'lit/decorators.js'
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
      const highlighted = this.syntaxHighlight(formatted)
      return html`<pre>${unsafeHTML(highlighted)}</pre>`
    } catch {
      return html`<pre class="null">[Unable to display]</pre>`
    }
  }

  private syntaxHighlight(json: string): string {
    return json
      .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
      .replace(/: "([^"]*?)"/g, ': <span class="string">"$1"</span>')
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
