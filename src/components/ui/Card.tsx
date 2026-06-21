import React from "react"
import { cn } from "../../utils/cn"

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { hoverable?: boolean }>(
  ({ className, hoverable = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white/80 backdrop-blur-xl border border-brand-forest/10 rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(16,32,22,0.04)] transition-all duration-300",
          hoverable && "hover:border-brand-leaf/30 hover:shadow-[0_8px_30px_rgba(16,32,22,0.08)] hover:-translate-y-1",
          className
        )}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 flex flex-col space-y-1.5", className)} {...props} />
)
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    // eslint-disable-next-line jsx-a11y/heading-has-content
    <h3
      ref={ref}
      className={cn("font-heading text-lg font-semibold leading-none tracking-tight text-brand-forest", className)}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-brand-forest/65 font-body", className)}
      {...props}
    />
  )
)
CardDescription.displayName = "CardDescription"

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-0 font-body text-sm text-brand-forest/80", className)} {...props} />
)
CardContent.displayName = "CardContent"

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-0 border-t border-brand-forest/5 flex items-center justify-between", className)} {...props} />
)
CardFooter.displayName = "CardFooter"
