// Imports
import { RedisClient } from '../security/RedisClient';

// Core Cache Components
export { BlockchainCache, CacheConfig, CacheStats } from './BlockchainCache';
export { 
  MemoryCache, 
  HotDataCache, 
  MemoryCacheConfig, 
  HotDataConfig 
} from './MemoryCache';
export { 
  HybridCache, 
  HybridCacheConfig, 
  CacheMiddlewareOptions,
  createCacheMiddleware,
  createCacheWarmingMiddleware
} from './HybridCache';

// Import types for use in this file
import { 
  MemoryCacheConfig, 
  HotDataConfig 
} from './MemoryCache';
import { 
  HybridCache, 
  HybridCacheConfig 
} from './HybridCache';

// Cache Strategy Types
export type CacheStrategy = 'memory-first' | 'redis-first' | 'parallel';
export type CacheType = 'block' | 'transaction' | 'balance' | 'stats';

// Default Configurations
export const defaultMemoryCacheConfig: MemoryCacheConfig = {
  maxSize: 1000,
  ttl: 5 * 60 * 1000, // 5 minutes
  updateAgeOnGet: true,
  allowStale: false
};

export const defaultHotDataConfig: HotDataConfig = {
  blocks: {
    maxCount: 100,       // Keep last 100 blocks
    ttl: 10 * 60 * 1000  // 10 minutes
  },
  transactions: {
    maxCount: 500,       // Keep last 500 transactions
    ttl: 5 * 60 * 1000   // 5 minutes
  },
  balances: {
    maxCount: 1000,      // Keep 1000 most accessed balances
    ttl: 1 * 60 * 1000   // 1 minute
  },
  stats: {
    ttl: 30 * 1000       // 30 seconds
  }
};

// Performance-optimized configurations
export const performanceHotDataConfig: HotDataConfig = {
  blocks: {
    maxCount: 500,       // More blocks for heavy read workloads
    ttl: 30 * 60 * 1000  // 30 minutes
  },
  transactions: {
    maxCount: 2000,      // More transactions
    ttl: 15 * 60 * 1000  // 15 minutes
  },
  balances: {
    maxCount: 5000,      // More balances for active trading
    ttl: 30 * 1000       // 30 seconds for real-time updates
  },
  stats: {
    ttl: 10 * 1000       // 10 seconds for live dashboards
  }
};

// Memory-constrained configurations
export const lightweightHotDataConfig: HotDataConfig = {
  blocks: {
    maxCount: 50,        // Fewer blocks
    ttl: 5 * 60 * 1000   // 5 minutes
  },
  transactions: {
    maxCount: 200,       // Fewer transactions
    ttl: 2 * 60 * 1000   // 2 minutes
  },
  balances: {
    maxCount: 500,       // Fewer balances
    ttl: 2 * 60 * 1000   // 2 minutes
  },
  stats: {
    ttl: 1 * 60 * 1000   // 1 minute
  }
};

// Cache Factory Functions

/**
 * Create a hybrid cache instance with default settings
 */
export function createDefaultHybridCache(redisClient: RedisClient, strategy: CacheStrategy = 'memory-first'): HybridCache {
  const config: HybridCacheConfig = {
    redis: {
      enabled: true,
      client: redisClient
    },
    memory: {
      enabled: true,
      config: defaultHotDataConfig
    },
    strategy,
    compressionThreshold: 1024 // 1KB
  };

  return new HybridCache(config);
}

/**
 * Create a performance-optimized hybrid cache
 */
export function createPerformanceHybridCache(redisClient: RedisClient, strategy: CacheStrategy = 'parallel'): HybridCache {
  const config: HybridCacheConfig = {
    redis: {
      enabled: true,
      client: redisClient
    },
    memory: {
      enabled: true,
      config: performanceHotDataConfig
    },
    strategy,
    compressionThreshold: 512 // 512 bytes
  };

  return new HybridCache(config);
}

/**
 * Create a lightweight hybrid cache for resource-constrained environments
 */
export function createLightweightHybridCache(redisClient: RedisClient, strategy: CacheStrategy = 'redis-first'): HybridCache {
  const config: HybridCacheConfig = {
    redis: {
      enabled: true,
      client: redisClient
    },
    memory: {
      enabled: true,
      config: lightweightHotDataConfig
    },
    strategy,
    compressionThreshold: 2048 // 2KB
  };

  return new HybridCache(config);
}

/**
 * Create a Redis-only cache (no memory caching)
 */
export function createRedisOnlyCache(redisClient: RedisClient): HybridCache {
  const config: HybridCacheConfig = {
    redis: {
      enabled: true,
      client: redisClient
    },
    memory: {
      enabled: false,
      config: defaultHotDataConfig // Unused but required
    },
    strategy: 'redis-first',
    compressionThreshold: 1024
  };

  return new HybridCache(config);
}

/**
 * Create a memory-only cache (no Redis)
 */
export function createMemoryOnlyCache(): HybridCache {
  const config: HybridCacheConfig = {
    redis: {
      enabled: false,
      client: {} as RedisClient // Unused but required
    },
    memory: {
      enabled: true,
      config: defaultHotDataConfig
    },
    strategy: 'memory-first',
    compressionThreshold: 1024
  };

  return new HybridCache(config);
}

// Cache Monitoring Utilities
export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  redisConnections: number;
  avgResponseTime: number;
  errorRate: number;
}

export class CacheMonitor {
  private metrics: CacheMetrics;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      hitRate: 0,
      missRate: 0,
      memoryUsage: 0,
      redisConnections: 0,
      avgResponseTime: 0,
      errorRate: 0
    };
  }

  /**
   * Update cache metrics
   */
  updateMetrics(cache: HybridCache): Promise<void> {
    return cache.getStats().then(stats => {
      if (stats.memory) {
        this.metrics.hitRate = stats.memory.blocks.hitRate;
        this.metrics.memoryUsage = stats.memory.totalMemoryUsage.heapUsed;
      }
      
      if (stats.redis) {
        this.metrics.redisConnections = 1; // Simplified
      }
    });
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    uptime: number;
    metrics: CacheMetrics;
    recommendations: string[];
  } {
    const uptime = Date.now() - this.startTime;
    const recommendations: string[] = [];

    if (this.metrics.hitRate < 80) {
      recommendations.push('Consider increasing cache TTL or size');
    }

    if (this.metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('Memory usage is high, consider reducing cache size');
    }

    if (this.metrics.avgResponseTime > 50) {
      recommendations.push('Response time is high, check Redis connection');
    }

    return {
      uptime,
      metrics: this.metrics,
      recommendations
    };
  }
}
