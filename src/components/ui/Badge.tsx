import React from "react"
import { cn } from "../../utils/cn"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral"
}

export const Badge = ({ className, variant = "neutral", ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold select-none border tracking-tight font-heading transition-colors",
        {
          "bg-brand-forest/10 text-brand-forest border-brand-forest/20": variant === "primary",
          "bg-brand-leaf/10 text-brand-leaf border-brand-leaf/20": variant === "secondary",
          "bg-emerald-50 text-emerald-700 border-emerald-200": variant === "success",
          "bg-brand-amber/10 text-amber-800 border-brand-amber/20": variant === "warning",
          "bg-rose-50 text-rose-700 border-rose-200": variant === "danger",
          "bg-brand-chalk/80 text-brand-forest/70 border-brand-forest/10": variant === "neutral",
        },
        className
      )}
      {...props}
    />
  )
}
