import React from "react"
import { cn } from "../../utils/cn"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular"
  width?: string | number
  height?: string | number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "rectangular",
  width,
  height,
  className,
  style,
  ...props
}) => {
  const getShapeClass = () => {
    switch (variant) {
      case "circular":
        return "rounded-full"
      case "text":
        return "rounded h-4 w-3/4 my-1"
      case "rectangular":
      default:
        return "rounded-2xl"
    }
  }

  return (
    <div
      className={cn(
        "animate-pulse bg-brand-forest/5 dark:bg-brand-forest/10",
        getShapeClass(),
        className
      )}
      style={{
        width,
        height,
        ...style
      }}
      {...props}
    />
  )
}

// Composite skeleton layouts to represent common items
export const CardSkeleton: React.FC = () => (
  <div className="bg-white border border-brand-forest/5 p-6 rounded-2xl space-y-4 shadow-sm">
    <Skeleton variant="rectangular" className="h-4 w-1/3" />
    <Skeleton variant="rectangular" className="h-8 w-1/2" />
    <div className="space-y-2 pt-2">
      <Skeleton variant="text" className="w-full" />
      <Skeleton variant="text" className="w-5/6" />
    </div>
  </div>
)

export const GoalSkeleton: React.FC = () => (
  <div className="bg-white border border-brand-forest/5 p-5 rounded-2xl flex items-center justify-between shadow-sm">
    <div className="flex items-center space-x-4 flex-1">
      <Skeleton variant="circular" className="h-10 w-10 shrink-0" />
      <div className="space-y-2 flex-1 max-w-[200px]">
        <Skeleton variant="rectangular" className="h-4 w-3/4" />
        <Skeleton variant="rectangular" className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton variant="rectangular" className="h-6 w-16" />
  </div>
)

export const ActivitySkeleton: React.FC = () => (
  <div className="flex items-start space-x-3.5 py-4 border-b border-brand-forest/5">
    <Skeleton variant="circular" className="h-9 w-9 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton variant="rectangular" className="h-4 w-24" />
        <Skeleton variant="rectangular" className="h-4 w-12" />
      </div>
      <Skeleton variant="text" className="w-1/3" />
    </div>
  </div>
)
