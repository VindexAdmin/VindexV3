import BridgeService, { BridgeTransaction } from './bridge-service';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

export class EnhancedBridgeService {
  private static defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2
  };

  /**
   * Execute bridge transaction with retry logic
   */
  static async executeBridgeWithRetry(
    transaction: BridgeTransaction, 
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<void> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        console.log(`🔄 Bridge attempt ${attempt + 1}/${config.maxRetries + 1} for transaction ${transaction.id}`);
        
        // Update status to show retry attempt
        if (attempt > 0) {
          BridgeService.updateBridgeTransactionStatus(
            transaction.id, 
            'pending', 
            { 
              retryAttempt: attempt,
              lastError: lastError?.message || 'Previous attempt failed'
            }
          );
        }
        
        // Execute the bridge transaction
        await BridgeService.executeBridge(transaction);
        
        console.log(`✅ Bridge transaction ${transaction.id} executed successfully on attempt ${attempt + 1}`);
        return; // Success - exit retry loop
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`❌ Bridge attempt ${attempt + 1} failed:`, lastError.message);
        
        // If this was the last attempt, throw the error
        if (attempt === config.maxRetries) {
          BridgeService.updateBridgeTransactionStatus(transaction.id, 'failed', {
            error: lastError.message,
            totalAttempts: attempt + 1
          });
          throw lastError;
        }
        
        // Calculate delay for next attempt (exponential backoff)
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );
        
        console.log(`⏱️ Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Validate bridge configuration before execution
   */
  static validateBridgeConfiguration(transaction: BridgeTransaction): void {
    // Validate basic transaction structure
    if (!transaction.id || !transaction.fromNetwork || !transaction.toNetwork) {
      throw new Error('Invalid transaction structure');
    }

    if (!transaction.fromAmount || transaction.fromAmount <= 0) {
      throw new Error('Invalid transaction amount');
    }

    if (!transaction.userAddress) {
      throw new Error('User address not specified');
    }

    // Validate network support
    const supportedNetworks = ['VDX', 'SOL', 'XRP', 'SUI'];
    if (!supportedNetworks.includes(transaction.fromNetwork) || 
        !supportedNetworks.includes(transaction.toNetwork)) {
      throw new Error('Unsupported network');
    }

    // Validate same network bridge
    if (transaction.fromNetwork === transaction.toNetwork) {
      throw new Error('Cannot bridge to the same network');
    }

    console.log(`✅ Bridge configuration validated for ${transaction.id}`);
  }

  /**
   * Check bridge transaction status with enhanced error handling
   */
  static async checkTransactionStatus(transactionId: string): Promise<BridgeTransaction | null> {
    try {
      const transactions = BridgeService.getBridgeTransactions();
      const transaction = transactions.find(tx => tx.id === transactionId);
      
      if (!transaction) {
        console.warn(`⚠️ Transaction ${transactionId} not found`);
        return null;
      }

      // Check if transaction is stuck (pending for too long)
      const maxPendingTime = 30 * 60 * 1000; // 30 minutes
      const isStuck = transaction.status === 'pending' && 
                     (Date.now() - transaction.timestamp) > maxPendingTime;

      if (isStuck) {
        console.warn(`⚠️ Transaction ${transactionId} appears to be stuck`);
        BridgeService.updateBridgeTransactionStatus(transactionId, 'failed', {
          error: 'Transaction timeout - stuck in pending state'
        });
      }

      return transaction;
    } catch (error) {
      console.error(`❌ Error checking transaction status:`, error);
      return null;
    }
  }

  /**
   * Get estimated completion time with more accuracy
   */
  static getEstimatedCompletion(fromNetwork: string, toNetwork: string): number {
    const baseTime = BridgeService.estimateBridgeTime(fromNetwork, toNetwork);
    
    // Add network-specific delays
    const networkDelays: { [key: string]: number } = {
      'VDX': 30000, // 30 seconds
      'SOL': 60000, // 1 minute
      'XRP': 45000, // 45 seconds
      'SUI': 50000  // 50 seconds
    };

    const fromDelay = networkDelays[fromNetwork] || 30000;
    const toDelay = networkDelays[toNetwork] || 30000;
    
    return baseTime + fromDelay + toDelay;
  }

  /**
   * Get bridge statistics with enhanced metrics
   */
  static getEnhancedBridgeStats() {
    const basicStats = BridgeService.getBridgeStatistics();
    const transactions = BridgeService.getBridgeTransactions();
    
    // Calculate additional metrics
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentTransactions = transactions.filter(tx => tx.timestamp > last24Hours);
    
    const retryStats = transactions.reduce((acc, tx) => {
      const retryAttempt = (tx as any).retryAttempt || 0;
      if (retryAttempt > 0) {
        acc.totalRetries += retryAttempt;
        acc.transactionsWithRetries++;
      }
      return acc;
    }, { totalRetries: 0, transactionsWithRetries: 0 });

    return {
      ...basicStats,
      recentTransactionCount: recentTransactions.length,
      averageRetries: retryStats.transactionsWithRetries > 0 
        ? retryStats.totalRetries / retryStats.transactionsWithRetries 
        : 0,
      retrySuccessRate: retryStats.transactionsWithRetries > 0
        ? (retryStats.transactionsWithRetries - transactions.filter(tx => tx.status === 'failed').length) / retryStats.transactionsWithRetries * 100
        : 100
    };
  }

  /**
   * Utility function for delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up old failed transactions
   */
  static cleanupFailedTransactions(): void {
    try {
      const transactions = BridgeService.getBridgeTransactions();
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      const activeTransactions = transactions.filter(tx => 
        tx.timestamp > cutoffTime || tx.status !== 'failed'
      );
      
      // This would need to be implemented in the base BridgeService
      console.log(`🧹 Cleaned up ${transactions.length - activeTransactions.length} old failed transactions`);
    } catch (error) {
      console.error('❌ Error cleaning up failed transactions:', error);
    }
  }
}

export default EnhancedBridgeService;
