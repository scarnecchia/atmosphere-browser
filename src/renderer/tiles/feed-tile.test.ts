import { describe, it, expect } from 'vitest'
import { FeedTile } from './feed-tile.js'

describe('FeedTile', () => {
  describe('properties', () => {
    it('accepts and stores record property', () => {
      const tile = new FeedTile()
      const record = { displayName: 'Test Feed', description: 'A test feed' }

      tile.record = record

      expect(tile.record).toBe(record)
    })

    it('accepts and stores creatorDid property', () => {
      const tile = new FeedTile()
      const did = 'did:plc:creator123'

      tile.creatorDid = did

      expect(tile.creatorDid).toBe(did)
    })

    it('initializes record to null by default', () => {
      const tile = new FeedTile()

      expect(tile.record).toBeNull()
    })

    it('initializes creatorDid to empty string by default', () => {
      const tile = new FeedTile()

      expect(tile.creatorDid).toBe('')
    })
  })

  describe('navigation', () => {
    it('dispatches navigate event when navigateToCreator is called', () => {
      const tile = new FeedTile()
      tile.record = { displayName: 'Test Feed' }
      tile.creatorDid = 'did:plc:creator123'

      let navigatedUri = ''
      tile.addEventListener('navigate', (e: Event) => {
        const customEvent = e as CustomEvent
        navigatedUri = customEvent.detail.uri
      })

      const navigateMethod = (tile as unknown as { navigateToCreator: () => void }).navigateToCreator
      navigateMethod.call(tile)

      expect(navigatedUri).toBe('at://did:plc:creator123')
    })

    it('navigate event bubbles', () => {
      const tile = new FeedTile()
      tile.record = { displayName: 'Test Feed' }
      tile.creatorDid = 'did:plc:creator123'

      let eventBubbled = false

      tile.addEventListener('navigate', (e: Event) => {
        eventBubbled = (e as unknown as { bubbles: boolean }).bubbles
      })

      const navigateMethod = (tile as unknown as { navigateToCreator: () => void }).navigateToCreator
      navigateMethod.call(tile)

      expect(eventBubbled).toBe(true)
    })

    it('navigate event is composed (crosses shadow DOM)', () => {
      const tile = new FeedTile()
      tile.record = { displayName: 'Test Feed' }
      tile.creatorDid = 'did:plc:creator123'

      let eventComposed = false

      tile.addEventListener('navigate', (e: Event) => {
        eventComposed = (e as unknown as { composed: boolean }).composed
      })

      const navigateMethod = (tile as unknown as { navigateToCreator: () => void }).navigateToCreator
      navigateMethod.call(tile)

      expect(eventComposed).toBe(true)
    })
  })
})
