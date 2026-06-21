import { useState } from "react"
import {
  User,
  MapPin,
  Users,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle,
  Lightbulb,
  TreePine,
  Car,
  Flame
} from "lucide-react"
import { Button } from "../../components/ui/Button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Badge } from "../../components/ui/Badge"

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void
}

export interface OnboardingData {
  name: string
  city: string
  householdSize: number
  primaryTransport: string
  dietType: string
  electricityConsumption: number
  calculatedCarbonBaseline?: number
}

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [city, setCity] = useState("")
  const [householdSize, setHouseholdSize] = useState<number>(1)
  const [primaryTransport, setPrimaryTransport] = useState("car")
  const [dietType, setDietType] = useState("mixed")
  const [electricity, setElectricity] = useState<number>(200)
  const [error, setError] = useState("")

  const totalSteps = 4

  const transportOptions = [
    { value: "car", label: "Personal Car", desc: "Daily commutes by gas or diesel vehicle" },
    { value: "metro", label: "Metro / Train", desc: "Subways, electric light rail, or trains" },
    { value: "bus", label: "Public Bus", desc: "Transit via local municipality buses" },
    { value: "bike_walk", label: "Walk / Bicycle", desc: "Zero emissions transit commutes" }
  ]

  const dietOptions = [
    { value: "vegan", label: "Vegan", desc: "Strictly plant-based nutrition" },
    { value: "vegetarian", label: "Vegetarian", desc: "Plant-based containing dairy & eggs" },
    { value: "mixed", label: "Mixed / Flexitarian", desc: "General balanced diet with minor meat" },
    { value: "meat_heavy", label: "Meat-Heavy", desc: "Daily diet featuring beef, pork, or poultry" }
  ]

  const validateStep = () => {
    setError("")
    if (step === 1) {
      if (!name.trim()) return "Please enter your name."
      if (!city.trim()) return "Please enter your city."
    }
    if (step === 2) {
      if (householdSize <= 0) return "Household size must be at least 1."
      if (electricity < 0) return "Electricity consumption cannot be negative."
    }
    if (step === 3) {
      if (!primaryTransport) return "Please select a primary transportation method."
      if (!dietType) return "Please select a diet type."
    }
    return null
  }

  const handleNext = () => {
    const stepError = validateStep()
    if (stepError) {
      setError(stepError)
      return
    }
    setStep((prev) => Math.min(prev + 1, totalSteps))
  }

  const handleBack = () => {
    setError("")
    setStep((prev) => Math.max(prev - 1, 1))
  }

  // Calculate high-fidelity baseline carbon footprint (metric tonnes CO2e per year)
  const calculateBaseline = () => {
    let transportEmissions = 0
    if (primaryTransport === "car") transportEmissions = 3.2 // tonnes/year
    if (primaryTransport === "metro") transportEmissions = 0.4
    if (primaryTransport === "bus") transportEmissions = 0.8
    if (primaryTransport === "bike_walk") transportEmissions = 0.0

    let dietEmissions = 0
    if (dietType === "vegan") dietEmissions = 1.0
    if (dietType === "vegetarian") dietEmissions = 1.6
    if (dietType === "mixed") dietEmissions = 2.5
    if (dietType === "meat_heavy") dietEmissions = 4.2

    // Electricity emissions: kWh/month * 12 * grid carbon intensity (e.g. 0.38 kg/kWh)
    const electricityEmissions = (electricity * 12 * 0.38) / 1000 // tonnes/year
    
    // Shared household factor adjustment
    const homeFootprint = electricityEmissions / householdSize

    const totalEmissions = transportEmissions + dietEmissions + homeFootprint
    return parseFloat(totalEmissions.toFixed(1))
  }

  const baselineCO2 = calculateBaseline()
  const score = Math.max(10, Math.min(100, Math.round(100 - (baselineCO2 * 8))))

  // Initial tailored recommendations based on onboarding choices
  const getInitialRecommendations = () => {
    const recs = []
    if (primaryTransport === "car") {
      recs.push({
        title: "Try Commuting via Public Transit",
        desc: "Switching to metro or bus twice a week can slash your transit footprint by up to 30%.",
        icon: <Car className="h-4 w-4 text-brand-leaf" />
      })
    }
    if (dietType === "meat_heavy" || dietType === "mixed") {
      recs.push({
        title: "Incorporate Meatless Days",
        desc: "Eating a plant-based diet just 2 days a week saves up to 400kg of CO2 emissions annually.",
        icon: <Lightbulb className="h-4 w-4 text-brand-amber" />
      })
    }
    if (electricity > 250) {
      recs.push({
        title: "Optimize Home Heating/Cooling",
        desc: "Lowering your HVAC thermostat by 1.5°C during peak hours saves energy and reduces utility footprint.",
        icon: <Flame className="h-4 w-4 text-red-500" />
      })
    }
    if (recs.length < 3) {
      recs.push({
        title: "Tree Planting & Forest Protection",
        desc: "Offset residual carbon footprint by joining virtual tree planting activities on Leaderboard page.",
        icon: <TreePine className="h-4 w-4 text-emerald-600" />
      })
    }
    return recs.slice(0, 3)
  }

  const handleFinish = () => {
    onComplete({
      name,
      city,
      householdSize,
      primaryTransport,
      dietType,
      electricityConsumption: electricity,
      calculatedCarbonBaseline: baselineCO2
    })
  }

  return (
    <div className="min-h-screen bg-brand-chalk flex flex-col justify-center items-center p-4 selection:bg-brand-leaf selection:text-white">
      {/* Onboarding Header Title */}
      <div className="flex items-center space-x-3 mb-6 select-none animate-fade-in">
        <div className="bg-brand-forest p-2.5 rounded-xl text-brand-chalk">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <span className="font-heading font-extrabold text-xl text-brand-forest">
          GreenBit Setup Wizard
        </span>
      </div>

      <Card className="w-full max-w-xl shadow-2xl border-brand-forest/5 bg-white relative overflow-hidden flex flex-col justify-between min-h-[520px] transition-all duration-300">
        {/* Step Progress Line Indicator */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-mist flex">
          <div
            className="h-full bg-brand-leaf transition-all duration-500 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <div>
          {/* Header */}
          <CardHeader className="pt-8 pb-4">
            <div className="flex items-center justify-between">
              <Badge variant="primary" className="text-[10px]">
                Step {step} of {totalSteps}
              </Badge>
              <span className="text-xs text-brand-forest/50 font-semibold font-heading">
                {step === 1 && "Personal Info"}
                {step === 2 && "Home Energy Params"}
                {step === 3 && "Habit & Diet Profile"}
                {step === 4 && "Congratulations!"}
              </span>
            </div>
            <CardTitle className="text-xl font-bold mt-2 font-heading text-brand-forest">
              {step === 1 && "Let's personalize your dashboard"}
              {step === 2 && "Configure energy parameters"}
              {step === 3 && "Tell us about your daily habits"}
              {step === 4 && "Your Sustainable Profile is Ready!"}
            </CardTitle>
          </CardHeader>

          {/* Content */}
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start space-x-2 animate-bounce">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-brand-forest/60 font-body">
                  We need minor details to set local climate constants and adjust your carbon estimates.
                </p>
                <Input
                  label="What is your name?"
                  placeholder="John Doe"
                  leftIcon={<User className="h-4 w-4" />}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="In which city do you live?"
                  placeholder="e.g. San Francisco"
                  leftIcon={<MapPin className="h-4 w-4" />}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <p className="text-xs text-brand-forest/60 font-body">
                  Sharing resources directly affects individual energy impacts. Let's adjust for household parameters.
                </p>
                <Input
                  label="How many people live in your household?"
                  type="number"
                  min="1"
                  leftIcon={<Users className="h-4 w-4" />}
                  value={householdSize}
                  onChange={(e) => setHouseholdSize(parseInt(e.target.value) || 1)}
                  required
                />
                <Input
                  label="Monthly Electricity Consumption (kWh)"
                  type="number"
                  min="0"
                  helperText="Average household uses around 250-500 kWh per month."
                  value={electricity}
                  onChange={(e) => setElectricity(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-5 animate-fade-in">
                <fieldset className="space-y-2.5">
                  <legend className="text-xs font-heading font-semibold text-brand-forest/75 uppercase tracking-wide mb-1">
                    Primary Transit Method
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    {transportOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPrimaryTransport(opt.value)}
                        className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all duration-200 ${
                          primaryTransport === opt.value
                            ? "border-brand-leaf bg-brand-mist/25 ring-2 ring-brand-leaf/25 font-semibold"
                            : "border-brand-forest/10 hover:border-brand-forest/20 text-brand-forest/75"
                        }`}
                      >
                        <span className="text-xs font-bold text-brand-forest">{opt.label}</span>
                        <span className="text-[10px] text-brand-forest/50 leading-tight mt-1">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="space-y-2.5">
                  <legend className="text-xs font-heading font-semibold text-brand-forest/75 uppercase tracking-wide mb-1">
                    Dietary Habits
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    {dietOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDietType(opt.value)}
                        className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all duration-200 ${
                          dietType === opt.value
                            ? "border-brand-leaf bg-brand-mist/25 ring-2 ring-brand-leaf/25 font-semibold"
                            : "border-brand-forest/10 hover:border-brand-forest/20 text-brand-forest/75"
                        }`}
                      >
                        <span className="text-xs font-bold text-brand-forest">{opt.label}</span>
                        <span className="text-[10px] text-brand-forest/50 leading-tight mt-1">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="space-y-6 animate-fade-in">
                {/* Result Card */}
                <div className="bg-brand-forest text-brand-chalk p-6 rounded-2xl relative overflow-hidden flex items-center justify-between shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-leaf/35 rounded-full blur-2xl pointer-events-none animate-pulse" />
                  <div className="z-10">
                    <span className="text-[10px] uppercase font-heading font-bold text-brand-leaf tracking-wider">Estimated Carbon Footprint</span>
                    <div className="text-4xl font-heading font-extrabold text-white mt-1">
                      {baselineCO2} <span className="text-sm font-body font-normal text-brand-chalk/75">Tonnes CO2e/yr</span>
                    </div>
                    <p className="text-[10px] text-brand-chalk/65 mt-2">
                      Comparable US average is ~16.0 Tonnes/yr. Global average is ~4.5 Tonnes/yr.
                    </p>
                  </div>
                  <div className="z-10 text-center border-l border-brand-chalk/10 pl-6 shrink-0">
                    <span className="text-[10px] text-brand-chalk/65 uppercase tracking-wider block font-heading">Sustainability Score</span>
                    <div className="text-4xl font-heading font-extrabold text-brand-amber mt-1 animate-pulse">{score}</div>
                  </div>
                </div>

                {/* Personalized Actionable Recommendations */}
                <div className="space-y-3">
                  <h4 className="text-xs font-heading font-semibold text-brand-forest uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-brand-leaf" /> Personalized Next Steps
                  </h4>
                  <div className="space-y-2">
                    {getInitialRecommendations().map((rec, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 bg-brand-mist/20 rounded-xl border border-brand-forest/5 font-body">
                        <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
                          {rec.icon}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-brand-forest">{rec.title}</h5>
                          <p className="text-[10px] text-brand-forest/65 mt-0.5 leading-relaxed">{rec.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LIVE INDICATOR (Bottom preview bar on steps 1, 2, 3) */}
            {step < 4 && (
              <div className="mt-4 p-3 bg-brand-mist/20 rounded-xl border border-brand-forest/5 flex items-center justify-between text-xs animate-fade-in font-body">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-brand-leaf animate-ping" />
                  <span className="text-brand-forest/65 font-medium">Dynamic Live Baseline Estimation:</span>
                </div>
                <div className="font-heading font-bold text-brand-forest text-sm">
                  {baselineCO2} Tonnes CO2/yr
                </div>
              </div>
            )}
          </CardContent>
        </div>

        {/* Footer */}
        <CardFooter className="bg-brand-chalk/25 border-t border-brand-forest/5 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          >
            Back
          </Button>

          {step < totalSteps ? (
            <Button
              variant="primary"
              onClick={handleNext}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={handleFinish}
              leftIcon={<CheckCircle className="h-4 w-4" />}
            >
              Start Tracking
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

// Alert component mock for localized usage inside file
const AlertCircle = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)
