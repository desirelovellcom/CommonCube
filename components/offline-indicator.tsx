"use client"

import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface OfflineIndicatorProps {
  isOnline: boolean
}

export function OfflineIndicator({ isOnline }: OfflineIndicatorProps) {
  return (
    <Badge
      variant={isOnline ? "default" : "secondary"}
      className={cn(
        "flex items-center gap-1 text-xs",
        isOnline ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20",
      )}
    >
      {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {isOnline ? "Online" : "Offline"}
    </Badge>
  )
}
