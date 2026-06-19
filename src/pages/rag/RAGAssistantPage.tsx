import { useState, useRef, useEffect } from "react"
import {
  Send,
  BookOpen,
  User,
  Sparkles,
  Info,
  FileText,
  Bookmark
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { Badge } from "../../components/ui/Badge"
import { API_ENDPOINTS, apiUrl } from "../../config/api"

interface Source {
  title: string
  source: string
  content: string
}

interface Message {
  sender: "user" | "bot"
  text: string
  sources?: Source[]
  engine?: string
}

const QUICK_QUESTIONS = [
  "What is carbon neutrality?",
  "How can households reduce emissions?",
  "How does public transport help?"
]

export const RAGAssistantPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "### Welcome to the Climate Library RAG Assistant! 📚\n\nI can retrieve information from our ingested sustainability guides, carbon reduction reports, and climate awareness documents.\n\nClick one of the quick questions below or type a query to search our local index!"
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
      const response = await fetch(apiUrl(API_ENDPOINTS.RAG_ASK), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textToSend })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, {
          sender: "bot",
          text: data.response,
          sources: data.sources,
          engine: data.engine
        }])
      } else {
        setMessages(prev => [...prev, {
          sender: "bot",
          text: "**Error**: Failed to establish connection with the RAG Assistant API. Verify server status."
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: "bot",
        text: "**Error**: Unable to reach RAG backend service. Check if your FastAPI server is running."
      }])
    } finally {
      setLoading(false)
    }
  }

  const parseBoldText = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/)
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-brand-forest">{part}</strong>
      }
      return part
    })
  }

  const renderResponseText = (text: string) => {
    const lines = text.split("\n")
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="text-sm font-heading font-extrabold text-brand-forest mt-3 mb-1.5">{line.replace("### ", "")}</h3>
      }
      if (line.startsWith("## ")) {
        return <h2 key={idx} className="text-base font-heading font-extrabold text-brand-forest mt-4 mb-2">{line.replace("## ", "")}</h2>
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const clean = line.replace(/^[\-\*]\s+/, "")
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-brand-forest/80 leading-relaxed py-0.5 font-body">
            {parseBoldText(clean)}
          </li>
        )
      }
      if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ")) {
        return (
          <p key={idx} className="ml-4 text-xs text-brand-forest/80 leading-relaxed py-0.5 font-body">
            {parseBoldText(line)}
          </p>
        )
      }
      return (
        <p key={idx} className="text-xs text-brand-forest/85 leading-relaxed mb-2 font-body">
          {parseBoldText(line)}
        </p>
      )
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[calc(100vh-12rem)] text-left">
      {/* Chat shell area */}
      <div className="lg:col-span-3 flex flex-col justify-between bg-white border border-brand-forest/5 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Messages Viewport */}
        <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[500px]">
          {messages.map((msg, index) => {
            const isBot = msg.sender === "bot"
            return (
              <div key={index} className={`space-y-3 ${!isBot ? "flex flex-col items-end" : ""}`}>
                <div className={`flex items-start space-x-3.5 ${!isBot ? "flex-row-reverse space-x-reverse" : ""}`}>
                  {/* Avatar */}
                  <div className={`p-2 rounded-xl shrink-0 ${isBot ? "bg-brand-mist/45 text-brand-leaf" : "bg-brand-forest text-brand-chalk"}`}>
                    {isBot ? <BookOpen className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
                  </div>

                  {/* Bubble */}
                  <div className={`p-4 rounded-2xl max-w-xl text-left border ${
                    isBot 
                      ? "bg-brand-chalk/10 border-brand-forest/5" 
                      : "bg-brand-leaf text-white border-brand-leaf/10"
                  }`}>
                    {isBot ? (
                      <div className="space-y-1">
                        {renderResponseText(msg.text)}
                        {msg.engine && (
                          <span className="text-[8px] uppercase tracking-wider text-brand-forest/30 block text-right pt-2 border-t border-brand-forest/5">
                            Index Search Engine: {msg.engine}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs font-body leading-relaxed">{msg.text}</p>
                    )}
                  </div>
                </div>

                {/* Retrieved Sources highlighted beneath bot bubble */}
                {isBot && msg.sources && msg.sources.length > 0 && (
                  <div className="ml-12 max-w-xl space-y-2">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-brand-forest/40 block">
                      Retrieved Context Sources
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.sources.map((src, sIdx) => (
                        <div key={sIdx} className="p-3 rounded-lg border border-brand-forest/5 bg-brand-chalk/20 space-y-1">
                          <div className="flex items-center space-x-1.5 text-brand-leaf">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-[10px] font-heading font-extrabold truncate">{src.title}</span>
                          </div>
                          <p className="text-[9px] leading-relaxed text-brand-forest/60 truncate font-body">
                            {src.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Typing Loading Indicator */}
          {loading && (
            <div className="flex items-start space-x-3.5">
              <div className="p-2 rounded-xl shrink-0 bg-brand-mist/45 text-brand-leaf">
                <BookOpen className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <div className="bg-brand-chalk/10 border border-brand-forest/5 p-4 rounded-2xl flex items-center space-x-2">
                <div className="h-2 w-2 bg-brand-leaf rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 bg-brand-leaf rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 bg-brand-leaf rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggested Strip & Input Form */}
        <div className="p-6 border-t border-brand-forest/5 bg-brand-chalk/10 space-y-4">
          
          {/* Quick Prompts */}
          {messages.length === 1 && (
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-bold tracking-wider text-brand-forest/45">Quick Library Queries</span>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    disabled={loading}
                    className="text-xs bg-white hover:bg-brand-mist/35 border border-brand-forest/10 hover:border-brand-leaf/30 text-brand-forest/80 hover:text-brand-leaf px-3.5 py-2 rounded-xl font-body transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input field */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend(inputValue)
            }}
            className="flex items-center space-x-3"
          >
            <div className="flex-1">
              <Input
                placeholder="Ask questions about carbon neutrality, transport, emissions..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={loading}
                className="bg-white border-brand-forest/15 focus:ring-brand-leaf focus:border-brand-leaf"
              />
            </div>
            <Button
              variant="primary"
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="shrink-0 rounded-xl p-3"
            >
              <Send className="h-4.5 w-4.5" />
            </Button>
          </form>
        </div>

      </div>

      {/* Library Reference Shelf Sidebar */}
      <div className="space-y-6">
        
        {/* Active shelf stats */}
        <Card className="bg-brand-forest text-brand-chalk border-brand-forest shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-36 h-36 bg-brand-leaf/20 rounded-full blur-xl pointer-events-none" />
          <CardHeader className="pb-2">
            <span className="text-[9px] uppercase tracking-wider text-brand-leaf font-heading font-extrabold flex items-center space-x-1">
              <Sparkles className="h-3 w-3 text-brand-amber animate-pulse" />
              <span>Vector Database Status</span>
            </span>
            <CardTitle className="text-lg text-white font-heading font-extrabold">Active Shelf</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] text-brand-chalk/50 block">Index size</span>
              <div className="text-2xl font-heading font-extrabold text-white">
                3 <span className="text-xs font-body font-normal text-brand-chalk/60">Documents Ingested</span>
              </div>
            </div>
            <div className="border-t border-brand-chalk/10 pt-3 space-y-1">
              <span className="text-[10px] text-brand-chalk/50 block">Retrieval Pipeline</span>
              <Badge variant="success">FAISS CPU Indexed</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Source items lists */}
        <div className="space-y-3">
          <span className="text-[9px] uppercase font-bold tracking-wider text-brand-forest/45 block">Ingested Sources</span>
          
          <div className="p-3 bg-white border border-brand-forest/5 rounded-xl space-y-1 flex flex-col justify-start">
            <div className="flex items-center space-x-1.5 text-brand-forest font-heading font-extrabold text-xs">
              <Bookmark className="h-3.5 w-3.5 text-brand-leaf" />
              <span>sustainability_guides.md</span>
            </div>
            <p className="text-[10px] text-brand-forest/55 leading-relaxed font-body">
              Maps Carbon Neutrality concepts and emissions balance equations.
            </p>
          </div>

          <div className="p-3 bg-white border border-brand-forest/5 rounded-xl space-y-1 flex flex-col justify-start">
            <div className="flex items-center space-x-1.5 text-brand-forest font-heading font-extrabold text-xs">
              <Bookmark className="h-3.5 w-3.5 text-brand-leaf" />
              <span>carbon_reduction_reports.md</span>
            </div>
            <p className="text-[10px] text-brand-forest/55 leading-relaxed font-body">
              Outlines household energy, plant-based diets, and waste indicators.
            </p>
          </div>

          <div className="p-3 bg-white border border-brand-forest/5 rounded-xl space-y-1 flex flex-col justify-start">
            <div className="flex items-center space-x-1.5 text-brand-forest font-heading font-extrabold text-xs">
              <Bookmark className="h-3.5 w-3.5 text-brand-leaf" />
              <span>climate_awareness_documents.md</span>
            </div>
            <p className="text-[10px] text-brand-forest/55 leading-relaxed font-body">
              Details public transport travel offsets and train savings metrics.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-brand-forest/5 bg-brand-mist/10 text-[10px] text-brand-forest/55 flex items-start space-x-2 leading-relaxed">
          <Info className="h-4 w-4 text-brand-leaf shrink-0 mt-0.5" />
          <span>If local packages fail, the RAG API switches to TF-IDF local index search.</span>
        </div>
      </div>
    </div>
  )
}
