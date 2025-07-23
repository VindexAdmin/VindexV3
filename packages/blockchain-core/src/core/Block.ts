import * as crypto from 'crypto-js';
import { MerkleTree } from 'merkletreejs';
import { Block as BlockInterface, Transaction } from './types';

export class Block implements BlockInterface {
  public index: number;
  public timestamp: number;
  public transactions: Transaction[];
  public previousHash: string;
  public hash: string;
  public nonce: number;
  public validator: string;
  public signature: string;
  public merkleRoot: string;
  public stateRoot: string;
  public transactionCount: number;
  public totalFees: number;
  public reward: number;

  constructor(
    index: number,
    transactions: Transaction[],
    previousHash: string,
    validator: string
  ) {
    this.index = index;
    this.timestamp = Date.now();
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.validator = validator;
    this.nonce = 0;
    this.signature = '';
    
    // Calculate derived properties
    this.transactionCount = transactions.length;
    this.totalFees = this.calculateTotalFees();
    this.reward = this.calculateBlockReward();
    this.merkleRoot = this.calculateMerkleRoot();
    this.stateRoot = this.calculateStateRoot();
    this.hash = this.calculateHash();
  }

  /**
   * Calculate total fees from all transactions
   */
  private calculateTotalFees(): number {
    return this.transactions.reduce((total, tx) => total + tx.fee, 0);
  }

  /**
   * Calculate block reward
   * No reward for empty blocks (anti-spam measure)
   */
  private calculateBlockReward(): number {
    if (this.transactions.length === 0) {
      return 0; // No reward for empty blocks
    }

    // Base reward decreases over time (halving-like mechanism)
    const baseReward = 10;
    const halvingInterval = 210000; // Every ~210k blocks
    const halvings = Math.floor(this.index / halvingInterval);
    const currentBaseReward = baseReward / Math.pow(2, halvings);

    // Bonus for processing more transactions
    const transactionBonus = Math.min(this.transactions.length * 0.1, 5);
    
    return currentBaseReward + transactionBonus + this.totalFees;
  }

  /**
   * Calculate Merkle root of all transactions
   */
  private calculateMerkleRoot(): string {
    if (this.transactions.length === 0) {
      return crypto.SHA256('').toString();
    }

    const leaves = this.transactions.map(tx => 
      crypto.SHA256(JSON.stringify(tx)).toString()
    );
    
    const tree = new MerkleTree(leaves, crypto.SHA256);
    return tree.getRoot().toString('hex');
  }

  /**
   * Calculate state root (simplified - in reality would be state trie root)
   */
  private calculateStateRoot(): string {
    // Simplified state root calculation
    // In a real implementation, this would be the root of a state trie
    const stateData = {
      blockIndex: this.index,
      timestamp: this.timestamp,
      transactionCount: this.transactionCount,
      totalFees: this.totalFees,
      validator: this.validator
    };
    
    return crypto.SHA256(JSON.stringify(stateData)).toString();
  }

  /**
   * Calculate block hash
   */
  public calculateHash(): string {
    return crypto.SHA256(
      this.index +
      this.timestamp +
      this.previousHash +
      this.merkleRoot +
      this.stateRoot +
      this.validator +
      this.nonce +
      this.transactionCount +
      this.totalFees
    ).toString();
  }

  /**
   * Sign the block with validator's private key
   */
  public signBlock(privateKey: string): void {
    const hash = this.calculateHash();
    this.signature = crypto.HmacSHA256(hash, privateKey).toString();
    this.hash = hash;
  }

  /**
   * Verify block signature
   */
  public verifySignature(publicKey: string): boolean {
    if (!this.signature) return false;
    
    const hash = this.calculateHash();
    const expectedSignature = crypto.HmacSHA256(hash, publicKey).toString();
    
    return this.signature === expectedSignature;
  }

  /**
   * Validate block structure and content
   */
  public isValid(): boolean {
    // Check basic structure
    if (this.index < 0 || !this.previousHash || !this.validator) {
      return false;
    }

    // Verify hash integrity
    if (this.hash !== this.calculateHash()) {
      return false;
    }

    // Verify merkle root
    if (this.merkleRoot !== this.calculateMerkleRoot()) {
      return false;
    }

    // Verify all transactions
    for (const tx of this.transactions) {
      if (!tx.id || typeof tx.amount !== 'number' || tx.amount < 0) {
        return false;
      }
    }

    // Check timestamp is reasonable
    const now = Date.now();
    if (this.timestamp > now + 60000) { // Not more than 1 minute in future
      return false;
    }

    // Verify transaction fees match
    const calculatedFees = this.calculateTotalFees();
    if (Math.abs(this.totalFees - calculatedFees) > 0.001) {
      return false;
    }

    // Verify reward calculation
    const calculatedReward = this.calculateBlockReward();
    if (Math.abs(this.reward - calculatedReward) > 0.001) {
      return false;
    }

    return true;
  }

  /**
   * Add transaction to block (before mining)
   */
  public addTransaction(transaction: Transaction): boolean {
    // Don't add if block is already mined (has signature)
    if (this.signature) {
      return false;
    }

    // Validate transaction
    if (!transaction.id || !transaction.from || !transaction.to) {
      return false;
    }

    this.transactions.push(transaction);
    
    // Recalculate derived properties
    this.transactionCount = this.transactions.length;
    this.totalFees = this.calculateTotalFees();
    this.reward = this.calculateBlockReward();
    this.merkleRoot = this.calculateMerkleRoot();
    this.stateRoot = this.calculateStateRoot();
    
    return true;
  }

  /**
   * Get block size in bytes (approximate)
   */
  public getSize(): number {
    return JSON.stringify(this.toJSON()).length;
  }

  /**
   * Convert to JSON for storage/transmission
   */
  public toJSON(): any {
    return {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions,
      previousHash: this.previousHash,
      hash: this.hash,
      nonce: this.nonce,
      validator: this.validator,
      signature: this.signature,
      merkleRoot: this.merkleRoot,
      stateRoot: this.stateRoot,
      transactionCount: this.transactionCount,
      totalFees: this.totalFees,
      reward: this.reward
    };
  }

  /**
   * Create Block from JSON
   */
  public static fromJSON(data: any): Block {
    const block = new Block(data.index, data.transactions, data.previousHash, data.validator);
    block.timestamp = data.timestamp;
    block.hash = data.hash;
    block.nonce = data.nonce;
    block.signature = data.signature;
    block.merkleRoot = data.merkleRoot;
    block.stateRoot = data.stateRoot;
    block.transactionCount = data.transactionCount;
    block.totalFees = data.totalFees;
    block.reward = data.reward;
    return block;
  }
}
