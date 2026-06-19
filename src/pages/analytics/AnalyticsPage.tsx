import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import {
  TrendingDown,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowDownRight
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/Card"

export const AnalyticsPage = () => {
  // Mock historical database data
  const trendData = [
    { name: "Week 1", Actual: 135, Baseline: 140 },
    { name: "Week 2", Actual: 128, Baseline: 135 },
    { name: "Week 3", Actual: 142, Baseline: 130 },
    { name: "Week 4", Actual: 110, Baseline: 125 },
    { name: "Week 5", Actual: 95, Baseline: 120 }
  ]

  const breakdownData = [
    { name: "Transportation", value: 3.2, color: "#4A7C59" }, // brand-leaf
    { name: "Energy & Utilities", value: 1.8, color: "#1A2E1E" }, // brand-forest
    { name: "Food & Meals", value: 2.2, color: "#D4A853" }, // brand-amber
    { name: "Waste Disposal", value: 0.9, color: "#E8F0E9" } // brand-mist
  ]

  const comparisonData = [
    { name: "Transport", Target: 60, Actual: 42 },
    { name: "Energy", Target: 40, Actual: 48 },
    { name: "Food", Target: 50, Actual: 38 },
    { name: "Waste", Target: 20, Actual: 12 }
  ]

  const goalsData = [
    { name: "Commute offset", progress: 80, color: "#4A7C59" },
    { name: "Vegetarian intake", progress: 60, color: "#D4A853" },
    { name: "Smart heating", progress: 30, color: "#1A2E1E" },
    { name: "Recycling index", progress: 100, color: "#4A7C59" }
  ]

  // Dynamic statistics
  const weeklyFootprint = 95 // kg CO2e
  const monthlyFootprint = 410 // kg CO2e
  const biggestSource = "Transportation"
  const biggestSourcePercent = "39.5%"

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-brand-forest">Advanced Analytics</h1>
        <p className="text-sm text-brand-forest/65 font-body">Deep-dive calculations, category proportions, and goal offsets.</p>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card hoverable className="bg-white border-brand-forest/5">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-forest/55 font-heading">
              Weekly Footprint Avg
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-heading font-extrabold text-brand-forest">
              {weeklyFootprint} <span className="text-xs font-body font-normal text-brand-forest/50">kg CO2e</span>
            </div>
            <div className="flex items-center text-[10px] text-brand-leaf space-x-1 font-semibold">
              <TrendingDown className="h-3 w-3" />
              <span>-15% vs previous cycle</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverable className="bg-white border-brand-forest/5">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-forest/55 font-heading">
              Monthly Footprint Avg
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-heading font-extrabold text-brand-forest">
              {monthlyFootprint} <span className="text-xs font-body font-normal text-brand-forest/50">kg CO2e</span>
            </div>
            <div className="flex items-center text-[10px] text-brand-forest/50 space-x-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Normalized against regional averages</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverable className="bg-white border-brand-forest/5">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-forest/55 font-heading">
              Biggest Emission Source
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-heading font-extrabold text-brand-forest capitalize truncate">
              {biggestSource}
            </div>
            <div className="flex items-center text-[10px] text-brand-forest/50 space-x-1">
              <Layers className="h-3.5 w-3.5 text-brand-amber" />
              <span>Accounts for {biggestSourcePercent} of total footprint</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverable className="bg-white border-brand-forest/5">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-forest/55 font-heading">
              Historical Trends
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-heading font-extrabold text-brand-leaf flex items-baseline">
              Stable
              <ArrowDownRight className="h-4 w-4 ml-1 text-brand-leaf" />
            </div>
            <div className="flex items-center text-[10px] text-brand-forest/50 space-x-1">
              <Sparkles className="h-3.5 w-3.5 text-brand-amber" />
              <span>Consistent log intervals tracked</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Block Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend line chart */}
        <Card className="bg-white border-brand-forest/5">
          <CardHeader>
            <CardTitle>Carbon Trend progression</CardTitle>
            <CardDescription>Weekly log actuals mapped against target baseline limits.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                <XAxis dataKey="name" stroke="#1A2E1E" strokeOpacity={0.4} fontSize={10} tickLine={false} />
                <YAxis stroke="#1A2E1E" strokeOpacity={0.4} fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1A2E1E", borderRadius: "8px", border: "0", color: "#F7F5F0" }}
                  itemStyle={{ color: "#F7F5F0" }}
                />
                <Legend iconType="circle" fontSize={11} wrapperStyle={{ paddingTop: "10px" }} />
                <Line type="monotone" dataKey="Actual" stroke="#4A7C59" strokeWidth={3} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Baseline" stroke="#1A2E1E" strokeWidth={1.5} strokeDasharray="5 5" strokeOpacity={0.5} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie breakdown chart */}
        <Card className="bg-white border-brand-forest/5">
          <CardHeader>
            <CardTitle>Emissions Proportion Breakdown</CardTitle>
            <CardDescription>Proportional annual categories contribution (T CO2e/yr).</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex flex-col sm:flex-row items-center justify-around">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {breakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="space-y-2 text-left">
              {breakdownData.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2.5 text-xs font-body text-brand-forest/80">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-brand-forest/50">({item.value} T)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Block Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category bar chart comparison */}
        <Card className="bg-white border-brand-forest/5">
          <CardHeader>
            <CardTitle>Category Targets Comparison</CardTitle>
            <CardDescription>Weekly emissions vs target thresholds (kg CO2e).</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                <XAxis dataKey="name" stroke="#1A2E1E" strokeOpacity={0.4} fontSize={10} tickLine={false} />
                <YAxis stroke="#1A2E1E" strokeOpacity={0.4} fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1A2E1E", borderRadius: "8px", border: "0", color: "#F7F5F0" }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "10px" }} />
                <Bar dataKey="Actual" fill="#4A7C59" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Target" fill="#E8F0E9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Goals progress horizontal stats */}
        <Card className="bg-white border-brand-forest/5 flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Goal Progress Index</CardTitle>
            <CardDescription>Milestone status trackers calculated from weekly timelines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalsData.map((goal, idx) => (
              <div key={idx} className="space-y-1.5 text-left">
                <div className="flex justify-between items-center text-xs font-body">
                  <span className="font-semibold text-brand-forest">{goal.name}</span>
                  <span className="font-bold text-brand-forest">{goal.progress}%</span>
                </div>
                <div className="w-full bg-brand-chalk h-3 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${goal.progress}%`,
                      backgroundColor: goal.color
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="bg-brand-chalk/20 py-4 px-6 text-[10px] text-brand-forest/50 leading-relaxed border-t border-brand-forest/5">
            <Info className="h-4 w-4 mr-2 text-brand-leaf shrink-0 inline align-middle -mt-0.5" />
            <span>Unlock higher levels (Tree, Forest Guardian) by completing remaining milestone offsets.</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
