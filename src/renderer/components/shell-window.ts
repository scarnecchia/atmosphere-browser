// pattern: Imperative Shell

import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('shell-window')
export class ShellWindow extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: var(--shell-bg);
        color: var(--shell-fg);
        font-family: system-ui, -apple-system, sans-serif;
      }

      .content {
        flex: 1;
        overflow: auto;
        padding: 16px;
      }
    `,
  ]

  @state()
  private placeholder = 'Shell loading...'

  render() {
    return html`
      <div class="content">
        <p>${this.placeholder}</p>
      </div>
    `
  }
}
