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
        background: var(--shell-surface-sunken);
        border-radius: 8px 8px 0 0;
        overflow: hidden;
      }

      .banner img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .profile-header {
        padding: 0 0 16px;
        margin-top: -40px;
      }

      .avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: 3px solid var(--shell-bg);
        background: var(--shell-surface-sunken);
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
        color: var(--shell-text-tertiary);
      }

      .display-name {
        font-family: var(--font-display);
        font-size: 1.25rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        margin-top: 8px;
        color: var(--shell-fg);
      }

      .handle {
        font-size: 0.9375rem;
        color: var(--shell-text-muted);
        margin-top: 2px;
      }

      .bio {
        margin-top: 8px;
        font-size: 0.9375rem;
        line-height: 1.55;
        color: var(--shell-fg);
        white-space: pre-wrap;
        max-width: 65ch;
      }

      .no-bio {
        color: var(--shell-text-tertiary);
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

  async updated(changed: Map<string, unknown>): Promise<void> {
    if (changed.has('record') || changed.has('pds') || changed.has('did')) {
      await this.loadImages()
    }
  }

  render() {
    const displayName = (this.record?.['displayName'] as string) ?? null
    const description = (this.record?.['description'] as string) ?? null

    return html`
      <div class="banner">
        ${this.bannerUrl ? html`<img src="${this.bannerUrl}" alt="Banner for ${displayName ?? this.handle}" />` : ''}
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

    const avatar = this.record['avatar'] as Record<string, unknown> | undefined
    const banner = this.record['banner'] as Record<string, unknown> | undefined

    const avatarCid = this.extractBlobCid(avatar)
    const bannerCid = this.extractBlobCid(banner)

    if (avatarCid) {
      const blob = await window.atBrowser.fetchBlob(this.pds, this.did, avatarCid)
      this.avatarUrl = blob?.data ?? null
    }

    if (bannerCid) {
      const blob = await window.atBrowser.fetchBlob(this.pds, this.did, bannerCid)
      this.bannerUrl = blob?.data ?? null
    }
  }

  private extractBlobCid(blob: Record<string, unknown> | undefined): string | null {
    if (!blob) return null
    const ref = blob['ref'] as Record<string, unknown> | undefined
    if (ref?.['$link']) return ref['$link'] as string
    if (blob['cid'] as string) return blob['cid'] as string
    return null
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'profile-tile': ProfileTile
  }
}
