import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Activity,
  Flame,
  Award,
  Settings,
  X,
  Sparkles,
  Bot,
  Trophy,
  BarChart2,
  BookOpen
} from "lucide-react"
import { cn } from "../../utils/cn"
import { Button } from "../ui/Button"
import {
  getNextLevelInfo,
  getLevelProgress,
  GAMIFICATION_UPDATED_EVENT,
  calculateStreak,
  type LevelName
} from "../../utils/gamification"
import { safeParseJSON } from "../../utils/storage"
import { STORAGE_KEYS } from "../../constants/emissions"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  currentTab: string
  setCurrentTab: (tab: string) => void
}

interface GamificationProfile {
  points: number
  level: LevelName
}

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "activity", label: "Activity Tracker", icon: Activity },
  { id: "simulator", label: "Carbon Twin", icon: Flame },
  { id: "goals", label: "Sustainability Goals", icon: Award },
  { id: "leaderboard", label: "Leaderboard & Badges", icon: Trophy },
  { id: "coach", label: "AI Coach", icon: Bot },
  { id: "analytics", label: "Advanced Analytics", icon: BarChart2 },
  { id: "rag", label: "Climate Library", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
] as const

const DEFAULT_PROFILE: GamificationProfile = { points: 450, level: "Sapling" }

export const Sidebar = ({ isOpen, onClose, currentTab, setCurrentTab }: SidebarProps) => {
  const [profile, setProfile] = useState<GamificationProfile>(() =>
    safeParseJSON<GamificationProfile>(STORAGE_KEYS.GAMIFICATION_PROFILE, DEFAULT_PROFILE)
  )

  // Streak state calculated from tracker activities
  const [streak, setStreak] = useState(0)

  // Load activities to calculate streak on mount and whenever activities modify
  const updateStreak = () => {
    const cached = localStorage.getItem("tracker_activities")
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setStreak(calculateStreak(parsed))
      } catch {
        setStreak(0)
      }
    }
  }

  // Listen for custom gamification events instead of polling every 1s
  useEffect(() => {
    updateStreak()
    
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent<GamificationProfile>).detail
      if (detail) {
        setProfile({ points: detail.points, level: detail.level })
      }
      updateStreak()
    }

    window.addEventListener(GAMIFICATION_UPDATED_EVENT, handleUpdate)
    window.addEventListener("gamification-updated", updateStreak) // Local event triggered on activity log
    return () => {
      window.removeEventListener(GAMIFICATION_UPDATED_EVENT, handleUpdate)
      window.removeEventListener("gamification-updated", updateStreak)
    }
  }, [])

  const lvlInfo = getNextLevelInfo(profile.points)
  const progressPercent = getLevelProgress(profile.points)

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-brand-forest/30 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 bg-brand-forest text-brand-chalk border-r border-brand-forest/15 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div>
          <div className="p-6 border-b border-brand-chalk/10 flex items-center justify-between">
            <div className="flex items-center space-x-3 select-none">
              <div className="bg-brand-leaf p-2 rounded-lg text-brand-chalk flex items-center justify-center" aria-hidden="true">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <span className="text-xl font-heading font-bold leading-none tracking-tight text-white block">
                  GreenBit
                </span>
                <span className="text-[10px] text-brand-leaf font-medium font-heading">
                  AI SUSTAINABILITY
                </span>
              </div>
            </div>
            {/* Mobile Close Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-1 text-brand-chalk/60 hover:text-white"
              onClick={onClose}
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1" aria-label="Application sections">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = currentTab === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id)
                    onClose()
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-heading font-medium transition-all duration-200 select-none",
                    isActive
                      ? "bg-brand-leaf text-white font-bold shadow-md shadow-brand-leaf/10"
                      : "text-brand-chalk/70 hover:text-white hover:bg-brand-chalk/5"
                  )}
                >
                  <Icon
                    className={cn("h-4 w-4", isActive ? "text-white" : "text-brand-chalk/50")}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Footer: level indicator */}
        <div className="p-4 border-t border-brand-chalk/10">
          <div className="bg-brand-chalk/5 rounded-xl p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-heading font-semibold text-brand-leaf uppercase tracking-wider">
                Current Level
              </span>
              <span className="text-xs bg-brand-leaf/20 text-brand-leaf px-2 py-0.5 rounded-full font-heading font-bold animate-pulse">
                {profile.level}
              </span>
            </div>

            {streak > 0 && (
              <div className="flex items-center space-x-1.5 text-[10px] text-brand-amber font-heading font-bold uppercase tracking-wider animate-pulse pt-0.5">
                <Flame className="h-3.5 w-3.5 fill-brand-amber text-brand-amber shrink-0" />
                <span>{streak} Day Logging Streak!</span>
              </div>
            )}

            <div className="space-y-1">
              <div
                className="w-full bg-brand-chalk/10 h-1.5 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={profile.points}
                aria-valuemin={lvlInfo.min}
                aria-valuemax={lvlInfo.target}
                aria-label={`Level progress: ${profile.points} of ${lvlInfo.target} points`}
              >
                <div
                  className="bg-brand-leaf h-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-brand-chalk/50">
                <span>{profile.points} Points</span>
                <span>
                  {profile.level === "Forest Guardian"
                    ? "Max Tier"
                    : `${lvlInfo.target} to ${lvlInfo.next}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
