import { RedisClient } from '../security/RedisClient';
import { Block } from '../core/Block';
import { Transaction } from '../core/Transaction';

export interface CacheConfig {
  ttl: {
    block: number;          // Block cache TTL in seconds
    transaction: number;    // Transaction cache TTL in seconds
    balance: number;        // Balance cache TTL in seconds
    chainStats: number;     // Chain statistics TTL in seconds
    pendingTx: number;      // Pending transactions TTL in seconds
  };
  keyPrefix: string;
  compression: boolean;     // Enable compression for large objects
  maxMemory: string;       // Redis max memory setting
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  keyCount: number;
}

export class BlockchainCache {
  private redis: RedisClient;
  private config: CacheConfig;
  private stats: CacheStats;

  constructor(redis: RedisClient, config?: Partial<CacheConfig>) {
    this.redis = redis;
    this.config = {
      ttl: {
        block: 3600,      // 1 hour - blocks are immutable
        transaction: 3600, // 1 hour - transactions are immutable
        balance: 60,       // 1 minute - balances change frequently
        chainStats: 30,    // 30 seconds - stats change often
        pendingTx: 10      // 10 seconds - pending txs change rapidly
      },
      keyPrefix: 'vindex:cache:',
      compression: true,
      maxMemory: '2gb',
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      memoryUsage: 0,
      keyCount: 0
    };
  }

  // ==================== BLOCK CACHING ====================

  /**
   * Cache a block by index and hash
   */
  async cacheBlock(block: Block): Promise<void> {
    const blockData = this.serializeBlock(block);
    
    await Promise.all([
      // Cache by index
      this.redis.setWithExpiration(
        this.getBlockKey('index', block.index.toString()),
        blockData,
        this.config.ttl.block
      ),
      // Cache by hash
      this.redis.setWithExpiration(
        this.getBlockKey('hash', block.hash),
        blockData,
        this.config.ttl.block
      )
    ]);
  }

  /**
   * Get block by index from cache
   */
  async getBlockByIndex(index: number): Promise<Block | null> {
    const key = this.getBlockKey('index', index.toString());
    const data = await this.redis.get(key);
    
    if (data) {
      this.recordHit();
      return this.deserializeBlock(data);
    }
    
    this.recordMiss();
    return null;
  }

  /**
   * Get block by hash from cache
   */
  async getBlockByHash(hash: string): Promise<Block | null> {
    const key = this.getBlockKey('hash', hash);
    const data = await this.redis.get(key);
    
    if (data) {
      this.recordHit();
      return this.deserializeBlock(data);
    }
    
    this.recordMiss();
    return null;
  }

  /**
   * Cache multiple blocks for range queries
   */
  async cacheBlockRange(blocks: Block[]): Promise<void> {
    const operations = blocks.flatMap(block => {
      const blockData = this.serializeBlock(block);
      return [
        this.redis.setWithExpiration(
          this.getBlockKey('index', block.index.toString()),
          blockData,
          this.config.ttl.block
        ),
        this.redis.setWithExpiration(
          this.getBlockKey('hash', block.hash),
          blockData,
          this.config.ttl.block
        )
      ];
    });

    await Promise.all(operations);
  }

  /**
   * Get block range from cache
   */
  async getBlockRange(startIndex: number, endIndex: number): Promise<Block[]> {
    const keys = [];
    for (let i = startIndex; i <= endIndex; i++) {
      keys.push(this.getBlockKey('index', i.toString()));
    }

    const results = await this.redis.mget(keys);
    const blocks: Block[] = [];

    for (let i = 0; i < results.length; i++) {
      if (results[i] !== null) {
        this.recordHit();
        blocks.push(this.deserializeBlock(results[i]!));
      } else {
        this.recordMiss();
      }
    }

    return blocks;
  }

  // ==================== TRANSACTION CACHING ====================

  /**
   * Cache a transaction
   */
  async cacheTransaction(transaction: Transaction): Promise<void> {
    const txData = this.serializeTransaction(transaction);
    const key = this.getTransactionKey(transaction.id);
    
    await this.redis.setWithExpiration(
      key,
      txData,
      this.config.ttl.transaction
    );
  }

  /**
   * Get transaction from cache
   */
  async getTransaction(id: string): Promise<Transaction | null> {
    const key = this.getTransactionKey(id);
    const data = await this.redis.get(key);
    
    if (data) {
      this.recordHit();
      return this.deserializeTransaction(data);
    }
    
    this.recordMiss();
    return null;
  }

  /**
   * Cache multiple transactions
   */
  async cacheTransactions(transactions: Transaction[]): Promise<void> {
    const operations = transactions.map(tx => 
      this.redis.setWithExpiration(
        this.getTransactionKey(tx.id),
        this.serializeTransaction(tx),
        this.config.ttl.transaction
      )
    );

    await Promise.all(operations);
  }

  /**
   * Get multiple transactions from cache
   */
  async getTransactions(ids: string[]): Promise<(Transaction | null)[]> {
    const keys = ids.map(id => this.getTransactionKey(id));
    const results = await this.redis.mget(keys);

    return results.map((result: string | null, index: number) => {
      if (result) {
        this.recordHit();
        return this.deserializeTransaction(result);
      } else {
        this.recordMiss();
        return null;
      }
    });
  }

  // ==================== BALANCE CACHING ====================

  /**
   * Cache account balance
   */
  async cacheBalance(address: string, balance: number): Promise<void> {
    const key = this.getBalanceKey(address);
    await this.redis.setWithExpiration(
      key,
      balance.toString(),
      this.config.ttl.balance
    );
  }

  /**
   * Get account balance from cache
   */
  async getBalance(address: string): Promise<number | null> {
    const key = this.getBalanceKey(address);
    const data = await this.redis.get(key);
    
    if (data !== null) {
      this.recordHit();
      return parseFloat(data);
    }
    
    this.recordMiss();
    return null;
  }

  /**
   * Cache multiple balances
   */
  async cacheBalances(balances: Map<string, number>): Promise<void> {
    const operations = Array.from(balances.entries()).map(([address, balance]) =>
      this.redis.setWithExpiration(
        this.getBalanceKey(address),
        balance.toString(),
        this.config.ttl.balance
      )
    );

    await Promise.all(operations);
  }

  /**
   * Get multiple balances from cache
   */
  async getBalances(addresses: string[]): Promise<Map<string, number | null>> {
    const keys = addresses.map(addr => this.getBalanceKey(addr));
    const results = await this.redis.mget(keys);
    
    const balanceMap = new Map<string, number | null>();
    
    addresses.forEach((address, index) => {
      if (results[index] !== null) {
        this.recordHit();
        balanceMap.set(address, parseFloat(results[index]));
      } else {
        this.recordMiss();
        balanceMap.set(address, null);
      }
    });

    return balanceMap;
  }

  // ==================== CHAIN STATISTICS CACHING ====================

  /**
   * Cache chain statistics
   */
  async cacheChainStats(stats: any): Promise<void> {
    const key = this.getChainStatsKey();
    await this.redis.setWithExpiration(
      key,
      JSON.stringify(stats),
      this.config.ttl.chainStats
    );
  }

  /**
   * Get chain statistics from cache
   */
  async getChainStats(): Promise<any | null> {
    const key = this.getChainStatsKey();
    const data = await this.redis.get(key);
    
    if (data) {
      this.recordHit();
      return JSON.parse(data);
    }
    
    this.recordMiss();
    return null;
  }

  // ==================== PENDING TRANSACTIONS CACHING ====================

  /**
   * Cache pending transactions
   */
  async cachePendingTransactions(transactions: Transaction[]): Promise<void> {
    const key = this.getPendingTxKey();
    const data = JSON.stringify(transactions.map(tx => this.serializeTransaction(tx)));
    
    await this.redis.setWithExpiration(
      key,
      data,
      this.config.ttl.pendingTx
    );
  }

  /**
   * Get pending transactions from cache
   */
  async getPendingTransactions(): Promise<Transaction[] | null> {
    const key = this.getPendingTxKey();
    const data = await this.redis.get(key);
    
    if (data) {
      this.recordHit();
      const txData = JSON.parse(data);
      return txData.map((tx: any) => this.deserializeTransaction(tx));
    }
    
    this.recordMiss();
    return null;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Invalidate cache for specific patterns
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(`${this.config.keyPrefix}${pattern}`);
    if (keys.length > 0) {
      return await this.redis.del(keys);
    }
    return 0;
  }

  /**
   * Clear all blockchain cache
   */
  async clearCache(): Promise<void> {
    await this.invalidatePattern('*');
    this.resetStats();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    const info = await this.redis.info('memory');
    const keyCount = await this.redis.dbsize();
    
    // Parse memory usage from Redis info
    const memoryMatch = info.match(/used_memory:(\d+)/);
    const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

    this.stats.memoryUsage = memoryUsage;
    this.stats.keyCount = keyCount;
    this.stats.hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0;

    return { ...this.stats };
  }

  /**
   * Warm up cache with recent blockchain data
   */
  async warmUpCache(blockchain: any): Promise<void> {
    console.log('Starting cache warm-up...');
    
    // Cache recent blocks (last 100)
    const chainLength = blockchain.chain.length;
    const startIndex = Math.max(0, chainLength - 100);
    
    for (let i = startIndex; i < chainLength; i++) {
      await this.cacheBlock(blockchain.chain[i]);
    }

    // Cache pending transactions
    if (blockchain.pendingTransactions.length > 0) {
      await this.cachePendingTransactions(blockchain.pendingTransactions);
    }

    console.log(`Cache warm-up completed. Cached ${chainLength - startIndex} blocks.`);
  }

  // ==================== PRIVATE METHODS ====================

  private getBlockKey(type: 'index' | 'hash', value: string): string {
    return `${this.config.keyPrefix}block:${type}:${value}`;
  }

  private getTransactionKey(id: string): string {
    return `${this.config.keyPrefix}tx:${id}`;
  }

  private getBalanceKey(address: string): string {
    return `${this.config.keyPrefix}balance:${address}`;
  }

  private getChainStatsKey(): string {
    return `${this.config.keyPrefix}stats:chain`;
  }

  private getPendingTxKey(): string {
    return `${this.config.keyPrefix}pending:transactions`;
  }

  private serializeBlock(block: Block): string {
    return JSON.stringify({
      index: block.index,
      timestamp: block.timestamp,
      transactions: block.transactions,
      previousHash: block.previousHash,
      hash: block.hash,
      nonce: block.nonce,
      validator: block.validator,
      signature: block.signature,
      merkleRoot: block.merkleRoot,
      stateRoot: block.stateRoot,
      transactionCount: block.transactionCount,
      totalFees: block.totalFees,
      reward: block.reward
    });
  }

  private deserializeBlock(data: string): Block {
    const blockData = JSON.parse(data);
    const block = new Block(
      blockData.index,
      blockData.transactions,
      blockData.previousHash,
      blockData.validator
    );
    block.hash = blockData.hash;
    block.nonce = blockData.nonce;
    block.signature = blockData.signature;
    block.timestamp = blockData.timestamp;
    return block;
  }

  private serializeTransaction(tx: Transaction): string {
    return JSON.stringify({
      id: tx.id,
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      fee: tx.fee,
      type: tx.type,
      data: tx.data,
      timestamp: tx.timestamp,
      signature: tx.signature
    });
  }

  private deserializeTransaction(data: string): Transaction {
    const txData = JSON.parse(data);
    const tx = new Transaction(
      txData.from,
      txData.to,
      txData.amount,
      txData.type,
      txData.data
    );
    tx.id = txData.id;
    tx.fee = txData.fee;
    tx.timestamp = txData.timestamp;
    tx.signature = txData.signature;
    return tx;
  }

  private recordHit(): void {
    this.stats.hits++;
  }

  private recordMiss(): void {
    this.stats.misses++;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      memoryUsage: 0,
      keyCount: 0
    };
  }
}
