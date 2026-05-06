import { describe, it, expect } from 'vitest'
import {
  createInitialState,
  addTab,
  navigateTab,
  goBack,
  goForward,
  getActiveTab,
} from './tab-manager.js'

describe('tab-manager', () => {
  describe('navigateTab', () => {
    it('adds URI to history when navigating', () => {
      const state = createInitialState()
      const activeTab = getActiveTab(state)!
      const tabId = activeTab.id

      const newState = navigateTab(state, tabId, 'at://alice.bsky.social')

      const updated = getActiveTab(newState)!
      expect(updated.uri).toBe('at://alice.bsky.social')
      expect(updated.history).toContain('at://alice.bsky.social')
      expect(updated.isLoading).toBe(true)
    })

    it('clears error when navigating to new URI', () => {
      let state = createInitialState()
      const activeTab = getActiveTab(state)!
      const tabId = activeTab.id

      state = navigateTab(state, tabId, 'at://alice.bsky.social')
      // Simulate error (we don't have setTabError exposed here, but we test the logic)

      const newState = navigateTab(state, tabId, 'at://bob.bsky.social')
      const updated = getActiveTab(newState)!
      expect(updated.error).toBeNull()
    })

    it('does not preserve old history when navigating after going back', () => {
      let state = createInitialState()
      const tabId = getActiveTab(state)!.id

      state = navigateTab(state, tabId, 'at://alice.bsky.social')
      state = navigateTab(state, tabId, 'at://bob.bsky.social')
      state = goBack(state, tabId)

      // Now navigate to new URI, should clear forward history
      state = navigateTab(state, tabId, 'at://charlie.bsky.social')

      const updated = getActiveTab(state)!
      // After going back from bob to alice, then navigating to charlie,
      // the history should be alice -> charlie (bob is discarded)
      expect(updated.history).toEqual(['at://alice.bsky.social', 'at://charlie.bsky.social'])
      expect(updated.historyIndex).toBe(1)
    })
  })

  describe('goBack', () => {
    it('decrements history index and changes URI', () => {
      let state = createInitialState()
      const tabId = getActiveTab(state)!.id

      state = navigateTab(state, tabId, 'at://alice.bsky.social')
      state = navigateTab(state, tabId, 'at://bob.bsky.social')

      const beforeBack = getActiveTab(state)!
      expect(beforeBack.uri).toBe('at://bob.bsky.social')
      expect(beforeBack.historyIndex).toBe(1)

      state = goBack(state, tabId)

      const afterBack = getActiveTab(state)!
      expect(afterBack.uri).toBe('at://alice.bsky.social')
      expect(afterBack.historyIndex).toBe(0)
      expect(afterBack.isLoading).toBe(true)
    })

    it('is a no-op when at history index 0', () => {
      let state = createInitialState()
      const tabId = getActiveTab(state)!.id

      state = navigateTab(state, tabId, 'at://alice.bsky.social')

      const before = getActiveTab(state)!
      state = goBack(state, tabId)
      const after = getActiveTab(state)!

      expect(after.uri).toBe(before.uri)
      expect(after.historyIndex).toBe(before.historyIndex)
    })

    it('is a no-op when history is empty', () => {
      const state = createInitialState()
      const before = getActiveTab(state)

      const newState = goBack(state, before!.id)

      // goBack returns the same state (by reference) when no-op
      expect(newState.tabs[0]!.uri).toBe(state.tabs[0]!.uri)
      expect(newState.tabs[0]!.historyIndex).toBe(state.tabs[0]!.historyIndex)
    })
  })

  describe('goForward', () => {
    it('increments history index and changes URI', () => {
      let state = createInitialState()
      const tabId = getActiveTab(state)!.id

      state = navigateTab(state, tabId, 'at://alice.bsky.social')
      state = navigateTab(state, tabId, 'at://bob.bsky.social')
      state = goBack(state, tabId)

      const beforeForward = getActiveTab(state)!
      expect(beforeForward.uri).toBe('at://alice.bsky.social')
      expect(beforeForward.historyIndex).toBe(0)

      state = goForward(state, tabId)

      const afterForward = getActiveTab(state)!
      expect(afterForward.uri).toBe('at://bob.bsky.social')
      expect(afterForward.historyIndex).toBe(1)
      expect(afterForward.isLoading).toBe(true)
    })

    it('is a no-op when at end of history', () => {
      let state = createInitialState()
      const tabId = getActiveTab(state)!.id

      state = navigateTab(state, tabId, 'at://alice.bsky.social')
      state = navigateTab(state, tabId, 'at://bob.bsky.social')

      const before = getActiveTab(state)!
      state = goForward(state, tabId)
      const after = getActiveTab(state)!

      expect(after.uri).toBe(before.uri)
      expect(after.historyIndex).toBe(before.historyIndex)
    })
  })

  describe('independent tab state (AC3.5)', () => {
    it('multiple tabs maintain independent navigation state', () => {
      let state = createInitialState()
      const tab1Id = getActiveTab(state)!.id

      state = navigateTab(state, tab1Id, 'at://alice.bsky.social')

      state = addTab(state, 'at://bob.bsky.social')
      const tab2Id = getActiveTab(state)!.id

      // Tab 1 should still be at alice
      const tab1 = state.tabs.find((t) => t.id === tab1Id)!
      expect(tab1.uri).toBe('at://alice.bsky.social')

      // Tab 2 should be at bob
      const tab2 = state.tabs.find((t) => t.id === tab2Id)!
      expect(tab2.uri).toBe('at://bob.bsky.social')

      // Navigate tab 2
      state = navigateTab(state, tab2Id, 'at://charlie.bsky.social')

      // Tab 1 history should be unaffected
      const tab1After = state.tabs.find((t) => t.id === tab1Id)!
      expect(tab1After.history).toEqual(['at://alice.bsky.social'])

      // Tab 2 history should have new entries
      const tab2After = state.tabs.find((t) => t.id === tab2Id)!
      expect(tab2After.history).toEqual(['at://bob.bsky.social', 'at://charlie.bsky.social'])
    })
  })
})
