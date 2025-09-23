export interface OfflineTransaction {
  id: string
  transaction: any
  timestamp: number
  synced: boolean
}

export class OfflineStorageService {
  private static readonly STORAGE_KEYS = {
    WALLET: "commoncube_wallet",
    TRANSACTIONS: "commoncube_transactions",
    BLOCKCHAIN: "commoncube_blockchain",
    PENDING_SYNC: "commoncube_pending_sync",
  }

  // Store wallet data securely
  static storeWallet(walletData: any): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.STORAGE_KEYS.WALLET, JSON.stringify(walletData))
    }
  }

  // Retrieve wallet data
  static getWallet(): any | null {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem(this.STORAGE_KEYS.WALLET)
      return data ? JSON.parse(data) : null
    }
    return null
  }

  // Store offline transactions
  static storeOfflineTransaction(transaction: OfflineTransaction): void {
    if (typeof window !== "undefined") {
      const existing = this.getOfflineTransactions()
      existing.push(transaction)
      localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify(existing))
    }
  }

  // Get all offline transactions
  static getOfflineTransactions(): OfflineTransaction[] {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS)
      return data ? JSON.parse(data) : []
    }
    return []
  }

  // Mark transaction as synced
  static markTransactionSynced(transactionId: string): void {
    if (typeof window !== "undefined") {
      const transactions = this.getOfflineTransactions()
      const updated = transactions.map((tx) => (tx.id === transactionId ? { ...tx, synced: true } : tx))
      localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated))
    }
  }

  // Get pending sync transactions
  static getPendingSyncTransactions(): OfflineTransaction[] {
    return this.getOfflineTransactions().filter((tx) => !tx.synced)
  }

  // Store blockchain data for offline access
  static storeBlockchainData(chainData: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.STORAGE_KEYS.BLOCKCHAIN, chainData)
    }
  }

  // Get stored blockchain data
  static getBlockchainData(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem(this.STORAGE_KEYS.BLOCKCHAIN)
    }
    return null
  }

  // Clear all stored data (for logout)
  static clearAllData(): void {
    if (typeof window !== "undefined") {
      Object.values(this.STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key)
      })
    }
  }

  // Check if device is online
  static isOnline(): boolean {
    return typeof window !== "undefined" ? navigator.onLine : false
  }

  // Store data for later sync when online
  static storePendingSync(data: any): void {
    if (typeof window !== "undefined") {
      const existing = this.getPendingSync()
      existing.push({ ...data, timestamp: Date.now() })
      localStorage.setItem(this.STORAGE_KEYS.PENDING_SYNC, JSON.stringify(existing))
    }
  }

  // Get pending sync data
  static getPendingSync(): any[] {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem(this.STORAGE_KEYS.PENDING_SYNC)
      return data ? JSON.parse(data) : []
    }
    return []
  }

  // Clear pending sync data after successful sync
  static clearPendingSync(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.STORAGE_KEYS.PENDING_SYNC)
    }
  }
}
