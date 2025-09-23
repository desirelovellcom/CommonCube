import { createHash } from "crypto"

export interface Transaction {
  id: string
  from: string
  to: string
  amount: number
  timestamp: number
  signature?: string
  nonce: number
}

export interface Block {
  index: number
  timestamp: number
  transactions: Transaction[]
  previousHash: string
  hash: string
  nonce: number
  merkleRoot: string
}

export class CommonCubeBlockchain {
  private chain: Block[] = []
  private pendingTransactions: Transaction[] = []
  private miningReward = 10
  private difficulty = 4

  constructor() {
    this.chain = [this.createGenesisBlock()]
  }

  private createGenesisBlock(): Block {
    const genesisBlock: Block = {
      index: 0,
      timestamp: Date.now(),
      transactions: [],
      previousHash: "0",
      hash: "",
      nonce: 0,
      merkleRoot: "",
    }

    genesisBlock.merkleRoot = this.calculateMerkleRoot(genesisBlock.transactions)
    genesisBlock.hash = this.calculateHash(genesisBlock)
    return genesisBlock
  }

  private calculateHash(block: Block): string {
    return createHash("sha256")
      .update(
        block.index +
          block.previousHash +
          block.timestamp +
          JSON.stringify(block.transactions) +
          block.nonce +
          block.merkleRoot,
      )
      .digest("hex")
  }

  private calculateMerkleRoot(transactions: Transaction[]): string {
    if (transactions.length === 0) return ""

    const hashes = transactions.map((tx) => createHash("sha256").update(JSON.stringify(tx)).digest("hex"))

    while (hashes.length > 1) {
      const newHashes = []
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i]
        const right = hashes[i + 1] || left
        newHashes.push(
          createHash("sha256")
            .update(left + right)
            .digest("hex"),
        )
      }
      hashes.splice(0, hashes.length, ...newHashes)
    }

    return hashes[0] || ""
  }

  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1]
  }

  createTransaction(transaction: Transaction): void {
    // Add offline capability - store in local queue
    this.pendingTransactions.push(transaction)
  }

  minePendingTransactions(miningRewardAddress: string): Block {
    const rewardTransaction: Transaction = {
      id: `reward_${Date.now()}`,
      from: "system",
      to: miningRewardAddress,
      amount: this.miningReward,
      timestamp: Date.now(),
      nonce: 0,
    }

    this.pendingTransactions.push(rewardTransaction)

    const block: Block = {
      index: this.chain.length,
      timestamp: Date.now(),
      transactions: this.pendingTransactions,
      previousHash: this.getLatestBlock().hash,
      hash: "",
      nonce: 0,
      merkleRoot: "",
    }

    block.merkleRoot = this.calculateMerkleRoot(block.transactions)
    block.hash = this.mineBlock(block)

    this.chain.push(block)
    this.pendingTransactions = []

    return block
  }

  private mineBlock(block: Block): string {
    const target = Array(this.difficulty + 1).join("0")

    while (block.hash.substring(0, this.difficulty) !== target) {
      block.nonce++
      block.hash = this.calculateHash(block)
    }

    return block.hash
  }

  getBalance(address: string): number {
    let balance = 0

    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.from === address) {
          balance -= trans.amount
        }
        if (trans.to === address) {
          balance += trans.amount
        }
      }
    }

    return balance
  }

  isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i]
      const previousBlock = this.chain[i - 1]

      if (currentBlock.hash !== this.calculateHash(currentBlock)) {
        return false
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false
      }
    }

    return true
  }

  // Offline sync capabilities
  exportChain(): string {
    return JSON.stringify(this.chain)
  }

  importChain(chainData: string): boolean {
    try {
      const importedChain = JSON.parse(chainData)
      // Validate imported chain
      const tempBlockchain = new CommonCubeBlockchain()
      tempBlockchain.chain = importedChain

      if (tempBlockchain.isChainValid()) {
        this.chain = importedChain
        return true
      }
      return false
    } catch {
      return false
    }
  }

  getAllTransactions(): Transaction[] {
    const allTransactions: Transaction[] = []
    for (const block of this.chain) {
      allTransactions.push(...block.transactions)
    }
    return allTransactions
  }
}

// Singleton instance for the app
export const commonCubeChain = new CommonCubeBlockchain()
