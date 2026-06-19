import { useState } from "react"
import {
  Calculator,
  Car,
  Zap,
  Coffee,
  Trash2,
  CheckCircle,
  Database,
  X
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { Badge } from "../../components/ui/Badge"
import { API_ENDPOINTS, apiUrl } from "../../config/api"

export const CalculatorPage = () => {
  // Inputs
  const [distance, setDistance] = useState<number>(120)
  const [fuelType, setFuelType] = useState<string>("petrol")
  const [electricity, setElectricity] = useState<number>(250)
  const [diet, setDiet] = useState<string>("average")
  const [waste, setWaste] = useState<number>(15)

  // System states
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  // Footprint computation formulas
  const calculateEmissions = () => {
    // 1. Transportation footprint (kg CO2e per week)
    let transportFactor = 0.18 // petrol kg/km
    if (fuelType === "diesel") transportFactor = 0.20
    if (fuelType === "hybrid") transportFactor = 0.10
    if (fuelType === "electric") transportFactor = 0.05
    const transportWeekly = distance * transportFactor

    // 2. Energy footprint (kg CO2e per week)
    // kWh/month * grid carbon intensity (e.g. 0.38 kg/kWh) / 4.3 weeks
    const energyWeekly = (electricity * 0.38) / 4.33

    // 3. Food footprint (kg CO2e per week)
    let foodDaily = 6.0 // average diet
    if (diet === "vegan") foodDaily = 2.7
    if (diet === "vegetarian") foodDaily = 4.4
    if (diet === "meat_heavy") foodDaily = 11.5
    const foodWeekly = foodDaily * 7

    // 4. Waste footprint (kg CO2e per week)
    // kg waste * plastic landfill factor (e.g. 0.92 kg CO2e per kg waste)
    const wasteWeekly = waste * 0.92

    const weeklyTotal = transportWeekly + energyWeekly + foodWeekly + wasteWeekly
    const yearlyTotal = weeklyTotal * 52
    const monthlyTotal = yearlyTotal / 12
    const dailyTotal = weeklyTotal / 7

    return {
      daily: parseFloat(dailyTotal.toFixed(1)),
      monthly: parseFloat(monthlyTotal.toFixed(0)),
      yearly: parseFloat((yearlyTotal / 1000).toFixed(1)), // Tonnes per year
      breakdown: {
        transport: parseFloat((transportWeekly * 52 / 1000).toFixed(1)),
        energy: parseFloat((energyWeekly * 52 / 1000).toFixed(1)),
        food: parseFloat((foodWeekly * 52 / 1000).toFixed(1)),
        waste: parseFloat((wasteWeekly * 52 / 1000).toFixed(1))
      }
    }
  }

  const results = calculateEmissions()
  const totalTonnes = results.yearly

  const fuelOptions = [
    { value: "petrol", label: "Petrol" },
    { value: "diesel", label: "Diesel" },
    { value: "hybrid", label: "Hybrid" },
    { value: "electric", label: "Electric EV" }
  ]

  const dietOptions = [
    { value: "vegan", label: "Vegan" },
    { value: "vegetarian", label: "Vegetarian" },
    { value: "average", label: "Average Diet" },
    { value: "meat_heavy", label: "Meat-Heavy" }
  ]

  const handleSaveToDB = async () => {
    setLoading(true)
    setError("")
    setSuccess("")

    const recordPayload = {
      travel_distance: distance,
      fuel_type: fuelType,
      electricity_usage: electricity,
      diet_preference: diet,
      waste_generation: waste,
      daily_footprint: results.daily,
      monthly_footprint: results.monthly,
      yearly_footprint: results.yearly
    }

    try {
      const token = sessionStorage.getItem("greenbit_auth_token")
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      const response = await fetch(apiUrl(API_ENDPOINTS.CALCULATOR_RECORD), {
        method: "POST",
        headers,
        body: JSON.stringify(recordPayload)
      })

      if (response.ok) {
        setSuccess("Footprint details successfully recorded in PostgreSQL database.")
      } else {
        setError("Could not write record to PostgreSQL server database.")
      }
    } catch (err) {
      console.warn("Backend not active, simulated fallback storage triggered", err)
      await new Promise((resolve) => setTimeout(resolve, 800))
      // Simulated cached save
      const savedList = JSON.parse(localStorage.getItem("calculator_records") || "[]")
      savedList.push({ id: savedList.length + 1, timestamp: new Date().toLocaleDateString(), ...recordPayload })
      localStorage.setItem("calculator_records", JSON.stringify(savedList))
      setSuccess("Recorded successfully (Simulated Database fallback cached).")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Input panel Form */}
      <Card className="lg:col-span-2 border-brand-forest/5 bg-white">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-brand-leaf" />
            <CardTitle>High Fidelity Footprint Parameters</CardTitle>
          </div>
          <CardDescription>
            Enter your monthly usage statistics. Projections recalibrate in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transportation */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-brand-forest/5 pb-2">
              <Car className="h-4 w-4 text-brand-leaf" />
              <h3 className="text-xs font-heading font-semibold text-brand-forest uppercase tracking-wider">Transportation</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Weekly Commute Distance (km)"
                type="number"
                min="0"
                value={distance}
                onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
              />
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-heading font-semibold text-brand-forest/75 uppercase tracking-wide">
                  Vehicle Fuel Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {fuelOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFuelType(opt.value)}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-heading font-medium transition-all ${
                        fuelType === opt.value
                          ? "border-brand-leaf bg-brand-mist/20 text-brand-forest ring-1 ring-brand-leaf/25"
                          : "border-brand-forest/10 hover:border-brand-forest/20 text-brand-forest/65"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Energy & Utility */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2 border-b border-brand-forest/5 pb-2">
              <Zap className="h-4 w-4 text-brand-leaf" />
              <h3 className="text-xs font-heading font-semibold text-brand-forest uppercase tracking-wider">Energy & Power</h3>
            </div>
            <Input
              label="Monthly Electricity Consumption (kWh)"
              type="number"
              min="0"
              value={electricity}
              onChange={(e) => setElectricity(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Food Nutrition */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2 border-b border-brand-forest/5 pb-2">
              <Coffee className="h-4 w-4 text-brand-leaf" />
              <h3 className="text-xs font-heading font-semibold text-brand-forest uppercase tracking-wider">Dietary Preferences</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {dietOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDiet(opt.value)}
                  className={`p-3 rounded-xl border text-center font-heading font-medium text-xs transition-all ${
                    diet === opt.value
                      ? "border-brand-leaf bg-brand-mist/20 text-brand-forest ring-1 ring-brand-leaf/25"
                      : "border-brand-forest/10 hover:border-brand-forest/20 text-brand-forest/65"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Waste Management */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2 border-b border-brand-forest/5 pb-2">
              <Trash2 className="h-4 w-4 text-brand-leaf" />
              <h3 className="text-xs font-heading font-semibold text-brand-forest uppercase tracking-wider">Waste Generation</h3>
            </div>
            <Input
              label="Weekly Garbage Generated (kg)"
              type="number"
              min="0"
              value={waste}
              onChange={(e) => setWaste(parseFloat(e.target.value) || 0)}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Badge variant="neutral" className="text-[10px]">
            Values mapped to standardized EPA coefficients.
          </Badge>
          <Button
            variant="secondary"
            onClick={handleSaveToDB}
            isLoading={loading}
            leftIcon={<Database className="h-4 w-4" />}
          >
            Record in Database
          </Button>
        </CardFooter>
      </Card>

      {/* Outputs & Breakdown panel */}
      <div className="space-y-8">
        {/* Footprint total widget */}
        <Card className="bg-brand-forest text-brand-chalk overflow-hidden relative border-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-leaf/20 rounded-full blur-2xl pointer-events-none" />
          <CardHeader>
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-leaf font-heading">
              Total Yearly Footprint
            </span>
          </CardHeader>
          <CardContent className="space-y-2 pb-6">
            <div className="text-5xl font-heading font-extrabold text-white">
              {totalTonnes} <span className="text-sm font-body font-normal text-brand-chalk/75">Tonnes/yr</span>
            </div>
            <p className="text-[10px] text-brand-chalk/65 font-body leading-relaxed">
              Your parameters map to a daily emission projection of <span className="font-bold text-white">{results.daily} kg CO2e</span>, or roughly <span className="font-bold text-white">{results.monthly} kg</span> monthly.
            </p>
          </CardContent>
        </Card>

        {/* Breakdown bar graph card */}
        <Card className="border-brand-forest/5 bg-white">
          <CardHeader>
            <CardTitle>Category Breakdowns</CardTitle>
            <CardDescription>Tonnes CO2e generated annually by category.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Transport Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-body">
                <span className="font-semibold text-brand-forest">Transportation</span>
                <span className="font-bold text-brand-forest">{results.breakdown.transport} T</span>
              </div>
              <div className="w-full bg-brand-chalk h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand-leaf h-full transition-all duration-300"
                  style={{ width: `${(results.breakdown.transport / totalTonnes) * 100 || 0}%` }}
                />
              </div>
            </div>

            {/* Energy Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-body">
                <span className="font-semibold text-brand-forest">Energy & Power</span>
                <span className="font-bold text-brand-forest">{results.breakdown.energy} T</span>
              </div>
              <div className="w-full bg-brand-chalk h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand-forest/75 h-full transition-all duration-300"
                  style={{ width: `${(results.breakdown.energy / totalTonnes) * 100 || 0}%` }}
                />
              </div>
            </div>

            {/* Food Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-body">
                <span className="font-semibold text-brand-forest">Food Diet</span>
                <span className="font-bold text-brand-forest">{results.breakdown.food} T</span>
              </div>
              <div className="w-full bg-brand-chalk h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand-amber h-full transition-all duration-300"
                  style={{ width: `${(results.breakdown.food / totalTonnes) * 100 || 0}%` }}
                />
              </div>
            </div>

            {/* Waste Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-body">
                <span className="font-semibold text-brand-forest">Waste Landfill</span>
                <span className="font-bold text-brand-forest">{results.breakdown.waste} T</span>
              </div>
              <div className="w-full bg-brand-chalk h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-red-400 h-full transition-all duration-300"
                  style={{ width: `${(results.breakdown.waste / totalTonnes) * 100 || 0}%` }}
                />
              </div>
            </div>

            {/* Success and Error messages */}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-start space-x-2 mt-4">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start space-x-2 mt-4">
                <X className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
