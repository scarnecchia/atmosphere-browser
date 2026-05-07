import { describe, it, expect } from 'vitest'
import { TileManagerPage } from './tile-manager-page.js'

describe('TileManagerPage', () => {
  describe('component creation', () => {
    it('can be instantiated', () => {
      const page = new TileManagerPage()
      expect(page).toBeDefined()
    })

    it('has correct class name', () => {
      const page = new TileManagerPage()
      expect(page.constructor.name).toBe('TileManagerPage')
    })

    it('has render method', () => {
      const page = new TileManagerPage()
      expect(typeof (page as any).render).toBe('function')
    })
  })

  describe('initial state', () => {
    it('initializes with empty tiles array', () => {
      const page = new TileManagerPage()
      expect((page as any).tiles).toEqual([])
    })

    it('initializes with empty status string', () => {
      const page = new TileManagerPage()
      expect((page as any).status).toBe('')
    })

    it('initializes isLoading as false', () => {
      const page = new TileManagerPage()
      expect((page as any).isLoading).toBe(false)
    })
  })

  describe('state mutations', () => {
    it('can store tiles list', () => {
      const page = new TileManagerPage()
      const mockTiles = [
        { nsid: 'app.bsky.actor.profile', source: 'built-in' as const, cachedAt: null },
      ]

      ;(page as any).tiles = mockTiles
      expect((page as any).tiles).toEqual(mockTiles)
    })

    it('can set status message', () => {
      const page = new TileManagerPage()
      ;(page as any).status = 'test status'

      expect((page as any).status).toBe('test status')
    })

    it('can toggle isLoading state', () => {
      const page = new TileManagerPage()

      ;(page as any).isLoading = true
      expect((page as any).isLoading).toBe(true)

      ;(page as any).isLoading = false
      expect((page as any).isLoading).toBe(false)
    })
  })
})
