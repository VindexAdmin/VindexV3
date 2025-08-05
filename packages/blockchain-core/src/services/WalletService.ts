import { PrismaClient, Wallet } from '@prisma/client';
import CryptoJS from 'crypto-js';
import { generateMnemonic } from 'bip39';
import { ethers } from 'ethers';

export class WalletService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Creates a new wallet for a user
   * @param userId The ID of the user to create the wallet for
   * @param password The user's password to encrypt the private key
   */
  async createWallet(userId: string, password: string): Promise<Wallet> {
    // Generate random mnemonic
    const mnemonic = generateMnemonic();
    
    // Create wallet from mnemonic
    const hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic);
    const privateKey = hdNode.privateKey;
    const publicKey = hdNode.publicKey;
    const address = hdNode.address;

    // Generate random salt and IV
    const salt = CryptoJS.lib.WordArray.random(32).toString();
    const iv = CryptoJS.lib.WordArray.random(16).toString();

    // Create encryption key from password and salt
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 10000
    });

    // Encrypt private key and mnemonic
    const encryptedPrivateKey = CryptoJS.AES.encrypt(
      privateKey,
      key.toString(),
      { iv: CryptoJS.enc.Hex.parse(iv) }
    ).toString();

    const encryptedMnemonic = CryptoJS.AES.encrypt(
      mnemonic,
      key.toString(),
      { iv: CryptoJS.enc.Hex.parse(iv) }
    ).toString();

    // Save wallet to database
    return this.prisma.wallet.create({
      data: {
        userId,
        address,
        publicKey,
        encryptedPrivateKey,
        encryptedMnemonic,
        salt,
        iv
      }
    });
  }

  /**
   * Decrypts and returns a wallet's private key
   * @param walletId The ID of the wallet
   * @param password The user's password
   */
  async decryptPrivateKey(walletId: string, password: string): Promise<string> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId }
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Recreate key from password and salt
    const key = CryptoJS.PBKDF2(password, wallet.salt, {
      keySize: 256 / 32,
      iterations: 10000
    });

    // Decrypt private key
    const bytes = CryptoJS.AES.decrypt(
      wallet.encryptedPrivateKey,
      key.toString(),
      { iv: CryptoJS.enc.Hex.parse(wallet.iv) }
    );

    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Recovers a wallet's mnemonic phrase
   * @param walletId The ID of the wallet
   * @param password The user's password
   */
  async recoverMnemonic(walletId: string, password: string): Promise<string> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId }
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Recreate key from password and salt
    const key = CryptoJS.PBKDF2(password, wallet.salt, {
      keySize: 256 / 32,
      iterations: 10000
    });

    // Decrypt mnemonic
    const bytes = CryptoJS.AES.decrypt(
      wallet.encryptedMnemonic,
      key.toString(),
      { iv: CryptoJS.enc.Hex.parse(wallet.iv) }
    );

    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
