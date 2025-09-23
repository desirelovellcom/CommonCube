import { EncryptionService } from "./encryption"

export interface AuthSession {
  id: string
  userId: string
  createdAt: number
  expiresAt: number
  deviceId: string
  isActive: boolean
}

export interface BiometricCredential {
  id: string
  publicKey: string
  counter: number
  createdAt: number
}

export interface AuthSettings {
  requirePin: boolean
  requireBiometric: boolean
  sessionTimeout: number // in minutes
  maxFailedAttempts: number
  lockoutDuration: number // in minutes
  twoFactorEnabled: boolean
}

export class AuthManager {
  private static readonly STORAGE_KEYS = {
    AUTH_SETTINGS: "commoncube_auth_settings",
    PIN_HASH: "commoncube_pin_hash",
    FAILED_ATTEMPTS: "commoncube_failed_attempts",
    LOCKOUT_UNTIL: "commoncube_lockout_until",
    SESSION: "commoncube_session",
    BIOMETRIC_CREDENTIALS: "commoncube_biometric_credentials",
  }

  private static readonly DEFAULT_SETTINGS: AuthSettings = {
    requirePin: true,
    requireBiometric: false,
    sessionTimeout: 15, // 15 minutes
    maxFailedAttempts: 5,
    lockoutDuration: 30, // 30 minutes
    twoFactorEnabled: false,
  }

  // Initialize authentication system
  static initialize(): void {
    const settings = this.getAuthSettings()
    if (!settings) {
      this.setAuthSettings(this.DEFAULT_SETTINGS)
    }
  }

  // Set up PIN authentication
  static async setupPin(pin: string): Promise<boolean> {
    try {
      // Hash PIN with salt
      const salt = EncryptionService.generateSecureId()
      const pinHash = EncryptionService.signTransaction({ pin, salt }, salt)

      const pinData = {
        hash: pinHash,
        salt,
        createdAt: Date.now(),
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(this.STORAGE_KEYS.PIN_HASH, JSON.stringify(pinData))
      }

      return true
    } catch (error) {
      console.error("Failed to setup PIN:", error)
      return false
    }
  }

  // Verify PIN
  static async verifyPin(pin: string): Promise<boolean> {
    try {
      if (this.isLockedOut()) {
        throw new Error("Account is locked due to too many failed attempts")
      }

      const pinData = this.getPinData()
      if (!pinData) {
        return false
      }

      const expectedHash = EncryptionService.signTransaction({ pin, salt: pinData.salt }, pinData.salt)

      const isValid = expectedHash === pinData.hash

      if (isValid) {
        this.clearFailedAttempts()
      } else {
        this.recordFailedAttempt()
      }

      return isValid
    } catch (error) {
      console.error("PIN verification failed:", error)
      this.recordFailedAttempt()
      return false
    }
  }

  // Setup biometric authentication
  static async setupBiometric(): Promise<boolean> {
    try {
      if (!this.isBiometricSupported()) {
        throw new Error("Biometric authentication not supported")
      }

      // Create WebAuthn credential
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: "Common Cube",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(EncryptionService.generateSecureId()),
            name: "Common Cube User",
            displayName: "Common Cube User",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
          attestation: "direct",
        },
      })) as PublicKeyCredential

      if (credential) {
        const biometricCredential: BiometricCredential = {
          id: credential.id,
          publicKey: Array.from(new Uint8Array(credential.response.publicKey!)).join(","),
          counter: 0,
          createdAt: Date.now(),
        }

        if (typeof window !== "undefined") {
          localStorage.setItem(this.STORAGE_KEYS.BIOMETRIC_CREDENTIALS, JSON.stringify([biometricCredential]))
        }

        return true
      }

      return false
    } catch (error) {
      console.error("Biometric setup failed:", error)
      return false
    }
  }

  // Verify biometric authentication
  static async verifyBiometric(): Promise<boolean> {
    try {
      if (!this.isBiometricSupported()) {
        return false
      }

      const credentials = this.getBiometricCredentials()
      if (credentials.length === 0) {
        return false
      }

      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: credentials.map((cred) => ({
            id: new TextEncoder().encode(cred.id),
            type: "public-key",
          })),
          userVerification: "required",
          timeout: 60000,
        },
      })) as PublicKeyCredential

      return assertion !== null
    } catch (error) {
      console.error("Biometric verification failed:", error)
      return false
    }
  }

  // Create authentication session
  static createSession(userId: string): AuthSession {
    const settings = this.getAuthSettings()
    const session: AuthSession = {
      id: EncryptionService.generateSecureId(),
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + settings.sessionTimeout * 60 * 1000,
      deviceId: this.getDeviceId(),
      isActive: true,
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(this.STORAGE_KEYS.SESSION, JSON.stringify(session))
    }

    return session
  }

  // Validate current session
  static validateSession(): boolean {
    const session = this.getCurrentSession()
    if (!session) {
      return false
    }

    if (Date.now() > session.expiresAt) {
      this.clearSession()
      return false
    }

    return session.isActive
  }

  // Extend session
  static extendSession(): boolean {
    const session = this.getCurrentSession()
    if (!session || !this.validateSession()) {
      return false
    }

    const settings = this.getAuthSettings()
    session.expiresAt = Date.now() + settings.sessionTimeout * 60 * 1000

    if (typeof window !== "undefined") {
      localStorage.setItem(this.STORAGE_KEYS.SESSION, JSON.stringify(session))
    }

    return true
  }

  // Clear session (logout)
  static clearSession(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.STORAGE_KEYS.SESSION)
    }
  }

  // Check if biometric is supported
  static isBiometricSupported(): boolean {
    return typeof window !== "undefined" && "credentials" in navigator && "create" in navigator.credentials
  }

  // Check if device is locked out
  static isLockedOut(): boolean {
    if (typeof window === "undefined") return false

    const lockoutUntil = localStorage.getItem(this.STORAGE_KEYS.LOCKOUT_UNTIL)
    if (!lockoutUntil) return false

    const lockoutTime = Number.parseInt(lockoutUntil)
    return Date.now() < lockoutTime
  }

  // Get lockout remaining time
  static getLockoutRemainingTime(): number {
    if (!this.isLockedOut()) return 0

    const lockoutUntil = localStorage.getItem(this.STORAGE_KEYS.LOCKOUT_UNTIL)
    if (!lockoutUntil) return 0

    return Math.max(0, Number.parseInt(lockoutUntil) - Date.now())
  }

  // Record failed authentication attempt
  private static recordFailedAttempt(): void {
    if (typeof window === "undefined") return

    const settings = this.getAuthSettings()
    const currentAttempts = this.getFailedAttempts()
    const newAttempts = currentAttempts + 1

    localStorage.setItem(this.STORAGE_KEYS.FAILED_ATTEMPTS, newAttempts.toString())

    if (newAttempts >= settings.maxFailedAttempts) {
      const lockoutUntil = Date.now() + settings.lockoutDuration * 60 * 1000
      localStorage.setItem(this.STORAGE_KEYS.LOCKOUT_UNTIL, lockoutUntil.toString())
    }
  }

  // Clear failed attempts
  private static clearFailedAttempts(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.STORAGE_KEYS.FAILED_ATTEMPTS)
      localStorage.removeItem(this.STORAGE_KEYS.LOCKOUT_UNTIL)
    }
  }

  // Get failed attempts count
  static getFailedAttempts(): number {
    if (typeof window === "undefined") return 0

    const attempts = localStorage.getItem(this.STORAGE_KEYS.FAILED_ATTEMPTS)
    return attempts ? Number.parseInt(attempts) : 0
  }

  // Helper methods
  private static getPinData(): any {
    if (typeof window === "undefined") return null

    const data = localStorage.getItem(this.STORAGE_KEYS.PIN_HASH)
    return data ? JSON.parse(data) : null
  }

  private static getBiometricCredentials(): BiometricCredential[] {
    if (typeof window === "undefined") return []

    const data = localStorage.getItem(this.STORAGE_KEYS.BIOMETRIC_CREDENTIALS)
    return data ? JSON.parse(data) : []
  }

  private static getCurrentSession(): AuthSession | null {
    if (typeof window === "undefined") return null

    const data = localStorage.getItem(this.STORAGE_KEYS.SESSION)
    return data ? JSON.parse(data) : null
  }

  private static getDeviceId(): string {
    if (typeof window === "undefined") return "unknown"

    let deviceId = localStorage.getItem("commoncube_device_id")
    if (!deviceId) {
      deviceId = EncryptionService.generateSecureId()
      localStorage.setItem("commoncube_device_id", deviceId)
    }
    return deviceId
  }

  // Settings management
  static getAuthSettings(): AuthSettings {
    if (typeof window === "undefined") return this.DEFAULT_SETTINGS

    const data = localStorage.getItem(this.STORAGE_KEYS.AUTH_SETTINGS)
    return data ? { ...this.DEFAULT_SETTINGS, ...JSON.parse(data) } : this.DEFAULT_SETTINGS
  }

  static setAuthSettings(settings: Partial<AuthSettings>): void {
    if (typeof window === "undefined") return

    const currentSettings = this.getAuthSettings()
    const newSettings = { ...currentSettings, ...settings }
    localStorage.setItem(this.STORAGE_KEYS.AUTH_SETTINGS, JSON.stringify(newSettings))
  }

  // Check if PIN is set up
  static isPinSetup(): boolean {
    return this.getPinData() !== null
  }

  // Check if biometric is set up
  static isBiometricSetup(): boolean {
    return this.getBiometricCredentials().length > 0
  }

  // Remove biometric credentials
  static removeBiometric(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.STORAGE_KEYS.BIOMETRIC_CREDENTIALS)
    }
  }

  // Change PIN
  static async changePin(oldPin: string, newPin: string): Promise<boolean> {
    const isOldPinValid = await this.verifyPin(oldPin)
    if (!isOldPinValid) {
      return false
    }

    return await this.setupPin(newPin)
  }
}
