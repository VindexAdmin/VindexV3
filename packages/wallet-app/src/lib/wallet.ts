import * as CryptoJS from 'crypto-js';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  address: string;
}

export class VindexWallet {
  private privateKey: string;
  private publicKey: string;
  private address: string;

  constructor(privateKey?: string) {
    if (privateKey) {
      this.privateKey = privateKey;
      this.publicKey = this.derivePublicKey(privateKey);
      this.address = this.deriveAddress(this.publicKey);
    } else {
      const keyPair = this.generateKeyPair();
      this.privateKey = keyPair.privateKey;
      this.publicKey = keyPair.publicKey;
      this.address = keyPair.address;
    }
  }

  /**
   * Generate a new key pair
   */
  private generateKeyPair(): KeyPair {
    // Generate random private key
    const privateKey = CryptoJS.lib.WordArray.random(256/8).toString();
    const publicKey = this.derivePublicKey(privateKey);
    const address = this.deriveAddress(publicKey);

    return {
      privateKey,
      publicKey,
      address
    };
  }

  /**
   * Derive public key from private key
   */
  private derivePublicKey(privateKey: string): string {
    return CryptoJS.SHA256(privateKey).toString();
  }

  /**
   * Derive address from public key
   */
  private deriveAddress(publicKey: string): string {
    const hash = CryptoJS.SHA256(publicKey).toString();
    return 'vdx_' + hash.substring(0, 40);
  }

  /**
   * Sign a message with the private key
   */
  public sign(message: string): string {
    return CryptoJS.HmacSHA256(message, this.privateKey).toString();
  }

  /**
   * Verify a signature
   */
  public static verify(message: string, signature: string, publicKey: string): boolean {
    const expectedSignature = CryptoJS.HmacSHA256(message, publicKey).toString();
    return signature === expectedSignature;
  }

  /**
   * Create a transaction and sign it
   */
  public createTransaction(to: string, amount: number, type: string = 'transfer', data?: any): any {
    const transaction = {
      from: this.address,
      to,
      amount,
      type,
      data,
      timestamp: Date.now(),
      fee: this.calculateFee(amount, type)
    };

    const transactionHash = this.hashTransaction(transaction);
    const signature = this.sign(transactionHash);

    return {
      ...transaction,
      signature
    };
  }

  /**
   * Calculate transaction fee
   */
  private calculateFee(amount: number, type: string): number {
    const baseFee = 0.001;
    const percentageFee = amount * 0.0001;
    
    let typeFee = 0;
    switch (type) {
      case 'transfer':
        typeFee = baseFee;
        break;
      case 'stake':
        typeFee = baseFee * 2;
        break;
      case 'unstake':
        typeFee = baseFee * 3;
        break;
      case 'swap':
        typeFee = baseFee * 1.5;
        break;
    }

    const largeTxFee = amount > 1000 ? amount * 0.0005 : 0;
    
    return Math.max(typeFee + percentageFee + largeTxFee, baseFee);
  }

  /**
   * Hash a transaction for signing
   */
  private hashTransaction(transaction: any): string {
    return CryptoJS.SHA256(
      transaction.from +
      transaction.to +
      transaction.amount +
      transaction.fee +
      transaction.timestamp +
      transaction.type +
      JSON.stringify(transaction.data || {})
    ).toString();
  }

  /**
   * Export wallet to encrypted JSON
   */
  public exportWallet(password: string): string {
    const walletData = {
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      address: this.address,
      timestamp: Date.now()
    };

    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(walletData),
      password
    ).toString();

    return encrypted;
  }

  /**
   * Import wallet from encrypted JSON
   */
  public static importWallet(encryptedWallet: string, password: string): VindexWallet {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedWallet, password);
      const walletData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
      
      return new VindexWallet(walletData.privateKey);
    } catch (error) {
      throw new Error('Invalid password or corrupted wallet file');
    }
  }

  /**
   * Generate mnemonic phrase (simplified version)
   */
  public static generateMnemonic(): string {
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
      'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
      'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
      'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
      'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
      'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
      'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among'
    ];

    const mnemonic = [];
    for (let i = 0; i < 12; i++) {
      const randomIndex = Math.floor(Math.random() * words.length);
      mnemonic.push(words[randomIndex]);
    }

    return mnemonic.join(' ');
  }

  /**
   * Create wallet from mnemonic
   */
  public static fromMnemonic(mnemonic: string): VindexWallet {
    const hash = CryptoJS.SHA256(mnemonic).toString();
    return new VindexWallet(hash);
  }

  // Getters
  public getPrivateKey(): string {
    return this.privateKey;
  }

  public getPublicKey(): string {
    return this.publicKey;
  }

  public getAddress(): string {
    return this.address;
  }

  /**
   * Validate an address format
   */
  public static isValidAddress(address: string): boolean {
    return /^vdx_[a-f0-9]{40}$/i.test(address);
  }

  /**
   * Format balance for display
   */
  public static formatBalance(balance: number): string {
    if (balance >= 1000000) {
      return (balance / 1000000).toFixed(2) + 'M VDX';
    } else if (balance >= 1000) {
      return (balance / 1000).toFixed(2) + 'K VDX';
    } else {
      return balance.toFixed(6) + ' VDX';
    }
  }

  /**
   * Format address for display
   */
  public static formatAddress(address: string): string {
    if (address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}

export default VindexWallet;
