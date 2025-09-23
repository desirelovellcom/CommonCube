"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CommonCubeLogo } from "@/components/common-cube-logo"
import { WalletBalance } from "@/components/wallet-balance"
import { QuickActions } from "@/components/quick-actions"
import { TransactionList } from "@/components/transaction-list"
import { OfflineIndicator } from "@/components/offline-indicator"
import { OfflineSyncManager } from "@/components/offline-sync-manager"
import { TransactionQueue } from "@/components/transaction-queue"
import { OfflineStorageService } from "@/lib/offline-storage"
import { EncryptionService } from "@/lib/encryption"
import { Bell, Settings, QrCode } from "lucide-react"
import { P2PNetworkStatus } from "@/components/p2p-network-status"

export function WalletDashboard() {
  const [wallet, setWallet] = useState<any>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "queue" | "sync" | "p2p">("overview")

  useEffect(() => {
    // Initialize or load wallet
    let existingWallet = OfflineStorageService.getWallet()

    if (!existingWallet) {
      // Create new wallet
      const keyPair = EncryptionService.generateKeyPair()
      const address = EncryptionService.generateWalletAddress(keyPair.publicKey)

      existingWallet = {
        address,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        balance: 1000, // Starting balance for demo
        createdAt: Date.now(),
      }

      OfflineStorageService.storeWallet(existingWallet)
    }

    setWallet(existingWallet)

    // Monitor online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!wallet) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <CommonCubeLogo size="lg" className="justify-center mb-4" />
          <p className="text-muted-foreground">Initializing wallet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <CommonCubeLogo />
            <div className="flex items-center gap-3">
              <OfflineIndicator isOnline={isOnline} />
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">3</Badge>
              </Button>
              <Button variant="ghost" size="icon">
                <QrCode className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-balance">Welcome back to Common Cube</h1>
          <p className="text-muted-foreground text-pretty">
            Your secure, offline-first digital wallet for Lagos and beyond
          </p>
        </div>

        {/* Balance Card */}
        <WalletBalance balance={wallet.balance} address={wallet.address} isOnline={isOnline} />

        {/* Quick Actions */}
        <QuickActions wallet={wallet} isOnline={isOnline} />

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("overview")}
            className="flex-1"
          >
            Overview
          </Button>
          <Button
            variant={activeTab === "queue" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("queue")}
            className="flex-1"
          >
            Queue
          </Button>
          <Button
            variant={activeTab === "sync" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("sync")}
            className="flex-1"
          >
            Sync
          </Button>
          <Button
            variant={activeTab === "p2p" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("p2p")}
            className="flex-1"
          >
            P2P
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Activity
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionList wallet={wallet} />
            </CardContent>
          </Card>
        )}

        {activeTab === "queue" && <TransactionQueue wallet={wallet} isOnline={isOnline} />}

        {activeTab === "sync" && <OfflineSyncManager wallet={wallet} isOnline={isOnline} />}

        {activeTab === "p2p" && <P2PNetworkStatus wallet={wallet} />}

        {/* Security Notice */}
        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-success mt-2 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-success-foreground">Your wallet works completely offline</p>
                <p className="text-sm text-muted-foreground">
                  All transactions are encrypted and queued for sync when you're back online
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
