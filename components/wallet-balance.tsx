"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Copy, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface WalletBalanceProps {
  balance: number
  address: string
  isOnline: boolean
}

export function WalletBalance({ balance, address, isOnline }: WalletBalanceProps) {
  const [showBalance, setShowBalance] = useState(true)
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
      <CardContent className="relative p-6 space-y-4">
        {/* Balance Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-90">Total Balance</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-white/10"
              onClick={() => setShowBalance(!showBalance)}
            >
              {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-1">
            <div className="text-3xl font-bold">{showBalance ? formatBalance(balance) : "••••••"}</div>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <TrendingUp className="h-4 w-4" />
              <span>+2.5% from last week</span>
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="space-y-2">
          <span className="text-sm opacity-90">Wallet Address</span>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-white/10 backdrop-blur-sm">
            <code className="text-sm font-mono flex-1 truncate">{address}</code>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-white/10 flex-shrink-0"
              onClick={copyAddress}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {copied && <p className="text-xs opacity-75">Address copied to clipboard!</p>}
        </div>

        {/* Status Badge */}
        <div className="flex justify-between items-center">
          <Badge
            variant={isOnline ? "default" : "secondary"}
            className={cn(
              "text-xs",
              isOnline ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground",
            )}
          >
            {isOnline ? "Online" : "Offline Mode"}
          </Badge>
          <span className="text-xs opacity-75">Common Cube • Lagos</span>
        </div>
      </CardContent>
    </Card>
  )
}
