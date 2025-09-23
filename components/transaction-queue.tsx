"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { OfflineStorageService } from "@/lib/offline-storage"
import { EncryptionService } from "@/lib/encryption"
import { Clock, CheckCircle, ArrowUpRight, ArrowDownLeft, X } from "lucide-react"

interface TransactionQueueProps {
  wallet: any
  isOnline: boolean
}

export function TransactionQueue({ wallet, isOnline }: TransactionQueueProps) {
  const [queuedTransactions, setQueuedTransactions] = useState<any[]>([])

  useEffect(() => {
    loadQueuedTransactions()
  }, [wallet])

  const loadQueuedTransactions = () => {
    const offlineTransactions = OfflineStorageService.getOfflineTransactions()

    const decryptedTransactions = offlineTransactions
      .map((offlineTx) => {
        try {
          const decryptedData = EncryptionService.decrypt(offlineTx.transaction.encrypted, wallet.privateKey)
          const transaction = JSON.parse(decryptedData)

          return {
            ...transaction,
            offlineId: offlineTx.id,
            synced: offlineTx.synced,
            queuedAt: offlineTx.transaction.queuedAt || offlineTx.timestamp,
          }
        } catch (error) {
          console.error("Failed to decrypt transaction:", error)
          return null
        }
      })
      .filter((tx) => tx !== null)
      .sort((a, b) => b.queuedAt - a.queuedAt)

    setQueuedTransactions(decryptedTransactions)
  }

  const removeTransaction = (offlineId: string) => {
    // Remove from storage
    const allTransactions = OfflineStorageService.getOfflineTransactions()
    const filtered = allTransactions.filter((tx) => tx.id !== offlineId)

    if (typeof window !== "undefined") {
      localStorage.setItem("commoncube_transactions", JSON.stringify(filtered))
    }

    loadQueuedTransactions()
  }

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

  const getStatusInfo = (transaction: any) => {
    if (transaction.synced) {
      return {
        icon: CheckCircle,
        color: "text-success",
        label: "Synced",
        description: "Transaction completed",
      }
    } else if (isOnline) {
      return {
        icon: Clock,
        color: "text-warning",
        label: "Syncing",
        description: "Processing transaction",
      }
    } else {
      return {
        icon: Clock,
        color: "text-muted-foreground",
        label: "Queued",
        description: "Waiting for connection",
      }
    }
  }

  if (queuedTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Transaction Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No queued transactions</p>
            <p className="text-sm">Offline transactions will appear here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Transaction Queue
          </div>
          <Badge variant="outline">{queuedTransactions.filter((tx) => !tx.synced).length} pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {queuedTransactions.map((transaction) => {
            const isReceived = transaction.to === wallet.address
            const Icon = isReceived ? ArrowDownLeft : ArrowUpRight
            const statusInfo = getStatusInfo(transaction)
            const StatusIcon = statusInfo.icon

            return (
              <div key={transaction.offlineId} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={isReceived ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}>
                    <Icon className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate text-sm">
                      {isReceived ? `From ${transaction.from.slice(0, 16)}...` : `To ${transaction.to.slice(0, 16)}...`}
                    </p>
                    <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatTime(transaction.queuedAt)}</span>
                    <span>•</span>
                    <span>{statusInfo.description}</span>
                  </div>
                  {transaction.note && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">"{transaction.note}"</p>
                  )}
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className={`font-semibold text-sm ${isReceived ? "text-success" : "text-foreground"}`}>
                      {isReceived ? "+" : "-"}
                      {formatAmount(transaction.amount)}
                    </p>
                    <Badge variant={transaction.synced ? "default" : "secondary"} className="text-xs">
                      {statusInfo.label}
                    </Badge>
                  </div>

                  {!transaction.synced && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTransaction(transaction.offlineId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total: {queuedTransactions.length} transactions</span>
            <span className="text-muted-foreground">
              Pending: {queuedTransactions.filter((tx) => !tx.synced).length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
