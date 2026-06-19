import { useState, useEffect, useMemo } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import {
  Trash2,
  Info,
  Bookmark,
  TreePine,
  Car,
  Lightbulb
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { Modal } from "../../components/ui/Modal"
import { Skeleton } from "../../components/ui/Skeleton"
import { apiUrl, API_ENDPOINTS } from "../../config/api"
import { apiMutate } from "../../hooks/useApiData"
import { safeParseJSON, safeSetJSON } from "../../utils/storage"
import {
  BASELINE_EMISSIONS_KG,
  BASELINE_TRANSPORT_KG,
  BASELINE_ENERGY_KG,
  BASELINE_FOOD_KG,
  COMMUTE_SHIFT_FACTOR,
  AC_REDUCTION_FACTOR,
  MEAL_SWAP_FACTOR,
  WEEKS_PER_MONTH,
  STORAGE_KEYS
} from "../../constants/emissions"

interface SimulationHistory {
  id: number
  name: string
  commute_shift: number
  ac_reduction: number
  vegetarian_meals: number
  current_emissions: number
  future_emissions: number
  savings_percent: number
  annual_impact: number
  date: string
}

type SimulationPayload = Omit<SimulationHistory, "id">

export const SimulatorPage = () => {
  const [history, setHistory] = useState<SimulationHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [scenarioName, setScenarioName] = useState("")

  // Lifestyle sliders
  const [commuteShift, setCommuteShift] = useState(25) // km/week shifted to transit
  const [acReduction, setAcReduction] = useState(3) // hours/day of AC reduced
  const [vegetarianMeals, setVegetarianMeals] = useState(5) // meat meals swapped to veg/week

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const token = sessionStorage.getItem("greenbit_auth_token")
      const headers: Record<string, string> = {}
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      const response = await fetch(apiUrl(API_ENDPOINTS.SIMULATOR_HISTORY), { headers })
      if (response.ok) {
        const data = await response.json() as SimulationHistory[]
        setHistory(data)
      } else {
        setHistory(safeParseJSON<SimulationHistory[]>(STORAGE_KEYS.SIMULATOR_HISTORY, []))
      }
    } catch {
      setHistory(safeParseJSON<SimulationHistory[]>(STORAGE_KEYS.SIMULATOR_HISTORY, []))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const transportSavings = commuteShift * WEEKS_PER_MONTH * COMMUTE_SHIFT_FACTOR
  const energySavings = acReduction * 30 * AC_REDUCTION_FACTOR
  const foodSavings = vegetarianMeals * WEEKS_PER_MONTH * MEAL_SWAP_FACTOR

  const currentTransport = BASELINE_TRANSPORT_KG
  const currentEnergy = BASELINE_ENERGY_KG
  const currentFood = BASELINE_FOOD_KG

  const projectedTransport = Math.max(BASELINE_TRANSPORT_KG - transportSavings, 10)
  const projectedEnergy = Math.max(BASELINE_ENERGY_KG - energySavings, 20)
  const projectedFood = Math.max(BASELINE_FOOD_KG - foodSavings, 10)

  const currentTotal = BASELINE_EMISSIONS_KG
  const projectedTotal = projectedTransport + projectedEnergy + projectedFood
  const totalSavings = currentTotal - projectedTotal
  const savingsPercent = (totalSavings / currentTotal) * 100
  const annualImpact = (totalSavings * 12) / 1000 // In metric Tonnes

  // Equivalent calculations
  const equivalentTrees = useMemo(() => Math.round(annualImpact * 46), [annualImpact])
  const equivalentMiles = useMemo(() => Math.round(annualImpact * 2480), [annualImpact])
  const equivalentBulbs = useMemo(() => Math.round(annualImpact * 36), [annualImpact])

  // Recharts Chart Data
  const chartData = [
    { name: "Transport", Current: currentTransport, Projected: Math.round(projectedTransport) },
    { name: "Energy", Current: currentEnergy, Projected: Math.round(projectedEnergy) },
    { name: "Food", Current: currentFood, Projected: Math.round(projectedFood) }
  ]

  const handleSaveSimulation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scenarioName.trim()) return

    const payload: SimulationPayload = {
      name: scenarioName,
      commute_shift: commuteShift,
      ac_reduction: acReduction,
      vegetarian_meals: vegetarianMeals,
      current_emissions: currentTotal,
      future_emissions: projectedTotal,
      savings_percent: Math.round(savingsPercent),
      annual_impact: parseFloat(annualImpact.toFixed(2)),
      date: new Date().toISOString().split("T")[0]
    }

    try {
      const result = await apiMutate(apiUrl(API_ENDPOINTS.SIMULATOR_RUN), "POST", payload)
      if (result.ok) {
        await fetchHistory()
      } else {
        handleLocalSave(payload)
      }
    } catch {
      handleLocalSave(payload)
    } finally {
      setIsModalOpen(false)
      setScenarioName("")
    }
  }

  const handleLocalSave = (payload: SimulationPayload) => {
    const newRecord: SimulationHistory = { id: Date.now(), ...payload }
    const updated = [...history, newRecord]
    setHistory(updated)
    safeSetJSON(STORAGE_KEYS.SIMULATOR_HISTORY, updated)
  }

  const handleDelete = async (id: number) => {
    try {
      const result = await apiMutate(apiUrl(API_ENDPOINTS.SIMULATOR_DELETE(id)), "DELETE")
      if (result.ok) {
        await fetchHistory()
      } else {
        const updated = history.filter(h => h.id !== id)
        setHistory(updated)
        safeSetJSON(STORAGE_KEYS.SIMULATOR_HISTORY, updated)
      }
    } catch {
      const updated = history.filter(h => h.id !== id)
      setHistory(updated)
      safeSetJSON(STORAGE_KEYS.SIMULATOR_HISTORY, updated)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-brand-forest/10 pb-6">
        <div>
          <h1 className="text-4xl font-heading font-normal text-brand-forest">Scenario Twin Simulator</h1>
          <p className="text-sm text-brand-forest/60 font-body mt-1">Calibrate hypothetical lifestyle models and forecast carbon modifications in real-time.</p>
        </div>
        <Button
          variant="outline"
          className="border-brand-forest/20 text-brand-forest hover:bg-brand-forest/5 font-body text-xs rounded"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Bookmark className="h-4 w-4" />}
        >
          Save Simulation
        </Button>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-brand-forest/10 shadow-none">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-forest/50 font-body">
              Current Baseline
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-heading font-normal text-brand-forest">
              {currentTotal.toFixed(0)} <span className="text-xs font-body font-light text-brand-forest/60">kg CO₂e/mo</span>
            </div>
            <span className="text-[10px] text-brand-forest/40 font-body">Primary onboarding parameters</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-brand-forest/10 shadow-none">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-forest/50 font-body">
              Projected Output
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-heading font-normal text-brand-leaf">
              {projectedTotal.toFixed(0)} <span className="text-xs font-body font-light text-brand-forest/60">kg CO₂e/mo</span>
            </div>
            <span className="text-[10px] text-brand-leaf font-semibold font-body">Reflected from simulated controls</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-brand-forest/10 shadow-none">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-forest/50 font-body">
              Relative Savings
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-heading font-normal text-brand-leaf flex items-baseline">
              {Math.round(savingsPercent)}%
            </div>
            <span className="text-[10px] text-brand-forest/40 font-body">Total carbon efficiency gain</span>
          </CardContent>
        </Card>

        <Card className="bg-[#EAECE9] border-brand-forest/10 shadow-none">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-leaf font-body">
              Annual Offset
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-heading font-normal text-brand-forest">
              -{annualImpact.toFixed(2)} <span className="text-xs font-body font-light text-brand-forest/60">T / yr</span>
            </div>
            <span className="text-[10px] text-brand-forest/50 font-body">Equivalent annual output reduction</span>
          </CardContent>
        </Card>
      </div>

      {/* Sliders and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sliders Input Panel */}
        <Card className="bg-white border-brand-forest/10 flex flex-col justify-between shadow-none">
          <CardHeader>
            <CardTitle className="font-heading font-normal">Lifestyle Calibration</CardTitle>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-forest/50 font-body">
              Modify controls to forecast changes
            </span>
          </CardHeader>
          <CardContent className="space-y-6 text-left">
            {/* Transit Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-body font-semibold text-brand-forest">
                <span>Public Transit Shift</span>
                <span className="text-brand-leaf font-bold">{commuteShift} km/week</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={commuteShift}
                onChange={e => setCommuteShift(parseInt(e.target.value))}
                className="w-full h-1 bg-[#EAECE9] rounded appearance-none cursor-pointer accent-brand-leaf transition-all"
              />
              <span className="text-[10px] text-brand-forest/50 font-body">Commute distance transitioned to transit</span>
            </div>

            {/* AC Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-body font-semibold text-brand-forest">
                <span>Utility HVAC Reduction</span>
                <span className="text-brand-leaf font-bold">{acReduction} hrs/day</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                value={acReduction}
                onChange={e => setAcReduction(parseInt(e.target.value))}
                className="w-full h-1 bg-[#EAECE9] rounded appearance-none cursor-pointer accent-brand-leaf transition-all"
              />
              <span className="text-[10px] text-brand-forest/50 font-body">Hours saved cooling or heating your dwelling</span>
            </div>

            {/* Veg Diet Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-body font-semibold text-brand-forest">
                <span>Low-Impact Meal Swaps</span>
                <span className="text-brand-leaf font-bold">{vegetarianMeals} meals/week</span>
              </div>
              <input
                type="range"
                min="0"
                max="21"
                value={vegetarianMeals}
                onChange={e => setVegetarianMeals(parseInt(e.target.value))}
                className="w-full h-1 bg-[#EAECE9] rounded appearance-none cursor-pointer accent-brand-leaf transition-all"
              />
              <span className="text-[10px] text-brand-forest/50 font-body">Meat meals swapped for vegetarian alternatives</span>
            </div>
          </CardContent>
          <CardFooter className="border-t border-brand-forest/5 bg-[#F4F3EE]/40 py-3 px-6 text-[10px] text-brand-forest/50 font-body">
            <Info className="h-4 w-4 mr-1.5 text-brand-leaf shrink-0 inline align-middle -mt-0.5" />
            <span>Calibrations compute instantly.</span>
          </CardFooter>
        </Card>

        {/* Recharts comparison Chart */}
        <Card className="lg:col-span-2 bg-white border-brand-forest/10 shadow-none">
          <CardHeader>
            <CardTitle className="font-heading font-normal">Scenario Output Projections</CardTitle>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-forest/50 font-body">
              Emissions comparison parameters (kg CO₂e/mo)
            </span>
          </CardHeader>
          <figure aria-label="Bar chart comparing current and projected monthly carbon emissions by category">
            <figcaption className="sr-only">
              Comparison chart showing current vs projected CO₂ emissions (kg/month) across Transport, Energy, and Food categories.
            </figcaption>
            <div className="h-72" role="img" aria-label="Bar chart: current vs projected emissions">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1A231F" strokeOpacity={0.06} vertical={false} />
                  <XAxis dataKey="name" stroke="#1A231F" strokeOpacity={0.4} fontSize={9} tickLine={false} />
                  <YAxis stroke="#1A231F" strokeOpacity={0.4} fontSize={9} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1A231F", borderRadius: "4px", border: "0", color: "#FBFBF9", fontSize: "11px" }}
                  />
                  <Legend iconType="rect" iconSize={8} wrapperStyle={{ paddingTop: "10px" }} />
                  <Bar dataKey="Current" fill="#EAECE9" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Projected" fill="#3A6047" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </figure>
        </Card>
      </div>

      {/* Environmental Equivalencies Panel (UX improvement) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-brand-forest/10 shadow-none flex items-center p-5 rounded-lg">
          <div className="p-3 bg-brand-mist/20 rounded text-brand-leaf mr-4">
            <TreePine className="h-6 w-6" />
          </div>
          <div className="text-left font-body">
            <span className="text-[10px] font-semibold text-brand-forest/50 uppercase tracking-wider block">Trees Planted</span>
            <div className="text-xl font-heading font-normal text-brand-forest mt-0.5">{equivalentTrees} trees</div>
            <p className="text-[9px] text-brand-forest/60 mt-0.5 leading-relaxed">Equivalent carbon sequestered by growing saplings.</p>
          </div>
        </Card>

        <Card className="bg-white border-brand-forest/10 shadow-none flex items-center p-5 rounded-lg">
          <div className="p-3 bg-brand-mist/20 rounded text-brand-leaf mr-4">
            <Car className="h-6 w-6" />
          </div>
          <div className="text-left font-body">
            <span className="text-[10px] font-semibold text-brand-forest/50 uppercase tracking-wider block">Un-driven Miles</span>
            <div className="text-xl font-heading font-normal text-brand-forest mt-0.5">{equivalentMiles.toLocaleString()} miles</div>
            <p className="text-[9px] text-brand-forest/60 mt-0.5 leading-relaxed">Equivalent gasoline vehicle miles eliminated.</p>
          </div>
        </Card>

        <Card className="bg-white border-brand-forest/10 shadow-none flex items-center p-5 rounded-lg">
          <div className="p-3 bg-brand-mist/20 rounded text-brand-leaf mr-4">
            <Lightbulb className="h-6 w-6" />
          </div>
          <div className="text-left font-body">
            <span className="text-[10px] font-semibold text-brand-forest/50 uppercase tracking-wider block">LED Bulbs Swapped</span>
            <div className="text-xl font-heading font-normal text-brand-forest mt-0.5">{equivalentBulbs} bulbs</div>
            <p className="text-[9px] text-brand-forest/60 mt-0.5 leading-relaxed">Equivalent power savings from utility luminary efficiency.</p>
          </div>
        </Card>
      </div>

      {/* History Grid */}
      <Card className="bg-white border-brand-forest/10 shadow-none rounded-lg">
        <CardHeader className="border-b border-brand-forest/5 pb-4">
          <CardTitle className="font-heading font-normal">Simulated Scenarios Log</CardTitle>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-forest/50 font-body">
            Historical calibrations saved for auditing comparisons
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center space-y-3 px-6">
              <div className="w-12 h-12 bg-brand-mist/20 text-brand-leaf rounded flex items-center justify-center">
                <Bookmark className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-heading font-normal text-brand-forest">No Saved Scenarios</h4>
                <p className="text-xs text-brand-forest/50 font-body max-w-sm mx-auto">
                  Calibrate the sliders above to experiment with lifestyle updates, then click "Save Simulation".
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-forest/10 bg-[#F4F3EE]/30 text-[10px] uppercase font-body font-semibold text-brand-forest/60">
                    <th className="py-3 px-6">Scenario Title</th>
                    <th className="py-3 px-6">Toggles (Transit/AC/Veg)</th>
                    <th className="py-3 px-6 text-right">Projected Footprint</th>
                    <th className="py-3 px-6 text-right">Total Savings %</th>
                    <th className="py-3 px-6 text-right">Annual Impact</th>
                    <th className="py-3 px-6 text-center w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-forest/10">
                  {history.map(item => (
                    <tr key={item.id} className="font-body text-xs text-brand-forest hover:bg-[#F4F3EE]/20 transition-colors">
                      <td className="py-4 px-6 font-medium">{item.name}</td>
                      <td className="py-4 px-6 text-brand-forest/60">
                        {item.commute_shift}km • {item.ac_reduction}h • {item.vegetarian_meals}meals
                      </td>
                      <td className="py-4 px-6 text-right text-brand-forest font-medium">
                        {item.future_emissions.toFixed(0)} kg CO₂e/mo
                      </td>
                      <td className="py-4 px-6 text-right text-brand-leaf font-semibold">
                        -{item.savings_percent}%
                      </td>
                      <td className="py-4 px-6 text-right text-brand-forest font-semibold">
                        -{item.annual_impact.toFixed(2)} T/yr
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1.5 text-brand-forest/40 hover:text-brand-forest rounded"
                          onClick={() => handleDelete(item.id)}
                          aria-label={`Delete scenario: ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Save Simulation Profile"
        size="md"
        footer={
          <div className="flex justify-end space-x-3 w-full">
            <Button variant="ghost" className="rounded text-xs" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" className="border-brand-forest/20 text-brand-forest hover:bg-brand-forest/5 rounded text-xs" onClick={handleSaveSimulation} disabled={!scenarioName.trim()}>
              Save scenario
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveSimulation} className="space-y-4 text-left">
          <Input
            label="Scenario Name"
            placeholder="e.g. My Target Hybrid Commute"
            value={scenarioName}
            onChange={e => setScenarioName(e.target.value)}
            required
            className="rounded text-xs"
          />
          <div className="p-3 bg-brand-mist/20 rounded border border-brand-forest/10 space-y-1">
            <span className="text-[10px] text-brand-forest/50 font-semibold block uppercase font-body">Forecast Summary</span>
            <p className="text-xs text-brand-forest/70 leading-relaxed font-body">
              This scenario forecasts a **{Math.round(savingsPercent)}%** reduction in footprint saving **{annualImpact.toFixed(2)} metric Tonnes** of CO₂ annually.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  )
}
export default SimulatorPage
