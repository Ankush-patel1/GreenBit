/**
 * useAuth — Centralized authentication state hook.
 *
 * Manages JWT token storage (via sessionStorage), provides auth status,
 * and exposes sign-out functionality. Avoids scattered sessionStore.get()
 * calls throughout the codebase.
 */
import { useState, useCallback } from "react"
import { sessionStore } from "../utils/storage"
import { STORAGE_KEYS } from "../constants/emissions"

export interface AuthState {
  /** The raw JWT token string, or null if not authenticated. */
  token: string | null
  /** True if a valid token exists in session storage. */
  isAuthenticated: boolean
}

export interface UseAuthReturn extends AuthState {
  /** Persist a new token to session storage and update state. */
  setToken: (token: string) => void
  /** Clear the auth token and reset state (sign out). */
  clearToken: () => void
  /** Read the current token directly (useful for one-off API calls). */
  getToken: () => string | null
}

/**
 * Hook that encapsulates all authentication token management.
 *
 * @example
 * ```tsx
 * const { isAuthenticated, setToken, clearToken } = useAuth()
 *
 * // After login:
 * setToken(data.access_token)
 *
 * // On logout:
 * clearToken()
 * ```
 */
export function useAuth(): UseAuthReturn {
  const [token, setTokenState] = useState<string | null>(() =>
    sessionStore.get(STORAGE_KEYS.AUTH_TOKEN)
  )

  const setToken = useCallback((newToken: string) => {
    sessionStore.set(STORAGE_KEYS.AUTH_TOKEN, newToken)
    setTokenState(newToken)
  }, [])

  const clearToken = useCallback(() => {
    sessionStore.remove(STORAGE_KEYS.AUTH_TOKEN)
    setTokenState(null)
  }, [])

  const getToken = useCallback(
    () => sessionStore.get(STORAGE_KEYS.AUTH_TOKEN),
    []
  )

  return {
    token,
    isAuthenticated: token !== null,
    setToken,
    clearToken,
    getToken,
  }
}
