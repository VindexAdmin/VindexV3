/**
 * Phantom Wallet Integration for Solana
 * Handles connection, account management, and transaction signing
 */

export interface PhantomWallet {
  isPhantom: boolean;
  publicKey: {
    toString(): string;
  } | null;
  isConnected: boolean;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions(transactions: any[]): Promise<any[]>;
}

declare global {
  interface Window {
    solana?: PhantomWallet;
    phantom?: {
      solana?: PhantomWallet;
    };
  }
}

export interface WalletConnection {
  address: string;
  isConnected: boolean;
  network: string;
  balance?: number;
}

export class PhantomWalletService {
  private wallet: PhantomWallet | null = null;
  private connectionStatus: WalletConnection | null = null;

  constructor() {
    this.wallet = this.getPhantomWallet();
  }

  /**
   * Get Phantom wallet instance
   */
  private getPhantomWallet(): PhantomWallet | null {
    if (typeof window === 'undefined') return null;
    
    // Check for Phantom wallet
    if (window.phantom?.solana?.isPhantom) {
      return window.phantom.solana;
    }
    
    // Fallback to window.solana for older versions
    if (window.solana?.isPhantom) {
      return window.solana;
    }
    
    return null;
  }

  /**
   * Check if Phantom is installed
   */
  isInstalled(): boolean {
    return this.wallet !== null;
  }

  /**
   * Get installation URL for Phantom
   */
  getInstallUrl(): string {
    return 'https://phantom.app/';
  }

  /**
   * Connect to Phantom wallet
   */
  async connect(): Promise<WalletConnection> {
    try {
      if (!this.wallet) {
        throw new Error('Phantom wallet not found. Please install Phantom wallet.');
      }

      // Try to connect (will show popup if not already connected)
      const response = await this.wallet.connect();
      
      if (!response.publicKey) {
        throw new Error('Failed to connect to Phantom wallet');
      }

      const address = response.publicKey.toString();
      
      this.connectionStatus = {
        address,
        isConnected: true,
        network: 'solana',
      };

      // Get balance
      try {
        const { solanaService } = await import('./solana-service');
        const balance = await solanaService.getBalance(address);
        this.connectionStatus.balance = balance;
      } catch (error) {
        console.warn('Could not fetch balance:', error);
      }

      console.log('Phantom wallet connected:', address);
      return this.connectionStatus;

    } catch (error) {
      console.error('Failed to connect to Phantom:', error);
      throw error;
    }
  }

  /**
   * Connect silently if already authorized
   */
  async connectSilently(): Promise<WalletConnection | null> {
    try {
      if (!this.wallet) {
        return null;
      }

      // Try to connect silently (won't show popup)
      const response = await this.wallet.connect({ onlyIfTrusted: true });
      
      if (!response.publicKey) {
        return null;
      }

      const address = response.publicKey.toString();
      
      this.connectionStatus = {
        address,
        isConnected: true,
        network: 'solana',
      };

      // Get balance
      try {
        const { solanaService } = await import('./solana-service');
        const balance = await solanaService.getBalance(address);
        this.connectionStatus.balance = balance;
      } catch (error) {
        console.warn('Could not fetch balance:', error);
      }

      return this.connectionStatus;

    } catch (error) {
      // Silent connection failed, this is expected if user hasn't authorized
      return null;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    try {
      if (this.wallet && this.wallet.isConnected) {
        await this.wallet.disconnect();
      }
      
      this.connectionStatus = null;
      console.log('Phantom wallet disconnected');
      
    } catch (error) {
      console.error('Error disconnecting Phantom:', error);
      // Reset connection status anyway
      this.connectionStatus = null;
    }
  }

  /**
   * Get current connection status
   */
  getConnection(): WalletConnection | null {
    return this.connectionStatus;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.connectionStatus?.isConnected || false;
  }

  /**
   * Get connected address
   */
  getAddress(): string | null {
    return this.connectionStatus?.address || null;
  }

  /**
   * Get balance for connected wallet
   */
  async getBalance(): Promise<number> {
    if (!this.connectionStatus?.address) {
      throw new Error('No wallet connected');
    }

    try {
      const { solanaService } = await import('./solana-service');
      const balance = await solanaService.getBalance(this.connectionStatus.address);
      
      // Update cached balance
      if (this.connectionStatus) {
        this.connectionStatus.balance = balance;
      }
      
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * Sign and send transaction
   */
  async signAndSendTransaction(transaction: any): Promise<string> {
    if (!this.wallet || !this.wallet.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      // Sign the transaction
      const signedTransaction = await this.wallet.signTransaction(transaction);
      
      // Send the transaction using Solana service
      const { solanaService } = await import('./solana-service');
      const signature = await solanaService.sendSignedTransaction(signedTransaction);
      
      console.log('Transaction sent:', signature);
      return signature;
      
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Request airdrop (testnet only)
   */
  async requestAirdrop(amount: number = 1): Promise<string> {
    if (!this.connectionStatus?.address) {
      throw new Error('No wallet connected');
    }

    try {
      const { solanaService } = await import('./solana-service');
      const signature = await solanaService.requestAirdrop(this.connectionStatus.address, amount);
      
      console.log('Airdrop requested:', signature);
      return signature;
      
    } catch (error) {
      console.error('Airdrop failed:', error);
      throw error;
    }
  }

  /**
   * Listen for account changes
   */
  onAccountChanged(callback: (address: string | null) => void): () => void {
    if (!this.wallet) return () => {};

    // Phantom emits account change events
    const handleAccountChange = (publicKey: any) => {
      if (publicKey) {
        const address = publicKey.toString();
        if (this.connectionStatus) {
          this.connectionStatus.address = address;
        }
        callback(address);
      } else {
        this.connectionStatus = null;
        callback(null);
      }
    };

    // Add event listener (if supported)
    if ('on' in this.wallet) {
      (this.wallet as any).on('accountChanged', handleAccountChange);
      
      // Return cleanup function
      return () => {
        if (this.wallet && 'off' in this.wallet) {
          (this.wallet as any).off('accountChanged', handleAccountChange);
        }
      };
    }

    // Return empty cleanup function if events not supported
    return () => {};
  }

  /**
   * Remove event listeners
   */
  removeAllListeners(): void {
    if (this.wallet && 'removeAllListeners' in this.wallet) {
      (this.wallet as any).removeAllListeners();
    }
  }
}

// Singleton instance
export const phantomWalletService = new PhantomWalletService();

// Export default
export default PhantomWalletService;
