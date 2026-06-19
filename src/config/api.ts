/**
 * Centralized API configuration.
 * All API base URL and endpoint path constants live here.
 * Override VITE_API_BASE_URL in .env for staging/production.
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000"

/** All API endpoint paths */
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: "/api/auth/login",
  AUTH_SIGNUP: "/api/auth/signup",
  AUTH_FORGOT_PASSWORD: "/api/auth/forgot-password",

  // Calculator
  CALCULATOR_RECORD: "/api/calculator/record",
  CALCULATOR_RECORDS: "/api/calculator/records",

  // Activities
  ACTIVITIES: "/api/activities",
  ACTIVITY_BY_ID: (id: number) => `/api/activities/${id}`,

  // Goals
  GOALS: "/api/goals",
  GOAL_BY_ID: (id: number) => `/api/goals/${id}`,

  // Gamification
  GAMIFICATION_PROFILE: "/api/gamification/profile",
  GAMIFICATION_ADD_POINTS: "/api/gamification/points/add",
  GAMIFICATION_LEADERBOARD: "/api/gamification/leaderboard",

  // Coach
  COACH_CHAT: "/api/coach/chat",

  // Simulator
  SIMULATOR_HISTORY: "/api/simulator/history",
  SIMULATOR_RUN: "/api/simulator/run",
  SIMULATOR_DELETE: (id: number) => `/api/simulator/history/${id}`,

  // Predictions
  PREDICTIONS: "/api/predictions",

  // RAG
  RAG_ASK: "/api/rag/ask",
} as const

/** Helper to build a full URL from an endpoint path */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}
