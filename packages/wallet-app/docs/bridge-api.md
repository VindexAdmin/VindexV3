# 🌉 Vindex Bridge API Documentation

## Overview
The Vindex Bridge API enables secure cross-chain token transfers between VDX and other supported blockchains including Solana (SOL), XRP, and Sui Network.

## Base URL
```
Production: https://bridge.vindexchain.com/api/v1
Development: http://localhost:3001/api/v1
```

## Authentication
All API endpoints require valid wallet authentication. Include the following headers:

```http
Authorization: Bearer <wallet_signature>
X-Wallet-Address: <wallet_address>
X-Chain-ID: <source_chain_id>
```

---

## 📋 **Core Endpoints**

### 1. Bridge Transaction Creation

**POST** `/bridge/create`

Creates a new cross-chain bridge transaction.

#### Request Body
```json
{
  "fromNetwork": "VDX",
  "toNetwork": "SOL",
  "fromAmount": 100.0,
  "toAddress": "destination_wallet_address",
  "slippage": 1.0,
  "priority": "normal"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "transactionId": "bridge_12345678",
    "status": "pending",
    "fromNetwork": "VDX",
    "toNetwork": "SOL",
    "fromAmount": 100.0,
    "toAmount": 0.8,
    "exchangeRate": 0.008,
    "bridgeFee": 0.1,
    "estimatedCompletion": 1722288000000,
    "estimatedTime": "2-5 minutes"
  },
  "error": null
}
```

### 2. Transaction Status Check

**GET** `/bridge/status/{transactionId}`

Retrieves the current status of a bridge transaction.

#### Response
```json
{
  "success": true,
  "data": {
    "id": "bridge_12345678",
    "status": "processing",
    "fromNetwork": "VDX",
    "toNetwork": "SOL",
    "fromAmount": 100.0,
    "toAmount": 0.8,
    "txHash": "0x742d35Cc6634C0532925a3b8D89e3734E1234567",
    "destinationTxHash": "3JZQ7F8F9k2N1m4H6D2P8R5L3X9T1K7Y",
    "progress": 75,
    "retryAttempt": 0,
    "estimatedCompletion": 1722288000000,
    "confirmations": 12,
    "requiredConfirmations": 15
  }
}
```

### 3. Bridge Validation

**POST** `/bridge/validate`

Validates bridge transaction parameters before execution.

#### Request Body
```json
{
  "fromNetwork": "VDX",
  "toNetwork": "SOL",
  "fromAmount": 100.0,
  "userAddress": "user_wallet_address"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": [
      "High network congestion may cause delays"
    ],
    "estimatedGas": 0.001,
    "minimumAmount": 1.0,
    "maximumAmount": 1000000.0,
    "exchangeRate": 0.008,
    "totalFee": 0.1
  }
}
```

### 4. Supported Networks

**GET** `/bridge/networks`

Returns all supported networks and their configurations.

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "VDX",
      "name": "Vindex Chain",
      "symbol": "VDX",
      "chainId": 1337,
      "status": "active",
      "exchangeRate": 1.0,
      "fee": 0.1,
      "minAmount": 1.0,
      "maxAmount": 1000000.0,
      "estimatedTime": "2-5 minutes",
      "contractAddress": "0x742d35Cc6634C0532925a3b8D89e3734E1234567",
      "explorerUrl": "http://localhost:3002/explorer"
    }
  ]
}
```

### 5. Transaction History

**GET** `/bridge/history?limit=10&offset=0&status=all`

Retrieves user's bridge transaction history.

#### Query Parameters
- `limit`: Number of transactions to return (max 100)
- `offset`: Pagination offset
- `status`: Filter by status (pending, processing, completed, failed, all)
- `fromNetwork`: Filter by source network
- `toNetwork`: Filter by destination network

#### Response
```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "total": 50,
    "hasMore": true
  }
}
```

### 6. Bridge Statistics

**GET** `/bridge/stats`

Returns comprehensive bridge statistics.

#### Response
```json
{
  "success": true,
  "data": {
    "totalTransactions": 1250,
    "totalVolume": 5000000.0,
    "recentTransactionCount": 45,
    "successRate": 98.5,
    "averageRetries": 0.2,
    "retrySuccessRate": 95.0,
    "networkStats": {
      "VDX": {
        "totalVolume": 3000000.0,
        "transactionCount": 800,
        "successRate": 99.1
      }
    }
  }
}
```

---

## 🔄 **Enhanced Retry Endpoints**

### 7. Retry Failed Transaction

**POST** `/bridge/retry/{transactionId}`

Retries a failed bridge transaction with enhanced parameters.

#### Request Body
```json
{
  "maxRetries": 3,
  "baseDelay": 2000,
  "priority": "high"
}
```

### 8. Bulk Transaction Status

**POST** `/bridge/status/bulk`

Check status of multiple transactions at once.

#### Request Body
```json
{
  "transactionIds": ["bridge_123", "bridge_456", "bridge_789"]
}
```

---

## 🚨 **Error Codes**

| Code | Message | Description |
|------|---------|-------------|
| 1001 | Invalid network configuration | Source or destination network not supported |
| 1002 | Insufficient balance | User doesn't have enough tokens |
| 1003 | Amount below minimum | Transaction amount too small |
| 1004 | Amount above maximum | Transaction amount too large |
| 1005 | Network maintenance | Target network is under maintenance |
| 1006 | High slippage detected | Slippage exceeds maximum allowed |
| 1007 | Transaction timeout | Transaction took too long to process |
| 1008 | Wallet not connected | User wallet not properly connected |
| 1009 | Invalid signature | Wallet signature validation failed |
| 1010 | Rate limit exceeded | Too many requests from user |

---

## 📊 **Rate Limiting**

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/bridge/create` | 10 requests | 1 minute |
| `/bridge/status/*` | 100 requests | 1 minute |
| `/bridge/validate` | 50 requests | 1 minute |
| `/bridge/retry/*` | 5 requests | 5 minutes |

---

## 🔔 **Webhooks**

Configure webhooks to receive real-time transaction updates:

### Webhook Events
- `transaction.created`
- `transaction.processing`
- `transaction.completed`
- `transaction.failed`
- `transaction.retry_initiated`

### Webhook Payload
```json
{
  "event": "transaction.completed",
  "timestamp": 1722288000000,
  "data": {
    "transactionId": "bridge_12345678",
    "status": "completed",
    "finalAmount": 0.8,
    "destinationTxHash": "3JZQ7F8F9k2N1m4H6D2P8R5L3X9T1K7Y"
  }
}
```

---

## 🛠️ **SDK Usage Examples**

### JavaScript/TypeScript
```typescript
import { VindexBridgeSDK } from '@vindex/bridge-sdk';

const bridge = new VindexBridgeSDK({
  apiKey: 'your-api-key',
  network: 'mainnet'
});

// Create bridge transaction
const transaction = await bridge.createTransaction({
  fromNetwork: 'VDX',
  toNetwork: 'SOL',
  fromAmount: 100.0,
  toAddress: 'destination_address'
});

// Monitor transaction
bridge.onStatusUpdate(transaction.id, (status) => {
  console.log('Transaction status:', status);
});
```

### Python
```python
from vindex_bridge import BridgeClient

client = BridgeClient(api_key='your-api-key')

# Create transaction
tx = client.create_transaction(
    from_network='VDX',
    to_network='SOL',
    from_amount=100.0,
    to_address='destination_address'
)

# Check status
status = client.get_status(tx.id)
```

---

## 🔐 **Security Best Practices**

1. **Always validate** transaction parameters before submission
2. **Use HTTPS** for all API communications
3. **Implement retry logic** with exponential backoff
4. **Monitor transaction status** regularly
5. **Set appropriate slippage** limits
6. **Use webhooks** for real-time updates
7. **Implement proper error handling** for all scenarios

---

## 📞 **Support**

- **Documentation**: https://docs.vindexchain.com/bridge
- **Discord**: https://discord.gg/vindexchain
- **Email**: bridge-support@vindexchain.com
- **Status Page**: https://status.vindexchain.com
