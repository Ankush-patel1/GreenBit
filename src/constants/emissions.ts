/**
 * Emission factor constants used across the application.
 * Centralizing these prevents magic numbers and makes updates consistent.
 *
 * Sources: IPCC AR6, EPA Emission Factors (2023)
 */

/** kg CO₂e saved per km of transit vs single-occupancy petrol vehicle */
export const TRANSPORT_EMISSION_FACTOR = 0.28

/** kg CO₂e saved per hour of reduced appliance/AC usage */
export const ENERGY_EMISSION_FACTOR = 0.38

/** kg CO₂e saved per vegetarian meal vs beef/pork equivalent */
export const FOOD_EMISSION_FACTOR = 0.70

/** kg CO₂e saved per kg of waste recycled */
export const WASTE_EMISSION_FACTOR = 0.92

/** Monthly baseline carbon footprint (kg CO₂e) used in Simulator */
export const BASELINE_EMISSIONS_KG = 410.0

/** Baseline transport emissions (kg CO₂e/month) */
export const BASELINE_TRANSPORT_KG = 160.0

/** Baseline energy emissions (kg CO₂e/month) */
export const BASELINE_ENERGY_KG = 150.0

/** Baseline food emissions (kg CO₂e/month) */
export const BASELINE_FOOD_KG = 100.0

/** kg CO₂e per transit km when commute shifts from driving */
export const COMMUTE_SHIFT_FACTOR = 0.15

/** kg CO₂e per hour per day of AC reduction (monthly) */
export const AC_REDUCTION_FACTOR = 0.40

/** kg CO₂e per vegetarian meal swap per week (monthly) */
export const MEAL_SWAP_FACTOR = 1.50

/** Average weeks per month (used for weekly → monthly conversions) */
export const WEEKS_PER_MONTH = 4.33

/**
 * Gamification level thresholds (eco points required)
 */
export const LEVEL_THRESHOLDS = {
  SEED: 0,
  SAPLING: 200,
  TREE: 600,
  FOREST_GUARDIAN: 1200,
} as const

/** Level names */
export const LEVEL_NAMES = {
  SEED: "Seed",
  SAPLING: "Sapling",
  TREE: "Tree",
  FOREST_GUARDIAN: "Forest Guardian",
} as const

/** Points multiplier for carbon saved per eco point awarded */
export const CARBON_PER_POINT = 0.3

/** 95% confidence interval Z-score for prediction bounds */
export const CONFIDENCE_Z_SCORE = 1.96

/** Local storage cache keys */
export const STORAGE_KEYS = {
  USER_PROFILE: "user_profile",
  AUTH_TOKEN: "greenbit_auth_token",
  TRACKER_ACTIVITIES: "tracker_activities",
  SUSTAINABILITY_GOALS: "sustainability_goals",
  GAMIFICATION_PROFILE: "gamification_profile",
  GAMIFICATION_LEADERBOARD: "gamification_leaderboard",
  SIMULATOR_HISTORY: "simulator_history",
  ONBOARDING_COMPLETED: "onboarding_completed",
} as const
