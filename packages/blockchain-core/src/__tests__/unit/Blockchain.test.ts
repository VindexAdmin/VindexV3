import { VindexBlockchain } from '../../core/VindexBlockchain';
import { Block } from '../../core/Block';
import { Transaction } from '../../core/Transaction';
import { TestHelpers } from '../utils/testHelpers';

describe('VindexBlockchain Class Tests', () => {
  let blockchain: VindexBlockchain;

  beforeEach(() => {
    blockchain = new VindexBlockchain();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Blockchain Initialization', () => {
    it('should initialize with genesis block', () => {
      const latestBlock = blockchain.getLatestBlock();
      
      expect(latestBlock.index).toBe(0);
      expect(latestBlock.previousHash).toBe('0');
    });

    it('should have correct genesis block properties', () => {
      const genesisBlock = blockchain.getLatestBlock();
      
      expect(genesisBlock.index).toBe(0);
      expect(genesisBlock.validator).toBe('genesis');
      expect(genesisBlock.hash).toBeDefined();
    });

    it('should initialize with network statistics', () => {
      const stats = blockchain.getNetworkStats();
      
      expect(stats).toHaveProperty('chainLength');
      expect(stats).toHaveProperty('pendingTransactions');
      expect(stats).toHaveProperty('totalSupply');
      expect(stats.chainLength).toBe(1); // Genesis block
    });
  });

  describe('Transaction Management', () => {
    it('should add valid transaction to pending pool', () => {
      // Create a test account with balance first
      const fromAddress = TestHelpers.generateTestAddress();
      const toAddress = TestHelpers.generateTestAddress();
      
      // Create account with sufficient balance
      blockchain.createAccount(fromAddress, 1000);
      
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const { privateKey } = TestHelpers.generateTestKeyPair();
      transaction.signTransaction(privateKey);

      expect(() => {
        blockchain.addTransaction(transaction);
      }).not.toThrow();
    });

    it('should reject transaction with insufficient balance', () => {
      const fromAddress = TestHelpers.generateTestAddress();
      const toAddress = TestHelpers.generateTestAddress();
      
      // Create account with insufficient balance
      blockchain.createAccount(fromAddress, 50);
      
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const { privateKey } = TestHelpers.generateTestKeyPair();
      transaction.signTransaction(privateKey);

      expect(() => {
        blockchain.addTransaction(transaction);
      }).toThrow('Insufficient balance');
    });

    it('should reject transaction from non-existent account', () => {
      const fromAddress = TestHelpers.generateTestAddress();
      const toAddress = TestHelpers.generateTestAddress();
      
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const { privateKey } = TestHelpers.generateTestKeyPair();
      transaction.signTransaction(privateKey);

      expect(() => {
        blockchain.addTransaction(transaction);
      }).toThrow('Sender account not found');
    });

    it('should reject invalid transaction', () => {
      const fromAddress = TestHelpers.generateTestAddress();
      const toAddress = TestHelpers.generateTestAddress();
      
      blockchain.createAccount(fromAddress, 1000);
      
      const invalidTransaction = new Transaction(fromAddress, toAddress, -100, 'transfer');

      expect(() => {
        blockchain.addTransaction(invalidTransaction);
      }).toThrow('Invalid transaction');
    });
  });

  describe('Block Mining', () => {
    it('should mine a new block', async () => {
      const originalStats = blockchain.getNetworkStats();
      
      await blockchain.mineBlock();
      
      const newStats = blockchain.getNetworkStats();
      expect(newStats.chainLength).toBe(originalStats.chainLength + 1);
    });

    it('should mine block with pending transactions', async () => {
      const fromAddress = TestHelpers.generateTestAddress();
      const toAddress = TestHelpers.generateTestAddress();
      
      blockchain.createAccount(fromAddress, 1000);
      
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const { privateKey } = TestHelpers.generateTestKeyPair();
      transaction.signTransaction(privateKey);
      
      blockchain.addTransaction(transaction);
      
      const statsBefore = blockchain.getNetworkStats();
      await blockchain.mineBlock();
      const statsAfter = blockchain.getNetworkStats();
      
      expect(statsAfter.chainLength).toBe(statsBefore.chainLength + 1);
      expect(statsAfter.pendingTransactions).toBe(0);
    });

    it('should update balances after mining', async () => {
      const fromAddress = TestHelpers.generateTestAddress();
      const toAddress = TestHelpers.generateTestAddress();
      
      blockchain.createAccount(fromAddress, 1000);
      blockchain.createAccount(toAddress, 0);
      
      const initialFromBalance = blockchain.getBalance(fromAddress);
      const initialToBalance = blockchain.getBalance(toAddress);
      
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const { privateKey } = TestHelpers.generateTestKeyPair();
      transaction.signTransaction(privateKey);
      
      blockchain.addTransaction(transaction);
      await blockchain.mineBlock();
      
      const finalFromBalance = blockchain.getBalance(fromAddress);
      const finalToBalance = blockchain.getBalance(toAddress);
      
      expect(finalFromBalance).toBeLessThan(initialFromBalance);
      expect(finalToBalance).toBe(initialToBalance + 100);
    });
  });

  describe('Chain Validation', () => {
    it('should validate correct blockchain', () => {
      expect(blockchain.isChainValid()).toBe(true);
    });

    it('should maintain chain integrity after mining', async () => {
      await blockchain.mineBlock();
      await blockchain.mineBlock();
      
      expect(blockchain.isChainValid()).toBe(true);
    });
  });

  describe('Account Management', () => {
    it('should create account with initial balance', () => {
      const address = TestHelpers.generateTestAddress();
      const initialBalance = 1000;
      
      blockchain.createAccount(address, initialBalance);
      
      expect(blockchain.getBalance(address)).toBe(initialBalance);
    });

    it('should get correct account balance', () => {
      const address = TestHelpers.generateTestAddress();
      blockchain.createAccount(address, 500);
      
      const balance = blockchain.getBalance(address);
      
      expect(balance).toBe(500);
    });

    it('should return 0 for non-existent account', () => {
      const nonExistentAddress = TestHelpers.generateTestAddress();
      
      const balance = blockchain.getBalance(nonExistentAddress);
      
      expect(balance).toBe(0);
    });

    it('should get account details', () => {
      const address = TestHelpers.generateTestAddress();
      blockchain.createAccount(address, 1000);
      
      const account = blockchain.getAccount(address);
      
      expect(account).toBeDefined();
      expect(account?.balance).toBe(1000);
      expect(account?.address).toBe(address);
    });
  });

  describe('Network Statistics', () => {
    it('should provide accurate network stats', () => {
      const stats = blockchain.getNetworkStats();
      
      expect(stats).toHaveProperty('chainLength');
      expect(stats).toHaveProperty('pendingTransactions');
      expect(stats).toHaveProperty('totalSupply');
      expect(stats).toHaveProperty('circulatingSupply');
      expect(stats).toHaveProperty('burnedTokens');
      
      expect(typeof stats.chainLength).toBe('number');
      expect(typeof stats.pendingTransactions).toBe('number');
      expect(typeof stats.totalSupply).toBe('number');
    });

    it('should update stats after adding transactions', () => {
      const fromAddress = TestHelpers.generateTestAddress();
      const toAddress = TestHelpers.generateTestAddress();
      
      blockchain.createAccount(fromAddress, 1000);
      
      const statsBefore = blockchain.getNetworkStats();
      
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const { privateKey } = TestHelpers.generateTestKeyPair();
      transaction.signTransaction(privateKey);
      
      blockchain.addTransaction(transaction);
      
      const statsAfter = blockchain.getNetworkStats();
      
      expect(statsAfter.pendingTransactions).toBe(statsBefore.pendingTransactions + 1);
    });

    it('should update stats after mining', async () => {
      const statsBefore = blockchain.getNetworkStats();
      
      await blockchain.mineBlock();
      
      const statsAfter = blockchain.getNetworkStats();
      
      expect(statsAfter.chainLength).toBe(statsBefore.chainLength + 1);
    });
  });

  describe('Performance Tests', () => {
    it('should mine block in reasonable time', async () => {
      const start = Date.now();
      await blockchain.mineBlock();
      const end = Date.now();

      expect(end - start).toBeLessThan(1000); // Less than 1 second
    });

    it('should validate chain in reasonable time', async () => {
      // Create a few blocks for testing
      await blockchain.mineBlock();
      await blockchain.mineBlock();
      await blockchain.mineBlock();

      const start = Date.now();
      const isValid = blockchain.isChainValid();
      const end = Date.now();

      expect(end - start).toBeLessThan(100); // Less than 100ms
      expect(isValid).toBe(true);
    });

    it('should handle multiple transactions efficiently', () => {
      const fromAddress = TestHelpers.generateTestAddress();
      blockchain.createAccount(fromAddress, 10000);
      
      const start = Date.now();
      
      for (let i = 0; i < 10; i++) {
        const toAddress = TestHelpers.generateTestAddress();
        const transaction = new Transaction(fromAddress, toAddress, 10, 'transfer');
        const { privateKey } = TestHelpers.generateTestKeyPair();
        transaction.signTransaction(privateKey);
        
        try {
          blockchain.addTransaction(transaction);
        } catch (error) {
          // Some transactions might fail due to balance checks
        }
      }
      
      const end = Date.now();
      
      expect(end - start).toBeLessThan(100); // Less than 100ms for 10 transactions
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty mining', async () => {
      const statsBefore = blockchain.getNetworkStats();
      
      await blockchain.mineBlock();
      
      const statsAfter = blockchain.getNetworkStats();
      
      expect(statsAfter.chainLength).toBe(statsBefore.chainLength + 1);
      expect(statsAfter.pendingTransactions).toBe(0);
    });

    it('should handle very small amounts', () => {
      const fromAddress = TestHelpers.generateTestAddress();
      const toAddress = TestHelpers.generateTestAddress();
      
      blockchain.createAccount(fromAddress, 1);
      
      const transaction = new Transaction(fromAddress, toAddress, 0.1, 'transfer');
      const { privateKey } = TestHelpers.generateTestKeyPair();
      transaction.signTransaction(privateKey);
      
      expect(() => {
        blockchain.addTransaction(transaction);
      }).not.toThrow();
    });

    it('should handle maximum safe integer amounts', () => {
      const fromAddress = TestHelpers.generateTestAddress();
      const toAddress = TestHelpers.generateTestAddress();
      
      const largeAmount = Number.MAX_SAFE_INTEGER - 1000;
      blockchain.createAccount(fromAddress, largeAmount);
      
      const transaction = new Transaction(fromAddress, toAddress, 1000, 'transfer');
      const { privateKey } = TestHelpers.generateTestKeyPair();
      transaction.signTransaction(privateKey);
      
      expect(() => {
        blockchain.addTransaction(transaction);
      }).not.toThrow();
    });
  });
});
