import { cn } from "@/lib/utils"

interface CommonCubeLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function CommonCubeLogo({ className, size = "md" }: CommonCubeLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg",
          sizeClasses[size],
        )}
      >
        <div className="absolute inset-1 rounded-lg bg-gradient-to-tr from-accent/20 to-primary/20" />
        <div className="relative text-primary-foreground font-bold text-lg">CC</div>
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-lg text-foreground">Common Cube</span>
        <span className="text-xs text-muted-foreground">Offline Finance</span>
      </div>
    </div>
  )
}
