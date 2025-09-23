"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { AuthManager } from "@/lib/auth-manager"
import { Shield, Lock, Fingerprint, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react"

interface AuthSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function AuthSetupDialog({ open, onOpenChange, onComplete }: AuthSetupDialogProps) {
  const [step, setStep] = useState<"welcome" | "pin" | "biometric" | "complete">("welcome")
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [enableBiometric, setEnableBiometric] = useState(false)
  const [setting, setSetting] = useState(false)

  const handlePinSetup = async () => {
    if (pin.length < 4) {
      alert("PIN must be at least 4 digits")
      return
    }

    if (pin !== confirmPin) {
      alert("PINs do not match")
      return
    }

    setSetting(true)
    const success = await AuthManager.setupPin(pin)
    setSetting(false)

    if (success) {
      if (AuthManager.isBiometricSupported()) {
        setStep("biometric")
      } else {
        setStep("complete")
      }
    } else {
      alert("Failed to setup PIN")
    }
  }

  const handleBiometricSetup = async () => {
    if (!enableBiometric) {
      setStep("complete")
      return
    }

    setSetting(true)
    const success = await AuthManager.setupBiometric()
    setSetting(false)

    if (success) {
      AuthManager.setAuthSettings({ requireBiometric: true })
    }

    setStep("complete")
  }

  const handleComplete = () => {
    // Update auth settings
    AuthManager.setAuthSettings({
      requirePin: true,
      requireBiometric: enableBiometric && AuthManager.isBiometricSetup(),
    })

    onComplete()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Secure Your Wallet
          </DialogTitle>
        </DialogHeader>

        {step === "welcome" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold">Protect Your Digital Assets</h3>
              <p className="text-sm text-muted-foreground">
                Set up authentication to keep your Common Cube wallet secure
              </p>
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">PIN Protection</p>
                      <p className="text-xs text-muted-foreground">Secure your wallet with a personal PIN</p>
                    </div>
                  </div>

                  {AuthManager.isBiometricSupported() && (
                    <div className="flex items-center gap-3">
                      <Fingerprint className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">Biometric Authentication</p>
                        <p className="text-xs text-muted-foreground">Use fingerprint or face recognition</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => setStep("pin")} className="w-full">
              Get Started
            </Button>
          </div>
        )}

        {step === "pin" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Create Your PIN</h3>
              <p className="text-sm text-muted-foreground">Choose a secure PIN to protect your wallet</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">PIN (4-8 digits)</Label>
                <div className="relative">
                  <Input
                    id="pin"
                    type={showPin ? "text" : "password"}
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    maxLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-pin">Confirm PIN</Label>
                <Input
                  id="confirm-pin"
                  type={showPin ? "text" : "password"}
                  placeholder="Confirm PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  maxLength={8}
                />
              </div>

              {pin && confirmPin && pin !== confirmPin && (
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  PINs do not match
                </p>
              )}
            </div>

            <Button
              onClick={handlePinSetup}
              disabled={!pin || !confirmPin || pin !== confirmPin || pin.length < 4 || setting}
              className="w-full"
            >
              {setting ? "Setting up..." : "Continue"}
            </Button>
          </div>
        )}

        {step === "biometric" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Fingerprint className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Enable Biometric Authentication</h3>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security with biometric authentication
              </p>
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Biometric Authentication</p>
                    <p className="text-xs text-muted-foreground">
                      Use fingerprint or face recognition to unlock your wallet
                    </p>
                  </div>
                  <Switch checked={enableBiometric} onCheckedChange={setEnableBiometric} />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("complete")} className="flex-1">
                Skip
              </Button>
              <Button onClick={handleBiometricSetup} disabled={setting} className="flex-1">
                {setting ? "Setting up..." : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h3 className="font-semibold text-success">Security Setup Complete!</h3>
              <p className="text-sm text-muted-foreground">Your wallet is now protected with secure authentication</p>
            </div>

            <Card className="border-success/20 bg-success/5">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>PIN protection enabled</span>
                  </div>
                  {enableBiometric && AuthManager.isBiometricSetup() && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>Biometric authentication enabled</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>End-to-end encryption active</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleComplete} className="w-full">
              Start Using Common Cube
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
