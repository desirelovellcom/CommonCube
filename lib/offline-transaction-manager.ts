import { OfflineStorageService, type OfflineTransaction } from "./offline-storage"
import { EncryptionService } from "./encryption"
import { commonCubeChain } from "./blockchain"

export interface PendingTransaction {
  id: string
  transaction: any
  encrypted: boolean
  retryCount: number
  lastAttempt: number
  priority: "high" | "medium" | "low"
  status: "pending" | "syncing" | "failed" | "completed"
}

export class OfflineTransactionManager {
  private static syncInProgress = false
  private static maxRetries = 3
  private static retryDelay = 5000 // 5 seconds

  // Queue transaction for offline processing
  static queueTransaction(transaction: any, wallet: any): string {
    const transactionId = EncryptionService.generateSecureId()

    // Encrypt transaction for secure storage
    const encryptedData = EncryptionService.encrypt(JSON.stringify(transaction), wallet.privateKey)

    const offlineTransaction: OfflineTransaction = {
      id: transactionId,
      transaction: {
        ...transaction,
        encrypted: encryptedData,
        queuedAt: Date.now(),
      },
      timestamp: Date.now(),
      synced: false,
    }

    OfflineStorageService.storeOfflineTransaction(offlineTransaction)

    // Update local balance immediately for better UX
    this.updateLocalBalance(wallet.address, -transaction.amount)

    return transactionId
  }

  // Process all pending transactions when online
  static async syncPendingTransactions(wallet: any): Promise<{
    successful: number
    failed: number
    errors: string[]
  }> {
    if (this.syncInProgress) {
      return { successful: 0, failed: 0, errors: ["Sync already in progress"] }
    }

    this.syncInProgress = true
    const results = { successful: 0, failed: 0, errors: [] as string[] }

    try {
      const pendingTransactions = OfflineStorageService.getPendingSyncTransactions()

      for (const offlineTransaction of pendingTransactions) {
        try {
          // Decrypt transaction
          const decryptedData = EncryptionService.decrypt(offlineTransaction.transaction.encrypted, wallet.privateKey)
          const transaction = JSON.parse(decryptedData)

          // Verify transaction signature
          const isValid = EncryptionService.verifySignature(transaction, transaction.signature, wallet.publicKey)

          if (!isValid) {
            throw new Error("Invalid transaction signature")
          }

          // Add to blockchain
          commonCubeChain.createTransaction(transaction)

          // Mark as synced
          OfflineStorageService.markTransactionSynced(offlineTransaction.id)
          results.successful++
        } catch (error) {
          results.failed++
          results.errors.push(`Transaction ${offlineTransaction.id}: ${error}`)
        }
      }

      // Mine pending transactions if any were added
      if (results.successful > 0) {
        commonCubeChain.minePendingTransactions(wallet.address)
      }
    } catch (error) {
      results.errors.push(`Sync error: ${error}`)
    } finally {
      this.syncInProgress = false
    }

    return results
  }

  // Get offline transaction status
  static getOfflineTransactionStatus(): {
    pending: number
    synced: number
    total: number
    lastSync: number | null
  } {
    const allTransactions = OfflineStorageService.getOfflineTransactions()
    const pending = allTransactions.filter((tx) => !tx.synced).length
    const synced = allTransactions.filter((tx) => tx.synced).length

    const lastSyncedTransaction = allTransactions.filter((tx) => tx.synced).sort((a, b) => b.timestamp - a.timestamp)[0]

    return {
      pending,
      synced,
      total: allTransactions.length,
      lastSync: lastSyncedTransaction?.timestamp || null,
    }
  }

  // Update local balance for immediate UI feedback
  private static updateLocalBalance(address: string, amount: number): void {
    const wallet = OfflineStorageService.getWallet()
    if (wallet && wallet.address === address) {
      wallet.balance += amount
      OfflineStorageService.storeWallet(wallet)
    }
  }

  // Validate transaction before queuing
  static validateTransaction(
    transaction: any,
    wallet: any,
  ): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Check balance
    if (transaction.amount > wallet.balance) {
      errors.push("Insufficient balance")
    }

    // Check amount is positive
    if (transaction.amount <= 0) {
      errors.push("Amount must be greater than zero")
    }

    // Check recipient address format
    if (!transaction.to || !transaction.to.startsWith("CC")) {
      errors.push("Invalid recipient address")
    }

    // Check sender address
    if (transaction.from !== wallet.address) {
      errors.push("Invalid sender address")
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // Get transaction history including offline transactions
  static getTransactionHistory(wallet: any): any[] {
    const blockchainTransactions = commonCubeChain
      .getAllTransactions()
      .filter((tx) => tx.from === wallet.address || tx.to === wallet.address)
      .map((tx) => ({ ...tx, source: "blockchain", synced: true }))

    const offlineTransactions = OfflineStorageService.getOfflineTransactions()
      .map((offlineTx) => {
        try {
          const decryptedData = EncryptionService.decrypt(offlineTx.transaction.encrypted, wallet.privateKey)
          const transaction = JSON.parse(decryptedData)
          return {
            ...transaction,
            source: "offline",
            synced: offlineTx.synced,
            queuedAt: offlineTx.transaction.queuedAt,
          }
        } catch {
          return null
        }
      })
      .filter((tx) => tx !== null)

    // Combine and sort by timestamp
    return [...blockchainTransactions, ...offlineTransactions].sort((a, b) => b.timestamp - a.timestamp)
  }

  // Retry failed transactions
  static async retryFailedTransactions(wallet: any): Promise<number> {
    const failedTransactions = OfflineStorageService.getOfflineTransactions().filter((tx) => !tx.synced)

    let retriedCount = 0

    for (const transaction of failedTransactions) {
      try {
        // Re-queue transaction
        const decryptedData = EncryptionService.decrypt(transaction.transaction.encrypted, wallet.privateKey)
        const tx = JSON.parse(decryptedData)

        // Validate again
        const validation = this.validateTransaction(tx, wallet)
        if (validation.valid) {
          // Mark for retry
          retriedCount++
        }
      } catch (error) {
        console.error("Failed to retry transaction:", error)
      }
    }

    return retriedCount
  }

  // Clear old synced transactions to save space
  static cleanupOldTransactions(daysToKeep = 30): number {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000
    const allTransactions = OfflineStorageService.getOfflineTransactions()

    const toKeep = allTransactions.filter((tx) => !tx.synced || tx.timestamp > cutoffTime)

    const removedCount = allTransactions.length - toKeep.length

    // Update storage with filtered transactions
    if (typeof window !== "undefined") {
      localStorage.setItem("commoncube_transactions", JSON.stringify(toKeep))
    }

    return removedCount
  }
}
