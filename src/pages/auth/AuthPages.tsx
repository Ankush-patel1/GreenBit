import React, { useState } from "react"
import { Eye, EyeOff, Sparkles, Mail, Lock, User, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "../../components/ui/Button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Badge } from "../../components/ui/Badge"
import { sessionStore } from "../../utils/storage"
import { API_ENDPOINTS, apiUrl } from "../../config/api"
import { signInWithPopup } from "firebase/auth"
import { auth, googleProvider } from "../../config/firebase"

interface AuthPagesProps {
  initialView?: "login" | "signup" | "forgot"
  onAuthSuccess: (token: string) => void
  onNavigateHome: () => void
}

export const AuthPages = ({ initialView = "login", onAuthSuccess, onNavigateHome }: AuthPagesProps) => {
  const [view, setView] = useState<"login" | "signup" | "forgot">(initialView)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const handleValidation = () => {
    setError("")
    if (!email) return "Email is required."
    if (!/\S+@\S+\.\S+/.test(email)) return "Please enter a valid email address."
    
    if (view === "signup") {
      if (!name) return "Name is required."
      if (password.length < 8) return "Password must be at least 8 characters."
      if (password !== confirmPassword) return "Passwords do not match."
    } else if (view === "login") {
      if (!password) return "Password is required."
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = handleValidation()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const endpoint = view === "login"
        ? API_ENDPOINTS.AUTH_LOGIN
        : view === "signup"
        ? API_ENDPOINTS.AUTH_SIGNUP
        : API_ENDPOINTS.AUTH_FORGOT_PASSWORD

      let response: Response | undefined
      try {
        const body = view === "forgot"
          ? { email }
          : view === "signup"
          ? { name, email, password }
          : { email, password }
        response = await fetch(apiUrl(endpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        })
      } catch {
        // Backend not reachable — fall through to simulation mode
      }

      if (response && response.ok) {
        const data = await response.json() as { access_token?: string; message?: string; detail?: string }
        if (view === "login" && data.access_token) {
          // [SEC-01 FIX] Use sessionStorage for short-lived auth tokens (not localStorage)
          sessionStore.set("greenbit_auth_token", data.access_token)
          onAuthSuccess(data.access_token)
        } else if (view === "signup") {
          setSuccess("Account created successfully! Please log in.")
          setView("login")
          setPassword("")
          setConfirmPassword("")
        } else {
          setSuccess("Instructions to reset password have been sent to your email.")
        }
      } else if (response) {
        const errData = await response.json() as { detail?: string }
        setError(errData.detail ?? "An error occurred. Please try again.")
      } else {
        // Simulated response if backend is offline
        await new Promise((resolve) => setTimeout(resolve, 1200))
        if (view === "login") {
          if (email === "demo@greenbit.com" && password !== "password123") {
            setError("Invalid credentials. Use demo@greenbit.com / password123")
          } else {
            onAuthSuccess("simulated-jwt-token-xyz")
          }
        } else if (view === "signup") {
          setSuccess("Registration successful! You can now log in.")
          setView("login")
          setPassword("")
          setConfirmPassword("")
        } else {
          setSuccess("Password reset instructions sent to email.")
        }
      }
    } catch (err) {
      setError("Server connection failed. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-chalk flex flex-col justify-center items-center p-4 selection:bg-brand-leaf selection:text-white">
      {/* Brand logo at top */}
      <button onClick={onNavigateHome} className="flex items-center space-x-3 mb-8 group select-none">
        <div className="bg-brand-forest p-2.5 rounded-xl text-brand-chalk group-hover:scale-105 transition-transform">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="font-heading font-extrabold text-2xl text-brand-forest">
          GreenBit
        </span>
      </button>

      {/* Main card */}
      <Card className="w-full max-w-md shadow-2xl border-brand-forest/5 bg-white relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-leaf/5 rounded-full blur-2xl pointer-events-none" />

        <CardHeader className="space-y-2 text-center pb-4">
          <div className="flex justify-center">
            <Badge variant="primary" className="text-[10px] uppercase font-bold tracking-wide">
              {view === "login" ? "Welcome Back" : view === "signup" ? "Get Started" : "Recovery"}
            </Badge>
          </div>
          <CardTitle className="text-2xl font-bold">
            {view === "login" && "Log in to GreenBit"}
            {view === "signup" && "Create your account"}
            {view === "forgot" && "Reset your password"}
          </CardTitle>
          <CardDescription>
            {view === "login" && "Access your climate dashboards and simulations."}
            {view === "signup" && "Start tracking and reducing your carbon footprint today."}
            {view === "forgot" && "We'll send you recovery link instructions."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Status alerts — aria-live announces to screen readers */}
            {error && (
              <div role="alert" aria-live="polite" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start space-x-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div role="status" aria-live="polite" className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-start space-x-2.5">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{success}</span>
              </div>
            )}

            {/* Form Fields */}
            {view === "signup" && (
              <Input
                label="Full Name"
                placeholder="John Doe"
                leftIcon={<User className="h-4 w-4" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="name@domain.com"
              leftIcon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            {view !== "forgot" && (
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 bottom-2.5 text-brand-forest/40 hover:text-brand-forest p-1 rounded focus:outline-none focus:ring-2 focus:ring-brand-leaf/40"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                    : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            )}

            {view === "signup" && (
              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            )}

            {view === "login" && (
              <div className="flex justify-end text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setView("forgot")
                    setError("")
                    setSuccess("")
                  }}
                  className="text-brand-leaf hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button variant="primary" className="w-full h-10 mt-2" isLoading={loading} type="submit">
              {view === "login" && "Sign In"}
              {view === "signup" && "Create Account"}
              {view === "forgot" && "Send Reset Link"}
            </Button>
          </form>

          {view !== "forgot" && (
            <div className="mt-6 space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 border-t border-brand-forest/10" />
                <span className="relative bg-white px-3 text-[10px] uppercase tracking-wider font-semibold text-brand-forest/40 font-body">Or continue with</span>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  setError("");
                  try {
                    const result = await signInWithPopup(auth, googleProvider);
                    const token = result.user?.uid || "google-firebase-session-token";
                    
                    // Store token for session authorization checks
                    sessionStore.set("greenbit_auth_token", token);
                    
                    // Dispatch login success event
                    onAuthSuccess(token);
                  } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : "Google Authentication failed. Please try again."
                    setError(message)
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full h-10 border border-brand-forest/20 rounded bg-white font-body text-xs font-medium text-brand-forest flex items-center justify-center space-x-2.5 hover:bg-brand-forest/5 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.99 1 12 1 7.24 1 3.2 3.73 1.24 7.72l3.96 3.07C6.16 7.6 8.84 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.01 3.67-8.64z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.2 14.71a7.07 7.07 0 010-4.32L1.24 7.32c-1.12 2.25-1.12 4.93 0 7.18l3.96-3.07a7.07 7.07 0 010-4.32z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.91c-1.1.74-2.5 1.18-4.2 1.18-3.16 0-5.84-2.56-6.8-5.75L1.24 16.3C3.2 20.27 7.24 23 12 23z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-brand-chalk/35 flex flex-col items-center py-4 text-xs font-body border-t border-brand-forest/5">
          {view === "login" && (
            <div className="text-brand-forest/65">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setView("signup")
                  setError("")
                  setSuccess("")
                }}
                className="text-brand-leaf font-bold hover:underline"
              >
                Sign up
              </button>
            </div>
          )}
          {view === "signup" && (
            <div className="text-brand-forest/65">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setView("login")
                  setError("")
                  setSuccess("")
                }}
                className="text-brand-leaf font-bold hover:underline"
              >
                Log in
              </button>
            </div>
          )}
          {view === "forgot" && (
            <button
              type="button"
              onClick={() => {
                setView("login")
                setError("")
                setSuccess("")
              }}
              className="text-brand-forest/60 hover:text-brand-forest flex items-center space-x-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Login</span>
            </button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
