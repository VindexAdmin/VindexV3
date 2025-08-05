import { LRUCache } from 'lru-cache';

export interface MemoryCacheConfig {
  maxSize: number;          // Maximum number of items
  ttl: number;             // Time to live in milliseconds
  updateAgeOnGet: boolean; // Update age when item is accessed
  allowStale: boolean;     // Allow stale items
  maxAge?: number;         // Deprecated, use ttl
}

export interface HotDataConfig {
  blocks: {
    maxCount: number;      // Keep last N blocks in memory
    ttl: number;          // TTL for block cache
  };
  transactions: {
    maxCount: number;      // Keep last N transactions in memory
    ttl: number;          // TTL for transaction cache
  };
  balances: {
    maxCount: number;      // Keep N most accessed balances
    ttl: number;          // TTL for balance cache
  };
  stats: {
    ttl: number;          // TTL for chain statistics
  };
}

export class MemoryCache {
  private cache: LRUCache<string, any>;
  private hitCount: number = 0;
  private missCount: number = 0;
  private config: MemoryCacheConfig;

  constructor(config: MemoryCacheConfig) {
    this.config = config;
    this.cache = new LRUCache({
      max: config.maxSize,
      ttl: config.ttl,
      updateAgeOnGet: config.updateAgeOnGet,
      allowStale: config.allowStale
    });
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.hitCount++;
      return value as T;
    } else {
      this.missCount++;
      return undefined;
    }
  }

  /**
   * Set item in cache
   */
  set(key: string, value: any, ttl?: number): void {
    const options: any = {};
    if (ttl) {
      options.ttl = ttl;
    }
    this.cache.set(key, value, options);
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
      size: this.cache.size,
      maxSize: this.config.maxSize
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache info
   */
  info() {
    return {
      config: this.config,
      stats: this.getStats(),
      memoryUsage: process.memoryUsage()
    };
  }
}

/**
 * Hot Data Cache - specialized memory cache for frequently accessed blockchain data
 */
export class HotDataCache {
  private blocksCache: MemoryCache;
  private transactionsCache: MemoryCache;
  private balancesCache: MemoryCache;
  private statsCache: MemoryCache;
  private config: HotDataConfig;

  constructor(config: HotDataConfig) {
    this.config = config;

    // Initialize specialized caches
    this.blocksCache = new MemoryCache({
      maxSize: config.blocks.maxCount,
      ttl: config.blocks.ttl,
      updateAgeOnGet: true,
      allowStale: false
    });

    this.transactionsCache = new MemoryCache({
      maxSize: config.transactions.maxCount,
      ttl: config.transactions.ttl,
      updateAgeOnGet: true,
      allowStale: false
    });

    this.balancesCache = new MemoryCache({
      maxSize: config.balances.maxCount,
      ttl: config.balances.ttl,
      updateAgeOnGet: true,
      allowStale: false
    });

    this.statsCache = new MemoryCache({
      maxSize: 10, // Only a few stats objects
      ttl: config.stats.ttl,
      updateAgeOnGet: true,
      allowStale: true // Allow stale stats briefly
    });
  }

  // ==================== BLOCK OPERATIONS ====================

  /**
   * Cache a block
   */
  cacheBlock(blockIndex: number, block: any): void {
    this.blocksCache.set(`block:${blockIndex}`, block);
  }

  /**
   * Get block from cache
   */
  getBlock(blockIndex: number): any | undefined {
    return this.blocksCache.get(`block:${blockIndex}`);
  }

  /**
   * Cache multiple blocks
   */
  cacheBlocks(blocks: { index: number; data: any }[]): void {
    blocks.forEach(({ index, data }) => {
      this.cacheBlock(index, data);
    });
  }

  /**
   * Get latest cached blocks
   */
  getLatestBlocks(count: number = 10): any[] {
    const keys = this.blocksCache.keys()
      .filter(key => key.startsWith('block:'))
      .sort((a, b) => {
        const indexA = parseInt(a.split(':')[1]);
        const indexB = parseInt(b.split(':')[1]);
        return indexB - indexA; // Descending order
      })
      .slice(0, count);

    return keys.map(key => this.blocksCache.get(key)).filter(Boolean);
  }

  // ==================== TRANSACTION OPERATIONS ====================

  /**
   * Cache a transaction
   */
  cacheTransaction(txId: string, transaction: any): void {
    this.transactionsCache.set(`tx:${txId}`, transaction);
  }

  /**
   * Get transaction from cache
   */
  getTransaction(txId: string): any | undefined {
    return this.transactionsCache.get(`tx:${txId}`);
  }

  /**
   * Cache multiple transactions
   */
  cacheTransactions(transactions: { id: string; data: any }[]): void {
    transactions.forEach(({ id, data }) => {
      this.cacheTransaction(id, data);
    });
  }

  /**
   * Get recent transactions
   */
  getRecentTransactions(count: number = 20): any[] {
    const keys = this.transactionsCache.keys()
      .filter(key => key.startsWith('tx:'))
      .slice(-count); // Get last N transactions

    return keys.map(key => this.transactionsCache.get(key)).filter(Boolean);
  }

  // ==================== BALANCE OPERATIONS ====================

  /**
   * Cache account balance
   */
  cacheBalance(address: string, balance: number): void {
    this.balancesCache.set(`balance:${address}`, {
      balance,
      lastUpdated: Date.now()
    });
  }

  /**
   * Get balance from cache
   */
  getBalance(address: string): { balance: number; lastUpdated: number } | undefined {
    return this.balancesCache.get(`balance:${address}`);
  }

  /**
   * Cache multiple balances
   */
  cacheBalances(balances: Map<string, number>): void {
    balances.forEach((balance, address) => {
      this.cacheBalance(address, balance);
    });
  }

  /**
   * Invalidate balance cache for address
   */
  invalidateBalance(address: string): void {
    this.balancesCache.delete(`balance:${address}`);
  }

  // ==================== STATISTICS OPERATIONS ====================

  /**
   * Cache chain statistics
   */
  cacheChainStats(stats: any): void {
    this.statsCache.set('chain:stats', {
      ...stats,
      cachedAt: Date.now()
    });
  }

  /**
   * Get chain statistics
   */
  getChainStats(): any | undefined {
    return this.statsCache.get('chain:stats');
  }

  /**
   * Cache network statistics
   */
  cacheNetworkStats(stats: any): void {
    this.statsCache.set('network:stats', {
      ...stats,
      cachedAt: Date.now()
    });
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): any | undefined {
    return this.statsCache.get('network:stats');
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.blocksCache.clear();
    this.transactionsCache.clear();
    this.balancesCache.clear();
    this.statsCache.clear();
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats() {
    return {
      blocks: this.blocksCache.getStats(),
      transactions: this.transactionsCache.getStats(),
      balances: this.balancesCache.getStats(),
      stats: this.statsCache.getStats(),
      totalMemoryUsage: process.memoryUsage(),
      timestamp: Date.now()
    };
  }

  /**
   * Warm up cache with initial data
   */
  warmUp(initialData: {
    blocks?: any[];
    transactions?: any[];
    balances?: Map<string, number>;
    chainStats?: any;
  }): void {
    if (initialData.blocks) {
      initialData.blocks.forEach(block => {
        this.cacheBlock(block.index, block);
      });
    }

    if (initialData.transactions) {
      initialData.transactions.forEach(tx => {
        this.cacheTransaction(tx.id, tx);
      });
    }

    if (initialData.balances) {
      this.cacheBalances(initialData.balances);
    }

    if (initialData.chainStats) {
      this.cacheChainStats(initialData.chainStats);
    }

    console.log('Hot data cache warmed up successfully');
  }

  /**
   * Get cache health information
   */
  getHealthInfo() {
    const stats = this.getCacheStats();
    const memUsage = process.memoryUsage();
    
    return {
      healthy: true,
      caches: {
        blocks: {
          usage: (stats.blocks.size / this.config.blocks.maxCount) * 100,
          hitRate: stats.blocks.hitRate
        },
        transactions: {
          usage: (stats.transactions.size / this.config.transactions.maxCount) * 100,
          hitRate: stats.transactions.hitRate
        },
        balances: {
          usage: (stats.balances.size / this.config.balances.maxCount) * 100,
          hitRate: stats.balances.hitRate
        }
      },
      memory: {
        heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
        heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
        external: memUsage.external / 1024 / 1024 // MB
      }
    };
  }

  /**
   * Cleanup expired entries manually
   */
  cleanup(): void {
    // LRU cache handles this automatically, but we can force cleanup
    this.blocksCache.clear();
    this.transactionsCache.clear();
    this.balancesCache.clear();
    this.statsCache.clear();
  }
}
