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
      expect(typeof (page as unknown as { render: () => void }).render).toBe('function')
    })
  })

  describe('initial state', () => {
    it('initializes with empty tiles array', () => {
      const page = new TileManagerPage()
      expect((page as unknown as { tiles: unknown }).tiles).toEqual([])
    })

    it('initializes with empty status string', () => {
      const page = new TileManagerPage()
      expect((page as unknown as { status: string }).status).toBe('')
    })

    it('initializes isLoading as false', () => {
      const page = new TileManagerPage()
      expect((page as unknown as { isLoading: boolean }).isLoading).toBe(false)
    })
  })

  describe('state mutations', () => {
    it('can store tiles list', () => {
      const page = new TileManagerPage()
      const mockTiles = [
        { nsid: 'app.bsky.actor.profile', source: 'built-in' as const, cachedAt: null },
      ]

      ;(page as unknown as { tiles: typeof mockTiles }).tiles = mockTiles
      expect((page as unknown as { tiles: typeof mockTiles }).tiles).toEqual(mockTiles)
    })

    it('can set status message', () => {
      const page = new TileManagerPage()
      ;(page as unknown as { status: string }).status = 'test status'

      expect((page as unknown as { status: string }).status).toBe('test status')
    })

    it('can toggle isLoading state', () => {
      const page = new TileManagerPage()

      ;(page as unknown as { isLoading: boolean }).isLoading = true
      expect((page as unknown as { isLoading: boolean }).isLoading).toBe(true)

      ;(page as unknown as { isLoading: boolean }).isLoading = false
      expect((page as unknown as { isLoading: boolean }).isLoading).toBe(false)
    })
  })
})
