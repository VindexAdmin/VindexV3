import { Transaction } from '../../core/Transaction';
import { TestHelpers } from '../utils/testHelpers';

describe('Transaction Basic Tests', () => {
  let fromAddress: string;
  let toAddress: string;

  beforeEach(() => {
    fromAddress = TestHelpers.generateTestAddress();
    toAddress = TestHelpers.generateTestAddress();
  });

  describe('Transaction Creation', () => {
    it('should create a valid transfer transaction', () => {
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');

      expect(transaction.id).toBeDefined();
      expect(transaction.from).toBe(fromAddress);
      expect(transaction.to).toBe(toAddress);
      expect(transaction.amount).toBe(100);
      expect(transaction.type).toBe('transfer');
      expect(transaction.timestamp).toBeGreaterThan(0);
      expect(transaction.fee).toBeGreaterThan(0);
    });

    it('should generate unique IDs for different transactions', () => {
      const tx1 = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const tx2 = new Transaction(fromAddress, toAddress, 100, 'transfer');

      expect(tx1.id).not.toBe(tx2.id);
    });

    it('should calculate fees correctly', () => {
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');

      expect(transaction.fee).toBeGreaterThan(0);
      expect(typeof transaction.fee).toBe('number');
    });
  });

  describe('Transaction Validation', () => {
    it('should validate a correct transaction', () => {
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');

      expect(transaction.isValid()).toBe(true);
    });

    it('should reject transaction with negative amount', () => {
      const transaction = new Transaction(fromAddress, toAddress, -100, 'transfer');

      expect(transaction.isValid()).toBe(false);
    });

    it('should reject transaction with zero amount', () => {
      const transaction = new Transaction(fromAddress, toAddress, 0, 'transfer');

      expect(transaction.isValid()).toBe(false);
    });
  });

  describe('Transaction Signing', () => {
    it('should sign transaction', () => {
      const { privateKey } = TestHelpers.generateTestKeyPair();
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');

      transaction.signTransaction(privateKey);

      expect(transaction.signature).toBeDefined();
      expect(transaction.signature).not.toBe('');
    });

    it('should verify signature with same key', () => {
      const { privateKey } = TestHelpers.generateTestKeyPair();
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');

      transaction.signTransaction(privateKey);

      // The current implementation uses HMAC, so we verify with the same key
      expect(transaction.verifySignature(privateKey)).toBe(true);
    });
  });
});
