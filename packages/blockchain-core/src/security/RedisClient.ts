import Redis from 'ioredis';

export class RedisClient {
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      console.error('Redis client error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('Redis client connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('Redis client reconnecting...');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.isConnected = false;
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  getClient(): Redis {
    return this.client;
  }

  isRedisConnected(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }

  // Rate limiting methods
  async increment(key: string, ttl: number = 3600): Promise<number> {
    const pipeline = this.client.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttl);
    const results = await pipeline.exec();
    
    if (!results || !results[0] || results[0][1] === null) {
      throw new Error('Failed to increment counter');
    }
    
    return results[0][1] as number;
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<number>;
  async del(keys: string[]): Promise<number>;
  async del(keyOrKeys: string | string[]): Promise<number> {
    if (Array.isArray(keyOrKeys)) {
      return await this.client.del(...keyOrKeys);
    } else {
      return await this.client.del(keyOrKeys);
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  // Caching methods
  async setWithExpiration(key: string, value: string, ttl: number): Promise<void> {
    await this.client.setex(key, ttl, value);
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return await this.client.mget(...keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async info(section?: string): Promise<string> {
    if (section) {
      return await this.client.info(section);
    } else {
      return await this.client.info();
    }
  }

  async dbsize(): Promise<number> {
    return await this.client.dbsize();
  }

  async flushdb(): Promise<string> {
    return await this.client.flushdb();
  }

  // Session management methods
  async setSession(sessionId: string, data: any, ttl: number = 86400): Promise<void> {
    await this.client.setex(
      `session:${sessionId}`, 
      ttl, 
      JSON.stringify(data)
    );
  }

  async getSession(sessionId: string): Promise<any | null> {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  async extendSession(sessionId: string, ttl: number = 86400): Promise<boolean> {
    const result = await this.client.expire(`session:${sessionId}`, ttl);
    return result === 1;
  }

  // Account lockout methods
  async incrementFailedAttempts(identifier: string, ttl: number = 900): Promise<number> {
    return await this.increment(`failed_attempts:${identifier}`, ttl);
  }

  async getFailedAttempts(identifier: string): Promise<number> {
    const attempts = await this.get(`failed_attempts:${identifier}`);
    return attempts ? parseInt(attempts) : 0;
  }

  async clearFailedAttempts(identifier: string): Promise<void> {
    await this.del(`failed_attempts:${identifier}`);
  }

  async lockAccount(identifier: string, ttl: number = 1800): Promise<void> {
    await this.set(`account_locked:${identifier}`, '1', ttl);
  }

  async isAccountLocked(identifier: string): Promise<boolean> {
    return await this.exists(`account_locked:${identifier}`);
  }

  async unlockAccount(identifier: string): Promise<void> {
    await this.del(`account_locked:${identifier}`);
  }
}

// Singleton instance
export const redisClient = new RedisClient();
