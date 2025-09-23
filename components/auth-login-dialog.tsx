"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { AuthManager } from "@/lib/auth-manager"
import { Lock, Fingerprint, AlertCircle, Eye, EyeOff, Timer } from "lucide-react"

interface AuthLoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AuthLoginDialog({ open, onOpenChange, onSuccess }: AuthLoginDialogProps) {
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState("")
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutTime, setLockoutTime] = useState(0)
  const [canUseBiometric, setCanUseBiometric] = useState(false)

  useEffect(() => {
    if (open) {
      setFailedAttempts(AuthManager.getFailedAttempts())
      setLockoutTime(AuthManager.getLockoutRemainingTime())
      setCanUseBiometric(AuthManager.isBiometricSetup())
      setError("")
      setPin("")

      // Update lockout timer
      const interval = setInterval(() => {
        const remaining = AuthManager.getLockoutRemainingTime()
        setLockoutTime(remaining)
        if (remaining === 0) {
          setFailedAttempts(0)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [open])

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (lockoutTime > 0) {
      setError("Account is locked. Please wait.")
      return
    }

    if (!pin) {
      setError("Please enter your PIN")
      return
    }

    setVerifying(true)
    setError("")

    try {
      const isValid = await AuthManager.verifyPin(pin)

      if (isValid) {
        const session = AuthManager.createSession("user")
        onSuccess()
        onOpenChange(false)
      } else {
        setError("Invalid PIN")
        setFailedAttempts(AuthManager.getFailedAttempts())
        setPin("")
      }
    } catch (error: any) {
      setError(error.message || "Authentication failed")
      setFailedAttempts(AuthManager.getFailedAttempts())
      setLockoutTime(AuthManager.getLockoutRemainingTime())
    } finally {
      setVerifying(false)
    }
  }

  const handleBiometricLogin = async () => {
    if (lockoutTime > 0) {
      setError("Account is locked. Please wait.")
      return
    }

    setVerifying(true)
    setError("")

    try {
      const isValid = await AuthManager.verifyBiometric()

      if (isValid) {
        const session = AuthManager.createSession("user")
        onSuccess()
        onOpenChange(false)
      } else {
        setError("Biometric authentication failed")
      }
    } catch (error: any) {
      setError(error.message || "Biometric authentication failed")
    } finally {
      setVerifying(false)
    }
  }

  const formatLockoutTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const settings = AuthManager.getAuthSettings()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Unlock Your Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lockout Warning */}
          {lockoutTime > 0 && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Timer className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-destructive">Account Locked</p>
                    <p className="text-xs text-muted-foreground">
                      Too many failed attempts. Try again in {formatLockoutTime(lockoutTime)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failed Attempts Warning */}
          {failedAttempts > 0 && lockoutTime === 0 && (
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Authentication Warning</p>
                    <p className="text-xs text-muted-foreground">
                      {failedAttempts} of {settings.maxFailedAttempts} attempts used. Account will be locked after{" "}
                      {settings.maxFailedAttempts} failed attempts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Biometric Authentication */}
          {canUseBiometric && settings.requireBiometric && lockoutTime === 0 && (
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleBiometricLogin}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Fingerprint className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Use Biometric Authentication</p>
                    <p className="text-xs text-muted-foreground">Touch the fingerprint sensor or look at the camera</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PIN Authentication */}
          {settings.requirePin && (
            <form onSubmit={handlePinLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-pin">Enter PIN</Label>
                <div className="relative">
                  <Input
                    id="login-pin"
                    type={showPin ? "text" : "password"}
                    placeholder="Enter your PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    maxLength={8}
                    disabled={lockoutTime > 0 || verifying}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPin(!showPin)}
                    disabled={lockoutTime > 0 || verifying}
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={!pin || lockoutTime > 0 || verifying}>
                {verifying ? "Verifying..." : "Unlock Wallet"}
              </Button>
            </form>
          )}

          {/* Alternative Authentication */}
          {canUseBiometric && settings.requirePin && lockoutTime === 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
          )}

          {canUseBiometric && settings.requirePin && lockoutTime === 0 && (
            <Button
              variant="outline"
              onClick={handleBiometricLogin}
              disabled={verifying}
              className="w-full bg-transparent"
            >
              <Fingerprint className="h-4 w-4 mr-2" />
              Use Biometric
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
