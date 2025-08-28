# 🛠️ Vindex Bridge Developer Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Authentication](#authentication)
4. [Basic Usage](#basic-usage)
5. [Advanced Features](#advanced-features)
6. [Error Handling](#error-handling)
7. [Testing](#testing)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

Get started with the Vindex Bridge API in under 5 minutes:

```typescript
import { VindexBridgeAPIClient } from '@vindex/bridge-api-client';

// Initialize client
const bridge = new VindexBridgeAPIClient({
  baseURL: 'https://bridge.vindexchain.com/api/v1',
  apiKey: 'your-api-key'
});

// Create a bridge transaction
const transaction = await bridge.createTransaction({
  fromNetwork: 'VDX',
  toNetwork: 'SOL',
  fromAmount: 100.0,
  toAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
});

// Monitor transaction
const unsubscribe = await bridge.subscribeToTransaction(
  transaction.id, 
  (tx) => console.log('Status:', tx.status)
);
```

---

## Installation

### NPM Package (Recommended)
```bash
npm install @vindex/bridge-api-client
```

### Direct Import
```typescript
import { VindexBridgeAPIClient } from '../lib/bridge-api-client';
```

### CDN (Browser)
```html
<script src="https://unpkg.com/@vindex/bridge-api-client@latest/dist/index.js"></script>
```

---

## Authentication

### Wallet Signature Authentication
```typescript
import { VindexBridgeAPIClient } from '@vindex/bridge-api-client';

const bridge = new VindexBridgeAPIClient();

// Set wallet authentication
bridge.setAuth(
  'your_wallet_address',
  'signed_message_signature',
  1337 // chain ID (optional)
);
```

### API Key Authentication
```typescript
const bridge = new VindexBridgeAPIClient({
  apiKey: 'your-api-key',
  baseURL: 'https://bridge.vindexchain.com/api/v1'
});
```

---

## Basic Usage

### 1. Creating Bridge Transactions

```typescript
import { VindexBridgeAPIClient, CreateBridgeRequest } from '@vindex/bridge-api-client';

const bridge = new VindexBridgeAPIClient();

const request: CreateBridgeRequest = {
  fromNetwork: 'VDX',
  toNetwork: 'SOL',
  fromAmount: 100.0,
  toAddress: 'destination_wallet_address',
  slippage: 1.0,
  priority: 'normal'
};

try {
  const transaction = await bridge.createTransaction(request);
  console.log('✅ Transaction created:', transaction.id);
} catch (error) {
  console.error('❌ Transaction failed:', error.message);
}
```

### 2. Checking Transaction Status

```typescript
// Single transaction
const status = await bridge.getTransactionStatus('bridge_12345678');
console.log('Status:', status.status);

// Bulk status check
const transactions = await bridge.getBulkTransactionStatus([
  'bridge_12345678',
  'bridge_87654321'
]);
```

### 3. Validating Transactions

```typescript
const validation = await bridge.validateTransaction({
  fromNetwork: 'VDX',
  toNetwork: 'SOL',
  fromAmount: 100.0,
  userAddress: 'user_wallet_address'
});

if (!validation.isValid) {
  console.log('❌ Validation errors:', validation.errors);
} else {
  console.log('✅ Transaction valid');
  console.log('Exchange rate:', validation.exchangeRate);
  console.log('Total fee:', validation.totalFee);
}
```

### 4. Getting Network Information

```typescript
const networks = await bridge.getSupportedNetworks();

networks.forEach(network => {
  console.log(`${network.name} (${network.symbol})`);
  console.log(`Status: ${network.status}`);
  console.log(`Fee: ${network.fee}%`);
  console.log(`Range: ${network.minAmount} - ${network.maxAmount}`);
});
```

---

## Advanced Features

### 1. Transaction Monitoring with Retry Logic

```typescript
class BridgeTransactionManager {
  private bridge: VindexBridgeAPIClient;
  
  constructor() {
    this.bridge = new VindexBridgeAPIClient();
  }
  
  async createAndMonitorTransaction(request: CreateBridgeRequest): Promise<BridgeTransaction> {
    try {
      // Create transaction
      const transaction = await this.bridge.createTransaction(request);
      
      // Monitor with automatic retry on failure
      return new Promise((resolve, reject) => {
        this.bridge.subscribeToTransaction(transaction.id, async (tx) => {
          if (tx.status === 'completed') {
            resolve(tx);
          } else if (tx.status === 'failed') {
            try {
              // Automatic retry with exponential backoff
              const retried = await this.bridge.retryTransaction(tx.id, {
                maxRetries: 3,
                baseDelay: 2000,
                priority: 'high'
              });
              
              // Continue monitoring retried transaction
              this.bridge.subscribeToTransaction(retried.id, (retryTx) => {
                if (retryTx.status === 'completed') resolve(retryTx);
                if (retryTx.status === 'failed') reject(new Error('Transaction failed after retry'));
              });
            } catch (retryError) {
              reject(retryError);
            }
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }
}
```

### 2. Batch Transaction Processing

```typescript
class BatchBridgeProcessor {
  private bridge: VindexBridgeAPIClient;
  
  constructor() {
    this.bridge = new VindexBridgeAPIClient();
  }
  
  async processBatch(requests: CreateBridgeRequest[]): Promise<BridgeTransaction[]> {
    const results: BridgeTransaction[] = [];
    
    // Process in chunks to respect rate limits
    const chunkSize = 5;
    for (let i = 0; i < requests.length; i += chunkSize) {
      const chunk = requests.slice(i, i + chunkSize);
      
      const chunkPromises = chunk.map(async (request) => {
        try {
          return await this.bridge.createTransaction(request);
        } catch (error) {
          console.error('Batch transaction failed:', error);
          return null;
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults.filter(Boolean) as BridgeTransaction[]);
      
      // Rate limiting delay
      if (i + chunkSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}
```

### 3. Real-time Statistics Dashboard

```typescript
class BridgeStatsDashboard {
  private bridge: VindexBridgeAPIClient;
  private updateInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.bridge = new VindexBridgeAPIClient();
  }
  
  startRealTimeUpdates(callback: (stats: BridgeStatistics) => void): void {
    const updateStats = async () => {
      try {
        const stats = await this.bridge.getStatistics();
        callback(stats);
      } catch (error) {
        console.error('Failed to update stats:', error);
      }
    };
    
    // Initial update
    updateStats();
    
    // Update every 30 seconds
    this.updateInterval = setInterval(updateStats, 30000);
  }
  
  stopRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  async getNetworkHealth(): Promise<Record<string, number>> {
    const stats = await this.bridge.getStatistics();
    const health: Record<string, number> = {};
    
    Object.entries(stats.networkStats).forEach(([network, netStats]) => {
      // Calculate health score (0-100)
      health[network] = Math.round(netStats.successRate * 100);
    });
    
    return health;
  }
}
```

---

## Error Handling

### 1. Error Types and Codes

```typescript
import { BridgeAPIError } from '@vindex/bridge-api-client';

try {
  const transaction = await bridge.createTransaction(request);
} catch (error) {
  if (error instanceof BridgeAPIError) {
    switch (error.code) {
      case 1001:
        console.error('❌ Invalid network configuration');
        break;
      case 1002:
        console.error('❌ Insufficient balance');
        break;
      case 1003:
        console.error('❌ Amount below minimum');
        break;
      case 1007:
        console.error('❌ Transaction timeout');
        // Implement retry logic
        break;
      case 1010:
        console.error('❌ Rate limit exceeded');
        // Implement backoff
        break;
      default:
        console.error('❌ Bridge error:', error.message);
    }
  } else {
    console.error('❌ Unexpected error:', error);
  }
}
```

### 2. Retry Strategies

```typescript
class RetryStrategy {
  static async exponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

// Usage
const transaction = await RetryStrategy.exponentialBackoff(
  () => bridge.createTransaction(request),
  3,
  2000
);
```

---

## Testing

### 1. Unit Tests

```typescript
import { VindexBridgeAPIClient, BridgeAPIError } from '@vindex/bridge-api-client';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('VindexBridgeAPIClient', () => {
  let bridge: VindexBridgeAPIClient;
  
  beforeEach(() => {
    bridge = new VindexBridgeAPIClient({
      baseURL: 'http://localhost:3001/api/v1'
    });
  });
  
  it('should create a bridge transaction', async () => {
    const request = {
      fromNetwork: 'VDX',
      toNetwork: 'SOL',
      fromAmount: 100.0,
      toAddress: 'test_address'
    };
    
    const transaction = await bridge.createTransaction(request);
    
    expect(transaction).toBeDefined();
    expect(transaction.id).toMatch(/^bridge_/);
    expect(transaction.fromNetwork).toBe('VDX');
    expect(transaction.toNetwork).toBe('SOL');
  });
  
  it('should handle validation errors', async () => {
    const request = {
      fromNetwork: 'INVALID',
      toNetwork: 'SOL',
      fromAmount: 100.0,
      toAddress: 'test_address'
    };
    
    await expect(bridge.createTransaction(request))
      .rejects.toThrow(BridgeAPIError);
  });
});
```

### 2. Integration Tests

```typescript
describe('Bridge Integration Tests', () => {
  let bridge: VindexBridgeAPIClient;
  
  beforeAll(() => {
    bridge = new VindexBridgeAPIClient({
      baseURL: process.env.BRIDGE_API_URL || 'http://localhost:3001/api/v1',
      apiKey: process.env.BRIDGE_API_KEY
    });
  });
  
  it('should complete a full bridge transaction flow', async () => {
    // Validate
    const validation = await bridge.validateTransaction({
      fromNetwork: 'VDX',
      toNetwork: 'SOL',
      fromAmount: 1.0,
      userAddress: 'test_address'
    });
    expect(validation.isValid).toBe(true);
    
    // Create
    const transaction = await bridge.createTransaction({
      fromNetwork: 'VDX',
      toNetwork: 'SOL',
      fromAmount: 1.0,
      toAddress: 'test_address'
    });
    expect(transaction.status).toBe('pending');
    
    // Monitor (mock completion)
    const finalStatus = await bridge.getTransactionStatus(transaction.id);
    expect(['pending', 'processing', 'completed']).toContain(finalStatus.status);
  }, 30000);
});
```

---

## Best Practices

### 1. Rate Limiting

```typescript
class RateLimitedBridgeClient {
  private bridge: VindexBridgeAPIClient;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  
  constructor() {
    this.bridge = new VindexBridgeAPIClient();
  }
  
  async queueRequest<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      await request();
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
    }
    
    this.isProcessing = false;
  }
}
```

### 2. Configuration Management

```typescript
interface BridgeEnvironmentConfig {
  development: {
    baseURL: string;
    retryAttempts: number;
    timeout: number;
  };
  production: {
    baseURL: string;
    retryAttempts: number;
    timeout: number;
  };
}

const CONFIG: BridgeEnvironmentConfig = {
  development: {
    baseURL: 'http://localhost:3001/api/v1',
    retryAttempts: 5,
    timeout: 60000
  },
  production: {
    baseURL: 'https://bridge.vindexchain.com/api/v1',
    retryAttempts: 3,
    timeout: 30000
  }
};

const env = process.env.NODE_ENV || 'development';
const bridge = new VindexBridgeAPIClient(CONFIG[env]);
```

### 3. Logging and Monitoring

```typescript
class MonitoredBridgeClient {
  private bridge: VindexBridgeAPIClient;
  private metrics = {
    requests: 0,
    failures: 0,
    avgResponseTime: 0
  };
  
  constructor() {
    this.bridge = new VindexBridgeAPIClient();
  }
  
  async createTransactionWithMetrics(request: CreateBridgeRequest): Promise<BridgeTransaction> {
    const startTime = Date.now();
    this.metrics.requests++;
    
    try {
      const result = await this.bridge.createTransaction(request);
      
      // Log success
      console.log(`✅ Bridge transaction created: ${result.id}`);
      
      return result;
    } catch (error) {
      this.metrics.failures++;
      
      // Log failure with context
      console.error('❌ Bridge transaction failed:', {
        error: error.message,
        request: request,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    } finally {
      // Update response time metrics
      const responseTime = Date.now() - startTime;
      this.metrics.avgResponseTime = 
        (this.metrics.avgResponseTime + responseTime) / 2;
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      successRate: ((this.metrics.requests - this.metrics.failures) / this.metrics.requests) * 100
    };
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
```
Error: Invalid wallet signature (Code: 1009)
```
**Solution**: Ensure wallet signature is valid and includes correct message format.

#### 2. Network Errors
```
Error: Network maintenance (Code: 1005)
```
**Solution**: Check network status and wait for maintenance to complete.

#### 3. Rate Limiting
```
Error: Rate limit exceeded (Code: 1010)
```
**Solution**: Implement exponential backoff and request queuing.

### Debug Mode

```typescript
const bridge = new VindexBridgeAPIClient({
  baseURL: 'http://localhost:3001/api/v1',
  timeout: 60000 // Increased for debugging
});

// Enable debug logging
process.env.DEBUG = 'bridge:*';
```

### Health Checks

```typescript
async function healthCheck(): Promise<boolean> {
  try {
    const networks = await bridge.getSupportedNetworks();
    return networks.length > 0;
  } catch (error) {
    console.error('Bridge API health check failed:', error);
    return false;
  }
}
```

---

## Support

- **Documentation**: https://docs.vindexchain.com/bridge
- **API Reference**: https://bridge.vindexchain.com/docs
- **GitHub Issues**: https://github.com/VindexChain/bridge-sdk/issues
- **Discord**: https://discord.gg/vindexchain
- **Email**: bridge-support@vindexchain.com
