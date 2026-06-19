import { useState, lazy, Suspense, useCallback } from "react"
import { Sidebar } from "./components/layout/Sidebar"
import { Navbar } from "./components/layout/Navbar"
import { Button } from "./components/ui/Button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./components/ui/Card"
import { Input } from "./components/ui/Input"
import { Modal } from "./components/ui/Modal"
import { LandingPage } from "./pages/LandingPage"
import { AuthPages } from "./pages/auth/AuthPages"
import { OnboardingWizard, type OnboardingData } from "./pages/onboarding/OnboardingWizard"
import { ErrorBoundary } from "./components/ui/ErrorBoundary"
import { sessionStore, safeParseJSON, safeSetJSON, safeRemoveItem } from "./utils/storage"
import { STORAGE_KEYS } from "./constants/emissions"

const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage").then(m => ({ default: m.DashboardPage })))
const TrackerPage = lazy(() => import("./pages/tracker/TrackerPage").then(m => ({ default: m.TrackerPage })))
const AnalyticsPage = lazy(() => import("./pages/analytics/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })))
const GoalsPage = lazy(() => import("./pages/goals/GoalsPage").then(m => ({ default: m.GoalsPage })))
const GamificationPage = lazy(() => import("./pages/gamification/GamificationPage").then(m => ({ default: m.GamificationPage })))
const CoachPage = lazy(() => import("./pages/coach/CoachPage").then(m => ({ default: m.CoachPage })))
const SimulatorPage = lazy(() => import("./pages/simulator/SimulatorPage").then(m => ({ default: m.SimulatorPage })))
const RAGAssistantPage = lazy(() => import("./pages/rag/RAGAssistantPage").then(m => ({ default: m.RAGAssistantPage })))
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage").then(m => ({ default: m.SettingsPage })))

import { Sparkles } from "lucide-react"

function App() {
  const [currentTab, setCurrentTab] = useState("landing")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const handleLogActivityClick = useCallback(() => setIsModalOpen(true), [])
  // [SEC-02 FIX] Use safeParseJSON instead of raw JSON.parse
  const [userProfile, setUserProfile] = useState<OnboardingData | undefined>(() =>
    safeParseJSON<OnboardingData | undefined>(STORAGE_KEYS.USER_PROFILE, undefined)
  )

  if (currentTab === "landing") {
    return <LandingPage onStartApp={() => setCurrentTab("login")} />
  }

  if (currentTab === "login" || currentTab === "signup" || currentTab === "forgot") {
    return (
      <AuthPages
        initialView={currentTab === "login" ? "login" : currentTab === "signup" ? "signup" : "forgot"}
        onAuthSuccess={(token) => {
          // [SEC-01 FIX] Token stored in sessionStorage via sessionStore in AuthPages
          // Kept here as secondary safety net for simulated fallback path
          sessionStore.set(STORAGE_KEYS.AUTH_TOKEN, token)
          setCurrentTab("onboarding")
        }}
        onNavigateHome={() => setCurrentTab("landing")}
      />
    )
  }

  if (currentTab === "onboarding") {
    return (
      <OnboardingWizard
        onComplete={(data) => {
          // [SEC-02 FIX] Use safeSetJSON instead of raw localStorage.setItem
          safeSetJSON(STORAGE_KEYS.ONBOARDING_COMPLETED, true)
          safeSetJSON(STORAGE_KEYS.USER_PROFILE, data)
          setUserProfile(data)
          setCurrentTab("dashboard")
        }}
      />
    )
  }

  return (
    <div className="flex min-h-screen bg-brand-chalk">
      {/* Sidebar Layout */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onMenuToggle={() => setSidebarOpen(true)}
          currentTab={currentTab === "dashboard" ? "GreenBit Dashboard" : currentTab}
        />

        {/* Dynamic Body Content */}
        <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <ErrorBoundary>
            <Suspense fallback={
              <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-brand-leaf border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-brand-forest/60 font-body">Loading carbon parameters...</p>
              </div>
            }>
              {currentTab === "dashboard" && (
                <DashboardPage
                  userProfile={userProfile}
                  onLogActivityClick={handleLogActivityClick}
                />
              )}

              {currentTab === "activity" && (
                <TrackerPage />
              )}

              {currentTab === "simulator" && (
                <SimulatorPage />
              )}

              {currentTab === "analytics" && (
                <AnalyticsPage />
              )}

              {currentTab === "goals" && (
                <GoalsPage />
              )}

              {currentTab === "leaderboard" && (
                <GamificationPage />
              )}

              {currentTab === "coach" && (
                <CoachPage userProfile={userProfile} />
              )}

              {currentTab === "rag" && (
                <RAGAssistantPage />
              )}

              {currentTab === "settings" && (
                <SettingsPage
                  userProfile={userProfile}
                  onUpdateProfile={(updated) => {
                    setUserProfile(updated)
                  }}
                  onResetOnboarding={() => {
                    safeRemoveItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
                    setUserProfile(undefined)
                    setCurrentTab("onboarding")
                  }}
                />
              )}

          {!["dashboard", "activity", "simulator", "settings", "goals", "leaderboard", "coach", "analytics", "rag"].includes(currentTab) && (
            <Card className="max-w-2xl mx-auto mt-12">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-brand-mist flex items-center justify-center text-brand-leaf mb-3">
                  <Sparkles className="h-6 w-6" />
                </div>
                <CardTitle className="capitalize">{currentTab} Section</CardTitle>
                <CardDescription>
                  This view represents the placeholder workspace for the {currentTab} page module.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center font-body text-brand-forest/75 py-6">
                All design system tokens and component modules are fully initialized and ready to build out this section.
              </CardContent>
              <CardFooter className="justify-center">
                <Button variant="outline" onClick={() => setCurrentTab("dashboard")}>
                  Return to Dashboard
                </Button>
              </CardFooter>
            </Card>
          )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Modal Showroom */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log New Sustainability Activity"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Add Log Entry
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-brand-forest/65">
            Log your daily habits to evaluate your footprint. Data points will instantly feed the twin simulation engine.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Distance Travelled (km)" placeholder="e.g. 15" type="number" />
            <Input label="Transport Mode" placeholder="e.g. Metro" />
          </div>
          <Input label="Energy Consumption (kWh)" placeholder="e.g. 1.2" type="number" />
        </div>
      </Modal>
    </div>
  )
}

export default App
