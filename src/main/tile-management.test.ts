import { describe, it, expect } from 'vitest'
import { generateInstalledTilesList } from './tile-management.js'

describe('generateInstalledTilesList', () => {
  it('returns built-in tiles', () => {
    const tiles = generateInstalledTilesList([])

    const builtInNsids = tiles
      .filter((t) => t.source === 'built-in')
      .map((t) => t.nsid)

    expect(builtInNsids).toContain('app.bsky.actor.profile')
    expect(builtInNsids).toContain('app.bsky.feed.post')
    expect(builtInNsids).toContain('app.bsky.graph.follow')
    expect(builtInNsids).toContain('app.bsky.graph.list')
    expect(builtInNsids).toContain('app.bsky.feed.generator')
  })

  it('marks built-in tiles with source=built-in', () => {
    const tiles = generateInstalledTilesList([])

    const profileTile = tiles.find((t) => t.nsid === 'app.bsky.actor.profile')
    expect(profileTile?.source).toBe('built-in')
    expect(profileTile?.cachedAt).toBeNull()
  })

  it('marks community tiles with source=community', () => {
    const communityFiles = ['com.example.widget.car', 'org.test.plugin.car']
    const tiles = generateInstalledTilesList(communityFiles)

    const communityTiles = tiles.filter((t) => t.source === 'community')
    expect(communityTiles).toHaveLength(2)
    expect(communityTiles[0]?.nsid).toBe('com.example.widget')
    expect(communityTiles[1]?.nsid).toBe('org.test.plugin')
  })

  it('strips .car extension from community tile filenames', () => {
    const communityFiles = ['com.example.widget.car']
    const tiles = generateInstalledTilesList(communityFiles)

    const communityTile = tiles.find((t) => t.source === 'community')
    expect(communityTile?.nsid).toBe('com.example.widget')
    expect(communityTile?.nsid).not.toContain('.car')
  })

  it('includes both built-in and community tiles', () => {
    const communityFiles = ['com.example.widget.car', 'org.test.plugin.car']
    const tiles = generateInstalledTilesList(communityFiles)

    const builtIn = tiles.filter((t) => t.source === 'built-in')
    const community = tiles.filter((t) => t.source === 'community')

    expect(builtIn.length).toBeGreaterThan(0)
    expect(community).toHaveLength(2)
  })

  it('returns empty community list when no cached tiles', () => {
    const tiles = generateInstalledTilesList([])

    const community = tiles.filter((t) => t.source === 'community')
    expect(community).toHaveLength(0)
  })

  it('ignores files that do not end in .car', () => {
    const files = ['com.example.widget.car', 'README.txt', 'metadata.json']
    const tiles = generateInstalledTilesList(files)

    const community = tiles.filter((t) => t.source === 'community')
    expect(community).toHaveLength(1)
    expect(community[0]?.nsid).toBe('com.example.widget')
  })

  it('sets cachedAt timestamp for community tiles', () => {
    const communityFiles = ['com.example.widget.car']
    const tiles = generateInstalledTilesList(communityFiles)

    const communityTile = tiles.find((t) => t.source === 'community')
    expect(communityTile?.cachedAt).not.toBeNull()
    expect(typeof communityTile?.cachedAt).toBe('string')
  })
})
