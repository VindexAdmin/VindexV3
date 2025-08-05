import { PrismaClient } from '../generated/prisma';

export class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });

    console.log('✅ Database service initialized');
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public get client(): PrismaClient {
    return this.prisma;
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }

  // Connection management
  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log('✅ Database disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
    }
  }

  // Transaction wrapper
  public async transaction<T>(
    fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // Database statistics
  public async getDatabaseStats(): Promise<{
    totalUsers: number;
    totalWallets: number;
    totalTransactions: number;
    totalBlocks: number;
    totalBridgeTransactions: number;
  }> {
    try {
      const [
        totalUsers,
        totalWallets,
        totalTransactions,
        totalBlocks,
        totalBridgeTransactions
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.wallet.count(),
        this.prisma.transaction.count(),
        this.prisma.block.count(),
        this.prisma.bridgeTransaction.count()
      ]);

      return {
        totalUsers,
        totalWallets,
        totalTransactions,
        totalBlocks,
        totalBridgeTransactions
      };
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      return {
        totalUsers: 0,
        totalWallets: 0,
        totalTransactions: 0,
        totalBlocks: 0,
        totalBridgeTransactions: 0
      };
    }
  }
}
