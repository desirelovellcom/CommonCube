"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EncryptionService } from "@/lib/encryption"
import { OfflineStorageService } from "@/lib/offline-storage"
import { commonCubeChain } from "@/lib/blockchain"
import { Send, Shield, Lock, CheckCircle } from "lucide-react"

interface SendMoneyDialogProps {
  wallet: any
  isOnline: boolean
  children: React.ReactNode
}

export function SendMoneyDialog({ wallet, isOnline, children }: SendMoneyDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"form" | "confirm" | "processing" | "success">("form")
  const [formData, setFormData] = useState({
    recipient: "",
    amount: "",
    note: "",
  })
  const [encryptedTransaction, setEncryptedTransaction] = useState<any>(null)
  const [transactionId, setTransactionId] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Create transaction
    const transaction = {
      id: EncryptionService.generateSecureId(),
      from: wallet.address,
      to: formData.recipient,
      amount: Number.parseFloat(formData.amount),
      timestamp: Date.now(),
      note: formData.note,
      nonce: Math.floor(Math.random() * 1000000),
    }

    // Sign transaction with private key
    const signature = EncryptionService.signTransaction(transaction, wallet.privateKey)
    const signedTransaction = { ...transaction, signature }

    // Encrypt transaction data
    const encryptedData = EncryptionService.encrypt(JSON.stringify(signedTransaction), wallet.privateKey)

    setEncryptedTransaction(encryptedData)
    setTransactionId(transaction.id)
    setStep("confirm")
  }

  const confirmTransaction = async () => {
    setStep("processing")

    try {
      // Decrypt and verify transaction
      const decryptedData = EncryptionService.decrypt(encryptedTransaction, wallet.privateKey)
      const transaction = JSON.parse(decryptedData)

      // Verify signature
      const isValid = EncryptionService.verifySignature(transaction, transaction.signature, wallet.publicKey)

      if (!isValid) {
        throw new Error("Transaction signature verification failed")
      }

      if (isOnline) {
        // Add to blockchain
        commonCubeChain.createTransaction(transaction)
        commonCubeChain.minePendingTransactions(wallet.address)
      } else {
        // Store for offline processing
        OfflineStorageService.storeOfflineTransaction({
          id: transaction.id,
          transaction,
          timestamp: Date.now(),
          synced: false,
        })
      }

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setStep("success")
    } catch (error) {
      console.error("Transaction failed:", error)
      setStep("form")
    }
  }

  const resetDialog = () => {
    setStep("form")
    setFormData({ recipient: "", amount: "", note: "" })
    setEncryptedTransaction(null)
    setTransactionId("")
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
            <Send className="h-5 w-5" />
            Send Money
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="CC1234567890ABCDEF..."
                value={formData.recipient}
                onChange={(e) => setFormData((prev) => ({ ...prev, recipient: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (NGN)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                required
                min="1"
                max={wallet.balance}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Input
                id="note"
                placeholder="What's this for?"
                value={formData.note}
                onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
              />
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm">End-to-End Encrypted</p>
                    <p className="text-xs text-muted-foreground">
                      Your transaction is secured with AES-256 encryption and digital signatures
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Continue
              </Button>
            </div>
          </form>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To:</span>
                  <code className="text-sm font-mono">{formData.recipient.slice(0, 16)}...</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">{formatAmount(formData.amount)}</span>
                </div>
                {formData.note && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Note:</span>
                    <span className="text-sm">{formData.note}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <code className="text-xs font-mono">{transactionId.slice(0, 8)}...</code>
                </div>
              </CardContent>
            </Card>

            <Card className="border-success/20 bg-success/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-success mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-success">Transaction Encrypted</p>
                    <p className="text-xs text-muted-foreground">
                      Your transaction has been encrypted and digitally signed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Badge variant={isOnline ? "default" : "secondary"} className="w-full justify-center">
              {isOnline ? "Will be processed immediately" : "Will sync when online"}
            </Badge>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("form")} className="flex-1">
                Back
              </Button>
              <Button onClick={confirmTransaction} className="flex-1">
                Confirm & Send
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Processing Transaction</h3>
              <p className="text-sm text-muted-foreground">
                Encrypting and {isOnline ? "broadcasting" : "storing"} your transaction...
              </p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-success">Transaction Sent!</h3>
              <p className="text-sm text-muted-foreground">
                {formatAmount(formData.amount)} has been {isOnline ? "sent" : "queued for sending"}
              </p>
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
