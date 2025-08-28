# 📚 Vindex Bridge Documentation

Welcome to the comprehensive documentation for the Vindex Bridge system - a secure, efficient cross-chain bridge enabling seamless token transfers between VDX and other supported blockchains.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [API Reference](#api-reference)
- [SDK & Libraries](#sdk--libraries)
- [Examples](#examples)
- [Support](#support)

---

## 🌉 Overview

The Vindex Bridge is a sophisticated cross-chain infrastructure that enables secure token transfers between:

- **VDX Chain** (Vindex native blockchain)
- **Solana** (SOL)
- **XRP Ledger** (XRP)
- **Sui Network** (SUI)

### Key Features

✅ **Multi-chain Support** - Connect 4 major blockchains  
✅ **Enhanced Security** - Multi-signature validation and timelock mechanisms  
✅ **Auto-retry Logic** - Exponential backoff for failed transactions  
✅ **Real-time Monitoring** - Live transaction status tracking  
✅ **Type Safety** - Full TypeScript support with comprehensive types  
✅ **Rate Limiting** - Built-in protection against abuse  
✅ **Comprehensive APIs** - RESTful API with OpenAPI specification  

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install @vindex/bridge-api-client
```

### 2. Basic Usage
```typescript
import { VindexBridgeAPIClient } from '@vindex/bridge-api-client';

const bridge = new VindexBridgeAPIClient({
  baseURL: 'https://bridge.vindexchain.com/api/v1'
});

// Create bridge transaction
const transaction = await bridge.createTransaction({
  fromNetwork: 'VDX',
  toNetwork: 'SOL',
  fromAmount: 100.0,
  toAddress: 'your_solana_address'
});

console.log('Transaction created:', transaction.id);
```

### 3. Monitor Transaction
```typescript
// Subscribe to transaction updates
const unsubscribe = await bridge.subscribeToTransaction(
  transaction.id,
  (status) => console.log('Status:', status.status)
);
```

---

## 📖 Documentation

### Core Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| **[API Documentation](./bridge-api.md)** | Complete API reference with examples | Developers |
| **[Developer Guide](./bridge-developer-guide.md)** | Comprehensive development guide | Developers |
| **[OpenAPI Spec](./bridge-openapi.yaml)** | Machine-readable API specification | Tools/Integration |

### Implementation Guides

- **[Frontend Integration](./guides/frontend-integration.md)** - React/Next.js integration
- **[Backend Integration](./guides/backend-integration.md)** - Node.js server integration
- **[Mobile Integration](./guides/mobile-integration.md)** - React Native implementation
- **[Testing Guide](./guides/testing.md)** - Testing strategies and examples

### Advanced Topics

- **[Security Best Practices](./security/best-practices.md)** - Security guidelines
- **[Performance Optimization](./performance/optimization.md)** - Performance tips
- **[Error Handling](./error-handling/guide.md)** - Comprehensive error handling
- **[Monitoring & Analytics](./monitoring/setup.md)** - Monitoring setup

---

## 🔌 API Reference

### Base URL
```
Production: https://bridge.vindexchain.com/api/v1
Testnet: https://testnet-bridge.vindexchain.com/api/v1
Development: http://localhost:3001/api/v1
```

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/bridge/create` | Create bridge transaction |
| `GET` | `/bridge/status/{id}` | Get transaction status |
| `POST` | `/bridge/validate` | Validate transaction |
| `GET` | `/bridge/networks` | Get supported networks |
| `GET` | `/bridge/history` | Get transaction history |
| `GET` | `/bridge/stats` | Get bridge statistics |
| `POST` | `/bridge/retry/{id}` | Retry failed transaction |

### Authentication
```http
Authorization: Bearer <wallet_signature>
X-Wallet-Address: <wallet_address>
X-Chain-ID: <source_chain_id>
```

---

## 📦 SDK & Libraries

### Official SDKs

- **[@vindex/bridge-api-client](../lib/bridge-api-client.ts)** - TypeScript/JavaScript client
- **[@vindex/bridge-react](../components/ui/WalletConnector.tsx)** - React components
- **[@vindex/bridge-enhanced](../lib/enhanced-bridge-service.ts)** - Enhanced service layer

### Community SDKs

- **Python SDK** - `pip install vindex-bridge-python`
- **Go SDK** - `go get github.com/vindexchain/bridge-go`
- **Rust SDK** - `cargo add vindex-bridge`

---

## 💡 Examples

### React Integration
```tsx
import { VindexBridgeProvider, useBridge } from '@vindex/bridge-react';

function BridgeComponent() {
  const { createTransaction, transactions } = useBridge();
  
  const handleBridge = async () => {
    const tx = await createTransaction({
      fromNetwork: 'VDX',
      toNetwork: 'SOL',
      fromAmount: 100,
      toAddress: userAddress
    });
  };
  
  return (
    <div>
      <button onClick={handleBridge}>Bridge Tokens</button>
      {transactions.map(tx => (
        <div key={tx.id}>Status: {tx.status}</div>
      ))}
    </div>
  );
}
```

### Node.js Backend
```javascript
const { VindexBridgeAPIClient } = require('@vindex/bridge-api-client');

const bridge = new VindexBridgeAPIClient({
  apiKey: process.env.BRIDGE_API_KEY
});

app.post('/bridge', async (req, res) => {
  try {
    const transaction = await bridge.createTransaction(req.body);
    res.json({ success: true, transaction });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

### Python Integration
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

# Monitor status
while tx.status in ['pending', 'processing']:
    time.sleep(5)
    tx = client.get_status(tx.id)
    print(f"Status: {tx.status}")
```

---

## 🔧 Configuration

### Environment Variables
```bash
# API Configuration
NEXT_PUBLIC_BRIDGE_API_URL=https://bridge.vindexchain.com/api/v1
BRIDGE_API_KEY=your-api-key

# Network Configuration
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_CHAIN_ID=1337

# Monitoring
BRIDGE_METRICS_ENABLED=true
BRIDGE_ERROR_REPORTING=true
```

### Client Configuration
```typescript
const config = {
  baseURL: 'https://bridge.vindexchain.com/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 2000,
  rateLimits: {
    createTransaction: 10,
    checkStatus: 100
  }
};
```

---

## 🔍 Monitoring & Analytics

### Health Checks
```bash
curl https://bridge.vindexchain.com/api/v1/health
```

### Metrics Dashboard
- **Grafana Dashboard**: https://metrics.vindexchain.com/bridge
- **Status Page**: https://status.vindexchain.com
- **Real-time Stats**: Available in admin dashboard

### Error Tracking
- **Sentry Integration**: Automatic error reporting
- **Custom Metrics**: Bridge-specific metrics
- **Performance Monitoring**: Response time tracking

---

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
npm run test:load
```

### Test Environment
- **Testnet API**: https://testnet-bridge.vindexchain.com/api/v1
- **Mock Services**: Available for development
- **Test Tokens**: Request from Discord

---

## 🆘 Support

### 📞 Community Support
- **Discord**: https://discord.gg/vindexchain
- **Telegram**: https://t.me/vindexchain
- **Reddit**: https://reddit.com/r/vindexchain

### 📧 Technical Support
- **Developer Support**: bridge-support@vindexchain.com
- **Bug Reports**: https://github.com/VindexChain/bridge/issues
- **Feature Requests**: https://github.com/VindexChain/bridge/discussions

### 📚 Additional Resources
- **Blog**: https://blog.vindexchain.com/bridge
- **YouTube**: https://youtube.com/c/VindexChain
- **Twitter**: https://twitter.com/VindexChain

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](../CONTRIBUTING.md) for details on:

- Code of Conduct
- Development Process
- Pull Request Process
- Issue Templates

### Development Setup
```bash
git clone https://github.com/VindexChain/VindexV3.git
cd VindexV3/packages/wallet-app
npm install
npm run dev
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

<div align="center">
  <strong>🛡️ Built with ❤️ by the Vindex Team</strong>
  <br>
  <a href="https://vindexchain.com">VindexChain.com</a> • 
  <a href="https://docs.vindexchain.com">Documentation</a> • 
  <a href="https://github.com/VindexChain">GitHub</a>
</div>
