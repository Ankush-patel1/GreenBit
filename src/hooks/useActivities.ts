import { useCallback } from "react"
import { useApiData, apiMutate } from "./useApiData"
import { API_ENDPOINTS } from "../config/api"

export interface ActivityItem {
  id: number
  type: string
  name: string
  value: number
  impact: number
  date: string
}

export function useActivities() {
  const { data: activities, loading, error, refetch } = useApiData<ActivityItem[]>(
    API_ENDPOINTS.ACTIVITIES,
    { cacheKey: "tracker_activities", fallback: [] }
  )

  const createActivity = useCallback(async (payload: Omit<ActivityItem, "id">) => {
    const res = await apiMutate<Omit<ActivityItem, "id">, { record: ActivityItem }>(
      API_ENDPOINTS.ACTIVITIES,
      "POST",
      payload
    )
    if (res.ok) await refetch()
    return res
  }, [refetch])

  const updateActivity = useCallback(async (id: number, payload: Omit<ActivityItem, "id">) => {
    const res = await apiMutate<Omit<ActivityItem, "id">, { record: ActivityItem }>(
      `${API_ENDPOINTS.ACTIVITIES}/${id}`,
      "PUT",
      payload
    )
    if (res.ok) await refetch()
    return res
  }, [refetch])

  const deleteActivity = useCallback(async (id: number) => {
    const res = await apiMutate(
      `${API_ENDPOINTS.ACTIVITIES}/${id}`,
      "DELETE"
    )
    if (res.ok) await refetch()
    return res
  }, [refetch])

  return {
    activities,
    loading,
    error,
    refetch,
    createActivity,
    updateActivity,
    deleteActivity
  }
}
