import { useState } from "react"
import {
  Award,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Calendar,
  Zap
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { Badge } from "../../components/ui/Badge"
import { Modal } from "../../components/ui/Modal"
import { GoalSkeleton } from "../../components/ui/Skeleton"
import { safeSetJSON, safeParseJSON } from "../../utils/storage"
import { STORAGE_KEYS } from "../../constants/emissions"
import { API_ENDPOINTS, apiUrl } from "../../config/api"
import { apiMutate } from "../../hooks/useApiData"

interface Goal {
  id: number
  type: string // reduce_emissions, public_transport, reduce_electricity
  title: string
  target_value: number
  current_value: number
  unit: string
  completed: boolean
  date_created: string
}

const GOAL_TYPES = [
  { value: "reduce_emissions", label: "Reduce emissions", color: "#4A7C59", defaultUnit: "kg CO2e" },
  { value: "public_transport", label: "Use public transport", color: "#D4A853", defaultUnit: "km" },
  { value: "reduce_electricity", label: "Reduce electricity usage", color: "#1A2E1E", defaultUnit: "kWh" }
]

// Fallback initial mock data if API fails
const INITIAL_GOALS: Goal[] = [
  {
    id: 1,
    type: "reduce_emissions",
    title: "Reduce home footprints",
    target_value: 150,
    current_value: 95,
    unit: "kg CO2e",
    completed: false,
    date_created: new Date().toISOString().split("T")[0]
  },
  {
    id: 2,
    type: "public_transport",
    title: "Weekly commute shift",
    target_value: 50,
    current_value: 40,
    unit: "km",
    completed: false,
    date_created: new Date().toISOString().split("T")[0]
  },
  {
    id: 3,
    type: "reduce_electricity",
    title: "Power optimization",
    target_value: 120,
    current_value: 120,
    unit: "kWh",
    completed: true,
    date_created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  }
]

const ProgressRing = ({ percentage, color = "#4A7C59", size = 64, strokeWidth = 6 }: { percentage: number; color?: string; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-brand-mist/60"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-heading font-extrabold text-brand-forest">
        {Math.round(percentage)}%
      </span>
    </div>
  )
}

export const GoalsPage = () => {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  // Form states
  const [title, setTitle] = useState("")
  const [type, setType] = useState("reduce_emissions")
  const [targetValue, setTargetValue] = useState("")
  const [currentValue, setCurrentValue] = useState("")
  const [unit, setUnit] = useState("kg CO2e")

  const fetchGoals = async () => {
    try {
      const response = await fetch(apiUrl(API_ENDPOINTS.GOALS))
      if (response.ok) {
        const data = await response.json() as Goal[]
        setGoals(data)
      } else {
        const cached = safeParseJSON(STORAGE_KEYS.SUSTAINABILITY_GOALS, INITIAL_GOALS)
        setGoals(cached)
      }
    } catch {
      const cached = safeParseJSON(STORAGE_KEYS.SUSTAINABILITY_GOALS, INITIAL_GOALS)
      setGoals(cached)
    } finally {
      setLoading(false)
    }
  }

  const saveToStorage = (updatedGoals: Goal[]) => {
    setGoals(updatedGoals)
    safeSetJSON(STORAGE_KEYS.SUSTAINABILITY_GOALS, updatedGoals)
  }

  const handleOpenCreateModal = () => {
    setEditingGoal(null)
    setTitle("")
    setType("reduce_emissions")
    setTargetValue("")
    setCurrentValue("0")
    setUnit("kg CO2e")
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (goal: Goal) => {
    setEditingGoal(goal)
    setTitle(goal.title)
    setType(goal.type)
    setTargetValue(goal.target_value.toString())
    setCurrentValue(goal.current_value.toString())
    setUnit(goal.unit)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !targetValue || !currentValue) return

    const tVal = parseFloat(targetValue)
    const cVal = parseFloat(currentValue)
    const isCompleted = cVal >= tVal

    const payload = {
      type,
      title,
      target_value: tVal,
      current_value: cVal,
      unit,
      completed: isCompleted,
      date_created: editingGoal ? editingGoal.date_created : new Date().toISOString().split("T")[0]
    }

    try {
      if (editingGoal) {
        const result = await apiMutate(apiUrl(API_ENDPOINTS.GOAL_BY_ID(editingGoal.id)), "PUT", payload)
        if (result.ok) {
          await fetchGoals()
        } else {
          const updated = goals.map(g => g.id === editingGoal.id ? { ...g, ...payload, completed: isCompleted } : g)
          saveToStorage(updated)
        }
      } else {
        const result = await apiMutate(apiUrl(API_ENDPOINTS.GOALS), "POST", payload)
        if (result.ok) {
          await fetchGoals()
        } else {
          const newGoal: Goal = { id: Date.now(), ...payload, completed: isCompleted }
          saveToStorage([...goals, newGoal])
        }
      }
      setIsModalOpen(false)
    } catch {
      if (editingGoal) {
        const updated = goals.map(g => g.id === editingGoal.id ? { ...g, ...payload, completed: isCompleted } : g)
        saveToStorage(updated)
      } else {
        const newGoal: Goal = { id: Date.now(), ...payload, completed: isCompleted }
        saveToStorage([...goals, newGoal])
      }
      setIsModalOpen(false)
    }
  }

  const handleToggleComplete = async (goal: Goal) => {
    const isCompleted = !goal.completed
    const newCurrent = isCompleted ? goal.target_value : Math.min(goal.current_value, goal.target_value - 1)
    const payload = { ...goal, completed: isCompleted, current_value: newCurrent }

    try {
      const result = await apiMutate(apiUrl(API_ENDPOINTS.GOAL_BY_ID(goal.id)), "PUT", payload)
      if (result.ok) {
        await fetchGoals()
      } else {
        saveToStorage(goals.map(g => g.id === goal.id ? payload : g))
      }
    } catch {
      saveToStorage(goals.map(g => g.id === goal.id ? payload : g))
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const result = await apiMutate(apiUrl(API_ENDPOINTS.GOAL_BY_ID(id)), "DELETE")
      if (result.ok) {
        await fetchGoals()
      } else {
        saveToStorage(goals.filter(g => g.id !== id))
      }
    } catch {
      saveToStorage(goals.filter(g => g.id !== id))
    }
  }

  // Calculate statistics
  const totalGoals = goals.length
  const completedGoals = goals.filter(g => g.completed).length
  const achievementPercentage = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-brand-forest">Sustainability Goals</h1>
          <p className="text-sm text-brand-forest/65 font-body">Set limits, target habits, and track milestone offsets.</p>
        </div>
        <Button variant="primary" onClick={handleOpenCreateModal} leftIcon={<Plus className="h-4 w-4" />}>
          Create Custom Goal
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-white border-brand-forest/5">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-forest/55 font-heading">
              Achievement Progress
            </span>
          </CardHeader>
          <CardContent className="flex items-center space-x-4">
            <div className="shrink-0">
              <ProgressRing percentage={achievementPercentage} color="#4A7C59" size={72} strokeWidth={7} />
            </div>
            <div className="space-y-0.5">
              <div className="text-2xl font-heading font-extrabold text-brand-forest">
                {Math.round(achievementPercentage)}% Complete
              </div>
              <p className="text-xs text-brand-forest/50">
                {completedGoals} of {totalGoals} milestones achieved
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-brand-forest/5">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-forest/55 font-heading">
              Active Challenges
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-heading font-extrabold text-brand-forest">
              {totalGoals - completedGoals}
            </div>
            <div className="flex items-center text-[10px] text-brand-amber font-semibold space-x-1">
              <Zap className="h-3 w-3" />
              <span>In-progress targets running</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-brand-forest/5">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-forest/55 font-heading">
              Total Milestones Completed
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-heading font-extrabold text-brand-leaf">
              {completedGoals}
            </div>
            <div className="flex items-center text-[10px] text-brand-leaf font-semibold space-x-1">
              <Award className="h-3.5 w-3.5" />
              <span>Level updates points unlocked</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GoalSkeleton />
          <GoalSkeleton />
          <GoalSkeleton />
        </div>
      ) : goals.length === 0 ? (
        <Card className="max-w-md mx-auto text-center p-8 border-brand-forest/10">
          <Award className="h-12 w-12 text-brand-leaf/40 mx-auto mb-4" />
          <h3 className="text-lg font-heading font-bold text-brand-forest">No goals created yet</h3>
          <p className="text-sm text-brand-forest/60 font-body mt-2 mb-6">
            Setting targets encourages sustainable lifestyle offsets. Add your first goal to begin tracking!
          </p>
          <Button variant="primary" onClick={handleOpenCreateModal}>
            Add First Goal
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => {
            const goalTypeDetails = GOAL_TYPES.find(gt => gt.value === goal.type) || GOAL_TYPES[0]
            const progressPercent = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0

            return (
              <Card key={goal.id} className="bg-white border-brand-forest/5 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                {goal.completed && (
                  <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                    <div className="bg-brand-leaf text-white text-[8px] font-heading font-extrabold text-center py-1 absolute transform rotate-45 top-3 -right-5 w-24">
                      COMPLETED
                    </div>
                  </div>
                )}
                
                <div>
                  <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                    <div className="space-y-1 pr-6">
                      <span className="text-[10px] uppercase font-bold tracking-wider font-heading" style={{ color: goalTypeDetails.color }}>
                        {goalTypeDetails.label}
                      </span>
                      <CardTitle className="text-base text-brand-forest truncate font-bold font-heading">
                        {goal.title}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Ring and Progress side-by-side */}
                    <div className="flex items-center justify-between bg-brand-chalk/30 p-3.5 rounded-xl border border-brand-forest/5">
                      <div className="space-y-1">
                        <span className="text-[10px] text-brand-forest/45 font-semibold block uppercase">Target Offset</span>
                        <div className="text-lg font-heading font-extrabold text-brand-forest">
                          {goal.current_value} / {goal.target_value}
                          <span className="text-xs font-body font-normal text-brand-forest/60 ml-1">
                            {goal.unit}
                          </span>
                        </div>
                      </div>
                      <ProgressRing percentage={progressPercent} color={goalTypeDetails.color} size={54} strokeWidth={5} />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-brand-forest/50">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Created {goal.date_created}</span>
                      </div>
                      <Badge variant={goal.completed ? "success" : "warning"}>
                        {goal.completed ? "Achieved" : "Active"}
                      </Badge>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="border-t border-brand-forest/5 bg-brand-chalk/10 py-3 px-6 flex justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleToggleComplete(goal)}
                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  >
                    {goal.completed ? "Undo Completion" : "Complete"}
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2"
                      onClick={() => handleOpenEditModal(goal)}
                      aria-label={`Edit goal: ${goal.title}`}
                    >
                      <Edit2 className="h-3.5 w-3.5 text-brand-forest/60" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2 border-red-100 hover:bg-red-50"
                      onClick={() => handleDelete(goal.id)}
                      aria-label={`Delete goal: ${goal.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGoal ? "Edit Goal Details" : "Create Sustainability Goal"}
        size="md"
        footer={
          <div className="flex justify-end space-x-3 w-full">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {editingGoal ? "Save Goal" : "Create Goal"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Goal Title"
            placeholder="e.g. Work commute bicycle shift"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="goal-type" className="block text-xs font-semibold text-brand-forest mb-1.5">Goal Type</label>
              <select
                id="goal-type"
                value={type}
                onChange={e => {
                  setType(e.target.value)
                  const selected = GOAL_TYPES.find(gt => gt.value === e.target.value)
                  if (selected) setUnit(selected.defaultUnit)
                }}
                className="w-full h-10 px-3 rounded-lg border border-brand-forest/15 bg-white text-sm text-brand-forest focus:outline-none focus:ring-1 focus:ring-brand-leaf font-body"
              >
                {GOAL_TYPES.map(gt => (
                  <option key={gt.value} value={gt.value}>
                    {gt.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Unit"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Current Progress"
              type="number"
              step="any"
              placeholder="e.g. 20"
              value={currentValue}
              onChange={e => setCurrentValue(e.target.value)}
              required
            />

            <Input
              label="Target Threshold"
              type="number"
              step="any"
              placeholder="e.g. 50"
              value={targetValue}
              onChange={e => setTargetValue(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default GoalsPage
