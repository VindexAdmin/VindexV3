import crypto from 'crypto';
import { Transaction } from '../../core/Transaction';
import { Block } from '../../core/Block';

export class TestHelpers {
  /**
   * Generate a random wallet address for testing
   */
  static generateTestAddress(): string {
    return `VDX${crypto.randomBytes(20).toString('hex')}`;
  }

  /**
   * Generate test private/public key pair
   */
  static generateTestKeyPair(): { privateKey: string; publicKey: string } {
    const privateKey = crypto.randomBytes(32).toString('hex');
    const publicKey = crypto.randomBytes(32).toString('hex');
    return { privateKey, publicKey };
  }

  /**
   * Create a valid test transaction
   */
  static createTestTransaction(
    from: string = TestHelpers.generateTestAddress(),
    to: string = TestHelpers.generateTestAddress(),
    amount: number = 100,
    type: 'transfer' | 'stake' | 'unstake' | 'swap' = 'transfer',
    data?: any
  ): Transaction {
    return new Transaction(from, to, amount, type, data);
  }

  /**
   * Create multiple test transactions
   */
  static createTestTransactions(count: number): Transaction[] {
    const transactions: Transaction[] = [];
    for (let i = 0; i < count; i++) {
      transactions.push(TestHelpers.createTestTransaction());
    }
    return transactions;
  }

  /**
   * Create a test block with transactions
   */
  static createTestBlock(
    height: number = 1,
    previousHash: string = '0000000000000000000000000000000000000000000000000000000000000000',
    transactions: Transaction[] = [],
    proposer: string = TestHelpers.generateTestAddress()
  ): Block {
    if (transactions.length === 0) {
      transactions = TestHelpers.createTestTransactions(3);
    }

    return new Block(height, transactions, previousHash, proposer);
  }

  /**
   * Create a chain of test blocks
   */
  static createTestBlockchain(length: number): Block[] {
    const blocks: Block[] = [];
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < length; i++) {
      const block = TestHelpers.createTestBlock(i, previousHash);
      blocks.push(block);
      previousHash = block.hash;
    }

    return blocks;
  }

  /**
   * Mock Prisma client for testing
   */
  static createMockPrisma() {
    return {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      wallet: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      block: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      transaction: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
      $disconnect: jest.fn(),
    };
  }

  /**
   * Wait for a specified amount of time (for async tests)
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate test account with balance
   */
  static createTestAccount(balance: number = 1000): {
    address: string;
    balance: number;
    privateKey: string;
    publicKey: string;
  } {
    const { privateKey, publicKey } = TestHelpers.generateTestKeyPair();
    const address = TestHelpers.generateTestAddress();
    
    return {
      address,
      balance,
      privateKey,
      publicKey
    };
  }

  /**
   * Create test validator
   */
  static createTestValidator(stake: number = 10000): {
    address: string;
    stake: number;
    isActive: boolean;
  } {
    return {
      address: TestHelpers.generateTestAddress(),
      stake,
      isActive: true
    };
  }

  /**
   * Compare two objects for deep equality (useful for testing)
   */
  static deepEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  /**
   * Generate deterministic test data based on seed
   */
  static seedRandom(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }
}
