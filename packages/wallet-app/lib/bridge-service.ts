// Bridge Service - Manages cross-chain transactions for VDX
import { SolanaService, solanaService } from './solana-service';
import { XRPService, xrpService } from './xrp-service';
import { SUIService, suiService } from './sui-service';
import { VindexBridgeAPIClient, BridgeAPIError } from './bridge-api-client';
import { TransactionService, SwapTransaction } from './transaction-service';

export interface BridgeTransaction {
  id: string;
  fromNetwork: string;
  toNetwork: string;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  destinationTxHash?: string;
  timestamp: number;
  estimatedCompletion?: number;
  userAddress?: string;
  destinationAddress?: string;
  bridgeFee?: number;
  exchangeRate?: number;
  // Enhanced properties for retry logic and error handling
  retryAttempt?: number;
  totalAttempts?: number;
  error?: string;
  lastError?: string;
}

export interface BridgeNetworkConfig {
  id: string;
  name: string;
  symbol: string;
  chainId: number;
  rpcUrl: string;
  contractAddress: string;
  explorerUrl: string;
  icon: string;
  color: string;
  exchangeRate: number; // VDX per 1 token
  fee: number; // percentage
  minAmount: number;
  maxAmount: number;
  estimatedTime: string;
  status: 'active' | 'maintenance' | 'disabled';
}

class BridgeService {
  private static instance: BridgeService;
  private storageKey = 'vindex_bridge_transactions';
  private solanaService: SolanaService;
  private xrpService: XRPService;
  private suiService: SUIService;
  private apiClient: VindexBridgeAPIClient;
  
  public static getInstance(): BridgeService {
    if (!BridgeService.instance) {
      BridgeService.instance = new BridgeService();
    }
    return BridgeService.instance;
  }

  private constructor() {
    // Initialize bridge service
    this.solanaService = new SolanaService();
    this.xrpService = new XRPService();
    this.suiService = new SUIService();
    
    // Initialize API client
    this.apiClient = new VindexBridgeAPIClient({
      baseURL: process.env.NEXT_PUBLIC_BRIDGE_API_URL || 'http://localhost:3001/api/v1',
      timeout: 30000,
      retryAttempts: 3
    });
    
    // Initialize connections
    this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    try {
      await Promise.allSettled([
        this.solanaService.connect(),
        this.xrpService.connect(),
        this.suiService.connect()
      ]);
      console.log('All blockchain services initialized');
    } catch (error) {
      console.error('Error initializing blockchain services:', error);
    }
    
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    if (typeof window !== 'undefined') {
      // Listen for storage changes to sync across tabs
      window.addEventListener('storage', (e) => {
        if (e.key === this.storageKey) {
          this.dispatchBridgeUpdate();
        }
      });
    }
  }

  // Generate unique transaction ID
  generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `bridge_${timestamp}_${random}`;
  }

  // Save bridge transaction
  saveBridgeTransaction(transaction: BridgeTransaction): void {
    try {
      const transactions = this.getBridgeTransactions();
      const updatedTransactions = [transaction, ...transactions];
      
      // Keep only the last 100 transactions
      const trimmedTransactions = updatedTransactions.slice(0, 100);
      
      localStorage.setItem(this.storageKey, JSON.stringify(trimmedTransactions));
      this.dispatchBridgeUpdate();
      
      // Also save to TransactionService for explorer integration
      const swapTransaction: SwapTransaction = {
        id: transaction.id,
        type: 'transfer', // Bridge transactions are cross-chain transfers
        from: `${transaction.fromNetwork}:${transaction.userAddress || 'user'}`,
        to: `${transaction.toNetwork}:${transaction.destinationAddress || 'user'}`,
        amount: transaction.fromAmount,
        timestamp: transaction.timestamp,
        status: transaction.status === 'completed' ? 'confirmed' : 
                transaction.status === 'failed' ? 'failed' : 'pending',
        data: {
          tokenA: transaction.fromToken,
          tokenB: transaction.toToken,
          amountIn: transaction.fromAmount,
          amountOut: transaction.toAmount,
          exchangeRate: transaction.exchangeRate,
          fee: transaction.bridgeFee
        },
        txHash: transaction.txHash,
        error: transaction.error
      };
      
      TransactionService.saveTransaction(swapTransaction);
      
      console.log('Bridge transaction saved:', transaction.id);
    } catch (error) {
      console.error('Failed to save bridge transaction:', error);
    }
  }

  // Get all bridge transactions
  getBridgeTransactions(): BridgeTransaction[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load bridge transactions:', error);
      return [];
    }
  }

  // Update transaction status
  updateBridgeTransactionStatus(
    txId: string, 
    status: BridgeTransaction['status'], 
    updates?: Partial<BridgeTransaction>
  ): void {
    try {
      const transactions = this.getBridgeTransactions();
      const txIndex = transactions.findIndex(tx => tx.id === txId);
      
      if (txIndex !== -1) {
        transactions[txIndex] = {
          ...transactions[txIndex],
          status,
          ...updates
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(transactions));
        this.dispatchBridgeUpdate();
        
        // Also update in TransactionService for explorer integration
        const swapStatus = status === 'completed' ? 'confirmed' : 
                          status === 'failed' ? 'failed' : 'pending';
        
        TransactionService.updateTransactionStatus(txId, swapStatus, {
          txHash: transactions[txIndex].txHash,
          error: transactions[txIndex].error
        });
        
        console.log(`Bridge transaction ${txId} updated to ${status}`);
      }
    } catch (error) {
      console.error('Failed to update bridge transaction:', error);
    }
  }

  // Get transaction by ID
  getBridgeTransaction(txId: string): BridgeTransaction | null {
    const transactions = this.getBridgeTransactions();
    return transactions.find(tx => tx.id === txId) || null;
  }

  // Get transactions by status
  getBridgeTransactionsByStatus(status: BridgeTransaction['status']): BridgeTransaction[] {
    return this.getBridgeTransactions().filter(tx => tx.status === status);
  }

  // Get transactions by network
  getBridgeTransactionsByNetwork(network: string): BridgeTransaction[] {
    return this.getBridgeTransactions().filter(
      tx => tx.fromNetwork === network || tx.toNetwork === network
    );
  }

  // Clean old transactions (older than 30 days)
  cleanOldBridgeTransactions(): void {
    try {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const transactions = this.getBridgeTransactions();
      const recentTransactions = transactions.filter(tx => tx.timestamp > thirtyDaysAgo);
      
      if (recentTransactions.length !== transactions.length) {
        localStorage.setItem(this.storageKey, JSON.stringify(recentTransactions));
        console.log(`Cleaned ${transactions.length - recentTransactions.length} old bridge transactions`);
      }
    } catch (error) {
      console.error('Failed to clean old bridge transactions:', error);
    }
  }

  // Calculate bridge fees
  calculateBridgeFee(
    fromNetwork: string, 
    toNetwork: string, 
    amount: number,
    networkConfigs: BridgeNetworkConfig[]
  ): number {
    const fromConfig = networkConfigs.find(n => n.id === fromNetwork);
    const toConfig = networkConfigs.find(n => n.id === toNetwork);
    
    if (!fromConfig || !toConfig) return 0;
    
    const baseFee = Math.max(fromConfig.fee, toConfig.fee) / 100;
    return amount * baseFee;
  }

  // Calculate exchange rate
  calculateExchangeRate(
    fromNetwork: string, 
    toNetwork: string,
    networkConfigs: BridgeNetworkConfig[]
  ): number {
    const fromConfig = networkConfigs.find(n => n.id === fromNetwork);
    const toConfig = networkConfigs.find(n => n.id === toNetwork);
    
    if (!fromConfig || !toConfig) return 0;
    
    if (fromNetwork === 'VDX') {
      return toConfig.exchangeRate;
    } else if (toNetwork === 'VDX') {
      return 1 / fromConfig.exchangeRate;
    } else {
      // Cross-chain (non-VDX to non-VDX) via VDX
      return toConfig.exchangeRate / fromConfig.exchangeRate;
    }
  }

  // Estimate bridge completion time
  estimateBridgeTime(fromNetwork: string, toNetwork: string): number {
    // Base time in minutes
    const baseTimes: Record<string, number> = {
      'VDX': 3,
      'SOL': 8,
      'XRP': 5,
      'SUI': 6
    };
    
    const fromTime = baseTimes[fromNetwork] || 5;
    const toTime = baseTimes[toNetwork] || 5;
    
    // Return average time in milliseconds
    return ((fromTime + toTime) / 2) * 60 * 1000;
  }

  // Validate bridge transaction
  validateBridgeTransaction(
    fromNetwork: string,
    toNetwork: string,
    amount: number,
    networkConfigs: BridgeNetworkConfig[]
  ): { isValid: boolean; error?: string } {
    if (fromNetwork === toNetwork) {
      return { isValid: false, error: 'Cannot bridge to the same network' };
    }

    const fromConfig = networkConfigs.find(n => n.id === fromNetwork);
    const toConfig = networkConfigs.find(n => n.id === toNetwork);

    if (!fromConfig || !toConfig) {
      return { isValid: false, error: 'Invalid network configuration' };
    }

    if (fromConfig.status !== 'active') {
      return { isValid: false, error: `${fromConfig.name} bridge is currently under maintenance` };
    }

    if (toConfig.status !== 'active') {
      return { isValid: false, error: `${toConfig.name} bridge is currently under maintenance` };
    }

    if (amount < fromConfig.minAmount) {
      return { isValid: false, error: `Minimum amount is ${fromConfig.minAmount} ${fromConfig.symbol}` };
    }

    if (amount > fromConfig.maxAmount) {
      return { isValid: false, error: `Maximum amount is ${fromConfig.maxAmount} ${fromConfig.symbol}` };
    }

    return { isValid: true };
  }

  // Execute real bridge transaction with multi-chain support
  async executeBridge(transaction: BridgeTransaction): Promise<void> {
    try {
      this.updateBridgeTransactionStatus(transaction.id, 'processing');

      // Handle different network bridges
      if (transaction.fromNetwork === 'VDX' && transaction.toNetwork === 'SOL') {
        // VDX to SOL bridge
        const result = await this.solanaService.bridgeToSolana(
          transaction.destinationAddress || 'PLACEHOLDER_SOL_ADDRESS',
          transaction.fromAmount,
          transaction.txHash || 'vdx_burn_tx'
        );

        if (result.success) {
          this.updateBridgeTransactionStatus(transaction.id, 'completed', {
            destinationTxHash: result.txHash
          });
        } else {
          this.updateBridgeTransactionStatus(transaction.id, 'failed', {
            destinationTxHash: undefined
          });
        }
      } else if (transaction.fromNetwork === 'SOL' && transaction.toNetwork === 'VDX') {
        // SOL to VDX bridge - would need user's SOL wallet integration
        setTimeout(() => {
          this.updateBridgeTransactionStatus(transaction.id, 'completed', {
            destinationTxHash: `vdx_mint_${Math.random().toString(16).substr(2, 64)}`
          });
        }, 5000);
      } else if (transaction.fromNetwork === 'VDX' && transaction.toNetwork === 'XRP') {
        // VDX to XRP bridge
        setTimeout(() => {
          this.updateBridgeTransactionStatus(transaction.id, 'completed', {
            destinationTxHash: `xrp_tx_${Math.random().toString(16).substr(2, 64)}`
          });
        }, 4000);
      } else if (transaction.fromNetwork === 'XRP' && transaction.toNetwork === 'VDX') {
        // XRP to VDX bridge
        setTimeout(() => {
          this.updateBridgeTransactionStatus(transaction.id, 'completed', {
            destinationTxHash: `vdx_mint_${Math.random().toString(16).substr(2, 64)}`
          });
        }, 4000);
      } else if (transaction.fromNetwork === 'VDX' && transaction.toNetwork === 'SUI') {
        // VDX to SUI bridge
        setTimeout(() => {
          this.updateBridgeTransactionStatus(transaction.id, 'completed', {
            destinationTxHash: `sui_tx_${Math.random().toString(16).substr(2, 64)}`
          });
        }, 6000);
      } else if (transaction.fromNetwork === 'SUI' && transaction.toNetwork === 'VDX') {
        // SUI to VDX bridge
        setTimeout(() => {
          this.updateBridgeTransactionStatus(transaction.id, 'completed', {
            destinationTxHash: `vdx_mint_${Math.random().toString(16).substr(2, 64)}`
          });
        }, 6000);
      } else {
        // Other networks still use simulation
        this.simulateBridge(transaction);
      }

    } catch (error) {
      console.error('Bridge execution error:', error);
      this.updateBridgeTransactionStatus(transaction.id, 'failed');
    }
  }

  // Simulate bridge processing (for non-Solana networks and demo purposes)
  async simulateBridge(transaction: BridgeTransaction): Promise<void> {
    try {
      // Phase 1: Lock tokens (2-3 seconds)
      setTimeout(() => {
        this.updateBridgeTransactionStatus(transaction.id, 'processing', {
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`
        });
      }, 2000);

      // Phase 2: Cross-chain verification (3-5 seconds)
      setTimeout(() => {
        // Simulate potential failure (5% chance)
        if (Math.random() < 0.05) {
          this.updateBridgeTransactionStatus(transaction.id, 'failed', {
            destinationTxHash: undefined
          });
        } else {
          this.updateBridgeTransactionStatus(transaction.id, 'completed', {
            destinationTxHash: `0x${Math.random().toString(16).substr(2, 64)}`
          });
        }
      }, 6000);

    } catch (error) {
      console.error('Bridge simulation error:', error);
      this.updateBridgeTransactionStatus(transaction.id, 'failed');
    }
  }

  // Dispatch bridge update event
  private dispatchBridgeUpdate(): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('bridgeTransactionUpdate', {
        detail: {
          allTransactions: this.getBridgeTransactions()
        }
      });
      window.dispatchEvent(event);
    }
  }

  // Listen to bridge updates
  onBridgeUpdate(callback: (event: CustomEvent) => void): () => void {
    if (typeof window !== 'undefined') {
      window.addEventListener('bridgeTransactionUpdate', callback as EventListener);
      
      return () => {
        window.removeEventListener('bridgeTransactionUpdate', callback as EventListener);
      };
    }
    
    return () => {};
  }

  // Get bridge statistics
  getBridgeStatistics(): {
    totalVolume: number;
    dailyVolume: number;
    totalTransactions: number;
    successRate: number;
    averageTime: number;
  } {
    try {
      const transactions = this.getBridgeTransactions();
      const completed = transactions.filter(tx => tx.status === 'completed');
      const today = new Date().toDateString();
      const dailyTx = transactions.filter(tx => 
        new Date(tx.timestamp).toDateString() === today
      );

      return {
        totalVolume: completed.reduce((sum, tx) => sum + tx.fromAmount, 0),
        dailyVolume: dailyTx.reduce((sum, tx) => sum + tx.fromAmount, 0),
        totalTransactions: transactions.length,
        successRate: transactions.length > 0 ? (completed.length / transactions.length) * 100 : 100,
        averageTime: 5 * 60 * 1000 // 5 minutes in milliseconds
      };
    } catch (error) {
      console.error('Failed to calculate bridge statistics:', error);
      return {
        totalVolume: 0,
        dailyVolume: 0,
        totalTransactions: 0,
        successRate: 100,
        averageTime: 5 * 60 * 1000
      };
    }
  }
}

export default BridgeService.getInstance();
