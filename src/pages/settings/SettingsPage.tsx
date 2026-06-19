import { useState, type FormEvent } from "react"
import { 
  MapPin, 
  Users, 
  Info,
  RefreshCw,
  Check
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import type { OnboardingData } from "../onboarding/OnboardingWizard"
import { safeSetJSON } from "../../utils/storage"
import { STORAGE_KEYS } from "../../constants/emissions"

interface SettingsPageProps {
  userProfile?: OnboardingData
  onUpdateProfile: (profile: OnboardingData) => void
  onResetOnboarding: () => void
}

export const SettingsPage = ({ userProfile, onUpdateProfile, onResetOnboarding }: SettingsPageProps) => {
  // Profile settings state
  const [name, setName] = useState(userProfile?.name || "")
  const [city, setCity] = useState(userProfile?.city || "")
  const [householdSize, setHouseholdSize] = useState<number>(userProfile?.householdSize || 1)
  const [primaryTransport, setPrimaryTransport] = useState(userProfile?.primaryTransport || "car")
  const [dietType, setDietType] = useState(userProfile?.dietType || "meat_heavy")
  const [electricity, setElectricity] = useState<number>(userProfile?.electricityConsumption || 200)
  
  // Status state
  const [profileSuccess, setProfileSuccess] = useState(false)

  const transportOptions = [
    { value: "car", label: "Personal Car" },
    { value: "metro", label: "Metro / Train" },
    { value: "bus", label: "Public Bus" },
    { value: "bike_walk", label: "Walk / Bicycle" }
  ]

  const dietOptions = [
    { value: "vegan", label: "Vegan" },
    { value: "vegetarian", label: "Vegetarian" },
    { value: "pescatarian", label: "Pescatarian" },
    { value: "balanced", label: "Balanced / Flexitarian" },
    { value: "meat_heavy", label: "Meat Heavy" }
  ]

  const handleSaveProfile = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const updatedProfile: OnboardingData = {
      name,
      city,
      householdSize,
      primaryTransport,
      dietType,
      electricityConsumption: electricity,
      calculatedCarbonBaseline: userProfile?.calculatedCarbonBaseline
    }
    
    // Update local storage and app state
    safeSetJSON(STORAGE_KEYS.USER_PROFILE, updatedProfile)
    onUpdateProfile(updatedProfile)
    
    setProfileSuccess(true)
    setTimeout(() => setProfileSuccess(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-brand-forest">Settings</h1>
        <p className="text-sm text-brand-forest/60 font-body">Manage your profile, baseline configuration, and carbon parameters.</p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal details and geographical location.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="City of Residence"
              placeholder="San Francisco"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              leftIcon={<MapPin className="h-4 w-4" />}
              required
            />
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-heading font-semibold text-brand-forest uppercase tracking-wider">Household Size</label>
              <div className="flex items-center space-x-2 border border-brand-forest/10 rounded-xl bg-white p-1.5 focus-within:ring-2 focus-within:ring-brand-leaf/25">
                <Users className="h-4 w-4 text-brand-forest/45 ml-2" />
                <input
                  type="number"
                  min="1"
                  className="w-full border-0 focus:ring-0 text-sm font-body bg-transparent py-1"
                  value={householdSize}
                  onChange={(e) => setHouseholdSize(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-heading font-semibold text-brand-forest uppercase tracking-wider">Monthly Electricity Consumption (kWh)</label>
              <div className="flex items-center space-x-2 border border-brand-forest/10 rounded-xl bg-white p-1.5 focus-within:ring-2 focus-within:ring-brand-leaf/25">
                <Info className="h-4 w-4 text-brand-forest/45 ml-2" />
                <input
                  type="number"
                  min="0"
                  className="w-full border-0 focus:ring-0 text-sm font-body bg-transparent py-1"
                  value={electricity}
                  onChange={(e) => setElectricity(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lifestyle Preferences</CardTitle>
            <CardDescription>
              These baselines help calibrate your initial carbon twin simulation coefficients.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-heading font-semibold text-brand-forest uppercase tracking-wider">Primary Transport Mode</label>
              <div className="grid grid-cols-1 gap-2">
                {transportOptions.map((opt) => (
                  <label 
                    key={opt.value} 
                    className={`flex items-center justify-between p-3 rounded-xl border text-sm font-body cursor-pointer transition-all ${
                      primaryTransport === opt.value 
                        ? "border-brand-leaf bg-brand-mist/20 text-brand-forest font-semibold" 
                        : "border-brand-forest/10 hover:bg-brand-chalk text-brand-forest/70"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <input 
                      type="radio" 
                      name="primaryTransport"
                      value={opt.value}
                      checked={primaryTransport === opt.value}
                      onChange={() => setPrimaryTransport(opt.value)}
                      className="text-brand-leaf focus:ring-brand-leaf"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-heading font-semibold text-brand-forest uppercase tracking-wider">Dietary Preferences</label>
              <div className="grid grid-cols-1 gap-2">
                {dietOptions.map((opt) => (
                  <label 
                    key={opt.value} 
                    className={`flex items-center justify-between p-3 rounded-xl border text-sm font-body cursor-pointer transition-all ${
                      dietType === opt.value 
                        ? "border-brand-leaf bg-brand-mist/20 text-brand-forest font-semibold" 
                        : "border-brand-forest/10 hover:bg-brand-chalk text-brand-forest/70"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <input 
                      type="radio" 
                      name="dietType"
                      value={opt.value}
                      checked={dietType === opt.value}
                      onChange={() => setDietType(opt.value)}
                      className="text-brand-leaf focus:ring-brand-leaf"
                    />
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-brand-forest/5 pt-4">
            <div className="text-xs text-brand-forest/55 flex items-center gap-1.5">
              {profileSuccess && (
                <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                  <Check className="h-3.5 w-3.5" /> Profile settings saved!
                </span>
              )}
            </div>
            <Button type="submit" variant="primary">
              Save Profile
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Danger Zone / Reset */}
      <Card className="border-red-100 bg-red-50/10">
        <CardHeader>
          <CardTitle className="text-red-700">Account Actions</CardTitle>
          <CardDescription>
            Reset onboarding to go through the configuration wizard again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-heading font-semibold text-brand-forest">Reset Onboarding Flow</h4>
              <p className="text-xs text-brand-forest/60">Restarts the Setup Wizard, letting you redefine your profile baseline.</p>
            </div>
            <Button 
              variant="outline" 
              className="text-red-700 border-red-200 hover:bg-red-50"
              onClick={onResetOnboarding}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Restart Onboarding
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default SettingsPage
