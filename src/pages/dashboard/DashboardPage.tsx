import { useState, useEffect, useMemo, useCallback } from "react"
import {
  PlusCircle,
  X,
  CheckCircle2,
  AlertCircle,
  Calculator,
  BookOpen,
  TrendingDown
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Skeleton } from "../../components/ui/Skeleton"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import { API_ENDPOINTS } from "../../config/api"
import { useApiData } from "../../hooks/useApiData"
import { useActivities } from "../../hooks/useActivities"

// ─── Local Goal shape used on dashboard ───────────────────────────────────────
interface DashboardGoal {
  id: number
  name: string
  progress: number
  target: string
  deadline: string
}

// ─── Quick action shape ────────────────────────────────────────────────────────
interface QuickAction {
  id: string
  title: string
  desc: string
  impact: number
  points: number
  type: string
  name: string
}

// ─── Predictions shape ────────────────────────────────────────────────────────
interface PredictionKPIs {
  next_week: number
  next_month: number
  next_year: number
  confidence_margin: number
}

interface EmissionDataPoint {
  day: string
  Emissions: number
  Type: string
  Upper?: number
  Lower?: number
}

interface PredictionData {
  history: EmissionDataPoint[]
  forecast: EmissionDataPoint[]
  kpis: PredictionKPIs
}

export interface DashboardPageProps {
  userProfile?: {
    name: string
    city: string
    calculatedCarbonBaseline?: number
    primaryTransport?: string
    dietType?: string
  }
  onLogActivityClick: () => void
  onNavigate?: (tab: string) => void
}

export const DashboardPage = ({ userProfile, onLogActivityClick, onNavigate }: DashboardPageProps) => {
  const name = userProfile?.name || "Demo User"
  const baselineCO2 = userProfile?.calculatedCarbonBaseline || 5.8
  const targetScore = Math.max(10, Math.min(100, Math.round(100 - (baselineCO2 * 8))))

  // Animated states
  const [animatedScore, setAnimatedScore] = useState(0)
  const [animatedOffset, setAnimatedOffset] = useState(0)

  // Use Custom Hook for activities
  const { activities, createActivity, deleteActivity } = useActivities()

  const [goals] = useState<DashboardGoal[]>([
    { id: 1, name: "Limit personal car use", progress: 80, target: "Commutes via Metro", deadline: "June 25" },
    { id: 2, name: "Introduce meatless weekdays", progress: 60, target: "4 days vegetarian/vegan", deadline: "June 30" },
    { id: 3, name: "Reduce power utility bill", progress: 30, target: "Lower HVAC consumption", deadline: "July 10" },
    { id: 4, name: "Improve household recycling", progress: 100, target: "Recycle plastics & glass", deadline: "Completed" }
  ])

  // Use Custom Hook for predictions
  const { data: predictions, loading: loadingPred } = useApiData<PredictionData | null>(
    API_ENDPOINTS.PREDICTIONS || "/api/predictions",
    { fallback: null }
  )

  const [logNotification, setLogNotification] = useState<string | null>(null)

  // Predictions fallback if API fails
  const mockPred: PredictionData = {
    history: [
      { day: "Day 1", Emissions: 14.5, Type: "Historical" },
      { day: "Day 2", Emissions: 13.8, Type: "Historical" },
      { day: "Day 3", Emissions: 15.2, Type: "Historical" },
      { day: "Day 4", Emissions: 12.0, Type: "Historical" },
      { day: "Day 5", Emissions: 11.2, Type: "Historical" },
      { day: "Day 6", Emissions: 10.5, Type: "Historical" },
      { day: "Day 7", Emissions: 9.8, Type: "Historical" },
      { day: "Day 8", Emissions: 12.2, Type: "Historical" },
      { day: "Day 9", Emissions: 10.1, Type: "Historical" },
      { day: "Day 10", Emissions: 9.5, Type: "Historical" }
    ],
    forecast: [
      { day: "Day 11", Emissions: 8.8, Upper: 11.5, Lower: 6.1, Type: "Forecast" },
      { day: "Day 12", Emissions: 8.2, Upper: 10.9, Lower: 5.5, Type: "Forecast" },
      { day: "Day 13", Emissions: 7.6, Upper: 10.3, Lower: 4.9, Type: "Forecast" },
      { day: "Day 14", Emissions: 7.1, Upper: 9.8, Lower: 4.4, Type: "Forecast" },
      { day: "Day 15", Emissions: 6.5, Upper: 9.2, Lower: 3.8, Type: "Forecast" }
    ],
    kpis: {
      next_week: 174.0,
      next_month: 165.0,
      next_year: 1.38,
      confidence_margin: 87.0
    }
  }
  
  const currentPredictions = predictions || mockPred

  // Carbon Saved total
  const totalCarbonSaved = useMemo(() => {
    const sum = activities.reduce((acc, act) => acc + Math.abs(act.impact || 0), 0)
    return parseFloat(sum.toFixed(1))
  }, [activities])

  // Count goals completed
  const completedGoalsCount = useMemo(() => goals.filter((g) => g.progress === 100).length, [goals])

  // Animation effect on load
  useEffect(() => {
    let scoreVal = 0
    const scoreInterval = setInterval(() => {
      if (scoreVal < targetScore) {
        scoreVal += 2
        setAnimatedScore(Math.min(scoreVal, targetScore))
      } else {
        clearInterval(scoreInterval)
      }
    }, 15)

    let offsetVal = 0
    const offsetInterval = setInterval(() => {
      if (offsetVal < totalCarbonSaved) {
        offsetVal += 1.5
        setAnimatedOffset(parseFloat(Math.min(offsetVal, totalCarbonSaved).toFixed(1)))
      } else {
        clearInterval(offsetInterval)
      }
    }, 10)

    return () => {
      clearInterval(scoreInterval)
      clearInterval(offsetInterval)
    }
  }, [targetScore, totalCarbonSaved])

  const handleDeleteActivity = useCallback(async (id: number) => {
    await deleteActivity(id)
  }, [deleteActivity])

  // Pre-configured Quick Action Recommendations
  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = []
    if (userProfile?.primaryTransport === "car") {
      actions.push({
        id: "metro",
        title: "Metro Commute",
        desc: "Commute via metro rail instead of gas vehicle.",
        impact: -4.2,
        points: 20,
        type: "transport",
        name: "Commuted via Metro (15km)"
      })
    }
    if (userProfile?.dietType !== "vegan" && userProfile?.dietType !== "vegetarian") {
      actions.push({
        id: "veggie",
        title: "Eat Vegetarian Dinner",
        desc: "Swap heavy meat-based meal for a vegan/vegetarian dinner.",
        impact: -2.1,
        points: 15,
        type: "food",
        name: "Veggie dinner log"
      })
    }
    actions.push({
      id: "hvac",
      title: "HVAC Eco-Adjustment",
      desc: "Turn down heating/cooling thermostat by 1.5°C today.",
      impact: -6.0,
      points: 25,
      type: "energy",
      name: "Thermostat eco adjustment"
    })
    return actions.slice(0, 3)
  }, [userProfile])

  // Handle Quick Add Action
  const handleQuickAdd = async (act: QuickAction) => {
    const newActivity = {
      type: act.type,
      name: act.name,
      value: 1,
      impact: act.impact,
      date: new Date().toISOString().split("T")[0]
    }

    await createActivity(newActivity)

    // Trigger floating notification
    setLogNotification(`✓ Logged "${act.title}" — ${act.impact} kg CO₂e saved, +${act.points} Eco Points`)
    setTimeout(() => setLogNotification(null), 4000)

    // Dispatch custom gamification event to update Sidebar
    const event = new CustomEvent("gamification-updated", {
      detail: { pointsAdded: act.points }
    })
    window.dispatchEvent(event)
  }

  // Personalized context line
  const transportLabel: Record<string, string> = {
    car: "driving", metro: "metro", bus: "bus", bike_walk: "cycling/walking"
  }
  const dietLabel: Record<string, string> = {
    vegan: "vegan", vegetarian: "vegetarian", pescatarian: "pescatarian",
    balanced: "balanced", meat_heavy: "meat-heavy"
  }
  const transportText = userProfile?.primaryTransport ? transportLabel[userProfile.primaryTransport] ?? "transit" : "transit"
  const dietText = userProfile?.dietType ? dietLabel[userProfile.dietType] ?? "mixed" : "mixed"

  return (
    <div className="space-y-8 animate-fade-in relative max-w-6xl mx-auto">
      {/* Toast Notification for Quick Action — accessible live region */}
      {logNotification && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="fixed bottom-6 right-6 z-50 bg-brand-forest text-brand-chalk px-4 py-3 rounded-lg shadow-md flex items-center gap-2.5 border border-brand-forest/20"
        >
          <CheckCircle2 className="h-4 w-4 text-brand-leaf" aria-hidden="true" />
          <span className="text-xs font-body font-medium">{logNotification}</span>
        </div>
      )}

      {/* Welcome header widget */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 border-b border-brand-forest/10 pb-6">
        <div>
          <h1 className="text-4xl font-heading font-normal text-brand-forest">
            Environmental Impact Statement
          </h1>
          <p className="text-sm text-brand-forest/60 font-body mt-1">
            Real-time carbon accounting for <strong>{name}</strong> in {userProfile?.city || "your city"} — {transportText} commuter · {dietText} diet.
          </p>
        </div>
        <div className="shrink-0 mt-4 md:mt-0">
          <Button variant="outline" className="border-brand-forest/25 text-brand-forest hover:bg-brand-forest/5 font-body text-xs" onClick={onLogActivityClick} leftIcon={<PlusCircle className="h-4 w-4" aria-hidden="true" />}>
            Log Impact Activity
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-brand-forest/10 bg-white shadow-none">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-forest/50 font-body">
              Annualized Baseline
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-heading font-normal text-brand-forest">
              {baselineCO2} <span className="text-xs font-body font-light text-brand-forest/60">T / yr</span>
            </div>
            <div className="flex items-center text-[10px] text-brand-forest/50 space-x-1 font-body">
              <span>Standard local baseline index</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-forest/10 bg-white shadow-none">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-forest/50 font-body">
              Monthly Progress
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-heading font-normal text-brand-forest">
              -8.4% <span className="text-xs font-body font-light text-brand-forest/60">vs last month</span>
            </div>
            <div className="flex items-center text-[10px] text-brand-forest/50 space-x-1 font-body">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-leaf" aria-hidden="true" />
              <span>Target: -10% reduction</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-forest/10 bg-white shadow-none">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-forest/50 font-body">
              Total Offset Logged
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-heading font-normal text-brand-leaf">
              {animatedOffset} <span className="text-xs font-body font-light text-brand-forest/60">kg CO2e</span>
            </div>
            <div className="flex items-center text-[10px] text-brand-forest/50 space-x-1 font-body">
              <span>Equivalent lifestyle reductions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-forest/10 bg-white shadow-none">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-forest/50 font-body">
              Target Milestones
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-heading font-normal text-brand-forest">
              {completedGoalsCount} <span className="text-xs font-body font-light text-brand-forest/60">/ {goals.length}</span>
            </div>
            <div className="flex items-center text-[10px] text-brand-forest/50 space-x-1 font-body">
              <span>Long term initiatives active</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Cards — guide users to key features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate?.("activity")}
          className="flex items-center space-x-4 p-4 bg-brand-forest text-brand-chalk rounded-xl border border-brand-forest/20 hover:bg-brand-forest/90 transition-colors text-left group"
          aria-label="Calculate your carbon footprint — go to Activity Tracker"
        >
          <div className="bg-brand-leaf/20 p-3 rounded-lg shrink-0">
            <Calculator className="h-5 w-5 text-brand-leaf" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-heading font-semibold text-white group-hover:text-brand-leaf transition-colors">Calculate My Footprint →</p>
            <p className="text-[11px] text-brand-chalk/60 font-body mt-0.5">Log transport, energy & food to get your personalized score.</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate?.("rag")}
          className="flex items-center space-x-4 p-4 bg-brand-mist text-brand-forest rounded-xl border border-brand-forest/10 hover:bg-brand-leaf/10 transition-colors text-left group"
          aria-label="Explore Green Tips — go to Climate Library"
        >
          <div className="bg-brand-leaf/20 p-3 rounded-lg shrink-0">
            <BookOpen className="h-5 w-5 text-brand-leaf" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-heading font-semibold text-brand-forest group-hover:text-brand-leaf transition-colors">Explore Green Tips →</p>
            <p className="text-[11px] text-brand-forest/60 font-body mt-0.5">Browse sustainability guides and ask the AI Climate Library.</p>
          </div>
        </button>
      </div>

      {/* Personalized Actions for You */}
      <Card className="border-brand-forest/10 bg-[#F4F3EE] shadow-none">
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-lg font-heading font-normal flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-brand-leaf" aria-hidden="true" />
              Personalized Actions for You
            </CardTitle>
            <CardDescription className="text-xs">Smart suggestions based on your {transportText} commute and {dietText} diet profile.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((act) => (
            <div key={act.id} className="flex flex-col justify-between p-4 bg-white border border-brand-forest/10 rounded-lg text-left">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-brand-forest/50 font-body">{act.type}</span>
                  <span className="text-[10px] font-semibold text-brand-leaf font-body">{act.impact} kg CO₂e</span>
                </div>
                <h4 className="text-sm font-heading font-medium text-brand-forest">{act.title}</h4>
                <p className="text-[11px] text-brand-forest/70 leading-relaxed font-body">{act.desc}</p>
              </div>
              <button
                className="mt-4 w-full text-[10px] py-1.5 border border-brand-forest/20 rounded font-body text-brand-forest hover:bg-brand-forest/5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-leaf/40"
                onClick={() => void handleQuickAdd(act)}
                aria-label={`Log ${act.title} action — saves ${Math.abs(act.impact)} kg CO₂e and earns ${act.points} eco points`}
              >
                Log Action (+{act.points} pts)
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Analytics Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend graph card */}
        <Card className="lg:col-span-2 border-brand-forest/10 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="font-heading font-normal">Emissions Trend</CardTitle>
            <CardDescription>
              Weekly comparison of logged activity offsets against your personal baseline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Clean Editorial SVG Chart */}
            <div className="h-56 w-full relative pt-2" role="img" aria-label="Line chart showing emissions trend decreasing from onboarding baseline over 5 weeks">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none" aria-hidden="true">
                <line x1="0" y1="50" x2="500" y2="50" stroke="#1A231F" strokeOpacity="0.05" strokeWidth="1" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="#1A231F" strokeOpacity="0.05" strokeWidth="1" />
                <line x1="0" y1="150" x2="500" y2="150" stroke="#1A231F" strokeOpacity="0.05" strokeWidth="1" />

                <path
                  d="M 0 80 L 500 80"
                  fill="none"
                  stroke="#1A231F"
                  strokeDasharray="3,3"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                />

                <path
                  d="M 0 110 L 100 100 L 200 120 L 300 90 L 400 70 L 500 50"
                  fill="none"
                  stroke="#3A6047"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <circle cx="200" cy="120" r="3" fill="#3A6047" />
                <circle cx="400" cy="70" r="3" fill="#3A6047" />
                <circle cx="500" cy="50" r="3" fill="#3A6047" />
              </svg>

              <div className="absolute top-[65px] left-2 text-[9px] font-semibold text-brand-forest/40 uppercase tracking-wider font-body">Baseline</div>
              <div className="absolute top-[35px] right-2 text-[9px] font-semibold text-brand-leaf uppercase tracking-wider font-body">Your Performance</div>
            </div>
            <div className="flex justify-between text-[10px] text-brand-forest/40 pt-4 px-2 font-body" aria-hidden="true">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
              <span>Week 5 (Current)</span>
            </div>
          </CardContent>
        </Card>

        {/* Sustainability Score circular gauge */}
        <Card className="border-brand-forest/10 bg-white shadow-none flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="font-heading font-normal">Sustainability Score</CardTitle>
            <CardDescription>Your aggregated carbon performance rating.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2">
            <div
              className="relative w-40 h-40 flex items-center justify-center"
              role="img"
              aria-label={`Sustainability score: ${animatedScore} out of 100`}
            >
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#EAECE9"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#3A6047"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray="263.8"
                  strokeDashoffset={263.8 - (263.8 * animatedScore) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center" aria-hidden="true">
                <span className="text-4xl font-heading font-normal text-brand-forest">
                  {animatedScore}
                </span>
                <span className="text-[9px] text-brand-forest/40 uppercase font-semibold tracking-wider font-body">
                  / 100
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t-0 pt-0 pb-6">
            <div className="text-center text-xs text-brand-forest/60 font-body">
              Score registers in the top <span className="font-semibold text-brand-leaf">15%</span> locally.
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Lists section grid: activities & goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent logs */}
        <Card className="border-brand-forest/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-brand-forest/5 pb-4">
            <div>
              <CardTitle className="font-heading font-normal">Activity Log</CardTitle>
              <CardDescription>Timeline of sustainability actions recorded today.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogActivityClick} className="p-1 text-brand-leaf hover:bg-brand-forest/5" aria-label="Add new activity">
              <PlusCircle className="h-5 w-5" aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {activities.length > 0 ? (
              <ul className="divide-y divide-brand-forest/10 max-h-[350px] overflow-y-auto" aria-label="Recent activities">
                {activities.map((act) => (
                  <li key={act.id} className="p-4 flex items-center justify-between hover:bg-brand-sand/30 transition-colors">
                    <div className="flex items-center space-x-3 text-left font-body">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-leaf shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-semibold text-brand-forest">{act.name}</p>
                        <p className="text-[10px] text-brand-forest/50">{act.date || "Today"}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="text-xs font-mono text-brand-leaf">
                        {act.impact} kg CO₂e
                      </span>
                      <button
                        onClick={() => void handleDeleteActivity(act.id)}
                        className="text-brand-forest/30 hover:text-brand-forest p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand-leaf/40"
                        aria-label={`Delete activity: ${act.name}`}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-xs text-brand-forest/40 font-body flex flex-col items-center justify-center space-y-2">
                <AlertCircle className="h-8 w-8 text-brand-forest/20" aria-hidden="true" />
                <p>No logged activities found.</p>
                <Button variant="outline" size="sm" onClick={onLogActivityClick}>Log first activity</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goal tracking */}
        <Card className="border-brand-forest/10 bg-white shadow-none">
          <CardHeader className="border-b border-brand-forest/5 pb-4">
            <div className="flex items-center space-x-2">
              <CardTitle className="font-heading font-normal">Active Goals</CardTitle>
            </div>
            <CardDescription>Your personal carbon reduction milestones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {goals.map((goal) => (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-body">
                  <div className="text-left">
                    <span className="font-medium text-brand-forest block leading-tight">{goal.name}</span>
                    <span className="text-[10px] text-brand-forest/50">{goal.target}</span>
                  </div>
                  <span className={`font-semibold shrink-0 ${goal.progress === 100 ? "text-brand-leaf" : "text-brand-forest"}`}>
                    {goal.progress}%
                  </span>
                </div>
                <div
                  className="w-full bg-[#EAECE9] h-1 rounded overflow-hidden"
                  role="progressbar"
                  aria-valuenow={goal.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${goal.name}: ${goal.progress}% complete`}
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      goal.progress === 100 ? "bg-brand-leaf" : "bg-brand-forest/70"
                    }`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] text-brand-forest/40">
                  <span>Deadline</span>
                  <span className={goal.progress === 100 ? "text-brand-leaf font-semibold" : ""}>{goal.deadline}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Your Emissions Forecast Section */}
      <Card className="border-brand-forest/10 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 font-heading font-normal">
            <span>Your Emissions Forecast</span>
          </CardTitle>
          <CardDescription>
            AI-powered projections of your future carbon output based on current habits and logged activities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingPred || !currentPredictions ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-brand-chalk/20 p-4 rounded border border-brand-forest/5 text-left space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-7 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              {/* Forecast stats segment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-[#F4F3EE] p-4 rounded border border-brand-forest/5 text-left">
                  <span className="text-[9px] uppercase font-semibold tracking-wider text-brand-forest/55">Next 7 Days</span>
                  <div className="text-xl font-heading font-normal text-brand-forest mt-1">
                    {currentPredictions.kpis.next_week} <span className="text-[10px] font-normal text-brand-forest/50">kg CO₂e</span>
                  </div>
                  <span className="text-[9px] text-brand-forest/40">±{currentPredictions.kpis.confidence_margin} kg confidence range</span>
                </div>

                <div className="bg-[#F4F3EE] p-4 rounded border border-brand-forest/5 text-left">
                  <span className="text-[9px] uppercase font-semibold tracking-wider text-brand-forest/55">Next 30 Days</span>
                  <div className="text-xl font-heading font-normal text-brand-forest mt-1">
                    {currentPredictions.kpis.next_month} <span className="text-[10px] font-normal text-brand-forest/50">kg CO₂e</span>
                  </div>
                  <span className="text-[9px] text-brand-forest/40">Statistical forecast baseline</span>
                </div>

                <div className="bg-[#EAECE9] p-4 rounded border border-brand-leaf/10 text-left">
                  <span className="text-[9px] uppercase font-semibold tracking-wider text-brand-leaf">Annual Estimate</span>
                  <div className="text-xl font-heading font-normal text-brand-leaf mt-1">
                    {currentPredictions.kpis.next_year} <span className="text-[10px] font-normal text-brand-forest/50">T / yr</span>
                  </div>
                  <span className="text-[9px] text-brand-forest/40">Annual lifestyle offset estimate</span>
                </div>
              </div>

              {/* Area chart visual */}
              <div className="h-64 w-full" role="img" aria-label="Area chart showing historical and forecast carbon emissions over time">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      ...currentPredictions.history,
                      ...currentPredictions.forecast
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="2 2" stroke="#1A231F" strokeOpacity={0.06} vertical={false} />
                    <XAxis dataKey="day" stroke="#1A231F" strokeOpacity={0.4} fontSize={9} tickLine={false} />
                    <YAxis stroke="#1A231F" strokeOpacity={0.4} fontSize={9} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1A231F", borderRadius: "4px", border: "0", color: "#FBFBF9", fontSize: "11px" }}
                    />
                    <Legend iconType="rect" iconSize={8} />
                    <Area
                      type="monotone"
                      dataKey="Upper"
                      stroke="none"
                      fill="#3A6047"
                      fillOpacity={0.05}
                      name="Upper Bound"
                    />
                    <Area
                      type="monotone"
                      dataKey="Lower"
                      stroke="none"
                      fill="#FBFBF9"
                      fillOpacity={1}
                      name="Lower Bound"
                    />
                    <Area
                      type="monotone"
                      dataKey="Emissions"
                      stroke="#3A6047"
                      strokeWidth={1.5}
                      fill="none"
                      name="Carbon Emissions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default DashboardPage
