import { useState, useEffect, useRef } from "react"
import {
  Trophy,
  Award,
  Zap,
  Sparkles,
  Shield,
  MapPin,
  Flame,
  Check
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { calculateLevel, dispatchGamificationUpdate, calculateStreak } from "../../utils/gamification"
import { safeParseJSON, safeSetJSON } from "../../utils/storage"
import { STORAGE_KEYS, CARBON_PER_POINT, LEVEL_THRESHOLDS, LEVEL_NAMES } from "../../constants/emissions"
import { API_ENDPOINTS, apiUrl } from "../../config/api"
import { apiMutate } from "../../hooks/useApiData"

interface BadgeData {
  id: string
  title: string
  description: string
  unlocked: boolean
  unlocked_date: string | null
}

interface LeaderboardEntry {
  rank: number
  name: string
  level: string
  points: number
  carbon_saved: number
  is_current_user: boolean
}

interface UserProfile {
  points: number
  level: string
  badges: BadgeData[]
}

const FALLBACK_PROFILE: UserProfile = {
  points: 450,
  level: "Sapling",
  badges: [
    { id: "green_traveler", title: "Green Traveler", description: "Log 5 public transit activities", unlocked: true, unlocked_date: "2026-06-10" },
    { id: "energy_saver", title: "Energy Saver", description: "Reduce electricity usage by 10%", unlocked: false, unlocked_date: null },
    { id: "waste_warrior", title: "Waste Warrior", description: "Log 3 waste optimization records", unlocked: true, unlocked_date: "2026-06-11" }
  ]
}

const FALLBACK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: "Elena Rostova", level: "Forest Guardian", points: 1420, carbon_saved: 420.5, is_current_user: false },
  { rank: 2, name: "Marcus Aurelius", level: "Tree", points: 890, carbon_saved: 280.2, is_current_user: false },
  { rank: 3, name: "Demo User (You)", level: "Sapling", points: 450, carbon_saved: 150.0, is_current_user: true },
  { rank: 4, name: "Sophia Lin", level: "Sapling", points: 380, carbon_saved: 110.8, is_current_user: false },
  { rank: 5, name: "Liam Davies", level: "Seed", points: 180, carbon_saved: 45.2, is_current_user: false }
]

export const GamificationPage = () => {
  const [profile, setProfile] = useState<UserProfile>(FALLBACK_PROFILE)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(FALLBACK_LEADERBOARD)
  const [, setLoading] = useState(true)
  const [addingPoints, setAddingPoints] = useState(false)
  const [streak, setStreak] = useState(0)

  // Celebration Canvas Confetti Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const fetchData = async () => {
    try {
      const profileRes = await fetch(apiUrl(API_ENDPOINTS.GAMIFICATION_PROFILE))
      const leaderboardRes = await fetch(apiUrl(API_ENDPOINTS.GAMIFICATION_LEADERBOARD))

      if (profileRes.ok && leaderboardRes.ok) {
        const profileData = await profileRes.json() as UserProfile
        const leaderboardData = await leaderboardRes.json() as LeaderboardEntry[]
        setProfile(profileData)
        setLeaderboard(leaderboardData)
      } else {
        loadFallbackData()
      }
    } catch {
      loadFallbackData()
    } finally {
      setLoading(false)
    }
  }

  const loadFallbackData = () => {
    const cachedProfile = safeParseJSON<UserProfile>(STORAGE_KEYS.GAMIFICATION_PROFILE, FALLBACK_PROFILE)
    const cachedLeaderboard = safeParseJSON<LeaderboardEntry[]>(STORAGE_KEYS.GAMIFICATION_LEADERBOARD, FALLBACK_LEADERBOARD)
    setProfile(cachedProfile)
    setLeaderboard(cachedLeaderboard)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
    
    // Calculate streak from activities
    const cachedActs = localStorage.getItem("tracker_activities")
    if (cachedActs) {
      try {
        const parsed = JSON.parse(cachedActs)
        setStreak(calculateStreak(parsed))
      } catch {
        setStreak(0)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Canvas Particle Confetti Animation
  const startCelebration = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const particles: any[] = []
    const colors = ["#4A7C59", "#D4A853", "#1A2E1E", "#3b82f6", "#10b981", "#ef4444"]

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15 - 5,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.015 + 0.01
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let living = false

      particles.forEach((p) => {
        if (p.alpha > 0) {
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.2 // Gravity
          p.alpha -= p.decay
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.globalAlpha = p.alpha
          ctx.fill()
          living = true
        }
      })

      if (living) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    animate()
  }

  const handleAddPoints = async (amount: number) => {
    setAddingPoints(true)
    try {
      const result = await apiMutate(apiUrl(API_ENDPOINTS.GAMIFICATION_ADD_POINTS), "POST", { points_to_add: amount })
      if (result.ok) {
        await fetchData()
        startCelebration()
      } else {
        handleLocalPointsAdd(amount)
      }
    } catch {
      handleLocalPointsAdd(amount)
    } finally {
      setAddingPoints(false)
    }
  }

  const handleLocalPointsAdd = (amount: number) => {
    const updatedPoints = profile.points + amount
    const updatedLvl = calculateLevel(updatedPoints)

    const updatedBadges = profile.badges.map(b => {
      if (b.id === "energy_saver" && updatedPoints > LEVEL_THRESHOLDS.TREE && !b.unlocked) {
        return { ...b, unlocked: true, unlocked_date: new Date().toISOString().split("T")[0] }
      }
      return b
    })

    const newProfile = { points: updatedPoints, level: updatedLvl, badges: updatedBadges }
    setProfile(newProfile)
    safeSetJSON(STORAGE_KEYS.GAMIFICATION_PROFILE, newProfile)
    dispatchGamificationUpdate(updatedPoints, updatedLvl)

    // Update leaderboard
    const newLeaderboard = leaderboard.map(entry => {
      if (entry.is_current_user) {
        return { ...entry, points: updatedPoints, level: updatedLvl, carbon_saved: entry.carbon_saved + (amount * CARBON_PER_POINT) }
      }
      return entry
    }).sort((a, b) => b.points - a.points)

    const rankedLeaderboard = newLeaderboard.map((item, idx) => ({ ...item, rank: idx + 1 }))
    setLeaderboard(rankedLeaderboard)
    safeSetJSON(STORAGE_KEYS.GAMIFICATION_LEADERBOARD, rankedLeaderboard)
    
    // Trigger visual confetti
    startCelebration()
  }

  const getNextLevelInfo = (pts: number) => {
    if (pts <= LEVEL_THRESHOLDS.SAPLING) return { next: LEVEL_NAMES.SAPLING, target: LEVEL_THRESHOLDS.SAPLING, current: pts, min: 0 }
    if (pts <= LEVEL_THRESHOLDS.TREE) return { next: LEVEL_NAMES.TREE, target: LEVEL_THRESHOLDS.TREE, current: pts, min: LEVEL_THRESHOLDS.SAPLING + 1 }
    if (pts <= LEVEL_THRESHOLDS.FOREST_GUARDIAN) return { next: LEVEL_NAMES.FOREST_GUARDIAN, target: LEVEL_THRESHOLDS.FOREST_GUARDIAN, current: pts, min: LEVEL_THRESHOLDS.TREE + 1 }
    return { next: "Max Level Reached", target: pts, current: pts, min: LEVEL_THRESHOLDS.FOREST_GUARDIAN }
  }

  const lvlInfo = getNextLevelInfo(profile.points)
  const range = lvlInfo.target - lvlInfo.min
  const levelProgress = range > 0 ? ((profile.points - lvlInfo.min) / range) * 100 : 100

  const getBadgeIcon = (id: string) => {
    switch (id) {
      case "green_traveler": return <MapPin className="h-6 w-6" />
      case "energy_saver": return <Zap className="h-6 w-6" />
      case "waste_warrior": return <Shield className="h-6 w-6" />
      default: return <Award className="h-6 w-6" />
    }
  }

  const getBadgeColors = (id: string, unlocked: boolean) => {
    if (!unlocked) return "bg-brand-chalk text-brand-forest/20 border-brand-forest/5"
    switch (id) {
      case "green_traveler": return "bg-brand-mist/30 text-brand-leaf border-brand-leaf/20"
      case "energy_saver": return "bg-brand-amber/15 text-brand-amber border-brand-amber/30"
      case "waste_warrior": return "bg-brand-forest/10 text-brand-forest border-brand-forest/20"
      default: return "bg-brand-mist/30 text-brand-leaf border-brand-leaf/20"
    }
  }

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Celebration overlay canvas */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      />

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-brand-forest">Eco Rewards & Rank</h1>
          <p className="text-sm text-brand-forest/65 font-body">Earn points, unlock green badges, and climb the public carbon leaderboard.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddPoints(50)}
            isLoading={addingPoints}
            leftIcon={<Sparkles className="h-4 w-4 text-brand-amber animate-pulse" />}
          >
            Simulate Activity (+50 Pts)
          </Button>
        </div>
      </div>

      {/* Grid of Profile, Streaks and Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Details and Streak Card */}
        <div className="space-y-6 lg:col-span-1 text-left font-body">
          <Card className="bg-white border-brand-forest/5 shadow-sm">
            <CardHeader>
              <CardTitle>Eco Status & Streak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Level indicator */}
              <div className="flex justify-between items-center bg-brand-mist/20 p-4 rounded-xl border border-brand-forest/5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-brand-forest/40 tracking-wider">Current Level</span>
                  <div className="text-xl font-heading font-extrabold text-brand-forest mt-0.5">{profile.level}</div>
                </div>
                <div className="bg-brand-leaf text-white px-3 py-1.5 rounded-xl font-heading font-extrabold text-xs">
                  {profile.points} pts
                </div>
              </div>

              {/* Streak Badge (Interactive UX) */}
              {streak > 0 ? (
                <div className="flex items-center space-x-3 bg-brand-amber/15 border border-brand-amber/30 p-4 rounded-xl">
                  <div className="p-2.5 bg-brand-amber rounded-lg text-white animate-pulse">
                    <Flame className="h-5 w-5 fill-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-forest">{streak} Day Active Streak!</h4>
                    <p className="text-[10px] text-brand-forest/60">Log activities daily to keep the fire burning.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3 bg-brand-chalk border border-brand-forest/10 p-4 rounded-xl">
                  <div className="p-2.5 bg-brand-forest/10 rounded-lg text-brand-forest/40">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-forest/50">No Active Streak</h4>
                    <p className="text-[10px] text-brand-forest/40">Log your first activity to start a streak.</p>
                  </div>
                </div>
              )}

              {/* Next Level Target */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-heading font-semibold text-brand-forest">
                  <span>Progress to Next Tier</span>
                  <span className="text-brand-leaf">{Math.round(levelProgress)}%</span>
                </div>
                <div className="w-full bg-brand-chalk h-2.5 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-brand-leaf rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${levelProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-brand-forest/40">
                  <span>{profile.points} Pts</span>
                  <span>{lvlInfo.next === "Max Level Reached" ? "Max Level" : `${lvlInfo.target} Pts`}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Badges Section */}
        <Card className="bg-white border-brand-forest/5 lg:col-span-2 shadow-sm text-left">
          <CardHeader>
            <CardTitle>Achievements & Badges</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            {profile.badges.map(badge => (
              <div
                key={badge.id}
                className={`p-5 rounded-2xl border flex flex-col items-center justify-between text-center transition-all duration-300 font-body ${
                  badge.unlocked 
                    ? "hover:scale-[1.03] hover:shadow-lg cursor-default" 
                    : "opacity-60"
                } ${getBadgeColors(badge.id, badge.unlocked)}`}
              >
                <div className={`p-4 rounded-full bg-white shadow-sm flex items-center justify-center ${badge.unlocked ? "text-inherit" : "text-brand-forest/20"}`}>
                  {getBadgeIcon(badge.id)}
                </div>
                <div className="mt-4 space-y-1">
                  <h4 className="text-xs font-extrabold font-heading text-brand-forest">{badge.title}</h4>
                  <p className="text-[10px] text-brand-forest/65 leading-relaxed">{badge.description}</p>
                </div>
                <div className="mt-4 pt-2 border-t border-brand-forest/5 w-full flex items-center justify-center gap-1.5 text-[9px] font-semibold">
                  {badge.unlocked ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Unlocked {badge.unlocked_date}
                    </span>
                  ) : (
                    <span className="text-brand-forest/40">Locked</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Section */}
      <Card className="bg-white border-brand-forest/5 shadow-sm text-left">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>GreenBit Global Leaderboard</CardTitle>
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-forest/55 font-heading">
              Community rank by carbon saved and points
            </span>
          </div>
          <Trophy className="h-6 w-6 text-brand-amber animate-bounce" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-body">
              <thead>
                <tr className="border-y border-brand-forest/5 bg-brand-chalk/10 text-[10px] uppercase font-heading font-extrabold text-brand-forest/65">
                  <th className="py-3 px-6">Rank</th>
                  <th className="py-3 px-6">User Name</th>
                  <th className="py-3 px-6">Level</th>
                  <th className="py-3 px-6 text-right">Points</th>
                  <th className="py-3 px-6 text-right">Carbon Saved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-forest/5">
                {leaderboard.map(entry => (
                  <tr
                    key={entry.rank}
                    className={`text-xs hover:bg-brand-chalk/10 transition-colors ${
                      entry.is_current_user 
                        ? "bg-brand-mist/25 font-bold border-l-4 border-l-brand-leaf text-brand-forest" 
                        : "text-brand-forest"
                    }`}
                  >
                    <td className="py-4 px-6 font-heading font-bold">{entry.rank}</td>
                    <td className="py-4 px-6 font-semibold flex items-center gap-2">
                      {entry.name}
                      {entry.is_current_user && (
                        <span className="bg-brand-leaf text-white text-[8px] font-heading font-extrabold px-1.5 py-0.5 rounded-full uppercase">You</span>
                      )}
                    </td>
                    <td className="py-4 px-6">{entry.level}</td>
                    <td className="py-4 px-6 text-right font-heading font-extrabold text-brand-forest">{entry.points}</td>
                    <td className="py-4 px-6 text-right text-brand-leaf font-bold">-{entry.carbon_saved.toFixed(1)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default GamificationPage
