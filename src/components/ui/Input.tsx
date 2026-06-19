import React, { useId } from "react"
import { cn } from "../../utils/cn"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
}

/**
 * Accessible form input component.
 * - Automatically generates a unique id linking <label htmlFor> to <input id>
 * - Announces errors via aria-describedby
 * - Supports icons, helper text, and disabled states
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, leftIcon, id: externalId, ...props }, ref) => {
    const generatedId = useId()
    const inputId = externalId ?? generatedId
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    return (
      <div className="w-full flex flex-col space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-heading font-semibold tracking-wide uppercase text-brand-forest/75 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div
              className="absolute left-3 text-brand-forest/40 pointer-events-none flex items-center justify-center"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            aria-invalid={error ? "true" : undefined}
            className={cn(
              "w-full rounded-lg border border-brand-forest/15 bg-white px-3 py-2 text-sm text-brand-forest font-body placeholder:text-brand-forest/35 transition-all duration-200 focus:outline-none focus:border-brand-leaf focus:ring-2 focus:ring-brand-leaf/20 disabled:cursor-not-allowed disabled:bg-brand-chalk/50 disabled:border-brand-forest/5",
              leftIcon && "pl-10",
              error && "border-red-500 focus:border-red-500 focus:ring-red-100",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <span id={errorId} role="alert" className="text-xs text-red-600 font-medium">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span id={helperId} className="text-xs text-brand-forest/50">
            {helperText}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"
