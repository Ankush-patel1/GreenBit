/**
 * Gamification utility functions.
 * De-duplicated from GamificationPage.tsx and Sidebar.tsx.
 */
import { LEVEL_THRESHOLDS, LEVEL_NAMES } from "../constants/emissions"

export type LevelName = "Seed" | "Sapling" | "Tree" | "Forest Guardian"

export interface LevelInfo {
  current: LevelName
  next: string
  target: number
  min: number
}

/**
 * Calculates the user's current level based on eco points.
 */
export function calculateLevel(points: number): LevelName {
  if (points > LEVEL_THRESHOLDS.FOREST_GUARDIAN) return LEVEL_NAMES.FOREST_GUARDIAN
  if (points > LEVEL_THRESHOLDS.TREE) return LEVEL_NAMES.TREE
  if (points > LEVEL_THRESHOLDS.SAPLING) return LEVEL_NAMES.SAPLING
  return LEVEL_NAMES.SEED
}

/**
 * Returns info about the current level and next level target.
 */
export function getNextLevelInfo(points: number): LevelInfo {
  if (points <= LEVEL_THRESHOLDS.SAPLING) {
    return { current: LEVEL_NAMES.SEED, next: LEVEL_NAMES.SAPLING, target: LEVEL_THRESHOLDS.SAPLING, min: 0 }
  }
  if (points <= LEVEL_THRESHOLDS.TREE) {
    return { current: LEVEL_NAMES.SAPLING, next: LEVEL_NAMES.TREE, target: LEVEL_THRESHOLDS.TREE, min: LEVEL_THRESHOLDS.SAPLING + 1 }
  }
  if (points <= LEVEL_THRESHOLDS.FOREST_GUARDIAN) {
    return { current: LEVEL_NAMES.TREE, next: LEVEL_NAMES.FOREST_GUARDIAN, target: LEVEL_THRESHOLDS.FOREST_GUARDIAN, min: LEVEL_THRESHOLDS.TREE + 1 }
  }
  return { current: LEVEL_NAMES.FOREST_GUARDIAN, next: "Max Level Reached", target: points, min: LEVEL_THRESHOLDS.FOREST_GUARDIAN }
}

/**
 * Calculates level progress as a 0-100 percentage.
 */
export function getLevelProgress(points: number): number {
  const info = getNextLevelInfo(points)
  const range = info.target - info.min
  if (range <= 0) return 100
  return Math.min(((points - info.min) / range) * 100, 100)
}

/**
 * Custom event name for gamification profile updates.
 * Used to notify Sidebar without polling.
 */
export const GAMIFICATION_UPDATED_EVENT = "gamification:updated" as const

/** Dispatch a gamification update event with new points/level data */
export function dispatchGamificationUpdate(points: number, level: LevelName): void {
  const event = new CustomEvent(GAMIFICATION_UPDATED_EVENT, {
    detail: { points, level }
  })
  window.dispatchEvent(event)
}

/**
 * Calculates consecutive logging streak in days based on active logged activities.
 */
export function calculateStreak(activities: { date?: string, timestamp?: string }[]): number {
  if (!activities || activities.length === 0) return 0
  
  // Normalize dates
  const dates = activities
    .map(act => act.date || (act.timestamp ? act.timestamp.split(",")[0] : ""))
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)) // Keep only YYYY-MM-DD
    
  if (dates.length === 0) return 0
  
  // Sort unique dates descending
  const uniqueDates = Array.from(new Set(dates)).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  const todayStr = new Date().toISOString().split("T")[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split("T")[0]

  // If the latest log is not today or yesterday, the streak is broken (0)
  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
    return 0
  }

  let streak = 0
  let currentTarget = new Date(uniqueDates[0])

  for (let i = 0; i < uniqueDates.length; i++) {
    const d = new Date(uniqueDates[i])
    const diffTime = Math.abs(currentTarget.getTime() - d.getTime())
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 1) {
      if (diffDays === 1) {
        streak++
      }
      currentTarget = d
    } else {
      break
    }
  }
  // Add 1 for the start day itself
  return streak + 1
}
