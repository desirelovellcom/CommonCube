"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { AuthManager } from "@/lib/auth-manager"
import { AuthSetupDialog } from "@/components/auth-setup-dialog"
import { AuthLoginDialog } from "@/components/auth-login-dialog"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()

    // Check session periodically
    const interval = setInterval(checkAuthStatus, 60000) // Every minute

    return () => clearInterval(interval)
  }, [])

  const checkAuthStatus = () => {
    AuthManager.initialize()

    const isPinSetup = AuthManager.isPinSetup()
    const hasValidSession = AuthManager.validateSession()

    if (!isPinSetup) {
      setNeedsSetup(true)
      setShowSetup(true)
      setIsAuthenticated(false)
    } else if (!hasValidSession) {
      setNeedsSetup(false)
      setShowLogin(true)
      setIsAuthenticated(false)
    } else {
      setNeedsSetup(false)
      setIsAuthenticated(true)
      // Extend session on activity
      AuthManager.extendSession()
    }

    setLoading(false)
  }

  const handleSetupComplete = () => {
    setNeedsSetup(false)
    setShowSetup(false)
    // Create initial session after setup
    AuthManager.createSession("user")
    setIsAuthenticated(true)
  }

  const handleLoginSuccess = () => {
    setShowLogin(false)
    setIsAuthenticated(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthSetupDialog open={showSetup} onOpenChange={setShowSetup} onComplete={handleSetupComplete} />
        <AuthLoginDialog open={showLogin} onOpenChange={setShowLogin} onSuccess={handleLoginSuccess} />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-muted-foreground">Authenticating...</p>
          </div>
        </div>
      </>
    )
  }

  return <>{children}</>
}
