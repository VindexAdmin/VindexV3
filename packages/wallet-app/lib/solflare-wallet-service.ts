'use client';

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

declare global {
  interface Window {
    solflare?: {
      isConnected: boolean;
      connect: () => Promise<{ publicKey: string }>;
      disconnect: () => Promise<void>;
      signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string }>;
      signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
      on: (event: string, callback: (data: any) => void) => void;
      off: (event: string, callback: (data: any) => void) => void;
    };
  }
}

export interface SolflareWalletInfo {
  publicKey: string;
  isConnected: boolean;
  balance?: number;
}

export class SolflareWalletService {
  private connection: Connection;
  private walletInfo: SolflareWalletInfo | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    // Use Solana mainnet for production, devnet for testing
    this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  }

  /**
   * Check if Solflare wallet is installed
   */
  isInstalled(): boolean {
    return typeof window !== 'undefined' && !!window.solflare;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.walletInfo?.isConnected || false;
  }

  /**
   * Get current wallet info
   */
  getWalletInfo(): SolflareWalletInfo | null {
    return this.walletInfo;
  }

  /**
   * Connect to Solflare wallet
   */
  async connect(): Promise<SolflareWalletInfo> {
    try {
      if (!this.isInstalled()) {
        throw new Error('Solflare wallet is not installed. Please install it from https://solflare.com');
      }

      const response = await window.solflare!.connect();
      
      this.walletInfo = {
        publicKey: response.publicKey,
        isConnected: true
      };

      // Get balance after connection
      await this.updateBalance();

      // Set up event listeners
      this.setupEventListeners();

      console.log('Connected to Solflare wallet:', this.walletInfo);
      this.emit('connect', this.walletInfo);

      return this.walletInfo;
    } catch (error) {
      console.error('Failed to connect to Solflare wallet:', error);
      throw error;
    }
  }

  /**
   * Disconnect from wallet
   */
  async disconnect(): Promise<void> {
    try {
      if (window.solflare && this.walletInfo?.isConnected) {
        await window.solflare.disconnect();
      }

      this.walletInfo = null;
      this.removeEventListeners();
      
      console.log('Disconnected from Solflare wallet');
      this.emit('disconnect', null);
    } catch (error) {
      console.error('Error disconnecting from Solflare wallet:', error);
      throw error;
    }
  }

  /**
   * Get SOL balance for connected wallet
   */
  async getBalance(): Promise<number> {
    if (!this.walletInfo?.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const publicKey = new PublicKey(this.walletInfo.publicKey);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  /**
   * Update balance and emit event
   */
  async updateBalance(): Promise<void> {
    if (this.walletInfo) {
      try {
        const balance = await this.getBalance();
        this.walletInfo.balance = balance;
        this.emit('balanceChanged', balance);
      } catch (error) {
        console.error('Failed to update balance:', error);
      }
    }
  }

  /**
   * Send SOL transaction
   */
  async sendTransaction(
    toAddress: string,
    amount: number
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      if (!this.walletInfo?.isConnected) {
        return { success: false, error: 'Wallet not connected' };
      }

      const fromPubkey = new PublicKey(this.walletInfo.publicKey);
      const toPubkey = new PublicKey(toAddress);
      const lamports = Math.round(amount * LAMPORTS_PER_SOL);

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // Sign and send transaction
      const { signature } = await window.solflare!.signAndSendTransaction(transaction);

      // Wait for confirmation
      await this.connection.confirmTransaction(signature);

      // Update balance after transaction
      setTimeout(() => this.updateBalance(), 2000);

      return { success: true, signature };
    } catch (error: any) {
      console.error('Transaction failed:', error);
      return { 
        success: false, 
        error: error.message || 'Transaction failed' 
      };
    }
  }

  /**
   * Sign message
   */
  async signMessage(message: string): Promise<{ signature: Uint8Array; error?: string }> {
    try {
      if (!this.walletInfo?.isConnected) {
        throw new Error('Wallet not connected');
      }

      const encodedMessage = new TextEncoder().encode(message);
      const { signature } = await window.solflare!.signMessage(encodedMessage);

      return { signature };
    } catch (error: any) {
      console.error('Failed to sign message:', error);
      return { signature: new Uint8Array(), error: error.message };
    }
  }

  /**
   * Set up event listeners for wallet events
   */
  private setupEventListeners(): void {
    if (window.solflare) {
      window.solflare.on('accountChanged', this.handleAccountChanged.bind(this));
      window.solflare.on('disconnect', this.handleDisconnect.bind(this));
    }
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (window.solflare) {
      window.solflare.off('accountChanged', this.handleAccountChanged.bind(this));
      window.solflare.off('disconnect', this.handleDisconnect.bind(this));
    }
  }

  /**
   * Handle account change
   */
  private async handleAccountChanged(newAccount: any): Promise<void> {
    console.log('Solflare account changed:', newAccount);
    
    if (newAccount?.publicKey) {
      this.walletInfo = {
        publicKey: newAccount.publicKey,
        isConnected: true
      };
      await this.updateBalance();
      this.emit('accountChanged', this.walletInfo);
    } else {
      await this.disconnect();
    }
  }

  /**
   * Handle disconnect
   */
  private async handleDisconnect(): Promise<void> {
    console.log('Solflare wallet disconnected');
    this.walletInfo = null;
    this.emit('disconnect', null);
  }

  /**
   * Event emitter - add listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Event emitter - remove listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Event emitter - emit event
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Get Solana Explorer URL for transaction
   */
  getExplorerUrl(signature: string): string {
    return `https://explorer.solana.com/tx/${signature}`;
  }
}

// Singleton instance
export const solflareWalletService = new SolflareWalletService();
