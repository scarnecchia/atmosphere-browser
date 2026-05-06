// pattern: Imperative Shell (UI component managing auth state)

import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('account-widget')
export class AccountWidget extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 8px;
      }

      .handle {
        font-size: 13px;
        color: var(--shell-fg);
        font-weight: 500;
      }

      button {
        padding: 4px 10px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: var(--shell-surface);
        color: var(--shell-fg);
        font-size: 12px;
        cursor: pointer;
      }

      button:hover {
        background: var(--shell-border);
      }

      .login-form {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .login-form input {
        padding: 4px 8px;
        border: 1px solid var(--shell-border);
        border-radius: 4px;
        background: var(--shell-input-bg);
        color: var(--shell-fg);
        font-size: 12px;
        width: 150px;
      }

      .status {
        font-size: 11px;
        color: var(--shell-text-muted);
      }
    `,
  ]

  @state()
  private isAuthenticated = false

  @state()
  private handle = ''

  @state()
  private showLoginForm = false

  @state()
  private loginHandle = ''

  @state()
  private isLoggingIn = false

  async connectedCallback(): Promise<void> {
    super.connectedCallback()
    await this.checkAuthState()
  }

  render() {
    if (this.isAuthenticated) {
      return html`
        <span class="handle">@${this.handle}</span>
        <button @click="${this.handleLogout}">Logout</button>
      `
    }

    if (this.isLoggingIn) {
      return html`
        <span class="status">Authenticating...</span>
        <button @click="${this.cancelLogin}">Cancel</button>
      `
    }

    if (this.showLoginForm) {
      return html`
        <div class="login-form">
          <input
            type="text"
            placeholder="handle.bsky.social"
            .value="${this.loginHandle}"
            @input="${(e: Event) => {
              this.loginHandle = (e.target as HTMLInputElement).value
            }}"
            @keydown="${(e: KeyboardEvent) => {
              if (e.key === 'Enter') this.handleLogin()
            }}"
          />
          <button @click="${this.handleLogin}">Login</button>
          <button @click="${() => {
            this.showLoginForm = false
          }}">Cancel</button>
        </div>
      `
    }

    return html`<button @click="${() => {
      this.showLoginForm = true
    }}">Login</button>`
  }

  private async checkAuthState(): Promise<void> {
    const state = (await window.atBrowser.authState()) as {
      did: string
      handle: string
      isAuthenticated: boolean
    } | null
    if (state?.isAuthenticated) {
      this.isAuthenticated = true
      this.handle = state.handle
    }
  }

  private async handleLogin(): Promise<void> {
    if (!this.loginHandle.trim()) return

    this.isLoggingIn = true
    this.showLoginForm = false

    const result = (await window.atBrowser.authLogin(this.loginHandle.trim())) as {
      did: string
      handle: string
      isAuthenticated: boolean
    } | null

    this.isLoggingIn = false

    if (result?.isAuthenticated) {
      this.isAuthenticated = true
      this.handle = result.handle
      this.dispatchEvent(new CustomEvent('auth-changed', { bubbles: true, composed: true }))
    }
  }

  private async handleLogout(): Promise<void> {
    await window.atBrowser.authLogout()
    this.isAuthenticated = false
    this.handle = ''
    this.dispatchEvent(new CustomEvent('auth-changed', { bubbles: true, composed: true }))
  }

  private async cancelLogin(): Promise<void> {
    await window.atBrowser.authCancel()
    this.isLoggingIn = false
  }
}
