import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { VindexBlockchain } from '../core/VindexBlockchain';
import { Transaction } from '../core/Transaction';

export class VindexAPI {
  private app: express.Application;
  private blockchain: VindexBlockchain;
  private port: number;

  constructor(blockchain: VindexBlockchain, port: number = 3001) {
    this.app = express();
    this.blockchain = blockchain;
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(morgan('combined'));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: Date.now(),
        version: '1.0.0',
        network: 'Vindex Chain'
      });
    });

    // Blockchain information
    this.app.get('/api/blockchain/info', (req, res) => {
      try {
        const stats = this.blockchain.getNetworkStats();
        const latestBlock = this.blockchain.getLatestBlock();
        
        res.json({
          success: true,
          data: {
            ...stats,
            latestBlock: {
              index: latestBlock.index,
              hash: latestBlock.hash,
              timestamp: latestBlock.timestamp,
              transactionCount: latestBlock.transactionCount
            },
            chainLength: this.blockchain.getChainLength(),
            isValid: this.blockchain.isChainValid()
          }
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Unknown error' });
      }
    });

    // Get specific block
    this.app.get('/api/blocks/:identifier', (req, res) => {
      try {
        const { identifier } = req.params;
        let block;

        // Check if identifier is a number (block index) or hash
        if (!isNaN(Number(identifier))) {
          block = this.blockchain.getBlock(Number(identifier));
        } else {
          block = this.blockchain.getBlockByHash(identifier);
        }

        if (!block) {
          return res.status(404).json({ success: false, error: 'Block not found' });
        }

        return res.json({ success: true, data: block.toJSON() });
      } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message || 'Unknown error' });
      }
    });

    // Get latest blocks
    this.app.get('/api/blocks', (req, res) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
        const offset = parseInt(req.query.offset as string) || 0;
        
        const chainLength = this.blockchain.getChainLength();
        const blocks = [];
        
        for (let i = Math.max(0, chainLength - offset - limit); i < chainLength - offset; i++) {
          const block = this.blockchain.getBlock(i);
          if (block) {
            blocks.unshift(block.toJSON());
          }
        }

        res.json({ 
          success: true, 
          data: blocks,
          pagination: {
            total: chainLength,
            limit,
            offset,
            hasMore: offset + limit < chainLength
          }
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Unknown error' });
      }
    });

    // Get transaction by ID
    this.app.get('/api/transactions/:txId', (req, res) => {
      try {
        const { txId } = req.params;
        const transaction = this.blockchain.getTransaction(txId);

        if (!transaction) {
          return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        return res.json({ success: true, data: transaction });
      } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message || 'Unknown error' });
      }
    });

    // Get pending transactions
    this.app.get('/api/transactions/pending', (req, res) => {
      try {
        const pending = this.blockchain.getPendingTransactions();
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        
        res.json({ 
          success: true, 
          data: pending.slice(0, limit).map(tx => tx.toJSON()),
          total: pending.length
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Unknown error' });
      }
    });

    // Submit new transaction
    this.app.post('/api/transactions', (req, res) => {
      try {
        const { from, to, amount, type, data, signature } = req.body;

        // Validate required fields
        if (!from || !to || typeof amount !== 'number' || amount <= 0) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid transaction data. Required: from, to, amount > 0' 
          });
        }

        // Create transaction
        const transaction = new Transaction(from, to, amount, type, data);
        
        // Set signature if provided
        if (signature) {
          transaction.signature = signature;
        }

        // Add to blockchain
        const success = this.blockchain.addTransaction(transaction);
        
        if (success) {
          return res.json({ 
            success: true, 
            data: { 
              transactionId: transaction.id,
              message: 'Transaction submitted successfully'
            }
          });
        } else {
          return res.status(400).json({ success: false, error: 'Failed to add transaction' });
        }
      } catch (error: any) {
        return res.status(400).json({ success: false, error: error.message || 'Unknown error' });
      }
    });

    // Get account balance and info
    this.app.get('/api/accounts/:address', (req, res) => {
      try {
        const { address } = req.params;
        const balance = this.blockchain.getBalance(address);
        
        res.json({ 
          success: true, 
          data: {
            address,
            balance,
          }
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Unknown error' });
      }
    });

    // Mine a new block (for testing/admin purposes)
    this.app.post('/api/mine', (req, res) => {
      try {
        const block = this.blockchain.mineBlock();
        
        if (block) {
          res.json({ 
            success: true, 
            data: { 
              message: 'Block mined successfully',
              block: block.toJSON()
            }
          });
        } else {
          res.json({ 
            success: true, 
            data: { message: 'No transactions to mine' }
          });
        }
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Unknown error' });
      }
    });

    // Search functionality
    this.app.get('/api/search/:query', (req, res) => {
      try {
        const { query } = req.params;
        const results: {
          blocks: any[];
          transactions: any[];
          addresses: any[];
        } = {
          blocks: [],
          transactions: [],
          addresses: []
        };

        // Search for block by hash or index
        if (!isNaN(Number(query))) {
          const block = this.blockchain.getBlock(Number(query));
          if (block) {
            results.blocks.push(block.toJSON());
          }
        } else if (query.length === 64) { // Assume it's a hash
          const block = this.blockchain.getBlockByHash(query);
          if (block) {
            results.blocks.push(block.toJSON());
          }
          
          // Also search for transaction
          const transaction = this.blockchain.getTransaction(query);
          if (transaction) {
            results.transactions.push(transaction);
          }
        }

        res.json({ success: true, data: results });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Unknown error' });
      }
    });

    // Network statistics
    this.app.get('/api/stats', (req, res) => {
      try {
        const stats = this.blockchain.getNetworkStats();
        res.json({ success: true, data: stats });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Unknown error' });
      }
    });

    // Export blockchain data (admin endpoint)
    this.app.get('/api/export', (req, res) => {
      try {
        const chainData = this.blockchain.exportChain();
        res.json({ success: true, data: chainData });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Unknown error' });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found',
        availableEndpoints: [
          'GET /health',
          'GET /api/blockchain/info',
          'GET /api/blocks/:identifier',
          'GET /api/blocks',
          'GET /api/transactions/:txId',
          'GET /api/transactions/pending',
          'POST /api/transactions',
          'GET /api/accounts/:address',
          'POST /api/mine',
          'GET /api/search/:query',
          'GET /api/stats',
          'GET /api/export'
        ]
      });
    });

    // Error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('API Error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        timestamp: Date.now()
      });
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`🚀 Vindex Chain API running on port ${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/health`);
        console.log(`🔗 Blockchain info: http://localhost:${this.port}/api/blockchain/info`);
        resolve();
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}
