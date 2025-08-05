import { PrismaClient } from '@prisma/client';
import { WalletService } from './WalletService';
import { ethers } from 'ethers';

export class TransactionService {
  private prisma: PrismaClient;
  private walletService: WalletService;

  constructor(prisma: PrismaClient, walletService: WalletService) {
    this.prisma = prisma;
    this.walletService = walletService;
  }

  /**
   * Create and sign a new transaction
   */
  async createTransaction(
    walletId: string, 
    password: string, 
    to: string, 
    amount: string, 
    data?: any
  ) {
    // Get wallet's private key
    const privateKey = await this.walletService.decryptPrivateKey(walletId, password);
    
    // Create wallet instance from private key
    const wallet = new ethers.Wallet(privateKey);
    
    // Get the source wallet from database
    const sourceWallet = await this.prisma.wallet.findUnique({
      where: { id: walletId }
    });

    if (!sourceWallet) {
      throw new Error('Source wallet not found');
    }

    // Find or create destination wallet
    const destWallet = await this.prisma.wallet.findUnique({
      where: { address: to }
    });

    // Create transaction object
    const tx = {
      to: to,
      value: ethers.parseEther(amount),
      data: data || '0x',
      nonce: await this.getNonce(wallet.address),
      gasPrice: await this.getGasPrice(),
      gasLimit: ethers.parseUnits('21000', 'wei') // Basic transfer gas limit
    };

    // Sign transaction
    const signedTx = await wallet.signTransaction(tx);

    // Save transaction to database
    const transaction = await this.prisma.transaction.create({
      data: {
        fromAddress: wallet.address,
        toAddress: to,
        amount: amount,
        data: data ? JSON.stringify(data) : null,
        gasPrice: tx.gasPrice.toString(),
        gasLimit: tx.gasLimit.toString(),
        nonce: tx.nonce,
        hash: ethers.keccak256(signedTx),
        rawTransaction: signedTx,
        status: 'PENDING',
        type: 'TRANSFER',
        // Set up relations
        user: sourceWallet.userId ? {
          connect: { id: sourceWallet.userId }
        } : undefined,
        fromWallet: {
          connect: { id: walletId }
        },
        toWallet: destWallet ? {
          connect: { id: destWallet.id }
        } : undefined
      }
    });

    return {
      transactionHash: transaction.hash,
      signedTransaction: signedTx
    };
  }

  /**
   * Get the next nonce for an address
   */
  private async getNonce(address: string): Promise<number> {
    const count = await this.prisma.transaction.count({
      where: {
        from: address
      }
    });

    return count; // Use transaction count as nonce
  }

  /**
   * Get current gas price (simplified)
   */
  private async getGasPrice(): Promise<bigint> {
    // In a real implementation, this would query the network
    return ethers.parseUnits('1', 'gwei');
  }

  /**
   * Get all transactions for a wallet
   */
  async getWalletTransactions(walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId }
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return this.prisma.transaction.findMany({
      where: {
        OR: [
          { fromWallet: { id: walletId } },
          { toWallet: { id: walletId } }
        ]
      },
      orderBy: { timestamp: 'desc' },
      include: {
        fromWallet: true,
        toWallet: true,
        block: true
      }
    });
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(hash: string, status: 'PENDING' | 'CONFIRMED' | 'FAILED', receipt?: Record<string, any>) {
    return this.prisma.transaction.update({
      where: { hash },
      data: {
        status,
        blockId: receipt?.blockNumber ? receipt.blockNumber.toString() : undefined,
        gasUsed: receipt?.gasUsed ? BigInt(receipt.gasUsed) : undefined,
        metadata: receipt || undefined
      }
    });
  }
}
