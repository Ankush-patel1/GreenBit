/**
 * Shared TypeScript interfaces for all GreenBit API response and request shapes.
 * Import these types wherever API data is consumed for end-to-end type safety.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string
  token_type: "bearer"
}

export interface AuthSuccessMessage {
  message: string
  email: string
}

// ─── User / Onboarding ────────────────────────────────────────────────────────

export interface UserProfile {
  name: string
  city: string
  householdSize: number
  primaryTransport: "car" | "metro" | "bus" | "bike_walk"
  dietType: "vegan" | "vegetarian" | "pescatarian" | "balanced" | "meat_heavy"
  electricityConsumption: number
  calculatedCarbonBaseline?: number
}

// ─── Activities ───────────────────────────────────────────────────────────────

export interface Activity {
  id: number
  type: string
  name: string
  value: number
  impact: number
  date: string
  user_id?: string
  timestamp?: string
}

export interface CreateActivityPayload {
  type: string
  name: string
  value: number
  impact: number
  date: string
}

export interface ActivityResponse {
  message: string
  record: Activity
}

// ─── Calculator ───────────────────────────────────────────────────────────────

export interface CalculatorRecord {
  id: number
  user_id?: string
  travel_distance: number
  fuel_type: string
  electricity_usage: number
  diet_preference: string
  waste_generation: number
  daily_footprint: number
  monthly_footprint: number
  yearly_footprint: number
  timestamp?: string
}

export interface CalculatorPayload {
  travel_distance: number
  fuel_type: string
  electricity_usage: number
  diet_preference: string
  waste_generation: number
  daily_footprint: number
  monthly_footprint: number
  yearly_footprint: number
}

export interface CalculatorResponse {
  message: string
  record: CalculatorRecord
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export interface Goal {
  id: number
  type: string
  title: string
  target_value: number
  current_value: number
  unit: string
  completed: boolean
  date_created: string
  user_id?: string
}

export interface CreateGoalPayload {
  type: string
  title: string
  target_value: number
  current_value: number
  unit: string
  completed: boolean
  date_created?: string
}

export interface GoalResponse {
  message: string
  record: Goal
}

// ─── Gamification ────────────────────────────────────────────────────────────

export interface Badge {
  id: string
  title: string
  description: string
  unlocked: boolean
  unlocked_date: string | null
}

export interface GamificationProfile {
  points: number
  level: LevelName
  badges: Badge[]
}

export type LevelName = "Seed" | "Sapling" | "Tree" | "Forest Guardian"

export interface LeaderboardEntry {
  rank: number
  name: string
  level: LevelName
  points: number
  carbon_saved: number
  is_current_user: boolean
}

export interface AddPointsResponse {
  message: string
  profile: GamificationProfile
}

// ─── Simulator ────────────────────────────────────────────────────────────────

export interface SimulationScenario {
  id?: number
  name: string
  commute_shift: number
  ac_reduction: number
  vegetarian_meals: number
  current_emissions: number
  future_emissions: number
  savings_percent: number
  annual_impact: number
  date?: string
}

export interface SimulationResponse {
  message: string
  record: SimulationScenario
}

// ─── Predictions ─────────────────────────────────────────────────────────────

export interface EmissionDataPoint {
  day: string
  Emissions: number
  Type: "Historical" | "Forecast"
  Upper?: number
  Lower?: number
}

export interface PredictionKPIs {
  next_week: number
  next_month: number
  next_year: number
  confidence_margin: number
}

export interface PredictionResponse {
  history: EmissionDataPoint[]
  forecast: EmissionDataPoint[]
  kpis: PredictionKPIs
}

// ─── AI Coach ────────────────────────────────────────────────────────────────

export interface ChatMessage {
  sender: string
  text: string
}

export interface CoachChatPayload {
  message: string
  history: ChatMessage[]
}

export interface CoachResponse {
  response: string
  source: "gemini" | "openai" | "local_coach_engine"
}

// ─── RAG Assistant ────────────────────────────────────────────────────────────

export interface RAGSource {
  title: string
  source: string
  content: string
}

export interface RAGResponse {
  response: string
  sources: RAGSource[]
  engine: "gemini" | "openai" | "local_rag_synthesis"
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "healthy" | "degraded"
  service: string
  version: string
  database: "connected" | "disconnected" | "unavailable"
}

// ─── Generic API Response ─────────────────────────────────────────────────────

export interface MessageResponse {
  message: string
}

export interface ApiError {
  detail: string
}
