/**
 * Pure logic for determining the account widget's render state machine.
 * Extracted for testability; component uses this to decide what to render.
 */

export type AuthDisplayState = 'authenticated' | 'logging-in' | 'login-form' | 'logged-out'

export function getAuthDisplayState(
  isAuthenticated: boolean,
  isLoggingIn: boolean,
  showLoginForm: boolean,
): AuthDisplayState {
  if (isAuthenticated) {
    return 'authenticated'
  }
  if (isLoggingIn) {
    return 'logging-in'
  }
  if (showLoginForm) {
    return 'login-form'
  }
  return 'logged-out'
}
