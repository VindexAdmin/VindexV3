import * as crypto from 'crypto-js';
import { Transaction as TransactionInterface } from './types';
import { v4 as uuidv4 } from 'uuid';

export class Transaction implements TransactionInterface {
  public id: string;
  public from: string;
  public to: string;
  public amount: number;
  public fee: number;
  public timestamp: number;
  public signature: string;
  public type: 'transfer' | 'stake' | 'unstake' | 'swap';
  public data?: any;

  constructor(
    from: string,
    to: string,
    amount: number,
    type: 'transfer' | 'stake' | 'unstake' | 'swap' = 'transfer',
    data?: any
  ) {
    this.id = uuidv4();
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.type = type;
    this.data = data;
    this.timestamp = Date.now();
    this.fee = this.calculateFee();
    this.signature = '';
  }

  /**
   * Calculate transaction fee based on type and amount
   * Anti-spam mechanism: Higher fees for larger amounts and specific types
   */
  private calculateFee(): number {
    const baseFee = 0.001; // 0.001 VDX base fee
    const percentageFee = this.amount * 0.0001; // 0.01% of amount
    
    let typeFee = 0;
    switch (this.type) {
      case 'transfer':
        typeFee = baseFee;
        break;
      case 'stake':
        typeFee = baseFee * 2; // Higher fee for staking
        break;
      case 'unstake':
        typeFee = baseFee * 3; // Highest fee for unstaking
        break;
      case 'swap':
        typeFee = baseFee * 1.5; // Medium fee for swaps
        break;
    }

    // Additional fee for large transactions (anti-spam)
    const largeTxFee = this.amount > 1000 ? this.amount * 0.0005 : 0;
    
    return Math.max(typeFee + percentageFee + largeTxFee, baseFee);
  }

  /**
   * Create transaction hash for signing
   */
  public getHash(): string {
    return crypto.SHA256(
      this.from +
      this.to +
      this.amount +
      this.fee +
      this.timestamp +
      this.type +
      JSON.stringify(this.data || {})
    ).toString();
  }

  /**
   * Sign the transaction with private key
   */
  public signTransaction(privateKey: string): void {
    const hash = this.getHash();
    this.signature = crypto.HmacSHA256(hash, privateKey).toString();
  }

  /**
   * Verify transaction signature
   */
  public verifySignature(publicKey: string): boolean {
    if (!this.signature) return false;
    
    const hash = this.getHash();
    const expectedSignature = crypto.HmacSHA256(hash, publicKey).toString();
    
    return this.signature === expectedSignature;
  }

  /**
   * Validate transaction data
   */
  public isValid(): boolean {
    // Basic validation
    if (!this.from || !this.to || this.amount <= 0 || this.fee < 0) {
      return false;
    }

    // Prevent self-transactions (except for staking)
    if (this.from === this.to && this.type !== 'stake') {
      return false;
    }

    // Validate timestamp (not too old or in the future)
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    if (this.timestamp < now - maxAge || this.timestamp > now + 60000) {
      return false;
    }

    // Type-specific validations
    switch (this.type) {
      case 'stake':
        return this.amount >= 100; // Minimum stake amount
      case 'unstake':
        return this.amount > 0;
      case 'swap':
        return this.data && this.data.tokenA && this.data.tokenB;
      default:
        return true;
    }
  }

  /**
   * Convert to JSON for storage/transmission
   */
  public toJSON(): any {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      amount: this.amount,
      fee: this.fee,
      timestamp: this.timestamp,
      signature: this.signature,
      type: this.type,
      data: this.data
    };
  }

  /**
   * Create Transaction from JSON
   */
  public static fromJSON(data: any): Transaction {
    const tx = new Transaction(data.from, data.to, data.amount, data.type, data.data);
    tx.id = data.id;
    tx.fee = data.fee;
    tx.timestamp = data.timestamp;
    tx.signature = data.signature;
    return tx;
  }
}
