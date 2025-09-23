"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { p2pNetwork, type P2PPeer } from "@/lib/p2p-network"
import { EncryptionService } from "@/lib/encryption"
import { Users, Smartphone, Monitor, Tablet, Send, CheckCircle } from "lucide-react"

interface P2PTransactionDialogProps {
  wallet: any
  children: React.ReactNode
}

export function P2PTransactionDialog({ wallet, children }: P2PTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"select" | "amount" | "confirm" | "sending" | "success">("select")
  const [selectedPeer, setSelectedPeer] = useState<P2PPeer | null>(null)
  const [connectedPeers, setConnectedPeers] = useState<P2PPeer[]>([])
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open) {
      updateConnectedPeers()
    }
  }, [open])

  const updateConnectedPeers = () => {
    const peers = p2pNetwork.getConnectedPeers()
    setConnectedPeers(peers)
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

  const handlePeerSelect = (peer: P2PPeer) => {
    setSelectedPeer(peer)
    setStep("amount")
  }

  const handleAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (amount && Number.parseFloat(amount) > 0) {
      setStep("confirm")
    }
  }

  const handleConfirmTransaction = async () => {
    if (!selectedPeer || !amount) return

    setStep("sending")
    setSending(true)

    try {
      // Create transaction
      const transaction = {
        id: EncryptionService.generateSecureId(),
        from: wallet.address,
        to: selectedPeer.address,
        amount: Number.parseFloat(amount),
        timestamp: Date.now(),
        note: note || undefined,
        nonce: Math.floor(Math.random() * 1000000),
      }

      // Sign transaction
      const signature = EncryptionService.signTransaction(transaction, wallet.privateKey)
      const signedTransaction = { ...transaction, signature }

      // Send via P2P network
      const success = await p2pNetwork.sendTransactionToPeer(selectedPeer.id, signedTransaction)

      if (success) {
        // Update local balance
        wallet.balance -= Number.parseFloat(amount)
        setStep("success")
      } else {
        throw new Error("Failed to send transaction to peer")
      }
    } catch (error) {
      console.error("P2P transaction failed:", error)
      setStep("amount")
    } finally {
      setSending(false)
    }
  }

  const resetDialog = () => {
    setStep("select")
    setSelectedPeer(null)
    setAmount("")
    setNote("")
    setSending(false)
    setOpen(false)
  }

  const formatAmount = (amount: string) => {
    const num = Number.parseFloat(amount)
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(num)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Send via P2P
          </DialogTitle>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select a connected peer to send money directly</p>

            {connectedPeers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No connected peers</p>
                <p className="text-sm">Make sure other wallets are nearby and connected</p>
                <Button variant="outline" size="sm" className="mt-4 bg-transparent" onClick={updateConnectedPeers}>
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {connectedPeers.map((peer) => {
                  const DeviceIcon = getDeviceIcon(peer.deviceInfo?.type)

                  return (
                    <Card
                      key={peer.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handlePeerSelect(peer)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              <DeviceIcon className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{peer.deviceInfo?.name || "Common Cube Wallet"}</p>
                            <code className="text-xs text-muted-foreground font-mono">
                              {peer.address.slice(0, 16)}...
                            </code>
                          </div>

                          <div className="flex items-center gap-2">
                            {peer.trusted && (
                              <Badge className="bg-success/10 text-success border-success/20 text-xs">Trusted</Badge>
                            )}
                            <Send className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {step === "amount" && selectedPeer && (
          <form onSubmit={handleAmountSubmit} className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getDeviceIcon(selectedPeer.deviceInfo?.type)({ className: "h-4 w-4" })}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{selectedPeer.deviceInfo?.name || "Common Cube Wallet"}</p>
                    <code className="text-xs text-muted-foreground font-mono">
                      {selectedPeer.address.slice(0, 16)}...
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (NGN)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                max={wallet.balance}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Input id="note" placeholder="What's this for?" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("select")} className="flex-1">
                Back
              </Button>
              <Button type="submit" className="flex-1">
                Continue
              </Button>
            </div>
          </form>
        )}

        {step === "confirm" && selectedPeer && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To:</span>
                  <span className="text-sm">{selectedPeer.deviceInfo?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">{formatAmount(amount)}</span>
                </div>
                {note && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Note:</span>
                    <span className="text-sm">{note}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method:</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20">P2P Direct</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("amount")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleConfirmTransaction} className="flex-1">
                Send Now
              </Button>
            </div>
          </div>
        )}

        {step === "sending" && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Sending via P2P</h3>
              <p className="text-sm text-muted-foreground">Transmitting directly to peer device...</p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-success">Sent Successfully!</h3>
              <p className="text-sm text-muted-foreground">{formatAmount(amount)} sent directly to peer</p>
            </div>
            <Button onClick={resetDialog} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
