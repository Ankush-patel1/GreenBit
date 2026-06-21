import { useState, useRef, useEffect } from "react"
import {
  Send,
  Info,
  ArrowRight
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { API_BASE_URL } from "../../config/api"

interface Message {
  sender: "user" | "coach"
  text: string
  source?: string
}

interface CoachPageProps {
  userProfile?: {
    name: string
    city: string
    calculatedCarbonBaseline?: number
    primaryTransport?: string
    dietType?: string
  }
}

const SUGGESTED_QUESTIONS = [
  "How can I reduce my footprint?",
  "What contributes most to my emissions?",
  "What should I improve this week?"
]

export const CoachPage = ({ userProfile }: CoachPageProps) => {
  const name = userProfile?.name || "Demo User"
  const rawBaseline = userProfile?.calculatedCarbonBaseline || 5.8
  // Convert annual tonnes to monthly kg: (tonnes * 1000) / 12
  const monthlyBaselineKg = Math.round((rawBaseline * 1000) / 12)
  const primaryCategory = userProfile?.primaryTransport === "car" ? "Transportation offsets" : "Energy & Power savings"

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "coach",
      text: `### Climate Advisory Briefing for ${name}\n\nThis system integrates your logged daily activity profiles, baseline projections, and transportation parameters to generate structured ESG recommendations. \n\nClick one of the suggested assessment prompts below or enter your inquiry to begin.`
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [loading, setLoading] = useState(false)
  
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return

    const userMsg: Message = { sender: "user", text: textToSend }
    setMessages(prev => [...prev, userMsg])
    setInputValue("")
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/coach/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem("greenbit_auth_token") || ""}`
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map(m => ({ sender: m.sender, text: m.text }))
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, { sender: "coach", text: data.response, source: data.source }])
      } else {
        setMessages(prev => [...prev, { sender: "coach", text: "**Error**: Failed to establish connection with GreenBit Coach API. Please verify server status." }])
      }
    } catch {
      setMessages(prev => [...prev, { sender: "coach", text: "**Error**: Unable to reach backend service. Check if your FastAPI server is running." }])
    } finally {
      setLoading(false)
    }
  }

  // Simple markdown renderer function for coach text (renders lists, headings, and bold inline elements)
  const renderResponseText = (text: string) => {
    const lines = text.split("\n")
    return lines.map((line, idx) => {
      // Headings
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="text-sm font-heading font-medium text-brand-forest mt-3 mb-1.5">{line.replace("### ", "")}</h3>
      }
      if (line.startsWith("## ")) {
        return <h2 key={idx} className="text-base font-heading font-medium text-brand-forest mt-4 mb-2">{line.replace("## ", "")}</h2>
      }
      // Bullet lists
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const clean = line.replace(/^[-*]\s+/, "")
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-brand-forest/80 leading-relaxed py-0.5 font-body">
            {parseBoldText(clean)}
          </li>
        )
      }
      // Standard line
      return (
        <p key={idx} className="text-xs text-brand-forest/85 leading-relaxed mb-2 font-body">
          {parseBoldText(line)}
        </p>
      )
    })
  }

  const parseBoldText = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/)
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-semibold text-brand-forest">{part}</strong>
      }
      return part
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[calc(100vh-12rem)] animate-fade-in max-w-6xl mx-auto">
      {/* Chat shell area */}
      <div className="lg:col-span-3 flex flex-col justify-between bg-white border border-brand-forest/10 rounded-lg overflow-hidden">
        
        {/* Messages viewport */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[500px]">
          {messages.map((msg, index) => {
            const isCoach = msg.sender === "coach"
            return (
              <div key={index} className={`flex items-start space-x-3 ${!isCoach ? "justify-end text-right" : ""}`}>
                <div className={`p-5 rounded border w-full ${
                  isCoach 
                    ? "bg-[#F4F3EE]/40 border-brand-forest/5 text-left" 
                    : "bg-brand-mist/20 border-brand-forest/10 max-w-lg text-left"
                }`}>
                  <span className="text-[9px] uppercase tracking-wider text-brand-forest/40 font-semibold block mb-2 font-body">
                    {isCoach ? "CLIMATE ADVISORY LOG" : "USER QUERY"}
                  </span>
                  {isCoach ? (
                    <div className="space-y-1">
                      {renderResponseText(msg.text)}
                      {msg.source && (
                        <span className="text-[8px] uppercase tracking-wider text-brand-forest/30 block text-right font-body">
                          Engine: {msg.source}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs font-body leading-relaxed text-brand-forest">{msg.text}</p>
                  )}
                </div>
              </div>
            )
          })}
          
          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start">
              <div className="bg-[#F4F3EE]/40 border border-brand-forest/5 p-4 rounded w-full flex items-center space-x-1.5">
                <span className="text-[9px] uppercase tracking-wider text-brand-forest/40 font-semibold font-body">Generating response</span>
                <span className="h-1 w-1 bg-brand-forest/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1 w-1 bg-brand-forest/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1 w-1 bg-brand-forest/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Strip & Inputs */}
        <div className="p-6 border-t border-brand-forest/10 bg-[#F4F3EE]/20 space-y-4">
          
          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="space-y-2 text-left">
              <span className="text-[9px] uppercase font-semibold tracking-wider text-brand-forest/50 font-body">Assessment Prompts</span>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    disabled={loading}
                    className="text-xs bg-white hover:bg-brand-mist/20 border border-brand-forest/15 text-brand-forest px-3 py-1.5 rounded font-body transition-all text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend(inputValue)
            }}
            className="flex items-center space-x-3"
          >
            <div className="flex-1">
              <Input
                placeholder="Ask your climate advisor for targeted sustainability tips..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={loading}
                className="bg-white border-brand-forest/15 focus:ring-brand-leaf focus:border-brand-leaf text-xs rounded"
              />
            </div>
            <Button
              variant="outline"
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="shrink-0 border-brand-forest/20 text-brand-forest hover:bg-brand-forest/5 rounded p-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>

      </div>

      {/* Insights Sidebar */}
      <div className="space-y-6 text-left">
        
        {/* Core Profile Stats Banner */}
        <Card className="bg-[#1A231F] text-brand-chalk border-none shadow-none relative overflow-hidden rounded-lg">
          <CardHeader className="pb-2">
            <span className="text-[9px] uppercase tracking-wider text-brand-leaf font-body font-semibold">
              Advisory Profile
            </span>
            <CardTitle className="text-lg text-white font-heading font-normal">Active Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] text-brand-chalk/50 block">Baseline Carbon Footprint</span>
              <div className="text-2xl font-heading font-normal text-white">
                {monthlyBaselineKg} <span className="text-xs font-body font-light text-brand-chalk/60">kg CO₂e/mo</span>
              </div>
            </div>
            
            <div className="border-t border-brand-chalk/10 pt-3 space-y-1">
              <span className="text-[10px] text-brand-chalk/50 block">Primary Target Category</span>
              <div className="text-xs font-heading font-normal text-brand-amber flex items-center space-x-1.5">
                <span>{primaryCategory}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suggestion list */}
        <Card className="bg-white border-brand-forest/10 shadow-none rounded-lg">
          <CardHeader className="pb-2">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-forest/50 font-body">
              Suggested Queries
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={loading}
                className="w-full text-left text-xs text-brand-forest/80 hover:text-brand-leaf p-2 border border-brand-forest/10 hover:border-brand-leaf/40 rounded hover:bg-[#F4F3EE]/30 transition-all font-body flex items-center justify-between"
              >
                <span>{q}</span>
                <ArrowRight className="h-3 w-3 shrink-0 ml-1.5 text-brand-leaf" />
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="p-4 rounded border border-brand-forest/10 bg-brand-mist/20 text-[10px] text-brand-forest/60 flex items-start space-x-2 leading-relaxed font-body">
          <Info className="h-4 w-4 text-brand-leaf shrink-0 mt-0.5" />
          <span>If you configure an environment key (e.g. GEMINI_API_KEY), the coach will switch to live LLM calculations.</span>
        </div>
      </div>
    </div>
  )
}
export default CoachPage
