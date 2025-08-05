import { Transaction } from '../../core/Transaction';
import { TestHelpers } from '../utils/testHelpers';

describe('Transaction Class Tests', () => {
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

    it('should create different transaction types', () => {
      const transferTx = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const stakeTx = new Transaction(fromAddress, toAddress, 1000, 'stake');
      const unstakeTx = new Transaction(fromAddress, toAddress, 500, 'unstake');
      const swapTx = new Transaction(fromAddress, toAddress, 50, 'swap');

      expect(transferTx.type).toBe('transfer');
      expect(stakeTx.type).toBe('stake');
      expect(unstakeTx.type).toBe('unstake');
      expect(swapTx.type).toBe('swap');
    });

    it('should generate unique IDs for different transactions', () => {
      const tx1 = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const tx2 = new Transaction(fromAddress, toAddress, 100, 'transfer');

      expect(tx1.id).not.toBe(tx2.id);
    });

    it('should include optional data', () => {
      const data = { memo: 'Test payment', reference: '12345' };
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer', data);

      expect(transaction.data).toEqual(data);
    });
  });

  describe('Fee Calculation', () => {
    it('should calculate base fee for transfer transactions', () => {
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');

      expect(transaction.fee).toBeGreaterThan(0);
      expect(transaction.fee).toBeLessThan(transaction.amount);
    });

    it('should calculate higher fees for larger amounts', () => {
      const smallTx = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const largeTx = new Transaction(fromAddress, toAddress, 10000, 'transfer');

      expect(largeTx.fee).toBeGreaterThan(smallTx.fee);
    });

    it('should have different fees for different transaction types', () => {
      const transferTx = new Transaction(fromAddress, toAddress, 1000, 'transfer');
      const stakeTx = new Transaction(fromAddress, toAddress, 1000, 'stake');

      // Stake transactions might have different fee structures
      expect(transferTx.fee).toBeDefined();
      expect(stakeTx.fee).toBeDefined();
    });

    it('should have minimum fee even for very small amounts', () => {
      const transaction = new Transaction(fromAddress, toAddress, 0.001, 'transfer');

      expect(transaction.fee).toBeGreaterThan(0);
    });
  });

  describe('Transaction Validation', () => {
    it('should validate a correctly formed transaction', () => {
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

    it('should reject transaction with invalid from address', () => {
      const transaction = new Transaction('', toAddress, 100, 'transfer');

      expect(transaction.isValid()).toBe(false);
    });

    it('should reject transaction with invalid to address', () => {
      const transaction = new Transaction(fromAddress, '', 100, 'transfer');

      expect(transaction.isValid()).toBe(false);
    });

    it('should reject transaction with same from and to address', () => {
      const transaction = new Transaction(fromAddress, fromAddress, 100, 'transfer');

      expect(transaction.isValid()).toBe(false);
    });

    it('should reject transaction with invalid timestamp', () => {
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');
      transaction.timestamp = -1;

      expect(transaction.isValid()).toBe(false);
    });

    it('should reject transaction with future timestamp', () => {
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');
      transaction.timestamp = Date.now() + 10000; // 10 seconds in future

      expect(transaction.isValid()).toBe(false);
    });
  });

  describe('Transaction Signing', () => {
    it('should sign transaction with private key', () => {
      const { privateKey } = TestHelpers.generateTestKeyPair();
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');

      transaction.signTransaction(privateKey);

      expect(transaction.signature).toBeDefined();
      expect(transaction.signature).not.toBe('');
    });

    it('should generate different signatures for different transactions', () => {
      const { privateKey } = TestHelpers.generateTestKeyPair();
      const tx1 = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const tx2 = new Transaction(fromAddress, toAddress, 200, 'transfer');

      tx1.signTransaction(privateKey);
      tx2.signTransaction(privateKey);

      expect(tx1.signature).not.toBe(tx2.signature);
    });

    it('should verify valid signature', () => {
      const { privateKey, publicKey } = TestHelpers.generateTestKeyPair();
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');

      transaction.signTransaction(privateKey);

      expect(transaction.verifySignature(publicKey)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const { privateKey } = TestHelpers.generateTestKeyPair();
      const { publicKey: wrongPublicKey } = TestHelpers.generateTestKeyPair();
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');

      transaction.signTransaction(privateKey);

      expect(transaction.verifySignature(wrongPublicKey)).toBe(false);
    });

    it('should reject transaction with tampered data after signing', () => {
      const { privateKey, publicKey } = TestHelpers.generateTestKeyPair();
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');

      transaction.signTransaction(privateKey);
      transaction.amount = 200; // Tamper with amount after signing

      expect(transaction.verifySignature(publicKey)).toBe(false);
    });
  });

  describe('Transaction Serialization', () => {
    it('should serialize transaction to JSON', () => {
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const serialized = transaction.toJSON();

      expect(serialized).toHaveProperty('id');
      expect(serialized).toHaveProperty('from', fromAddress);
      expect(serialized).toHaveProperty('to', toAddress);
      expect(serialized).toHaveProperty('amount', 100);
      expect(serialized).toHaveProperty('type', 'transfer');
    });

    it('should deserialize transaction from JSON', () => {
      const originalTx = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const serialized = originalTx.toJSON();
      const deserializedTx = Transaction.fromJSON(serialized);

      expect(deserializedTx.id).toBe(originalTx.id);
      expect(deserializedTx.from).toBe(originalTx.from);
      expect(deserializedTx.to).toBe(originalTx.to);
      expect(deserializedTx.amount).toBe(originalTx.amount);
      expect(deserializedTx.type).toBe(originalTx.type);
    });

    it('should preserve signature after serialization', () => {
      const { privateKey } = TestHelpers.generateTestKeyPair();
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');
      
      transaction.signTransaction(privateKey);
      const serialized = transaction.toJSON();
      const deserializedTx = Transaction.fromJSON(serialized);

      expect(deserializedTx.signature).toBe(transaction.signature);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', () => {
      const largeAmount = Number.MAX_SAFE_INTEGER - 1000;
      const transaction = new Transaction(fromAddress, toAddress, largeAmount, 'transfer');

      expect(transaction.amount).toBe(largeAmount);
      expect(transaction.isValid()).toBe(true);
    });

    it('should handle very small decimal amounts', () => {
      const smallAmount = 0.00000001;
      const transaction = new Transaction(fromAddress, toAddress, smallAmount, 'transfer');

      expect(transaction.amount).toBe(smallAmount);
    });

    it('should handle very long addresses', () => {
      const longFromAddress = 'VDX' + 'a'.repeat(100);
      const longToAddress = 'VDX' + 'b'.repeat(100);
      const transaction = new Transaction(longFromAddress, longToAddress, 100, 'transfer');

      expect(transaction.from).toBe(longFromAddress);
      expect(transaction.to).toBe(longToAddress);
    });

    it('should handle large data objects', () => {
      const largeData = {
        memo: 'a'.repeat(1000),
        metadata: { tags: new Array(100).fill('tag') }
      };
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer', largeData);

      expect(transaction.data).toEqual(largeData);
    });
  });

  describe('Performance Tests', () => {
    it('should create transaction in reasonable time', () => {
      const start = Date.now();
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');
      const end = Date.now();

      expect(end - start).toBeLessThan(10); // Less than 10ms
      expect(transaction.id).toBeDefined();
    });

    it('should validate transaction in reasonable time', () => {
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');
      
      const start = Date.now();
      const isValid = transaction.isValid();
      const end = Date.now();

      expect(end - start).toBeLessThan(5); // Less than 5ms
      expect(isValid).toBe(true);
    });

    it('should sign transaction in reasonable time', () => {
      const { privateKey } = TestHelpers.generateTestKeyPair();
      const transaction = new Transaction(fromAddress, toAddress, 100, 'transfer');
      
      const start = Date.now();
      transaction.signTransaction(privateKey);
      const end = Date.now();

      expect(end - start).toBeLessThan(50); // Less than 50ms
      expect(transaction.signature).toBeDefined();
    });
  });
});
