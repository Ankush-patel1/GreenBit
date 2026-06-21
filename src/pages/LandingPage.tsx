import {
  ArrowRight,
  Calculator,
  Activity,
  Flame,
  Bot,
  Globe,
  TrendingDown,
  Sparkles,
  Users,
  Shield,
  Zap
} from "lucide-react"
import { Button } from "../components/ui/Button"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"

interface LandingPageProps {
  onStartApp: () => void
}

export const LandingPage = ({ onStartApp }: LandingPageProps) => {
  const stats = [
    { value: "48,500+", label: "Active Contributors", icon: Users },
    { value: "14,250 T", label: "CO2e Emissions Reduced", icon: TrendingDown },
    { value: "98.2%", label: "Recommendation Accuracy", icon: Sparkles },
    { value: "150+", label: "Climate Data Sources", icon: Globe }
  ]

  const features = [
    {
      title: "Carbon Footprint Calculator",
      description: "Measure your impact across transport, diet, home energy, and waste in under 3 minutes with smart localized calculations.",
      icon: Calculator,
      badge: "Core Engine",
      badgeVariant: "primary" as const
    },
    {
      title: "Real-time Activity Tracker",
      description: "Log daily commutes, dietary changes, and energy efficiency targets directly on your dynamic timeline.",
      icon: Activity,
      badge: "Continuous",
      badgeVariant: "secondary" as const
    },
    {
      title: "AI Sustainability Coach",
      description: "Get context-aware advice on reducing emissions based on your historical behaviors and regional grid carbon intensities.",
      icon: Bot,
      badge: "AI Powered",
      badgeVariant: "warning" as const
    },
    {
      title: "Carbon Twin Simulator",
      description: "Simulate lifestyle alterations (e.g. eating vegan, taking transit) to visualize long-term footprint reductions before making decisions.",
      icon: Flame,
      badge: "Flagship",
      badgeVariant: "success" as const
    }
  ]

  const steps = [
    {
      step: "01",
      title: "Onboard & Sync",
      description: "Enter minor demographic details to initialize your baseline carbon score and sync your smart appliances."
    },
    {
      step: "02",
      title: "Track Activities",
      description: "Log actions manually or let automated integrations track your utility bills and commutes silently."
    },
    {
      step: "03",
      title: "Simulate Futures",
      description: "Use the Carbon Twin module to predict how custom habit shifts impact your emissions profile."
    },
    {
      step: "04",
      title: "Receive Rewards",
      description: "Rank on leaderboards, claim status badges (Sapling, Tree, Forest Guardian), and lower global temperatures."
    }
  ]

  const testimonials = [
    {
      quote: "GreenBit completely shifted how we think about environmental impact. The Carbon Twin simulation is eye-opening.",
      author: "Elena Rostova",
      role: "Climate Researcher",
      org: "EcoLab Foundation",
      initials: "ER"
    },
    {
      quote: "The interface is gorgeous, clean, and intuitive. It's the first climate-tech tool I've used that doesn't feel like homework.",
      author: "Marcus Chen",
      role: "Software Designer",
      org: "Stripe Carbon",
      initials: "MC"
    },
    {
      quote: "I've reduced my daily commute emissions by 25% using the AI Coach's weekly suggestions. Highly recommended.",
      author: "Clara Vance",
      role: "Urban Planner",
      org: "City of Portland",
      initials: "CV"
    }
  ]

  return (
    <div className="min-h-screen bg-brand-chalk flex flex-col justify-between selection:bg-brand-leaf selection:text-white">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-40 bg-brand-chalk/85 backdrop-blur-md border-b border-brand-forest/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-brand-forest p-2 rounded-lg text-brand-chalk">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-heading font-bold text-lg text-brand-forest">
            GreenBit
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" className="text-sm font-heading" onClick={onStartApp}>
            Sign In
          </Button>
          <Button variant="primary" size="sm" onClick={onStartApp}>
            Launch App
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 md:px-12 text-center overflow-hidden">
        {/* Abstract background blobs for modern SaaS feel */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-mist/20 rounded-full blur-3xl -z-10" />
        <div className="absolute top-10 left-10 w-72 h-72 bg-brand-leaf/5 rounded-full blur-2xl -z-10" />

        <div className="max-w-4xl mx-auto space-y-8">
          <Badge variant="primary" className="px-4 py-1 text-xs">
            Introducing Carbon Twin v2.0
          </Badge>

          <h1 className="text-4xl sm:text-6xl font-heading font-extrabold text-brand-forest leading-[1.1] tracking-tight">
            Track your carbon footprint. <br />
            <span className="text-brand-leaf">Understand your impact.</span> <br />
            Build greener habits.
          </h1>

          <p className="text-base sm:text-lg text-brand-forest/70 font-body max-w-2xl mx-auto leading-relaxed">
            GreenBit combines high-fidelity carbon calculations, predictive machine learning model forecasts, and custom lifestyle simulations to make climate action data-driven and personal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={onStartApp}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all"
            >
              Calculate My Footprint
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onStartApp}
              className="w-full sm:w-auto"
            >
              Learn More
            </Button>
          </div>

          {/* SaaS Dashboard Preview Shell */}
          <div className="pt-12">
            <div className="bg-white border border-brand-forest/10 p-3 rounded-2xl shadow-xl max-w-5xl mx-auto overflow-hidden">
              <div className="border border-brand-forest/5 rounded-xl bg-brand-chalk/20 overflow-hidden flex flex-col">
                {/* Mock header bar */}
                <div className="bg-white px-4 py-2 border-b border-brand-forest/5 flex items-center space-x-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <div className="h-4 w-32 bg-brand-chalk/60 rounded-md ml-4" />
                </div>
                {/* Mock content panel */}
                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="md:col-span-2 space-y-4">
                    <div className="h-32 bg-white rounded-xl border border-brand-forest/5 p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-brand-forest/50 font-heading">
                          Monthly Emissions Forecast
                        </span>
                        <Badge variant="success" className="text-[9px] py-0">Target Path</Badge>
                      </div>
                      <div className="flex items-end space-x-1.5 h-16 pt-2">
                        <div className="bg-brand-leaf/30 w-full h-[60%] rounded-md" />
                        <div className="bg-brand-leaf/30 w-full h-[75%] rounded-md" />
                        <div className="bg-brand-leaf/30 w-full h-[90%] rounded-md" />
                        <div className="bg-brand-leaf/30 w-full h-[55%] rounded-md" />
                        <div className="bg-brand-leaf w-full h-[45%] rounded-md flex items-center justify-center font-heading text-[8px] text-white">Current</div>
                        <div className="bg-brand-forest w-full h-[35%] rounded-md border border-dashed border-brand-forest/20" />
                        <div className="bg-brand-forest w-full h-[25%] rounded-md border border-dashed border-brand-forest/20" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-32 bg-white rounded-xl border border-brand-forest/5 p-4 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-brand-forest/50 font-heading">
                        Sustainability Score
                      </span>
                      <div className="text-3xl font-heading font-extrabold text-brand-forest">84<span className="text-xs text-brand-forest/50">/100</span></div>
                      <div className="w-full bg-brand-chalk h-1.5 rounded-full overflow-hidden">
                        <div className="bg-brand-leaf h-full w-[84%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Strip */}
      <section className="bg-brand-forest text-brand-chalk border-y border-brand-forest/15 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <div key={idx} className="space-y-1">
                <div className="mx-auto w-10 h-10 rounded-lg bg-brand-chalk/5 flex items-center justify-center text-brand-leaf mb-2">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-brand-chalk/65 font-body">
                  {stat.label}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 md:px-12 bg-white">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="primary" className="text-xs">
              System Modules
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-brand-forest">
              Engineered for Climate Action
            </h2>
            <p className="text-sm text-brand-forest/65 font-body">
              Everything you need to navigate carbon reduction, build healthy habits, and understand climate parameters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feat, idx) => {
              const Icon = feat.icon
              return (
                <Card key={idx} hoverable className="flex flex-col justify-between border-brand-forest/5">
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-brand-mist/40 text-brand-leaf rounded-xl">
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge variant={feat.badgeVariant}>{feat.badge}</Badge>
                    </div>
                    <CardTitle className="text-xl pt-2">{feat.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="font-body text-sm text-brand-forest/75 leading-relaxed pt-0">
                    {feat.description}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-6 md:px-12 bg-brand-chalk/45 border-y border-brand-forest/5">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs uppercase font-heading font-bold text-brand-leaf tracking-wider">
              Easy Integration
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-brand-forest">
              Your Path to Carbon Neutrality
            </h2>
            <p className="text-sm text-brand-forest/65 font-body">
              Transitioning to carbon neutrality is structured into four sequential steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl border border-brand-forest/5 space-y-4 shadow-[0_2px_8px_rgba(26,46,30,0.02)]">
                <div className="text-3xl font-heading font-extrabold text-brand-leaf/25">
                  {step.step}
                </div>
                <h3 className="text-lg font-heading font-bold text-brand-forest">
                  {step.title}
                </h3>
                <p className="text-xs text-brand-forest/70 font-body leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 md:px-12 bg-white">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs uppercase font-heading font-bold text-brand-leaf tracking-wider">
              Social Proof
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-brand-forest">
              Loved by Climate Professionals
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((test, idx) => (
              <Card key={idx} className="border-brand-forest/5 flex flex-col justify-between p-6 space-y-6">
                <p className="text-sm italic font-body text-brand-forest/80 leading-relaxed">
                  "{test.quote}"
                </p>
                <div className="flex items-center space-x-3 pt-4 border-t border-brand-forest/5">
                  <div className="w-9 h-9 rounded-full bg-brand-forest text-brand-chalk font-heading font-bold text-xs flex items-center justify-center">
                    {test.initials}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-forest">{test.author}</h4>
                    <p className="text-[10px] text-brand-forest/50">{test.role}, {test.org}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-forest text-brand-chalk border-t border-brand-chalk/10 pt-16 pb-8 px-6 md:px-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-brand-chalk/10">
          {/* Logo Brand info */}
          <div className="space-y-4 text-left">
            <div className="flex items-center space-x-3 text-white">
              <div className="bg-brand-leaf p-2 rounded-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="font-heading font-bold text-lg">GreenBit</span>
            </div>
            <p className="text-xs text-brand-chalk/65 font-body leading-relaxed max-w-sm">
              Providing modern infrastructure to track emissions, forecast scenarios, and automate user carbon audits.
            </p>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-8 md:justify-self-center text-left">
            <div className="space-y-3">
              <h4 className="text-xs font-heading font-bold text-white uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-xs text-brand-chalk/65">
                <li><button onClick={onStartApp} className="hover:text-white transition-colors">Calculator</button></li>
                <li><button onClick={onStartApp} className="hover:text-white transition-colors">Twin Simulator</button></li>
                <li><button onClick={onStartApp} className="hover:text-white transition-colors">AI Assistant</button></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-heading font-bold text-white uppercase tracking-wider">Company</h4>
              <ul className="space-y-2 text-xs text-brand-chalk/65">
                <li><button onClick={onStartApp} className="hover:text-white transition-colors">About Us</button></li>
                <li><button onClick={onStartApp} className="hover:text-white transition-colors">Methodology</button></li>
                <li><button onClick={onStartApp} className="hover:text-white transition-colors">Security</button></li>
              </ul>
            </div>
          </div>

          {/* Newsletter / Security Cert */}
          <div className="space-y-4 text-left">
            <h4 className="text-xs font-heading font-bold text-white uppercase tracking-wider">Trust & Security</h4>
            <div className="flex flex-col space-y-2 text-xs text-brand-chalk/65 font-body">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-brand-leaf shrink-0" />
                <span>ISO 27001 Certified Infrastructure</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-brand-leaf shrink-0" />
                <span>Real-time Grid Carbon intensity updates</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Strip */}
        <div className="max-w-6xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-brand-chalk/45">
          <span>&copy; 2026 GreenBit Inc. All rights reserved.</span>
          <div className="flex space-x-6">
            <button onClick={onStartApp} className="hover:text-white">Privacy Policy</button>
            <button onClick={onStartApp} className="hover:text-white">Terms of Service</button>
            <button onClick={onStartApp} className="hover:text-white">Trust Center</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
