import { EncryptionService } from "./encryption"
import { OfflineStorageService } from "./offline-storage"

export interface P2PPeer {
  id: string
  address: string
  publicKey: string
  lastSeen: number
  distance: number
  trusted: boolean
  deviceInfo?: {
    name: string
    type: "mobile" | "desktop" | "tablet"
    version: string
  }
}

export interface P2PMessage {
  id: string
  type: "discovery" | "transaction" | "sync" | "handshake" | "heartbeat"
  from: string
  to?: string
  payload: any
  timestamp: number
  signature: string
  encrypted: boolean
}

export class P2PNetworkManager {
  private static instance: P2PNetworkManager
  private peers: Map<string, P2PPeer> = new Map()
  private connections: Map<string, RTCPeerConnection> = new Map()
  private dataChannels: Map<string, RTCDataChannel> = new Map()
  private wallet: any = null
  private isDiscovering = false
  private heartbeatInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.initializeNetwork()
  }

  static getInstance(): P2PNetworkManager {
    if (!P2PNetworkManager.instance) {
      P2PNetworkManager.instance = new P2PNetworkManager()
    }
    return P2PNetworkManager.instance
  }

  private async initializeNetwork() {
    // Load wallet for P2P identity
    this.wallet = OfflineStorageService.getWallet()

    // Start peer discovery using WebRTC
    if (typeof window !== "undefined") {
      this.startPeerDiscovery()
      this.startHeartbeat()
    }
  }

  // Start discovering nearby peers using WebRTC and local network
  async startPeerDiscovery(): Promise<void> {
    if (this.isDiscovering || !this.wallet) return

    this.isDiscovering = true

    try {
      // Use WebRTC for peer discovery
      await this.discoverWebRTCPeers()

      // Use Bluetooth Web API if available
      if ("bluetooth" in navigator) {
        await this.discoverBluetoothPeers()
      }

      // Use local network discovery
      await this.discoverLocalNetworkPeers()
    } catch (error) {
      console.error("Peer discovery failed:", error)
    } finally {
      this.isDiscovering = false
    }
  }

  private async discoverWebRTCPeers(): Promise<void> {
    // Create RTCPeerConnection for discovery
    const config: RTCConfiguration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    }

    const peerConnection = new RTCPeerConnection(config)

    // Create data channel for communication
    const dataChannel = peerConnection.createDataChannel("commoncube", {
      ordered: true,
    })

    dataChannel.onopen = () => {
      console.log("P2P data channel opened")
      this.broadcastDiscovery(dataChannel)
    }

    dataChannel.onmessage = (event) => {
      this.handleP2PMessage(JSON.parse(event.data))
    }

    // Create offer for peer discovery
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
  }

  private async discoverBluetoothPeers(): Promise<void> {
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ["commoncube-service"] }],
        optionalServices: ["commoncube-service"],
      })

      const server = await device.gatt.connect()
      const service = await server.getPrimaryService("commoncube-service")
      const characteristic = await service.getCharacteristic("peer-discovery")

      // Listen for peer announcements
      characteristic.addEventListener("characteristicvaluechanged", (event: any) => {
        const data = new TextDecoder().decode(event.target.value)
        this.handlePeerAnnouncement(JSON.parse(data))
      })

      await characteristic.startNotifications()
    } catch (error) {
      console.log("Bluetooth discovery not available:", error)
    }
  }

  private async discoverLocalNetworkPeers(): Promise<void> {
    // Use WebSocket for local network discovery
    try {
      const ws = new WebSocket("ws://localhost:8080/commoncube-discovery")

      ws.onopen = () => {
        this.broadcastDiscovery(ws)
      }

      ws.onmessage = (event) => {
        this.handleP2PMessage(JSON.parse(event.data))
      }
    } catch (error) {
      console.log("Local network discovery not available:", error)
    }
  }

  private broadcastDiscovery(channel: RTCDataChannel | WebSocket): void {
    if (!this.wallet) return

    const discoveryMessage: P2PMessage = {
      id: EncryptionService.generateSecureId(),
      type: "discovery",
      from: this.wallet.address,
      payload: {
        publicKey: this.wallet.publicKey,
        deviceInfo: {
          name: "Common Cube Wallet",
          type: "mobile",
          version: "1.0.0",
        },
        capabilities: ["transaction", "sync", "relay"],
      },
      timestamp: Date.now(),
      signature: "",
      encrypted: false,
    }

    // Sign the message
    discoveryMessage.signature = EncryptionService.signTransaction(discoveryMessage, this.wallet.privateKey)

    const messageData = JSON.stringify(discoveryMessage)

    if (channel instanceof RTCDataChannel && channel.readyState === "open") {
      channel.send(messageData)
    } else if (channel instanceof WebSocket && channel.readyState === WebSocket.OPEN) {
      channel.send(messageData)
    }
  }

  private handlePeerAnnouncement(data: any): void {
    const peer: P2PPeer = {
      id: data.address,
      address: data.address,
      publicKey: data.publicKey,
      lastSeen: Date.now(),
      distance: data.distance || 0,
      trusted: false,
      deviceInfo: data.deviceInfo,
    }

    this.peers.set(peer.id, peer)
    this.establishConnection(peer)
  }

  private async establishConnection(peer: P2PPeer): Promise<void> {
    if (this.connections.has(peer.id)) return

    const config: RTCConfiguration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    }

    const peerConnection = new RTCPeerConnection(config)
    this.connections.set(peer.id, peerConnection)

    // Create data channel
    const dataChannel = peerConnection.createDataChannel("commoncube-data", {
      ordered: true,
    })

    dataChannel.onopen = () => {
      console.log(`Connected to peer: ${peer.address}`)
      this.dataChannels.set(peer.id, dataChannel)
      this.sendHandshake(peer.id)
    }

    dataChannel.onmessage = (event) => {
      this.handleP2PMessage(JSON.parse(event.data))
    }

    dataChannel.onclose = () => {
      console.log(`Disconnected from peer: ${peer.address}`)
      this.dataChannels.delete(peer.id)
    }

    // Handle incoming data channels
    peerConnection.ondatachannel = (event) => {
      const channel = event.channel
      this.dataChannels.set(peer.id, channel)

      channel.onmessage = (event) => {
        this.handleP2PMessage(JSON.parse(event.data))
      }
    }
  }

  private sendHandshake(peerId: string): void {
    if (!this.wallet) return

    const handshakeMessage: P2PMessage = {
      id: EncryptionService.generateSecureId(),
      type: "handshake",
      from: this.wallet.address,
      to: peerId,
      payload: {
        publicKey: this.wallet.publicKey,
        protocolVersion: "1.0",
        capabilities: ["transaction", "sync"],
      },
      timestamp: Date.now(),
      signature: "",
      encrypted: false,
    }

    handshakeMessage.signature = EncryptionService.signTransaction(handshakeMessage, this.wallet.privateKey)

    this.sendMessage(peerId, handshakeMessage)
  }

  private handleP2PMessage(message: P2PMessage): void {
    // Verify message signature
    const peer = this.peers.get(message.from)
    if (peer) {
      const isValid = EncryptionService.verifySignature(message, message.signature, peer.publicKey)

      if (!isValid) {
        console.error("Invalid message signature from peer:", message.from)
        return
      }
    }

    switch (message.type) {
      case "discovery":
        this.handlePeerAnnouncement(message.payload)
        break
      case "handshake":
        this.handleHandshake(message)
        break
      case "transaction":
        this.handleP2PTransaction(message)
        break
      case "sync":
        this.handleSyncRequest(message)
        break
      case "heartbeat":
        this.handleHeartbeat(message)
        break
    }
  }

  private handleHandshake(message: P2PMessage): void {
    const peer = this.peers.get(message.from)
    if (peer) {
      peer.trusted = true
      peer.lastSeen = Date.now()
      console.log(`Handshake completed with peer: ${peer.address}`)
    }
  }

  private handleP2PTransaction(message: P2PMessage): void {
    // Handle incoming P2P transaction
    const transaction = message.payload

    // Decrypt if encrypted
    if (message.encrypted && this.wallet) {
      try {
        const decryptedData = EncryptionService.decrypt(transaction, this.wallet.privateKey)
        transaction.data = JSON.parse(decryptedData)
      } catch (error) {
        console.error("Failed to decrypt P2P transaction:", error)
        return
      }
    }

    // Store transaction for processing
    OfflineStorageService.storeOfflineTransaction({
      id: transaction.id,
      transaction: transaction.data || transaction,
      timestamp: Date.now(),
      synced: false,
    })

    console.log("Received P2P transaction:", transaction.id)
  }

  private handleSyncRequest(message: P2PMessage): void {
    // Handle blockchain sync request from peer
    if (!this.wallet) return

    const syncData = {
      transactions: OfflineStorageService.getOfflineTransactions(),
      blockchainData: OfflineStorageService.getBlockchainData(),
    }

    const responseMessage: P2PMessage = {
      id: EncryptionService.generateSecureId(),
      type: "sync",
      from: this.wallet.address,
      to: message.from,
      payload: syncData,
      timestamp: Date.now(),
      signature: "",
      encrypted: true,
    }

    responseMessage.signature = EncryptionService.signTransaction(responseMessage, this.wallet.privateKey)

    this.sendMessage(message.from, responseMessage)
  }

  private handleHeartbeat(message: P2PMessage): void {
    const peer = this.peers.get(message.from)
    if (peer) {
      peer.lastSeen = Date.now()
    }
  }

  // Send transaction directly to peer
  async sendTransactionToPeer(peerId: string, transaction: any): Promise<boolean> {
    if (!this.wallet || !this.dataChannels.has(peerId)) {
      return false
    }

    // Encrypt transaction
    const encryptedTransaction = EncryptionService.encrypt(JSON.stringify(transaction), this.wallet.privateKey)

    const message: P2PMessage = {
      id: EncryptionService.generateSecureId(),
      type: "transaction",
      from: this.wallet.address,
      to: peerId,
      payload: encryptedTransaction,
      timestamp: Date.now(),
      signature: "",
      encrypted: true,
    }

    message.signature = EncryptionService.signTransaction(message, this.wallet.privateKey)

    return this.sendMessage(peerId, message)
  }

  private sendMessage(peerId: string, message: P2PMessage): boolean {
    const dataChannel = this.dataChannels.get(peerId)

    if (dataChannel && dataChannel.readyState === "open") {
      dataChannel.send(JSON.stringify(message))
      return true
    }

    return false
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.wallet) return

      const heartbeatMessage: P2PMessage = {
        id: EncryptionService.generateSecureId(),
        type: "heartbeat",
        from: this.wallet.address,
        payload: { timestamp: Date.now() },
        timestamp: Date.now(),
        signature: "",
        encrypted: false,
      }

      heartbeatMessage.signature = EncryptionService.signTransaction(heartbeatMessage, this.wallet.privateKey)

      // Send heartbeat to all connected peers
      this.dataChannels.forEach((channel, peerId) => {
        if (channel.readyState === "open") {
          channel.send(JSON.stringify(heartbeatMessage))
        }
      })

      // Clean up stale peers
      this.cleanupStalePeers()
    }, 30000) // Every 30 seconds
  }

  private cleanupStalePeers(): void {
    const now = Date.now()
    const staleThreshold = 2 * 60 * 1000 // 2 minutes

    this.peers.forEach((peer, peerId) => {
      if (now - peer.lastSeen > staleThreshold) {
        this.peers.delete(peerId)
        this.connections.get(peerId)?.close()
        this.connections.delete(peerId)
        this.dataChannels.delete(peerId)
        console.log(`Removed stale peer: ${peer.address}`)
      }
    })
  }

  // Public API methods
  getPeers(): P2PPeer[] {
    return Array.from(this.peers.values())
  }

  getConnectedPeers(): P2PPeer[] {
    return Array.from(this.peers.values()).filter(
      (peer) => this.dataChannels.has(peer.id) && this.dataChannels.get(peer.id)?.readyState === "open",
    )
  }

  async broadcastTransaction(transaction: any): Promise<number> {
    let sentCount = 0
    const connectedPeers = this.getConnectedPeers()

    for (const peer of connectedPeers) {
      const success = await this.sendTransactionToPeer(peer.id, transaction)
      if (success) sentCount++
    }

    return sentCount
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.dataChannels.forEach((channel) => channel.close())
    this.connections.forEach((connection) => connection.close())

    this.peers.clear()
    this.connections.clear()
    this.dataChannels.clear()
  }
}

// Export singleton instance
export const p2pNetwork = P2PNetworkManager.getInstance()
