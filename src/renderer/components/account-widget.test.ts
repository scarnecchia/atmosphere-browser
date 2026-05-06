// pattern: Test (testing pure auth state logic)

import { describe, it, expect } from 'vitest'
import { getAuthDisplayState, type AuthDisplayState } from '../utils/auth-state.js'

describe('auth-state utility: render state machine', () => {
  it('should return "authenticated" when user is authenticated', () => {
    const state: AuthDisplayState = getAuthDisplayState(true, false, false)
    expect(state).toBe('authenticated')
  })

  it('should return "logging-in" when login is in progress', () => {
    const state: AuthDisplayState = getAuthDisplayState(false, true, false)
    expect(state).toBe('logging-in')
  })

  it('should return "login-form" when login form is shown', () => {
    const state: AuthDisplayState = getAuthDisplayState(false, false, true)
    expect(state).toBe('login-form')
  })

  it('should return "logged-out" as default state', () => {
    const state: AuthDisplayState = getAuthDisplayState(false, false, false)
    expect(state).toBe('logged-out')
  })

  it('should prioritize authenticated state over others', () => {
    // Even if isLoggingIn and showLoginForm are true, authenticated takes precedence
    const state: AuthDisplayState = getAuthDisplayState(true, true, true)
    expect(state).toBe('authenticated')
  })

  it('should prioritize logging-in over login-form', () => {
    const state: AuthDisplayState = getAuthDisplayState(false, true, true)
    expect(state).toBe('logging-in')
  })
})
