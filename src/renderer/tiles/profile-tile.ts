// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

@customElement('profile-tile')
export class ProfileTile extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
      }

      .banner {
        height: 150px;
        background: var(--shell-surface);
        border-radius: 8px 8px 0 0;
        overflow: hidden;
      }

      .banner img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .profile-header {
        padding: 0 16px 16px;
        margin-top: -40px;
      }

      .avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: 3px solid var(--shell-bg);
        background: var(--shell-surface);
        overflow: hidden;
      }

      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        color: var(--shell-text-muted);
      }

      .display-name {
        font-size: 20px;
        font-weight: bold;
        margin-top: 8px;
        color: var(--shell-fg);
      }

      .handle {
        font-size: 14px;
        color: var(--shell-text-muted);
        margin-top: 2px;
      }

      .bio {
        margin-top: 8px;
        line-height: 1.5;
        color: var(--shell-fg);
        white-space: pre-wrap;
      }

      .no-bio {
        color: var(--shell-text-muted);
        font-style: italic;
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

  @state()
  private avatarUrl: string | null = null

  @state()
  private bannerUrl: string | null = null

  async connectedCallback(): Promise<void> {
    super.connectedCallback()
    await this.loadImages()
  }

  async updated(changed: Map<string, unknown>): Promise<void> {
    if (changed.has('record')) {
      await this.loadImages()
    }
  }

  render() {
    const displayName = (this.record?.['displayName'] as string) ?? null
    const description = (this.record?.['description'] as string) ?? null

    return html`
      <div class="banner">
        ${this.bannerUrl ? html`<img src="${this.bannerUrl}" alt="" />` : ''}
      </div>
      <div class="profile-header">
        <div class="avatar">
          ${this.avatarUrl
            ? html`<img src="${this.avatarUrl}" alt="${displayName ?? this.handle}" />`
            : html`<div class="avatar-placeholder">&#9786;</div>`}
        </div>
        <div class="display-name">${displayName ?? this.handle}</div>
        <div class="handle">@${this.handle}</div>
        ${description
          ? html`<div class="bio">${description}</div>`
          : html`<div class="bio no-bio">No bio</div>`}
      </div>
    `
  }

  private async loadImages(): Promise<void> {
    if (!this.record || !this.pds || !this.did) return

    const avatar = this.record['avatar'] as { ref?: { $link?: string } } | undefined
    const banner = this.record['banner'] as { ref?: { $link?: string } } | undefined

    if (avatar?.ref?.$link) {
      const blob = await window.atBrowser.fetchBlob(this.pds, this.did, avatar.ref.$link)
      this.avatarUrl = blob?.data ?? null
    }

    if (banner?.ref?.$link) {
      const blob = await window.atBrowser.fetchBlob(this.pds, this.did, banner.ref.$link)
      this.bannerUrl = blob?.data ?? null
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'profile-tile': ProfileTile
  }
}
