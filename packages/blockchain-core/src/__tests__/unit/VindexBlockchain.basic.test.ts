import { VindexBlockchain } from '../../core/VindexBlockchain';
import { Transaction } from '../../core/Transaction';
import { TestHelpers } from '../utils/testHelpers';

describe('VindexBlockchain Basic Tests', () => {
  let blockchain: VindexBlockchain;
  let testTransaction: Transaction;

  beforeEach(() => {
    blockchain = new VindexBlockchain();
    testTransaction = TestHelpers.createTestTransaction();
  });

  describe('Blockchain Initialization', () => {
    it('should initialize with genesis block', () => {
      expect(blockchain.getChainLength()).toBe(1);
      
      const genesisBlock = blockchain.getLatestBlock();
      expect(genesisBlock.index).toBe(0);
      expect(genesisBlock.previousHash).toBe('0');
      expect(genesisBlock.validator).toBe('genesis');
    });

    it('should have valid genesis accounts with balances', () => {
      const genesisValidator1Balance = blockchain.getBalance('vindex_genesis_validator_1');
      const treasuryBalance = blockchain.getBalance('vindex_treasury');
      
      expect(genesisValidator1Balance).toBe(100000000);
      expect(treasuryBalance).toBe(200000000);
    });

    it('should initialize with empty pending transactions', () => {
      const pendingTransactions = blockchain.getPendingTransactions();
      expect(pendingTransactions).toHaveLength(0);
    });

    it('should have valid initial chain', () => {
      expect(blockchain.isChainValid()).toBe(true);
    });
  });

  describe('Transaction Management', () => {
    it('should add valid transaction to pending pool', () => {
      // Create a transaction from genesis validator with sufficient balance
      const validTransaction = new Transaction(
        'vindex_genesis_validator_1',
        TestHelpers.generateTestAddress(),
        1000,
        'transfer',
        'test payment'
      );

      const result = blockchain.addTransaction(validTransaction);
      expect(result).toBe(true);
      expect(blockchain.getPendingTransactions()).toHaveLength(1);
    });

    it('should get pending transactions correctly', () => {
      const tx1 = new Transaction(
        'vindex_genesis_validator_1',
        TestHelpers.generateTestAddress(),
        1000,
        'transfer',
        'test payment 1'
      );
      const tx2 = new Transaction(
        'vindex_genesis_validator_2',
        TestHelpers.generateTestAddress(),
        2000,
        'transfer',
        'test payment 2'
      );

      blockchain.addTransaction(tx1);
      blockchain.addTransaction(tx2);

      const pendingTxs = blockchain.getPendingTransactions();
      expect(pendingTxs).toHaveLength(2);
    });
  });

  describe('Block Operations', () => {
    it('should get latest block correctly', () => {
      const latestBlock = blockchain.getLatestBlock();
      expect(latestBlock.index).toBe(0); // Genesis block
    });

    it('should get block by index', () => {
      const genesisBlock = blockchain.getBlock(0);
      expect(genesisBlock).toBeDefined();
      expect(genesisBlock!.index).toBe(0);
      
      const nonExistentBlock = blockchain.getBlock(999);
      expect(nonExistentBlock).toBeUndefined();
    });

    it('should get block by hash', () => {
      const genesisBlock = blockchain.getLatestBlock();
      const foundBlock = blockchain.getBlockByHash(genesisBlock.hash);
      
      expect(foundBlock).toBeDefined();
      expect(foundBlock!.hash).toBe(genesisBlock.hash);
      
      const nonExistentBlock = blockchain.getBlockByHash('non_existent_hash');
      expect(nonExistentBlock).toBeUndefined();
    });

    it('should mine block when pending transactions exist', () => {
      // Add a transaction
      const transaction = new Transaction(
        'vindex_genesis_validator_1',
        TestHelpers.generateTestAddress(),
        1000,
        'transfer',
        'test mining'
      );
      blockchain.addTransaction(transaction);

      const initialLength = blockchain.getChainLength();
      const minedBlock = blockchain.mineBlock();

      expect(minedBlock).toBeDefined();
      expect(blockchain.getChainLength()).toBe(initialLength + 1);
      expect(blockchain.getPendingTransactions()).toHaveLength(0);
    });

    it('should not mine block when no pending transactions', () => {
      const minedBlock = blockchain.mineBlock();
      expect(minedBlock).toBeNull();
    });
  });

  describe('Balance Management', () => {
    it('should get balance for existing account', () => {
      const balance = blockchain.getBalance('vindex_genesis_validator_1');
      expect(balance).toBe(100000000);
    });

    it('should return 0 for non-existent account', () => {
      const balance = blockchain.getBalance('non_existent_address');
      expect(balance).toBe(0);
    });
  });

  describe('Chain Validation', () => {
    it('should validate fresh blockchain', () => {
      expect(blockchain.isChainValid()).toBe(true);
    });

    it('should maintain chain validity after mining', () => {
      // Add and mine a transaction
      const transaction = new Transaction(
        'vindex_genesis_validator_1',
        TestHelpers.generateTestAddress(),
        1000,
        'transfer',
        'test validation'
      );
      blockchain.addTransaction(transaction);
      blockchain.mineBlock();

      expect(blockchain.isChainValid()).toBe(true);
    });
  });

  describe('Network Statistics', () => {
    it('should provide network stats', () => {
      const stats = blockchain.getNetworkStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalSupply).toBeDefined();
      expect(stats.circulatingSupply).toBeDefined();
      expect(stats.totalStaked).toBeDefined();
      expect(stats.totalValidators).toBeDefined();
      expect(stats.activeValidators).toBeDefined();
      expect(stats.averageBlockTime).toBeDefined();
      expect(stats.tps).toBeDefined();
      expect(stats.networkHashrate).toBeDefined();
    });
  });

  describe('Token Economics', () => {
    it('should handle token burning', () => {
      const burnAmount = 1000;
      const result = blockchain.burnTokens(burnAmount);
      
      expect(result).toBe(true);
    });

    it('should create swap pairs', () => {
      const result = blockchain.createSwapPair('VDX', 'ETH', 1000000, 100);
      expect(result).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple transactions efficiently', () => {
      const start = Date.now();
      
      // Add multiple transactions
      for (let i = 0; i < 10; i++) {
        const tx = new Transaction(
          'vindex_genesis_validator_1',
          TestHelpers.generateTestAddress(),
          100,
          'transfer',
          `test tx ${i}`
        );
        blockchain.addTransaction(tx);
      }
      
      const end = Date.now();
      expect(end - start).toBeLessThan(100); // Less than 100ms
      expect(blockchain.getPendingTransactions()).toHaveLength(10);
    });
  });
});
