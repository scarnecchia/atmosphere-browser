// pattern: Imperative Shell (Lit component lifecycle and rendering)

import { LitElement, html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { shellColors } from '../styles/shared.js'

type CollectionGroup = {
  readonly prefix: string
  readonly items: ReadonlyArray<string>
}

function groupCollections(
  collections: ReadonlyArray<Record<string, unknown>>,
): ReadonlyArray<CollectionGroup> {
  const groups = new Map<string, string[]>()

  for (const col of collections) {
    const nsid = (col['nsid'] as string) ?? ''
    if (!nsid) continue

    const parts = nsid.split('.')
    const prefix = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : parts[0]

    const existing = groups.get(prefix)
    if (existing) {
      existing.push(nsid)
    } else {
      groups.set(prefix, [nsid])
    }
  }

  return Array.from(groups.entries())
    .map(([prefix, items]) => ({ prefix, items: items.sort() }))
    .sort((a, b) => b.items.length - a.items.length)
}

@customElement('repo-page')
export class RepoPage extends LitElement {
  static styles = [
    shellColors,
    css`
      :host {
        display: block;
        overflow-y: auto;
        max-width: var(--content-medium);
        margin: 0 auto;
      }

      .profile-header profile-tile {
        max-width: none;
      }

      .identity-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 16px;
        padding: 12px 0;
        border-bottom: 1px solid var(--shell-border-subtle);
        font-size: 0.75rem;
        line-height: 1.4;
      }

      .identity-item {
        display: flex;
        gap: 4px;
        align-items: baseline;
      }

      .identity-label {
        color: var(--shell-text-tertiary);
        font-family: var(--font-body);
        font-weight: 500;
      }

      .identity-value {
        color: var(--shell-text-muted);
        font-family: var(--font-mono);
        cursor: pointer;
        transition: color var(--duration-fast) var(--ease-snappy);
      }

      .identity-value:hover {
        color: var(--shell-accent);
      }

      .no-profile-header {
        padding: 32px 0 0;
      }

      .no-profile-name {
        font-family: var(--font-display);
        font-size: 1.25rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--shell-fg);
      }

      .no-profile-did {
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        color: var(--shell-text-muted);
        margin-top: 4px;
      }

      .collections-section {
        padding: 24px 0 16px;
      }

      .collections-title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 1.25rem;
        letter-spacing: -0.01em;
        margin-bottom: 16px;
        color: var(--shell-fg);
      }

      .collection-group {
        margin-bottom: 4px;
      }

      .group-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        cursor: pointer;
        user-select: none;
        transition: color var(--duration-fast) var(--ease-snappy);
      }

      .group-header:hover {
        color: var(--shell-accent);
      }

      .group-toggle {
        font-size: 0.625rem;
        color: var(--shell-text-tertiary);
        width: 12px;
        text-align: center;
        transition: transform var(--duration-fast) var(--ease-snappy);
      }

      .group-toggle.open {
        transform: rotate(90deg);
      }

      .group-name {
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--shell-fg);
      }

      .group-count {
        font-family: var(--font-body);
        font-size: 0.75rem;
        font-variant-numeric: tabular-nums;
        color: var(--shell-text-tertiary);
      }

      .group-items {
        padding: 0 0 4px 20px;
      }

      .collection-link {
        display: block;
        padding: 4px 0;
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        color: var(--shell-accent);
        cursor: pointer;
        text-decoration: none;
        transition: color var(--duration-fast) var(--ease-snappy);
      }

      .collection-link:hover {
        color: var(--shell-accent-hover);
      }

      .error-section {
        padding: 24px 0;
        color: var(--shell-error);
      }
    `,
  ]

  @property({ attribute: false })
  responseData: Record<string, unknown> | null = null

  @state()
  private identityInfo: {
    createdAt: string | null
    pdsEndpoint: string | null
    alsoKnownAs: string[]
  } | null = null

  @state()
  private expandedGroups: Set<string> = new Set()

  updated(changed: Map<string, unknown>): void {
    if (changed.has('responseData') && this.responseData) {
      this.identityInfo = null
      this.expandedGroups = new Set()
      this.loadIdentityInfo()
    }
  }

  private async loadIdentityInfo(): Promise<void> {
    const identity = this.responseData?.['identity'] as Record<string, unknown> | undefined
    const did = (identity?.['did'] as string) ?? ''
    if (!did) return

    try {
      this.identityInfo = await window.atBrowser.getIdentityInfo(did)
    } catch {
      // Best effort
    }
  }

  render() {
    if (!this.responseData) {
      return html`<div class="error-section">No data</div>`
    }

    const responseType = (this.responseData['type'] as string) ?? ''

    if (responseType !== 'repo') {
      return html`<div class="error-section">Expected repo response type</div>`
    }

    const identity = this.responseData['identity'] as Record<string, unknown> | undefined
    const profile = this.responseData['profile'] as Record<string, unknown> | undefined | null
    const collections = (this.responseData['collections'] as Array<Record<string, unknown>>) ?? []

    if (!identity) {
      return html`<div class="error-section">Missing identity data</div>`
    }

    const did = (identity['did'] as string) ?? ''
    const handle = (identity['handle'] as string) ?? ''
    const pds = (identity['pds'] as string) ?? ''

    const groups = groupCollections(collections)

    return html`
      ${profile
        ? html`
            <div class="profile-header">
              <profile-tile
                .record="${profile}"
                .did="${did}"
                .handle="${handle}"
                .pds="${pds}"
              ></profile-tile>
            </div>
          `
        : html`
            <div class="no-profile-header">
              <div class="no-profile-name">${handle || did}</div>
              ${handle ? html`<div class="no-profile-did">${did}</div>` : nothing}
            </div>
          `}

      ${this.renderIdentityBar(did, pds)}

      <div class="collections-section">
        <div class="collections-title">Collections (${collections.length})</div>
        ${groups.map((group) => this.renderGroup(group, handle || did))}
      </div>
    `
  }

  private renderIdentityBar(did: string, pds: string): unknown {
    const info = this.identityInfo
    const pdsDisplay = info?.pdsEndpoint ?? pds
    const createdAt = info?.createdAt ? new Date(info.createdAt) : null
    const accountAge = createdAt ? this.formatAge(createdAt) : null

    return html`
      <div class="identity-bar">
        <div class="identity-item">
          <span class="identity-label">DID</span>
          <span class="identity-value" title="Click to copy" @click="${() => this.copyToClipboard(did)}">${did}</span>
        </div>
        ${pdsDisplay
          ? html`
              <div class="identity-item">
                <span class="identity-label">PDS</span>
                <span class="identity-value" title="Click to copy" @click="${() => this.copyToClipboard(pdsDisplay)}">${pdsDisplay}</span>
              </div>
            `
          : nothing}
        ${createdAt
          ? html`
              <div class="identity-item">
                <span class="identity-label">Created</span>
                <span class="identity-value">${createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}${accountAge ? ` (${accountAge})` : ''}</span>
              </div>
            `
          : nothing}
      </div>
    `
  }

  private renderGroup(group: CollectionGroup, handle: string): unknown {
    const isExpanded = this.expandedGroups.has(group.prefix)

    return html`
      <div class="collection-group">
        <div class="group-header" @click="${() => this.toggleGroup(group.prefix)}">
          <span class="group-toggle ${isExpanded ? 'open' : ''}">&#9654;</span>
          <span class="group-name">${group.prefix}</span>
          <span class="group-count">${group.items.length}</span>
        </div>
        ${isExpanded
          ? html`
              <div class="group-items">
                ${group.items.map(
                  (nsid) => html`
                    <span
                      class="collection-link"
                      @click="${() => this.navigateToCollection(handle, nsid)}"
                    >${nsid.slice(group.prefix.length + 1)}</span>
                  `,
                )}
              </div>
            `
          : nothing}
      </div>
    `
  }

  private toggleGroup(prefix: string): void {
    const next = new Set(this.expandedGroups)
    if (next.has(prefix)) {
      next.delete(prefix)
    } else {
      next.add(prefix)
    }
    this.expandedGroups = next
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API may not be available
    }
  }

  private formatAge(created: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    if (remainingMonths === 0) return `${years}y ago`
    return `${years}y ${remainingMonths}m ago`
  }

  private navigateToCollection(handle: string, nsid: string): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { uri: `at://${handle}/${nsid}` },
        bubbles: true,
        composed: true,
      }),
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'repo-page': RepoPage
  }
}
