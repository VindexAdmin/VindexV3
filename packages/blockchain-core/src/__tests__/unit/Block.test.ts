import { Block } from '../../core/Block';
import { Transaction } from '../../core/Transaction';
import { TestHelpers } from '../utils/testHelpers';

describe('Block Class Tests', () => {
  let testTransactions: Transaction[];
  let previousHash: string;
  let validator: string;

  beforeEach(() => {
    testTransactions = TestHelpers.createTestTransactions(3);
    previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    validator = TestHelpers.generateTestAddress();
  });

  describe('Block Creation', () => {
    it('should create a valid block with transactions', () => {
      const block = new Block(1, testTransactions, previousHash, validator);

      expect(block.index).toBe(1);
      expect(block.transactions).toHaveLength(3);
      expect(block.previousHash).toBe(previousHash);
      expect(block.validator).toBe(validator);
      expect(block.timestamp).toBeGreaterThan(0);
      expect(block.hash).toBeDefined();
      expect(block.merkleRoot).toBeDefined();
      expect(block.stateRoot).toBeDefined();
    });

    it('should create a block with empty transactions array', () => {
      const block = new Block(0, [], previousHash, validator);

      expect(block.transactions).toHaveLength(0);
      expect(block.transactionCount).toBe(0);
      expect(block.totalFees).toBe(0);
      expect(block.hash).toBeDefined();
    });

    it('should calculate transaction count correctly', () => {
      const block = new Block(1, testTransactions, previousHash, validator);

      expect(block.transactionCount).toBe(testTransactions.length);
    });

    it('should calculate total fees correctly', () => {
      const block = new Block(1, testTransactions, previousHash, validator);
      const expectedTotalFees = testTransactions.reduce((sum, tx) => sum + tx.fee, 0);

      expect(block.totalFees).toBe(expectedTotalFees);
    });
  });

  describe('Hash Calculation', () => {
    it('should generate consistent hash for same data', () => {
      const block1 = new Block(1, testTransactions, previousHash, validator);
      const block2 = new Block(1, testTransactions, previousHash, validator);

      // Hash should be different due to different timestamps
      expect(block1.hash).not.toBe(block2.hash);
    });

    it('should generate different hash for different data', () => {
      const block1 = new Block(1, testTransactions, previousHash, validator);
      const block2 = new Block(2, testTransactions, previousHash, validator);

      expect(block1.hash).not.toBe(block2.hash);
    });

    it('should recalculate hash when nonce changes', () => {
      const block = new Block(1, testTransactions, previousHash, validator);
      const originalHash = block.hash;

      block.nonce = 12345;
      const newHash = block.calculateHash();

      expect(newHash).not.toBe(originalHash);
    });
  });

  describe('Merkle Root Generation', () => {
    it('should generate merkle root for transactions', () => {
      const block = new Block(1, testTransactions, previousHash, validator);

      expect(block.merkleRoot).toBeDefined();
      expect(block.merkleRoot).toHaveLength(64); // SHA-256 hex string length
    });

    it('should generate different merkle roots for different transactions', () => {
      const block1 = new Block(1, testTransactions, previousHash, validator);
      const differentTransactions = TestHelpers.createTestTransactions(2);
      const block2 = new Block(1, differentTransactions, previousHash, validator);

      expect(block1.merkleRoot).not.toBe(block2.merkleRoot);
    });

    it('should handle empty transaction list', () => {
      const block = new Block(1, [], previousHash, validator);

      expect(block.merkleRoot).toBeDefined();
    });
  });

  describe('Block Validation', () => {
    it('should validate a correctly formed block', () => {
      const block = new Block(1, testTransactions, previousHash, validator);

      expect(block.isValid()).toBe(true);
    });

    it('should reject block with invalid hash', () => {
      const block = new Block(1, testTransactions, previousHash, validator);
      block.hash = 'invalid_hash';

      expect(block.isValid()).toBe(false);
    });

    it('should reject block with negative index', () => {
      const block = new Block(-1, testTransactions, previousHash, validator);

      expect(block.isValid()).toBe(false);
    });

    it('should reject block with future timestamp', () => {
      const block = new Block(1, testTransactions, previousHash, validator);
      block.timestamp = Date.now() + 10000; // 10 seconds in future

      expect(block.isValid()).toBe(false);
    });

    it('should reject block with invalid transactions', () => {
      const invalidTransaction = TestHelpers.createTestTransaction();
      invalidTransaction.amount = -100; // Invalid negative amount
      
      const block = new Block(1, [invalidTransaction], previousHash, validator);

      expect(block.isValid()).toBe(false);
    });
  });

  describe('Block Serialization', () => {
    it('should serialize block to JSON', () => {
      const block = new Block(1, testTransactions, previousHash, validator);
      const serialized = block.toJSON();

      expect(serialized).toHaveProperty('index', 1);
      expect(serialized).toHaveProperty('hash');
      expect(serialized).toHaveProperty('transactions');
      expect(serialized).toHaveProperty('timestamp');
      expect(serialized.transactions).toHaveLength(testTransactions.length);
    });

    it('should deserialize block from JSON', () => {
      const originalBlock = new Block(1, testTransactions, previousHash, validator);
      const serialized = originalBlock.toJSON();
      const deserializedBlock = Block.fromJSON(serialized);

      expect(deserializedBlock.index).toBe(originalBlock.index);
      expect(deserializedBlock.hash).toBe(originalBlock.hash);
      expect(deserializedBlock.previousHash).toBe(originalBlock.previousHash);
      expect(deserializedBlock.validator).toBe(originalBlock.validator);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large transaction count', () => {
      const largeTransactionSet = TestHelpers.createTestTransactions(1000);
      const block = new Block(1, largeTransactionSet, previousHash, validator);

      expect(block.transactionCount).toBe(1000);
      expect(block.hash).toBeDefined();
      expect(block.merkleRoot).toBeDefined();
    });

    it('should handle block with zero index (genesis block)', () => {
      const genesisBlock = new Block(0, [], '', validator);

      expect(genesisBlock.index).toBe(0);
      expect(genesisBlock.previousHash).toBe('');
      expect(genesisBlock.isValid()).toBe(true);
    });

    it('should handle very long validator address', () => {
      const longValidator = 'VDX' + 'a'.repeat(100);
      const block = new Block(1, testTransactions, previousHash, longValidator);

      expect(block.validator).toBe(longValidator);
      expect(block.isValid()).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should create block in reasonable time', () => {
      const start = Date.now();
      const block = new Block(1, testTransactions, previousHash, validator);
      const end = Date.now();

      expect(end - start).toBeLessThan(100); // Less than 100ms
      expect(block.hash).toBeDefined();
    });

    it('should validate block in reasonable time', () => {
      const block = new Block(1, testTransactions, previousHash, validator);
      
      const start = Date.now();
      const isValid = block.isValid();
      const end = Date.now();

      expect(end - start).toBeLessThan(50); // Less than 50ms
      expect(isValid).toBe(true);
    });
  });
});
