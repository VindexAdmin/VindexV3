import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export class AuthService {
  static async register(email: string, password: string, firstName?: string, lastName?: string) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName
        }
      });

      // Generate JWT token
      const token = this.generateToken(user.id);

      // Create session
      await prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt
        },
        token
      };
    } catch (error) {
      throw error;
    }
  }

  static async login(email: string, password: string) {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Generate JWT token
      const token = this.generateToken(user.id);

      // Create session
      await prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt,
          lastLoginAt: new Date()
        },
        token
      };
    } catch (error) {
      throw error;
    }
  }

  static async logout(token: string) {
    try {
      await prisma.userSession.updateMany({
        where: { token },
        data: { isActive: false }
      });
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  static async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      
      // Check if session exists and is active
      const session = await prisma.userSession.findFirst({
        where: {
          token,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true
            }
          }
        }
      });

      if (!session) {
        throw new Error('Invalid or expired token');
      }

      if (!session.user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Update last used
      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() }
      });

      return session.user;
    } catch (error) {
      throw error;
    }
  }

  static generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
  }

  static async createWallet(userId: string, name?: string) {
    try {
      // Generate new keypair
      const privateKey = crypto.randomBytes(32).toString('hex');
      const publicKey = crypto.createHash('sha256').update(privateKey).digest('hex');
      const address = 'VDX' + crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 40);

      // Encrypt private key
      const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
      const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
      let encryptedPrivateKey = cipher.update(privateKey, 'utf8', 'hex');
      encryptedPrivateKey += cipher.final('hex');

      // Create wallet
      const wallet = await prisma.wallet.create({
        data: {
          userId,
          address,
          publicKey,
          encryptedPrivateKey,
          name: name || 'Main Wallet'
        }
      });

      return {
        id: wallet.id,
        address: wallet.address,
        name: wallet.name,
        balance: wallet.balance,
        createdAt: wallet.createdAt
      };
    } catch (error) {
      console.error('Create wallet error:', error);
      throw error;
    }
  }

  static async getUserWallets(userId: string) {
    try {
      const wallets = await prisma.wallet.findMany({
        where: {
          userId,
          isActive: true
        },
        select: {
          id: true,
          address: true,
          name: true,
          balance: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return wallets;
    } catch (error) {
      throw error;
    }
  }
}

export default AuthService;
