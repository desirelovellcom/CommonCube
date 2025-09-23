"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { p2pNetwork, type P2PPeer } from "@/lib/p2p-network"
import { Wifi, Users, Smartphone, Monitor, Tablet, Signal, RefreshCw, Send } from "lucide-react"

interface P2PNetworkStatusProps {
  wallet: any
}

export function P2PNetworkStatus({ wallet }: P2PNetworkStatusProps) {
  const [peers, setPeers] = useState<P2PPeer[]>([])
  const [connectedPeers, setConnectedPeers] = useState<P2PPeer[]>([])
  const [discovering, setDiscovering] = useState(false)

  useEffect(() => {
    updatePeerStatus()

    // Update peer status every 10 seconds
    const interval = setInterval(updatePeerStatus, 10000)

    return () => clearInterval(interval)
  }, [])

  const updatePeerStatus = () => {
    const allPeers = p2pNetwork.getPeers()
    const connected = p2pNetwork.getConnectedPeers()

    setPeers(allPeers)
    setConnectedPeers(connected)
  }

  const handleDiscoverPeers = async () => {
    setDiscovering(true)
    try {
      await p2pNetwork.startPeerDiscovery()
      updatePeerStatus()
    } catch (error) {
      console.error("Peer discovery failed:", error)
    } finally {
      setDiscovering(false)
    }
  }

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType) {
      case "mobile":
        return Smartphone
      case "tablet":
        return Tablet
      case "desktop":
        return Monitor
      default:
        return Smartphone
    }
  }

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return "Just now"
  }

  const getSignalStrength = (distance: number) => {
    if (distance < 10) return "strong"
    if (distance < 50) return "medium"
    return "weak"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            P2P Network
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {connectedPeers.length} connected
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleDiscoverPeers} disabled={discovering}>
              {discovering ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
            <div>
              <p className="font-medium text-sm">P2P Network Active</p>
              <p className="text-xs text-muted-foreground">Discovering nearby Common Cube wallets</p>
            </div>
          </div>
          <Wifi className="h-5 w-5 text-success" />
        </div>

        {/* Connected Peers */}
        {connectedPeers.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Signal className="h-4 w-4" />
              Connected Peers ({connectedPeers.length})
            </h4>

            {connectedPeers.map((peer) => {
              const DeviceIcon = getDeviceIcon(peer.deviceInfo?.type)
              const signalStrength = getSignalStrength(peer.distance)

              return (
                <div key={peer.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-success/10 text-success">
                      <DeviceIcon className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{peer.deviceInfo?.name || "Common Cube Wallet"}</p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          signalStrength === "strong"
                            ? "border-success text-success"
                            : signalStrength === "medium"
                              ? "border-warning text-warning"
                              : "border-muted-foreground text-muted-foreground"
                        }`}
                      >
                        {signalStrength}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <code className="font-mono">{peer.address.slice(0, 16)}...</code>
                      <span>•</span>
                      <span>{formatLastSeen(peer.lastSeen)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {peer.trusted && (
                      <Badge className="bg-success/10 text-success border-success/20 text-xs">Trusted</Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Discovered Peers */}
        {peers.length > connectedPeers.length && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Discovered Peers ({peers.length - connectedPeers.length})
            </h4>

            {peers
              .filter((peer) => !connectedPeers.find((cp) => cp.id === peer.id))
              .slice(0, 3)
              .map((peer) => {
                const DeviceIcon = getDeviceIcon(peer.deviceInfo?.type)

                return (
                  <div key={peer.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        <DeviceIcon className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{peer.deviceInfo?.name || "Common Cube Wallet"}</p>
                      <p className="text-xs text-muted-foreground">{formatLastSeen(peer.lastSeen)}</p>
                    </div>

                    <Button variant="outline" size="sm" className="text-xs bg-transparent">
                      Connect
                    </Button>
                  </div>
                )
              })}
          </div>
        )}

        {/* No Peers Found */}
        {peers.length === 0 && !discovering && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No peers discovered</p>
            <p className="text-sm">Make sure other Common Cube wallets are nearby</p>
            <Button variant="outline" size="sm" className="mt-4 bg-transparent" onClick={handleDiscoverPeers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Discover Peers
            </Button>
          </div>
        )}

        {/* Discovery in Progress */}
        {discovering && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-primary animate-spin" />
            </div>
            <p className="font-medium">Discovering peers...</p>
            <p className="text-sm text-muted-foreground">Looking for nearby Common Cube wallets</p>
          </div>
        )}

        {/* P2P Features */}
        <div className="pt-4 border-t space-y-2">
          <h4 className="font-medium text-sm">P2P Features</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Direct Transactions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Blockchain Sync</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Encrypted Messages</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Offline Relay</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
