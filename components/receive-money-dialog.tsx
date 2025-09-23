"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Download, Share2, Shield } from "lucide-react"

interface ReceiveMoneyDialogProps {
  wallet: any
  children: React.ReactNode
}

export function ReceiveMoneyDialog({ wallet, children }: ReceiveMoneyDialogProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [copied, setCopied] = useState(false)

  const generatePaymentRequest = () => {
    const paymentData = {
      address: wallet.address,
      amount: amount ? Number.parseFloat(amount) : undefined,
      note: note || undefined,
      timestamp: Date.now(),
    }

    return JSON.stringify(paymentData)
  }

  const copyAddress = async () => {
    await navigator.clipboard.writeText(wallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyPaymentRequest = async () => {
    await navigator.clipboard.writeText(generatePaymentRequest())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sharePaymentRequest = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Common Cube Payment Request",
          text: `Send me ${amount ? `₦${amount}` : "money"} via Common Cube`,
          url: `commoncube://pay?data=${encodeURIComponent(generatePaymentRequest())}`,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Receive Money
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (Optional)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Note Input */}
          <div className="space-y-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Input id="note" placeholder="What's this for?" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {/* QR Code */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG value={generatePaymentRequest()} size={200} level="M" includeMargin={true} />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Scan this QR code to send money to this wallet
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Address */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Wallet Address</Label>
                <Button variant="ghost" size="sm" onClick={copyAddress} className="h-8 px-2">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <code className="block p-3 bg-muted rounded-lg text-sm font-mono break-all">{wallet.address}</code>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Secure Payment Request</p>
                  <p className="text-xs text-muted-foreground">
                    Your address is cryptographically generated and secure
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {copied && <p className="text-sm text-success text-center">Copied to clipboard!</p>}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyPaymentRequest} className="flex-1 bg-transparent">
              <Copy className="h-4 w-4 mr-2" />
              Copy Request
            </Button>
            <Button onClick={sharePaymentRequest} className="flex-1">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
