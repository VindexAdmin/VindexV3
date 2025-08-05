import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { WalletService } from '../services/WalletService';
import { TransactionService } from '../services/TransactionService';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const walletService = new WalletService(prisma);
const transactionService = new TransactionService(prisma, walletService);

// Create a new wallet
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const userId = req.user!.id; // Set by auth middleware

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const wallet = await walletService.createWallet(userId, password);
    
    return res.json({
      id: wallet.id,
      address: wallet.address,
      name: wallet.name
    });
  } catch (error) {
    console.error('Error creating wallet:', error);
    return res.status(500).json({ error: 'Failed to create wallet' });
  }
});

// Get user's wallets
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const wallets = await prisma.wallet.findMany({
      where: { userId },
      select: {
        id: true,
        address: true,
        name: true,
        balance: true,
        isActive: true,
        createdAt: true
      }
    });

    return res.json(wallets);
  } catch (error) {
    console.error('Error fetching wallets:', error);
    return res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// Get specific wallet
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const wallet = await prisma.wallet.findFirst({
      where: { 
        id,
        userId 
      },
      select: {
        id: true,
        address: true,
        name: true,
        balance: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    return res.json(wallet);
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// Create transaction
router.post('/:id/transactions', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { to, amount, password } = req.body;
    const userId = req.user!.id;

    // Verify wallet ownership
    const wallet = await prisma.wallet.findFirst({
      where: { 
        id,
        userId 
      }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (!to || !amount || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transaction = await transactionService.createTransaction(
      id,
      password,
      to,
      amount
    );

    return res.json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Get wallet transactions
router.get('/:id/transactions', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify wallet ownership
    const wallet = await prisma.wallet.findFirst({
      where: { 
        id,
        userId 
      }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const transactions = await transactionService.getWalletTransactions(id);
    return res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Export router
export default router;
