import { useState, useEffect, useMemo } from "react"
import {
  PlusCircle,
  Sparkles,
  Zap,
  Award,
  Trash2,
  Edit,
  X,
  CheckCircle,
  ChevronRight,
  Lightbulb,
  CheckCircle2
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { Badge } from "../../components/ui/Badge"
import { Modal } from "../../components/ui/Modal"
import { CalculatorPage } from "../calculator/CalculatorPage"
import { ActivitySkeleton } from "../../components/ui/Skeleton"
import { API_BASE_URL } from "../../config/api"

interface ActivityItem {
  id: number
  type: string
  name: string
  value: number
  impact: number
  date: string
}

export const TrackerPage = () => {
  const [subTab, setSubTab] = useState<"timeline" | "calculator">("timeline")
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  // Form values
  const [type, setType] = useState("transport")
  const [name, setName] = useState("")
  const [value, setValue] = useState<number>(0)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    setFetching(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/activities`, {
        headers: {
          "Authorization": `Bearer ${sessionStorage.getItem("greenbit_auth_token") || ""}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setActivities(data)
      } else {
        throw new Error()
      }
    } catch (err) {
      console.warn("Backend offline, loading cached mock data fallback", err)
      const cached = localStorage.getItem("tracker_activities")
      if (cached) {
        setActivities(JSON.parse(cached))
      } else {
        const initialSeed = [
          { id: 1, type: "transport", name: "Metro commute", value: 15, impact: -4.2, date: new Date().toISOString().split("T")[0] },
          { id: 2, type: "food", name: "Vegetarian meals", value: 3, impact: -2.1, date: new Date().toISOString().split("T")[0] },
          { id: 3, type: "energy", name: "Appliance eco use", value: 4, impact: -1.5, date: new Date(Date.now() - 86400000).toISOString().split("T")[0] }
        ]
        setActivities(initialSeed)
        localStorage.setItem("tracker_activities", JSON.stringify(initialSeed))
      }
    } finally {
      setFetching(false)
    }
  }

  const getCalculatedImpact = (activityType: string, activityVal: number) => {
    let impactFactor = 0
    if (activityType === "transport") impactFactor = -0.28
    if (activityType === "energy") impactFactor = -0.38
    if (activityType === "food") impactFactor = -0.70
    if (activityType === "waste") impactFactor = -0.92
    return parseFloat((activityVal * impactFactor).toFixed(1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Please specify an activity description.")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    const impact = getCalculatedImpact(type, value)
    const payload = { type, name, value, impact, date }

    try {
      let response
      if (editingId) {
        response = await fetch(`${API_BASE_URL}/api/activities/${editingId}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("greenbit_auth_token") || ""}`
          },
          body: JSON.stringify(payload)
        })
      } else {
        response = await fetch(`${API_BASE_URL}/api/activities`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("greenbit_auth_token") || ""}`
          },
          body: JSON.stringify(payload)
        })
      }

      if (response.ok) {
        setSuccess(editingId ? "Activity updated successfully." : "Activity logged successfully.")
        setIsModalOpen(false)
        fetchActivities()
        resetForm()
        
        // Custom update points event trigger
        const points = type === "transport" ? 20 : type === "energy" ? 25 : type === "food" ? 15 : 10
        const event = new CustomEvent("gamification-updated", {
          detail: { pointsAdded: points }
        })
        window.dispatchEvent(event)
      } else {
        setError("Error writing record to database.")
      }
    } catch (err) {
      console.warn("Backend not active, saving to local storage cache fallback", err)
      const list = [...activities]
      if (editingId) {
        const idx = list.findIndex((a) => a.id === editingId)
        if (idx !== -1) {
          list[idx] = { id: editingId, ...payload }
        }
      } else {
        list.push({ id: Date.now(), ...payload })
      }
      setActivities(list)
      localStorage.setItem("tracker_activities", JSON.stringify(list))
      setSuccess(editingId ? "Activity updated (Simulated)." : "Activity logged (Simulated).")
      setIsModalOpen(false)
      resetForm()

      const points = type === "transport" ? 20 : type === "energy" ? 25 : type === "food" ? 15 : 10
      const event = new CustomEvent("gamification-updated", {
        detail: { pointsAdded: points }
      })
      window.dispatchEvent(event)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAdd = async (preset: { type: string, name: string, value: number, points: number }) => {
    const impact = getCalculatedImpact(preset.type, preset.value)
    const newActivity: ActivityItem = {
      id: Date.now(),
      type: preset.type,
      name: preset.name,
      value: preset.value,
      impact,
      date: new Date().toISOString().split("T")[0]
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem("greenbit_auth_token") || ""}`
        },
        body: JSON.stringify({
          type: preset.type,
          name: preset.name,
          value: preset.value,
          impact,
          date: newActivity.date
        })
      })
      if (response.ok) {
        const added = await response.json()
        setActivities(prev => [added, ...prev])
      } else {
        throw new Error()
      }
    } catch {
      const updated = [newActivity, ...activities]
      setActivities(updated)
      localStorage.setItem("tracker_activities", JSON.stringify(updated))
    }

    // Trigger toast notification
    setToastMessage(`Quick Logged "${preset.name}" (${impact} kg CO2e, +${preset.points} pts)`)
    setTimeout(() => setToastMessage(null), 3500)

    // Dispatch sidebar update
    const event = new CustomEvent("gamification-updated", {
      detail: { pointsAdded: preset.points }
    })
    window.dispatchEvent(event)
  }

  const handleEditClick = (item: ActivityItem) => {
    setEditingId(item.id)
    setType(item.type)
    setName(item.name)
    setValue(item.value)
    setDate(item.date)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/activities/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${sessionStorage.getItem("greenbit_auth_token") || ""}`
        }
      })
      if (response.ok) {
        fetchActivities()
      } else {
        throw new Error()
      }
    } catch (err) {
      console.warn("Backend offline, updating local cache fallback for delete", err)
      const list = activities.filter((a) => a.id !== id)
      setActivities(list)
      localStorage.setItem("tracker_activities", JSON.stringify(list))
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setName("")
    setValue(0)
    setDate(new Date().toISOString().split("T")[0])
    setError("")
  }

  const weeklyImpact = useMemo(() => parseFloat(activities.reduce((acc, act) => acc + act.impact, 0).toFixed(1)), [activities])
  const daysInMonth = useMemo(() => Array.from({ length: 30 }, (_, i) => i + 1), [])
  const loggedDates = useMemo(() => new Set(activities.map((a) => parseInt(a.date.split("-")[2]))), [activities])

  const quickPresets = [
    { type: "transport", name: "Metro commute", value: 15, label: "Metro (15km)", points: 20 },
    { type: "food", name: "Vegetarian meals", value: 1, label: "Veggie Meal Swapped", points: 15 },
    { type: "waste", name: "Recycled Plastic", value: 2, label: "Recycled 2kg plastic", points: 10 }
  ]

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-forest text-brand-chalk px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-brand-leaf/30 animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-brand-leaf" />
          <span className="text-xs font-heading font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-brand-forest">Daily Tracker & Timeline</h1>
          <p className="text-sm text-brand-forest/65 font-body">Create, edit, and audit daily sustainability activities.</p>
        </div>
        {subTab === "timeline" && (
          <Button
            variant="secondary"
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            Add Daily Log
          </Button>
        )}
      </div>

      {/* Subtab selection toggles */}
      <div className="flex border-b border-brand-forest/10 space-x-6 pb-1">
        <button
          onClick={() => setSubTab("timeline")}
          className={`pb-2.5 text-sm font-heading font-semibold transition-all border-b-2 ${
            subTab === "timeline" ? "border-brand-leaf text-brand-forest" : "border-transparent text-brand-forest/50 hover:text-brand-forest"
          }`}
        >
          Daily Timeline logs
        </button>
        <button
          onClick={() => setSubTab("calculator")}
          className={`pb-2.5 text-sm font-heading font-semibold transition-all border-b-2 ${
            subTab === "calculator" ? "border-brand-leaf text-brand-forest" : "border-transparent text-brand-forest/50 hover:text-brand-forest"
          }`}
        >
          Detailed Footprint Calculator
        </button>
      </div>

      {subTab === "calculator" ? (
        <CalculatorPage />
      ) : (
        <>
          {/* Top Summaries: Calendar, Templates & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Weekly carbon saved KPI */}
            <Card className="bg-brand-forest text-brand-chalk border-0 relative overflow-hidden flex flex-col justify-between shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-leaf/25 rounded-full blur-2xl pointer-events-none" />
              <CardHeader>
                <span className="text-[10px] uppercase font-bold tracking-wider text-brand-leaf font-heading">
                  Weekly Carbon Savings
                </span>
              </CardHeader>
              <CardContent className="pb-8 z-10">
                <div className="text-5xl font-heading font-extrabold text-white">
                  {Math.abs(weeklyImpact)} <span className="text-sm font-body font-normal text-brand-chalk/70">kg CO2e</span>
                </div>
                <p className="text-[10px] text-brand-chalk/65 leading-relaxed mt-2 font-body">
                  Your logged activities represent positive offset offsets reducing local greenhouse gas index levels.
                </p>
              </CardContent>
            </Card>

            {/* Quick Templates Card */}
            <Card className="border-brand-forest/5 bg-white shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="h-4.5 w-4.5 text-brand-amber animate-pulse" />
                  <CardTitle className="text-sm">Quick Log Templates</CardTitle>
                </div>
                <CardDescription className="text-[10px]">Add common logged actions with 1 click.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                {quickPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAdd(preset)}
                    className="w-full flex items-center justify-between p-2 text-xs font-body rounded-lg border border-brand-forest/5 hover:border-brand-leaf hover:bg-brand-mist/10 text-left transition-all"
                  >
                    <div>
                      <span className="font-bold text-brand-forest block">{preset.label}</span>
                      <span className="text-[10px] text-brand-forest/50 capitalize">{preset.type}</span>
                    </div>
                    <Badge variant="success" className="text-[9px] font-bold">+{preset.points} pts</Badge>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Mini Calendar visualization */}
            <Card className="border-brand-forest/5 bg-white shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Daily Logging Calendar</CardTitle>
                  <CardDescription className="text-[10px]">Highlighting logged days.</CardDescription>
                </div>
                <Badge variant="primary" className="text-[9px]">June 2026</Badge>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-heading font-semibold">
                  <span className="text-brand-forest/35">S</span>
                  <span className="text-brand-forest/35">M</span>
                  <span className="text-brand-forest/35">T</span>
                  <span className="text-brand-forest/35">W</span>
                  <span className="text-brand-forest/35">T</span>
                  <span className="text-brand-forest/35">F</span>
                  <span className="text-brand-forest/35">S</span>

                  {daysInMonth.map((day) => {
                    const hasLog = loggedDates.has(day)
                    return (
                      <div
                        key={day}
                        className={`h-6 w-full flex items-center justify-center rounded-md text-[10px] transition-all ${
                          hasLog
                            ? "bg-brand-leaf text-white font-bold shadow-md shadow-brand-leaf/10"
                            : "bg-brand-chalk/40 text-brand-forest/70 hover:bg-brand-mist/20"
                        }`}
                      >
                        {day}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main timeline listing */}
          <Card className="border-brand-forest/5 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Logged History Timeline</CardTitle>
              <CardDescription>Auditing timeline database table logs.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {fetching ? (
                <div className="p-4 space-y-4">
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                </div>
              ) : activities.length > 0 ? (
                <div className="divide-y divide-brand-forest/5 max-h-[400px] overflow-y-auto">
                  {activities.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-brand-chalk/25 transition-all">
                      <div className="flex items-center space-x-3.5 text-left font-body">
                        <div className="w-9 h-9 rounded-xl bg-brand-mist/40 text-brand-leaf flex items-center justify-center shrink-0">
                          {item.type === "transport" && <ChevronRight className="h-4 w-4" />}
                          {item.type === "energy" && <Zap className="h-4 w-4 text-red-500" />}
                          {item.type === "food" && <Sparkles className="h-4 w-4 text-brand-amber" />}
                          {item.type === "waste" && <Award className="h-4 w-4 text-emerald-500" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-brand-forest capitalize">{item.name}</h4>
                          <p className="text-[10px] text-brand-forest/40">
                            {item.date} &bull; Type: <span className="capitalize">{item.type}</span> &bull; Value: {item.value}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 shrink-0">
                        <span className="text-xs font-bold text-brand-leaf">{item.impact} kg CO2e</span>
                        <div className="flex space-x-1.5 border-l border-brand-forest/10 pl-3">
                          <Button variant="ghost" className="p-1 text-brand-forest/40 hover:text-brand-forest" onClick={() => handleEditClick(item)} aria-label={`Edit activity ${item.name}`}>
                            <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                          <Button variant="ghost" className="p-1 text-brand-forest/30 hover:text-red-600" onClick={() => handleDelete(item.id)} aria-label={`Delete activity ${item.name}`}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 bg-brand-mist/60 text-brand-leaf rounded-full flex items-center justify-center animate-bounce">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-heading font-extrabold text-brand-forest">No Activities Logged</h4>
                    <p className="text-xs text-brand-forest/50 font-body max-w-sm mx-auto">
                      Log transport, meals, electricity savings, and recycling to calculate carbon offsets.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetForm()
                      setIsModalOpen(true)
                    }}
                    leftIcon={<PlusCircle className="h-4 w-4" />}
                  >
                    Log First Activity
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* CRUD logging modal wizard */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Modify Activity Log" : "Log Daily Habit"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
              {editingId ? "Save Changes" : "Create Entry"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 font-body">
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start space-x-2">
              <X className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Select */}
          <div className="space-y-1 text-left">
            <label className="text-xs font-heading font-semibold text-brand-forest/75 uppercase tracking-wide">
              Activity Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["transport", "energy", "food", "waste"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setType(cat)}
                  className={`py-1.5 px-1 rounded-lg border text-center font-heading font-medium text-[11px] capitalize transition-all ${
                    type === cat
                      ? "border-brand-leaf bg-brand-mist/20 text-brand-forest ring-1 ring-brand-leaf/25"
                      : "border-brand-forest/10 hover:border-brand-forest/20 text-brand-forest/65"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Activity Description"
            placeholder="e.g. Took subway train to office"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={
                type === "transport"
                  ? "Distance (km)"
                  : type === "energy"
                  ? "Usage (hours)"
                  : type === "food"
                  ? "Meals count"
                  : "Garbage recycled (kg)"
              }
              type="number"
              min="0"
              value={value}
              onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
export default TrackerPage
