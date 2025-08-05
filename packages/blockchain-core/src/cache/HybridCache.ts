import { Request, Response, NextFunction } from 'express';
import { BlockchainCache } from './BlockchainCache';
import { HotDataCache, HotDataConfig } from './MemoryCache';
import { RedisClient } from '../security/RedisClient';

export interface HybridCacheConfig {
  redis: {
    enabled: boolean;
    client: RedisClient;
  };
  memory: {
    enabled: boolean;
    config: HotDataConfig;
  };
  strategy: 'memory-first' | 'redis-first' | 'parallel';
  compressionThreshold: number; // Compress data larger than this size
}

export interface CacheMiddlewareOptions {
  ttl?: number;
  key?: string | ((req: Request) => string);
  skipCache?: (req: Request) => boolean;
  onHit?: (key: string, data: any) => void;
  onMiss?: (key: string) => void;
}

export class HybridCache {
  private redisCache?: BlockchainCache;
  private memoryCache?: HotDataCache;
  private config: HybridCacheConfig;

  constructor(config: HybridCacheConfig) {
    this.config = config;
    
    if (config.redis.enabled) {
      this.redisCache = new BlockchainCache(config.redis.client);
    }
    
    if (config.memory.enabled) {
      this.memoryCache = new HotDataCache(config.memory.config);
    }
  }

  // ==================== UNIFIED CACHE INTERFACE ====================

  /**
   * Get data from cache using hybrid strategy
   */
  async get<T>(key: string, type: 'block' | 'transaction' | 'balance' | 'stats'): Promise<T | null> {
    switch (this.config.strategy) {
      case 'memory-first':
        return await this.getMemoryFirst<T>(key, type);
      case 'redis-first':
        return await this.getRedisFirst<T>(key, type);
      case 'parallel':
        return await this.getParallel<T>(key, type);
      default:
        return await this.getMemoryFirst<T>(key, type);
    }
  }

  /**
   * Set data in cache using hybrid strategy
   */
  async set(key: string, data: any, type: 'block' | 'transaction' | 'balance' | 'stats', ttl?: number): Promise<void> {
    const promises: Promise<void>[] = [];

    // Set in memory cache if enabled
    if (this.config.memory.enabled) {
      promises.push(this.setInMemory(key, data, type));
    }

    // Set in Redis cache if enabled
    if (this.config.redis.enabled) {
      promises.push(this.setInRedis(key, data, type, ttl));
    }

    await Promise.all(promises);
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key: string, type: 'block' | 'transaction' | 'balance' | 'stats'): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.config.memory.enabled) {
      promises.push(this.invalidateMemory(key, type));
    }

    if (this.config.redis.enabled) {
      promises.push(this.invalidateRedis(key, type));
    }

    await Promise.all(promises);
  }

  // ==================== STRATEGY IMPLEMENTATIONS ====================

  /**
   * Memory-first strategy: Check memory first, fallback to Redis
   */
  private async getMemoryFirst<T>(key: string, type: 'block' | 'transaction' | 'balance' | 'stats'): Promise<T | null> {
    // Try memory cache first
    if (this.config.memory.enabled) {
      const memoryResult = this.getFromMemory<T>(key, type);
      if (memoryResult !== undefined) {
        return memoryResult;
      }
    }

    // Fallback to Redis
    if (this.config.redis.enabled) {
      const redisResult = await this.getFromRedis<T>(key, type);
      if (redisResult !== null) {
        // Populate memory cache for next time
        if (this.config.memory.enabled) {
          await this.setInMemory(key, redisResult, type);
        }
        return redisResult;
      }
    }

    return null;
  }

  /**
   * Redis-first strategy: Check Redis first, update memory cache
   */
  private async getRedisFirst<T>(key: string, type: 'block' | 'transaction' | 'balance' | 'stats'): Promise<T | null> {
    // Try Redis first
    if (this.config.redis.enabled) {
      const redisResult = await this.getFromRedis<T>(key, type);
      if (redisResult !== null) {
        // Update memory cache
        if (this.config.memory.enabled) {
          await this.setInMemory(key, redisResult, type);
        }
        return redisResult;
      }
    }

    // Fallback to memory
    if (this.config.memory.enabled) {
      const memoryResult = this.getFromMemory<T>(key, type);
      if (memoryResult !== undefined) {
        return memoryResult;
      }
    }

    return null;
  }

  /**
   * Parallel strategy: Check both simultaneously, prefer memory
   */
  private async getParallel<T>(key: string, type: 'block' | 'transaction' | 'balance' | 'stats'): Promise<T | null> {
    const promises: Promise<T | null | undefined>[] = [];

    if (this.config.memory.enabled) {
      promises.push(Promise.resolve(this.getFromMemory<T>(key, type)));
    }

    if (this.config.redis.enabled) {
      promises.push(this.getFromRedis<T>(key, type));
    }

    const results = await Promise.all(promises);
    
    // Return first non-null result, preferring memory
    for (const result of results) {
      if (result !== null && result !== undefined) {
        return result;
      }
    }

    return null;
  }

  // ==================== CACHE-SPECIFIC OPERATIONS ====================

  private getFromMemory<T>(key: string, type: 'block' | 'transaction' | 'balance' | 'stats'): T | undefined {
    if (!this.memoryCache) return undefined;
    
    switch (type) {
      case 'block':
        const blockIndex = this.extractBlockIndex(key);
        return blockIndex !== null ? this.memoryCache.getBlock(blockIndex) : undefined;
      case 'transaction':
        const txId = this.extractTransactionId(key);
        return txId ? this.memoryCache.getTransaction(txId) : undefined;
      case 'balance':
        const address = this.extractAddress(key);
        const balanceData = address ? this.memoryCache.getBalance(address) : undefined;
        return balanceData ? balanceData.balance as T : undefined;
      case 'stats':
        return key.includes('chain') ? this.memoryCache.getChainStats() : this.memoryCache.getNetworkStats();
      default:
        return undefined;
    }
  }

  private async getFromRedis<T>(key: string, type: 'block' | 'transaction' | 'balance' | 'stats'): Promise<T | null> {
    if (!this.redisCache) return null;
    
    switch (type) {
      case 'block':
        const blockIndex = this.extractBlockIndex(key);
        if (blockIndex !== null) {
          return await this.redisCache.getBlockByIndex(blockIndex) as T;
        }
        const blockHash = this.extractBlockHash(key);
        if (blockHash) {
          return await this.redisCache.getBlockByHash(blockHash) as T;
        }
        return null;
      case 'transaction':
        const txId = this.extractTransactionId(key);
        return txId ? await this.redisCache.getTransaction(txId) as T : null;
      case 'balance':
        const address = this.extractAddress(key);
        return address ? await this.redisCache.getBalance(address) as T : null;
      case 'stats':
        return await this.redisCache.getChainStats() as T;
      default:
        return null;
    }
  }

  private async setInMemory(key: string, data: any, type: 'block' | 'transaction' | 'balance' | 'stats'): Promise<void> {
    if (!this.memoryCache) return;
    
    switch (type) {
      case 'block':
        if (data.index !== undefined) {
          this.memoryCache.cacheBlock(data.index, data);
        }
        break;
      case 'transaction':
        if (data.id) {
          this.memoryCache.cacheTransaction(data.id, data);
        }
        break;
      case 'balance':
        const address = this.extractAddress(key);
        if (address && typeof data === 'number') {
          this.memoryCache.cacheBalance(address, data);
        }
        break;
      case 'stats':
        if (key.includes('chain')) {
          this.memoryCache.cacheChainStats(data);
        } else {
          this.memoryCache.cacheNetworkStats(data);
        }
        break;
    }
  }

  private async setInRedis(key: string, data: any, type: 'block' | 'transaction' | 'balance' | 'stats', ttl?: number): Promise<void> {
    if (!this.redisCache) return;
    
    switch (type) {
      case 'block':
        await this.redisCache.cacheBlock(data);
        break;
      case 'transaction':
        await this.redisCache.cacheTransaction(data);
        break;
      case 'balance':
        const address = this.extractAddress(key);
        if (address && typeof data === 'number') {
          await this.redisCache.cacheBalance(address, data);
        }
        break;
      case 'stats':
        await this.redisCache.cacheChainStats(data);
        break;
    }
  }

  private async invalidateMemory(key: string, type: 'block' | 'transaction' | 'balance' | 'stats'): Promise<void> {
    if (!this.memoryCache) return;
    
    switch (type) {
      case 'balance':
        const address = this.extractAddress(key);
        if (address) {
          this.memoryCache.invalidateBalance(address);
        }
        break;
      // For other types, we'd need more specific invalidation logic
    }
  }

  private async invalidateRedis(key: string, type: 'block' | 'transaction' | 'balance' | 'stats'): Promise<void> {
    if (!this.redisCache) return;
    await this.redisCache.invalidatePattern(key);
  }

  // ==================== UTILITY METHODS ====================

  private extractBlockIndex(key: string): number | null {
    const match = key.match(/block:index:(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  private extractBlockHash(key: string): string | null {
    const match = key.match(/block:hash:([a-fA-F0-9]+)/);
    return match ? match[1] : null;
  }

  private extractTransactionId(key: string): string | null {
    const match = key.match(/tx:(.+)/);
    return match ? match[1] : null;
  }

  private extractAddress(key: string): string | null {
    const match = key.match(/balance:(.+)/);
    return match ? match[1] : null;
  }

  /**
   * Get comprehensive cache statistics
   */
  async getStats() {
    const stats: any = {
      strategy: this.config.strategy,
      timestamp: Date.now()
    };

    if (this.config.memory.enabled && this.memoryCache) {
      stats.memory = this.memoryCache.getCacheStats();
    }

    if (this.config.redis.enabled && this.redisCache) {
      stats.redis = await this.redisCache.getCacheStats();
    }

    return stats;
  }

  /**
   * Warm up both caches
   */
  async warmUp(blockchain: any): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.config.redis.enabled && this.redisCache) {
      promises.push(this.redisCache.warmUpCache(blockchain));
    }

    if (this.config.memory.enabled && this.memoryCache) {
      const recentBlocks = blockchain.chain.slice(-20); // Last 20 blocks
      const recentTxs = blockchain.pendingTransactions.slice(-50); // Last 50 pending txs
      
      promises.push(Promise.resolve(this.memoryCache.warmUp({
        blocks: recentBlocks,
        transactions: recentTxs
      })));
    }

    await Promise.all(promises);
    console.log('Hybrid cache warm-up completed');
  }
}

// ==================== EXPRESS MIDDLEWARE ====================

/**
 * Create cache middleware for Express routes
 */
export function createCacheMiddleware(hybridCache: HybridCache, options: CacheMiddlewareOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip cache if specified
    if (options.skipCache && options.skipCache(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = options.key 
      ? (typeof options.key === 'function' ? options.key(req) : options.key)
      : `${req.method}:${req.path}:${JSON.stringify(req.query)}`;

    try {
      // Determine cache type based on route
      const cacheType = determineCacheType(req.path);
      
      // Try to get from cache
      const cachedData = await hybridCache.get(cacheKey, cacheType);
      
      if (cachedData) {
        if (options.onHit) {
          options.onHit(cacheKey, cachedData);
        }
        
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      if (options.onMiss) {
        options.onMiss(cacheKey);
      }

      // Cache miss - continue to route handler
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data: any) {
        // Cache the response
        hybridCache.set(cacheKey, data, cacheType, options.ttl).catch(err => {
          console.error('Failed to cache response:', err);
        });
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next(); // Continue without caching on error
    }
  };
}

/**
 * Determine cache type based on request path
 */
function determineCacheType(path: string): 'block' | 'transaction' | 'balance' | 'stats' {
  if (path.includes('/block')) return 'block';
  if (path.includes('/transaction') || path.includes('/tx')) return 'transaction';
  if (path.includes('/balance') || path.includes('/wallet')) return 'balance';
  return 'stats';
}

/**
 * Cache warming middleware - preloads cache with essential data
 */
export function createCacheWarmingMiddleware(hybridCache: HybridCache) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only warm cache on specific routes or conditions
    if (req.path === '/api/warmup' && req.method === 'POST') {
      try {
        const { blockchain } = req.body;
        await hybridCache.warmUp(blockchain);
        res.json({ success: true, message: 'Cache warmed up successfully' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Failed to warm up cache', details: errorMessage });
      }
    } else {
      next();
    }
  };
}
