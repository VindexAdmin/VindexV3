import { VindexBlockchain } from './core/VindexBlockchain';
import { VindexAPI } from './api/VindexAPI';
import { Transaction } from './core/Transaction';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Main entry point for Vindex Chain
 */
class VindexChainNode {
  private blockchain: VindexBlockchain;
  private api: VindexAPI;
  private port: number;

  constructor() {
    this.port = parseInt(process.env.PORT || '3001');
    this.blockchain = new VindexBlockchain();
    this.api = new VindexAPI(this.blockchain, this.port);
    
    this.setupGracefulShutdown();
  }

  /**
   * Start the Vindex Chain node
   */
  public async start(): Promise<void> {
    try {
      console.log('🔗 Starting Vindex Chain Node...');
      console.log('===============================');
      
      // Initialize blockchain
      this.initializeTestData();
      
      // Start API server
      await this.api.start();
      
      console.log('✅ Vindex Chain Node started successfully!');
      console.log(`🌐 Network: ${this.blockchain.isChainValid() ? 'Valid' : 'Invalid'}`);
      console.log(`📊 Chain Length: ${this.blockchain.getChainLength()}`);
      console.log(`💰 Total Supply: ${this.blockchain.getNetworkStats().totalSupply.toLocaleString()} VDX`);
      console.log('===============================');
      
      // Start background processes
      this.startBackgroundTasks();
      
    } catch (error) {
      console.error('❌ Failed to start Vindex Chain Node:', error);
      process.exit(1);
    }
  }

  /**
   * Initialize test data for development
   */
  private initializeTestData(): void {
    try {
      console.log('🔄 Initializing test data...');
      
      // Create some test transactions
      const testTransactions = [
        new Transaction(
          'vindex_genesis_validator_1',
          'test_user_1',
          1000,
          'transfer'
        ),
        new Transaction(
          'vindex_genesis_validator_2',
          'test_user_2',
          2000,
          'transfer'
        ),
        new Transaction(
          'test_user_1',
          'vindex_genesis_validator_1',
          100,
          'stake'
        )
      ];

      // Sign transactions (simplified - in production would use real private keys)
      testTransactions.forEach(tx => {
        tx.signTransaction('test_private_key_' + tx.from);
      });

      // Add transactions to blockchain
      testTransactions.forEach(tx => {
        try {
          this.blockchain.addTransaction(tx);
        } catch (error: any) {
          console.warn('⚠️  Could not add test transaction:', error.message);
        }
      });

      // Mine a block with the test transactions
      const testBlock = this.blockchain.mineBlock();
      if (testBlock) {
        console.log(`✅ Test block mined: #${testBlock.index} with ${testBlock.transactionCount} transactions`);
      }

      console.log('✅ Test data initialized');
    } catch (error: any) {
      console.warn('⚠️  Could not initialize test data:', error.message);
    }
  }

  /**
   * Start background tasks
   */
  private startBackgroundTasks(): void {
    // Auto-mine blocks every 10 seconds if there are pending transactions
    setInterval(() => {
      try {
        const pendingCount = this.blockchain.getPendingTransactions().length;
        if (pendingCount > 0) {
          console.log(`🔨 Auto-mining block with ${pendingCount} pending transactions...`);
          const block = this.blockchain.mineBlock();
          if (block) {
            console.log(`✅ Block #${block.index} mined successfully`);
          }
        }
      } catch (error: any) {
        console.error('❌ Auto-mining error:', error.message);
      }
    }, 10000); // Every 10 seconds

    // Log network stats every minute
    setInterval(() => {
      const stats = this.blockchain.getNetworkStats();
      console.log('📊 Network Stats:', {
        chainLength: this.blockchain.getChainLength(),
        pendingTx: this.blockchain.getPendingTransactions().length,
        activeValidators: stats.activeValidators,
        tps: stats.tps.toFixed(2)
      });
    }, 60000); // Every minute
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
        this.shutdown();
      });
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      this.shutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown();
    });
  }

  /**
   * Shutdown the node
   */
  private shutdown(): void {
    console.log('💾 Saving blockchain state...');
    
    // In a real implementation, you would save the blockchain state to disk
    const chainData = this.blockchain.exportChain();
    console.log(`💾 Blockchain exported with ${chainData.chain.length} blocks`);
    
    console.log('👋 Vindex Chain Node shutdown complete');
    process.exit(0);
  }
}

// Start the node if this file is run directly
if (require.main === module) {
  const node = new VindexChainNode();
  node.start().catch(error => {
    console.error('❌ Failed to start node:', error);
    process.exit(1);
  });
}

export { VindexChainNode, VindexBlockchain, Transaction };
