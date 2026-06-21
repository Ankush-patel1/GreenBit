import { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "./Button"

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // In production, forward to your error monitoring service (e.g. Sentry):
    // reportError(error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-brand-chalk rounded-2xl border border-brand-forest/5 shadow-sm max-w-lg mx-auto my-12">
          <div className="w-16 h-16 bg-brand-amber/10 text-brand-amber rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-heading font-extrabold text-brand-forest mb-3">
            Something Went Wrong
          </h2>
          <p className="text-xs text-brand-forest/65 max-w-sm mb-6 leading-relaxed font-body">
            An unexpected error occurred while rendering this module. We've logged the issue and are looking into it.
          </p>
          {this.state.error && import.meta.env.DEV && (
            <div className="w-full bg-brand-forest text-brand-chalk/80 p-4 rounded-xl text-left font-mono text-[10px] overflow-auto max-h-40 mb-6 border border-white/5 leading-relaxed">
              {this.state.error.toString()}
            </div>
          )}
          <Button
            variant="primary"
            onClick={this.handleReset}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Reload Module
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
