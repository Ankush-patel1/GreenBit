import { useState, useEffect, useCallback } from "react"
import { apiUrl } from "../config/api"
import { safeParseJSON, safeSetJSON, sessionStore } from "../utils/storage"
import { STORAGE_KEYS } from "../constants/emissions"

interface UseApiDataOptions<T> {
  /** localStorage key for caching fallback data */
  cacheKey?: string
  /** Static fallback if both API and cache fail */
  fallback: T
}

interface UseApiDataResult<T> {
  data: T
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Reusable data-fetching hook that handles:
 * - HTTP GET from the API
 * - localStorage caching on success
 * - Fallback to cache on network failure
 * - Static fallback if no cache exists
 * - Loading and error states
 */
export function useApiData<T>(
  endpoint: string,
  { cacheKey, fallback }: UseApiDataOptions<T>
): UseApiDataResult<T> {
  const [data, setData] = useState<T>(
    cacheKey ? safeParseJSON<T>(cacheKey, fallback) : fallback
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = sessionStore.get(STORAGE_KEYS.AUTH_TOKEN)
      const headers: Record<string, string> = {}
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      const response = await fetch(apiUrl(endpoint), { headers })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const json = (await response.json()) as T
      setData(json)
      if (cacheKey) safeSetJSON(cacheKey, json)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      // Fall back to cached data (already initialized in useState)
    } finally {
      setLoading(false)
    }
  }, [endpoint, cacheKey])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

/**
 * Mutation helper: performs a POST/PUT/DELETE and returns the result.
 * Caller is responsible for calling refetch() after a successful mutation.
 */
export async function apiMutate<TBody, TResult>(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: TBody
): Promise<{ ok: boolean; data?: TResult; error?: string }> {
  try {
    const token = sessionStore.get(STORAGE_KEYS.AUTH_TOKEN)
    const headers: Record<string, string> = {
      ...(body ? { "Content-Type": "application/json" } : {})
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as { detail?: string }
      return { ok: false, error: errData.detail ?? `HTTP ${response.status}` }
    }
    const data = (await response.json().catch(() => undefined)) as TResult | undefined
    return { ok: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error"
    return { ok: false, error: message }
  }
}
