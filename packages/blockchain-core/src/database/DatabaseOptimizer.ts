import { Pool, PoolConfig } from 'pg';

export interface DatabaseOptimizationConfig {
  connectionPool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    acquireTimeoutMillis: number;
  };
  queryOptimization: {
    statementTimeout: number;
    queryTimeout: number;
    maxRows: number;
    enablePreparedStatements: boolean;
  };
  indexing: {
    autoCreateIndexes: boolean;
    customIndexes: string[];
    analyzeFrequency: number; // hours
  };
  maintenance: {
    autoVacuum: boolean;
    vacuumFrequency: number; // hours
    reindexFrequency: number; // hours
  };
}

export class DatabaseOptimizer {
  private pool: Pool;
  private config: DatabaseOptimizationConfig;
  private metrics: {
    totalQueries: number;
    slowQueries: number;
    avgQueryTime: number;
    connectionPoolUsage: number;
  };

  constructor(connectionConfig: PoolConfig, optimizationConfig: DatabaseOptimizationConfig) {
    this.config = optimizationConfig;
    
    // Optimized connection pool configuration
    this.pool = new Pool({
      ...connectionConfig,
      min: optimizationConfig.connectionPool.min,
      max: optimizationConfig.connectionPool.max,
      idleTimeoutMillis: optimizationConfig.connectionPool.idleTimeoutMillis,
      connectionTimeoutMillis: optimizationConfig.connectionPool.connectionTimeoutMillis,
      application_name: 'vindex-blockchain-core',
      statement_timeout: optimizationConfig.queryOptimization.statementTimeout,
      query_timeout: optimizationConfig.queryOptimization.queryTimeout
    });

    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      avgQueryTime: 0,
      connectionPoolUsage: 0
    };

    this.setupMonitoring();
    this.initializeOptimizations();
  }

  // ==================== QUERY OPTIMIZATION ====================

  /**
   * Execute optimized query with performance monitoring
   */
  async executeQuery<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const startTime = Date.now();
    const client = await this.pool.connect();
    
    try {
      // Enable query planning for complex queries
      if (sql.toLowerCase().includes('join') || sql.toLowerCase().includes('subquery')) {
        await client.query('SET enable_seqscan = off');
        await client.query('SET random_page_cost = 1.1');
      }

      const result = await client.query(sql, params);
      const queryTime = Date.now() - startTime;
      
      // Update metrics
      this.updateQueryMetrics(queryTime, sql);
      
      // Log slow queries
      if (queryTime > 1000) { // Queries taking more than 1 second
        console.warn(`Slow query detected (${queryTime}ms):`, sql.substring(0, 100));
        this.metrics.slowQueries++;
      }

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Execute query with prepared statement for better performance
   */
  async executePreparedQuery<T = any>(name: string, sql: string, params?: any[]): Promise<T[]> {
    if (!this.config.queryOptimization.enablePreparedStatements) {
      return this.executeQuery(sql, params);
    }

    const startTime = Date.now();
    const client = await this.pool.connect();
    
    try {
      // Prepare statement if not exists
      try {
        await client.query(`PREPARE ${name} AS ${sql}`);
      } catch (error) {
        // Statement might already exist, which is fine
      }

      const result = await client.query(`EXECUTE ${name}${params ? `(${params.map(() => '$1').join(',')})` : ''}`, params);
      const queryTime = Date.now() - startTime;
      
      this.updateQueryMetrics(queryTime, sql);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Execute batch queries for better performance
   */
  async executeBatch(queries: { sql: string; params?: any[] }[]): Promise<any[]> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const query of queries) {
        const result = await client.query(query.sql, query.params);
        results.push(result.rows);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== INDEX MANAGEMENT ====================

  /**
   * Create optimized indexes for blockchain data
   */
  async createOptimizedIndexes(): Promise<void> {
    const indexes = [
      // Block indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocks_index ON blocks(index)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocks_hash ON blocks(hash)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocks_timestamp ON blocks(timestamp)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocks_validator ON blocks(validator)',
      
      // Transaction indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_hash ON transactions(hash)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_from ON transactions(from_address)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_to ON transactions(to_address)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_block_index ON transactions(block_index)',
      
      // Balance indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_balances_address ON balances(address)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_balances_updated ON balances(last_updated)',
      
      // Composite indexes for common queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_from_to ON transactions(from_address, to_address)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_timestamp_type ON transactions(timestamp, type)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocks_timestamp_validator ON blocks(timestamp, validator)',
      
      // Partial indexes for active data
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_transactions ON transactions(timestamp) WHERE timestamp > extract(epoch from now() - interval \'24 hours\')',
      
      // Custom indexes from config
      ...this.config.indexing.customIndexes
    ];

    for (const indexSql of indexes) {
      try {
        await this.executeQuery(indexSql);
        console.log(`Created index: ${indexSql.split('IF NOT EXISTS')[1]?.split('ON')[0]?.trim()}`);
      } catch (error) {
        console.error(`Failed to create index: ${indexSql}`, error);
      }
    }
  }

  /**
   * Analyze table statistics for query optimization
   */
  async analyzeTableStatistics(): Promise<void> {
    const tables = ['blocks', 'transactions', 'balances', 'validators', 'staking_records'];
    
    for (const table of tables) {
      try {
        await this.executeQuery(`ANALYZE ${table}`);
        console.log(`Analyzed table: ${table}`);
      } catch (error) {
        console.error(`Failed to analyze table ${table}:`, error);
      }
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsageStats(): Promise<any[]> {
    const sql = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        idx_scan,
        CASE WHEN idx_scan = 0 THEN 'UNUSED' 
             WHEN idx_scan < 10 THEN 'LOW_USAGE'
             ELSE 'ACTIVE' 
        END as usage_category
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
    `;
    
    return this.executeQuery(sql);
  }

  // ==================== MAINTENANCE OPERATIONS ====================

  /**
   * Perform database maintenance operations
   */
  async performMaintenance(): Promise<void> {
    console.log('Starting database maintenance...');
    
    if (this.config.maintenance.autoVacuum) {
      await this.performVacuum();
    }
    
    await this.analyzeTableStatistics();
    await this.updateTableStatistics();
    await this.cleanupOldData();
    
    console.log('Database maintenance completed');
  }

  /**
   * Perform vacuum operation to reclaim space
   */
  async performVacuum(): Promise<void> {
    const tables = ['blocks', 'transactions', 'balances'];
    
    for (const table of tables) {
      try {
        await this.executeQuery(`VACUUM ANALYZE ${table}`);
        console.log(`Vacuumed table: ${table}`);
      } catch (error) {
        console.error(`Failed to vacuum table ${table}:`, error);
      }
    }
  }

  /**
   * Update table statistics for better query planning
   */
  async updateTableStatistics(): Promise<void> {
    try {
      await this.executeQuery('UPDATE pg_stat_user_tables SET n_tup_ins = 0, n_tup_upd = 0, n_tup_del = 0');
      console.log('Updated table statistics');
    } catch (error) {
      console.error('Failed to update table statistics:', error);
    }
  }

  /**
   * Cleanup old data to maintain performance
   */
  async cleanupOldData(): Promise<void> {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    try {
      // Cleanup old transaction logs
      await this.executeQuery(
        'DELETE FROM transaction_logs WHERE timestamp < $1',
        [thirtyDaysAgo]
      );
      
      // Cleanup old session data
      await this.executeQuery(
        'DELETE FROM user_sessions WHERE last_activity < $1',
        [thirtyDaysAgo]
      );
      
      console.log('Cleaned up old data');
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  // ==================== MONITORING AND METRICS ====================

  /**
   * Setup performance monitoring
   */
  private setupMonitoring(): void {
    // Monitor connection pool
    this.pool.on('connect', () => {
      this.metrics.connectionPoolUsage++;
    });

    this.pool.on('error', (error: Error) => {
      console.error('Database pool error:', error);
    });

    // Regular metrics collection
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      // Get connection pool stats
      const poolStats = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };

      // Get query performance stats
      const queryStats = await this.executeQuery(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        ORDER BY total_time DESC 
        LIMIT 10
      `);

      console.log('Database Metrics:', {
        pool: poolStats,
        queries: this.metrics,
        slowQueries: queryStats.slice(0, 5)
      });
    } catch (error) {
      console.error('Failed to collect metrics:', error);
    }
  }

  /**
   * Update query performance metrics
   */
  private updateQueryMetrics(queryTime: number, sql: string): void {
    this.metrics.totalQueries++;
    this.metrics.avgQueryTime = (this.metrics.avgQueryTime + queryTime) / 2;
    
    if (queryTime > 1000) {
      this.metrics.slowQueries++;
    }
  }

  // ==================== QUERY HELPERS ====================

  /**
   * Get blockchain data with optimized queries
   */
  async getOptimizedBlockchainData(limit: number = 100): Promise<{
    blocks: any[];
    transactions: any[];
    stats: any;
  }> {
    const queries = [
      // Get recent blocks with minimal data
      {
        sql: `
          SELECT index, hash, timestamp, validator, transaction_count 
          FROM blocks 
          ORDER BY index DESC 
          LIMIT $1
        `,
        params: [limit]
      },
      // Get recent transactions
      {
        sql: `
          SELECT hash, from_address, to_address, amount, timestamp, type
          FROM transactions 
          ORDER BY timestamp DESC 
          LIMIT $1
        `,
        params: [limit]
      },
      // Get chain statistics
      {
        sql: `
          SELECT 
            COUNT(*) as total_blocks,
            MAX(index) as latest_block,
            AVG(transaction_count) as avg_transactions_per_block,
            SUM(transaction_count) as total_transactions
          FROM blocks
        `,
        params: []
      }
    ];

    const [blocks, transactions, stats] = await this.executeBatch(queries);
    
    return {
      blocks: blocks || [],
      transactions: transactions || [],
      stats: stats?.[0] || {}
    };
  }

  /**
   * Get account data with optimized query
   */
  async getOptimizedAccountData(address: string): Promise<{
    balance: number;
    transactionCount: number;
    recentTransactions: any[];
  }> {
    const queries = [
      // Get balance
      {
        sql: 'SELECT balance FROM balances WHERE address = $1',
        params: [address]
      },
      // Get transaction count
      {
        sql: 'SELECT COUNT(*) as count FROM transactions WHERE from_address = $1 OR to_address = $1',
        params: [address]
      },
      // Get recent transactions
      {
        sql: `
          SELECT hash, from_address, to_address, amount, timestamp, type
          FROM transactions 
          WHERE from_address = $1 OR to_address = $1
          ORDER BY timestamp DESC 
          LIMIT 20
        `,
        params: [address]
      }
    ];

    const [balanceResult, countResult, transactionsResult] = await this.executeBatch(queries);
    
    return {
      balance: balanceResult?.[0]?.balance || 0,
      transactionCount: countResult?.[0]?.count || 0,
      recentTransactions: transactionsResult || []
    };
  }

  /**
   * Initialize performance optimizations
   */
  private async initializeOptimizations(): Promise<void> {
    try {
      // Set optimized PostgreSQL parameters for blockchain data
      await this.executeQuery("SET shared_preload_libraries = 'pg_stat_statements'");
      await this.executeQuery('SET work_mem = \'256MB\'');
      await this.executeQuery('SET maintenance_work_mem = \'512MB\'');
      await this.executeQuery('SET effective_cache_size = \'2GB\'');
      await this.executeQuery('SET random_page_cost = 1.1');
      await this.executeQuery('SET seq_page_cost = 1.0');
      
      if (this.config.indexing.autoCreateIndexes) {
        await this.createOptimizedIndexes();
      }
      
      console.log('Database optimizations initialized');
    } catch (error) {
      console.error('Failed to initialize optimizations:', error);
    }
  }

  /**
   * Get performance recommendations
   */
  async getPerformanceRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (this.metrics.slowQueries > this.metrics.totalQueries * 0.1) {
      recommendations.push('High number of slow queries detected. Consider optimizing query patterns.');
    }
    
    if (this.metrics.avgQueryTime > 100) {
      recommendations.push('Average query time is high. Consider adding more indexes.');
    }
    
    const indexStats = await this.getIndexUsageStats();
    const unusedIndexes = indexStats.filter(stat => stat.usage_category === 'UNUSED');
    
    if (unusedIndexes.length > 0) {
      recommendations.push(`${unusedIndexes.length} unused indexes detected. Consider removing them.`);
    }
    
    return recommendations;
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Default configuration for blockchain applications
export const defaultDatabaseConfig: DatabaseOptimizationConfig = {
  connectionPool: {
    min: 5,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    acquireTimeoutMillis: 60000
  },
  queryOptimization: {
    statementTimeout: 30000,
    queryTimeout: 10000,
    maxRows: 10000,
    enablePreparedStatements: true
  },
  indexing: {
    autoCreateIndexes: true,
    customIndexes: [],
    analyzeFrequency: 6 // Every 6 hours
  },
  maintenance: {
    autoVacuum: true,
    vacuumFrequency: 24, // Every 24 hours
    reindexFrequency: 168 // Every week
  }
};

// High-performance configuration for heavy loads
export const performanceDatabaseConfig: DatabaseOptimizationConfig = {
  connectionPool: {
    min: 10,
    max: 50,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 3000,
    acquireTimeoutMillis: 30000
  },
  queryOptimization: {
    statementTimeout: 60000,
    queryTimeout: 5000,
    maxRows: 50000,
    enablePreparedStatements: true
  },
  indexing: {
    autoCreateIndexes: true,
    customIndexes: [
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_amount_range ON transactions(amount) WHERE amount > 1000',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocks_large_tx_count ON blocks(transaction_count) WHERE transaction_count > 100'
    ],
    analyzeFrequency: 2 // Every 2 hours
  },
  maintenance: {
    autoVacuum: true,
    vacuumFrequency: 12, // Every 12 hours
    reindexFrequency: 72 // Every 3 days
  }
};
