/**
 * Safe localStorage utilities with schema validation and error handling.
 * Prevents crashes from malformed JSON or tainted storage data.
 */

/**
 * Safely parse a JSON value from localStorage.
 * Returns the fallback if the key is absent, JSON is malformed, or parsing fails.
 */
export function safeParseJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw) as unknown
    // Basic type guard: ensure parsed result matches the shape of the fallback
    if (typeof parsed !== typeof fallback && fallback !== null) return fallback
    return parsed as T
  } catch {
    return fallback
  }
}

/**
 * Safely serialize and store a value in localStorage.
 * Silently no-ops if serialization or storage fails (e.g. private browsing quota).
 */
export function safeSetJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage quota exceeded or unavailable — fail silently
  }
}

/**
 * Safely remove a key from localStorage.
 */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore
  }
}

/**
 * Session storage utilities (for sensitive short-lived data like auth tokens).
 */
export const sessionStore = {
  set(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value)
    } catch {
      // Ignore
    }
  },
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  remove(key: string): void {
    try {
      sessionStorage.removeItem(key)
    } catch {
      // Ignore
    }
  }
}
