"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { OfflineTransactionManager } from "@/lib/offline-transaction-manager"
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Clock, Trash2 } from "lucide-react"

interface OfflineSyncManagerProps {
  wallet: any
  isOnline: boolean
}

export function OfflineSyncManager({ wallet, isOnline }: OfflineSyncManagerProps) {
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<any>(null)

  useEffect(() => {
    updateSyncStatus()

    // Auto-sync when coming online
    if (isOnline && !syncing) {
      const pendingCount = OfflineTransactionManager.getOfflineTransactionStatus().pending
      if (pendingCount > 0) {
        handleSync()
      }
    }
  }, [isOnline])

  const updateSyncStatus = () => {
    const status = OfflineTransactionManager.getOfflineTransactionStatus()
    setSyncStatus(status)
  }

  const handleSync = async () => {
    if (!isOnline || syncing) return

    setSyncing(true)
    try {
      const result = await OfflineTransactionManager.syncPendingTransactions(wallet)
      setLastSyncResult(result)
      updateSyncStatus()
    } catch (error) {
      console.error("Sync failed:", error)
      setLastSyncResult({ successful: 0, failed: 1, errors: [error.message] })
    } finally {
      setSyncing(false)
    }
  }

  const handleRetryFailed = async () => {
    const retriedCount = await OfflineTransactionManager.retryFailedTransactions(wallet)
    updateSyncStatus()

    if (retriedCount > 0 && isOnline) {
      handleSync()
    }
  }

  const handleCleanup = () => {
    const removedCount = OfflineTransactionManager.cleanupOldTransactions(30)
    updateSyncStatus()
    alert(`Cleaned up ${removedCount} old transactions`)
  }

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return "Never"

    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return "Just now"
  }

  if (!syncStatus) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isOnline ? <Wifi className="h-5 w-5 text-success" /> : <WifiOff className="h-5 w-5 text-warning" />}
          Offline Transaction Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection Status</span>
          <Badge
            variant={isOnline ? "default" : "secondary"}
            className={
              isOnline ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
            }
          >
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>

        {/* Transaction Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pending Transactions</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {syncStatus.pending}
              </Badge>
              {syncStatus.pending > 0 && <Clock className="h-4 w-4 text-warning" />}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Synced Transactions</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {syncStatus.synced}
              </Badge>
              {syncStatus.synced > 0 && <CheckCircle className="h-4 w-4 text-success" />}
            </div>
          </div>

          {syncStatus.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Sync Progress</span>
                <span>{Math.round((syncStatus.synced / syncStatus.total) * 100)}%</span>
              </div>
              <Progress value={(syncStatus.synced / syncStatus.total) * 100} className="h-2" />
            </div>
          )}
        </div>

        {/* Last Sync */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Last Sync</span>
          <span className="text-sm text-muted-foreground">{formatLastSync(syncStatus.lastSync)}</span>
        </div>

        {/* Sync Result */}
        {lastSyncResult && (
          <Card
            className={`border-2 ${lastSyncResult.failed > 0 ? "border-destructive/20 bg-destructive/5" : "border-success/20 bg-success/5"}`}
          >
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                {lastSyncResult.failed > 0 ? (
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                )}
                <div className="space-y-1 flex-1">
                  <p className="font-medium text-sm">
                    Last Sync: {lastSyncResult.successful} successful, {lastSyncResult.failed} failed
                  </p>
                  {lastSyncResult.errors.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {lastSyncResult.errors.slice(0, 2).map((error, index) => (
                        <p key={index}>• {error}</p>
                      ))}
                      {lastSyncResult.errors.length > 2 && <p>• ... and {lastSyncResult.errors.length - 2} more</p>}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleSync} disabled={!isOnline || syncing || syncStatus.pending === 0} className="flex-1">
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now ({syncStatus.pending})
              </>
            )}
          </Button>

          {syncStatus.pending > 0 && (
            <Button variant="outline" onClick={handleRetryFailed} disabled={syncing}>
              Retry Failed
            </Button>
          )}
        </div>

        {/* Cleanup Button */}
        {syncStatus.synced > 50 && (
          <Button variant="ghost" size="sm" onClick={handleCleanup} className="w-full text-muted-foreground">
            <Trash2 className="h-4 w-4 mr-2" />
            Clean Up Old Transactions
          </Button>
        )}

        {/* Offline Mode Notice */}
        {!isOnline && syncStatus.pending > 0 && (
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <WifiOff className="h-5 w-5 text-warning mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Offline Mode Active</p>
                  <p className="text-xs text-muted-foreground">
                    {syncStatus.pending} transactions will sync automatically when you're back online
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
