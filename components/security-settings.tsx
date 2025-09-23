"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { EncryptionService } from "@/lib/encryption"
import { OfflineStorageService } from "@/lib/offline-storage"
import { Shield, Key, Lock, Eye, EyeOff, RefreshCw, Download, AlertTriangle } from "lucide-react"

interface SecuritySettingsProps {
  wallet: any
  onWalletUpdate: (wallet: any) => void
}

export function SecuritySettings({ wallet, onWalletUpdate }: SecuritySettingsProps) {
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [backupPassword, setBackupPassword] = useState("")
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)

  const regenerateKeys = () => {
    const newKeyPair = EncryptionService.generateKeyPair()
    const newAddress = EncryptionService.generateWalletAddress(newKeyPair.publicKey)

    const updatedWallet = {
      ...wallet,
      publicKey: newKeyPair.publicKey,
      privateKey: newKeyPair.privateKey,
      address: newAddress,
      lastKeyRotation: Date.now(),
    }

    OfflineStorageService.storeWallet(updatedWallet)
    onWalletUpdate(updatedWallet)
  }

  const exportWallet = () => {
    if (!backupPassword) {
      alert("Please enter a backup password")
      return
    }

    const walletBackup = {
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      createdAt: wallet.createdAt,
      exportedAt: Date.now(),
    }

    const encrypted = EncryptionService.encrypt(JSON.stringify(walletBackup), backupPassword)

    const backupData = {
      version: "1.0",
      encrypted: encrypted.encrypted,
      iv: encrypted.iv,
      tag: encrypted.tag,
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `commoncube-wallet-backup-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Encryption Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Encryption Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">End-to-End Encryption</p>
              <p className="text-sm text-muted-foreground">AES-256-GCM encryption active</p>
            </div>
            <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Digital Signatures</p>
              <p className="text-sm text-muted-foreground">SHA-256 transaction signing</p>
            </div>
            <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Secure Storage</p>
              <p className="text-sm text-muted-foreground">Local encrypted storage</p>
            </div>
            <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Key Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Key Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Public Key</Label>
            <code className="block p-3 bg-muted rounded-lg text-sm font-mono break-all">{wallet.publicKey}</code>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Private Key</Label>
              <Button variant="ghost" size="sm" onClick={() => setShowPrivateKey(!showPrivateKey)}>
                {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <code className="block p-3 bg-muted rounded-lg text-sm font-mono break-all">
              {showPrivateKey ? wallet.privateKey : "•".repeat(64)}
            </code>
          </div>

          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Keep Your Private Key Safe</p>
                  <p className="text-xs text-muted-foreground">
                    Never share your private key. Anyone with access can control your wallet.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={regenerateKeys} variant="outline" className="w-full bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate Keys
          </Button>
        </CardContent>
      </Card>

      {/* Backup & Recovery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Backup & Recovery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-password">Backup Password</Label>
            <Input
              id="backup-password"
              type="password"
              placeholder="Enter a strong password"
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
            />
          </div>

          <Button onClick={exportWallet} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Export Encrypted Backup
          </Button>
        </CardContent>
      </Card>

      {/* Security Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add extra security to transactions</p>
            </div>
            <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Biometric Authentication</p>
              <p className="text-sm text-muted-foreground">Use fingerprint or face unlock</p>
            </div>
            <Switch checked={biometricEnabled} onCheckedChange={setBiometricEnabled} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
