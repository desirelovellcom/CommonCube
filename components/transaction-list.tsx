"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { OfflineStorageService } from "@/lib/offline-storage"
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle } from "lucide-react"

interface TransactionListProps {
  wallet: any
}

export function TransactionList({ wallet }: TransactionListProps) {
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    // Load transactions from storage
    const offlineTransactions = OfflineStorageService.getOfflineTransactions()

    // Mock some sample transactions for demo
    const sampleTransactions = [
      {
        id: "1",
        type: "received",
        amount: 25000,
        from: "John Doe",
        to: wallet.address,
        timestamp: Date.now() - 3600000,
        status: "completed",
        synced: true,
      },
      {
        id: "2",
        type: "sent",
        amount: 15000,
        from: wallet.address,
        to: "Jane Smith",
        timestamp: Date.now() - 7200000,
        status: "completed",
        synced: true,
      },
      {
        id: "3",
        type: "received",
        amount: 50000,
        from: "Mike Johnson",
        to: wallet.address,
        timestamp: Date.now() - 86400000,
        status: "pending",
        synced: false,
      },
    ]

    setTransactions([...sampleTransactions, ...offlineTransactions])
  }, [wallet.address])

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return "Just now"
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No transactions yet</p>
        <p className="text-sm">Your transaction history will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {transactions.slice(0, 5).map((transaction) => {
        const isReceived = transaction.type === "received"
        const Icon = isReceived ? ArrowDownLeft : ArrowUpRight
        const StatusIcon = transaction.synced ? CheckCircle : Clock

        return (
          <div
            key={transaction.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className={isReceived ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}>
                <Icon className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">
                  {isReceived ? `From ${transaction.from}` : `To ${transaction.to}`}
                </p>
                <StatusIcon className={`h-4 w-4 ${transaction.synced ? "text-success" : "text-warning"}`} />
              </div>
              <p className="text-sm text-muted-foreground">{formatTime(transaction.timestamp)}</p>
            </div>

            <div className="text-right">
              <p className={`font-semibold ${isReceived ? "text-success" : "text-foreground"}`}>
                {isReceived ? "+" : "-"}
                {formatAmount(transaction.amount)}
              </p>
              <Badge variant={transaction.status === "completed" ? "default" : "secondary"} className="text-xs">
                {transaction.status}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}
