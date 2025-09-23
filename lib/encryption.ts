import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto"

export class EncryptionService {
  private static algorithm = "aes-256-gcm"

  // Generate a secure key pair for a user
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const privateKey = randomBytes(32).toString("hex")
    const publicKey = createHash("sha256").update(privateKey).digest("hex")

    return { publicKey, privateKey }
  }

  // Encrypt data with AES-256-GCM
  static encrypt(data: string, key: string): { encrypted: string; iv: string; tag: string } {
    const iv = randomBytes(16)
    const keyBuffer = Buffer.from(key, "hex")
    const cipher = createCipheriv(this.algorithm, keyBuffer, iv)

    let encrypted = cipher.update(data, "utf8", "hex")
    encrypted += cipher.final("hex")

    const tag = cipher.getAuthTag()

    return {
      encrypted,
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
    }
  }

  // Decrypt data with AES-256-GCM
  static decrypt(encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string {
    const keyBuffer = Buffer.from(key, "hex")
    const iv = Buffer.from(encryptedData.iv, "hex")
    const tag = Buffer.from(encryptedData.tag, "hex")

    const decipher = createDecipheriv(this.algorithm, keyBuffer, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  }

  // Create digital signature for transactions
  static signTransaction(transaction: any, privateKey: string): string {
    const transactionString = JSON.stringify(transaction)
    return createHash("sha256")
      .update(transactionString + privateKey)
      .digest("hex")
  }

  // Verify digital signature
  static verifySignature(transaction: any, signature: string, publicKey: string): boolean {
    const transactionCopy = { ...transaction }
    delete transactionCopy.signature

    const expectedSignature = createHash("sha256")
      .update(JSON.stringify(transactionCopy) + publicKey)
      .digest("hex")

    return signature === expectedSignature
  }

  // Generate secure wallet address
  static generateWalletAddress(publicKey: string): string {
    return "CC" + createHash("sha256").update(publicKey).digest("hex").substring(0, 32).toUpperCase()
  }

  // Secure random ID generation
  static generateSecureId(): string {
    return randomBytes(16).toString("hex")
  }
}
