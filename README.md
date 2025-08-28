# 🔗 Vindex Chain - Complete Blockchain Ecosystem

![Vindex Chain Logo](https://img.shields.io/badge/Vindex-Chain-red?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **The future of decentralized finance - A complete blockchain ecosystem with Proof of Stake consensus, built-in staking, DEX functionality, and modern user interfaces.**


## �‍💻 Para Nuevos Desarrolladores

Bienvenido al ecosistema Vindex Chain. Este monorepo contiene **toda la infraestructura, backend, frontend, explorer y panel de administración** de la blockchain Vindex. Si quieres replicar el proyecto, contribuir o entender cómo funciona, sigue estas instrucciones y lee el resumen al final.

### ¿Cómo levantar todo el ecosistema?

1. Clona el repositorio:
	```bash
	git clone https://github.com/VindexAdmin/vindex-chain.git
	cd vindex-chain
	```
2. Instala todas las dependencias:
	```bash
	npm install
	```
3. Levanta **todo el ecosistema** (backend, wallet, explorer, admin) con un solo comando:
	```bash
	npm run dev
	```
	Esto ejecuta todos los servicios en paralelo usando workspaces. Espera unos segundos y accede a:
	- Blockchain Core API: http://localhost:3001
	- Wallet App: http://localhost:3005
	- Explorer: http://localhost:3002
	- Admin Dashboard: http://localhost:3003

> Si solo quieres levantar un servicio, usa los scripts individuales (ver más abajo).

### Troubleshooting rápido

- Si algún puerto está ocupado (por ejemplo, 3005), ciérralo con:
  ```bash
  lsof -i :3005 | grep LISTEN | awk '{print $2}' | xargs kill -9
  ```
- Si tienes errores de dependencias, ejecuta:
  ```bash
  npm install && npm run build
  ```
- Si la base de datos no refleja los cambios, revisa las migraciones Prisma en `blockchain-core`.

---

## 📝 Prompt/Resumen del Proyecto (para replicar o entender el stack)

```
Quiero replicar el ecosistema Vindex Chain, una blockchain Proof of Stake con supply fijo, sistema de staking, DEX, anti-spam, y métricas reales. El stack es:
- Monorepo con npm workspaces
- Backend TypeScript/Node.js (blockchain-core, API REST, Prisma/Postgres)
- Frontend Next.js/React (wallet-app, explorer, admin-dashboard)
- Tailwind CSS para UI
- Scripts unificados para levantar todo con `npm run dev`
- Seguridad, logging y validaciones siguiendo mejores prácticas cripto
El objetivo es tener una red pública con 3 validadores, supply de 1B VDX, burn mechanism, y experiencia de usuario moderna. Todo el código y la infraestructura están en este repo.
```

---

Vindex Chain is a comprehensive blockchain cryptocurrency ecosystem featuring:

- **🔐 Proof of Stake Consensus** - Secure, energy-efficient validation
- **💰 Native Token (VDX)** - 1 billion fixed supply with burn mechanisms
- **📊 Built-in Staking** - Earn rewards by validating transactions
- **🔄 Decentralized Exchange** - Swap tokens with automated market makers
- **🛡️ Anti-Spam Protection** - Dynamic fees prevent network abuse
- **⚡ High Performance** - Fast transactions with minimal fees
- **🎨 Modern UI/UX** - User-friendly interfaces across all applications

## 🏗️ Architecture

This project is structured as a monorepo containing:

```
vindex-ecosystem/
├── packages/
│   ├── blockchain-core/     # Core blockchain implementation
│   ├── wallet-app/         # React-based wallet interface  
│   ├── explorer/           # Block explorer web app
│   └── admin-dashboard/    # Network administration tools
├── .github/               # GitHub workflows and settings
└── docs/                 # Documentation
```

## 📦 Components

### 🔗 Blockchain Core (`packages/blockchain-core/`)

The heart of Vindex Chain - a TypeScript-based blockchain implementation featuring:

- **Proof of Stake Consensus** with weighted validator selection
- **Transaction Processing** with fee-based prioritization
- **Block Mining** with reward distribution
- **Account Management** with balance tracking
- **Staking System** with reward calculation
- **REST API** for external integrations
- **Anti-Spam Measures** - No rewards for empty blocks
- **Network Statistics** and health monitoring

**Key Features:**
- 🏆 No rewards for empty blocks (anti-spam)
- 📈 Dynamic fee calculation based on transaction type and amount
- 🎯 Weighted validator selection for fair block production
- 🔒 Cryptographic transaction signing and verification
- 💎 Built-in token burning mechanism (BurnSwap)

### 💳 Wallet App (`packages/wallet-app/`)

Modern, responsive cryptocurrency wallet built with Next.js and React:

- **Clean UI/UX** with Vindex brand colors (Red, White, Black)
- **Wallet Management** - Create, import, export wallets
- **Transaction History** with real-time updates
- **Balance Tracking** across multiple accounts
- **Staking Interface** for earning rewards
- **Token Swapping** via integrated DEX
- **QR Code Support** for easy address sharing
- **Mobile Responsive** design

**Design System:**
- 🎨 Custom Vindex color palette
- 🖼️ Shield logo with "V" branding
- ⚡ Smooth animations with Framer Motion
- 📱 Mobile-first responsive design

### 🔍 Block Explorer (`packages/explorer/`)

Comprehensive blockchain explorer for transparency and monitoring:

- **Block Browsing** with detailed transaction lists
- **Transaction Search** by hash, address, or block
- **Network Statistics** and validator information
- **Real-time Updates** with WebSocket connections
- **API Documentation** for developers
- **Export Functionality** for data analysis

### 🛠️ Admin Dashboard (`packages/admin-dashboard/`)

Network administration and monitoring tools:

- **Validator Management** and monitoring
- **Network Health** metrics and alerts
- **Transaction Pool** monitoring
- **Emergency Controls** for network maintenance
- **Analytics Dashboard** with charts and graphs
- **User Management** and permissions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/VindexAdmin/vindex-chain.git
cd vindex-chain
```

2. **Install dependencies**
```bash
npm install
```

3. **Build all packages**
```bash
npm run build
```

4. **Start the ecosystem**
```bash
npm run dev
```

This will start:
- 🔗 Blockchain Core API on `http://localhost:3001`
- 💳 Wallet App on `http://localhost:3000`
- 🔍 Block Explorer on `http://localhost:3002`
- 🛠️ Admin Dashboard on `http://localhost:3003`

### Individual Package Commands

```bash
# Start blockchain core only
npm run start:blockchain

# Start wallet app only
npm run start:wallet

# Start block explorer only
npm run start:explorer

# Start admin dashboard only
npm run start:admin
```

## 📖 Documentation

### Blockchain Core API

#### Endpoints

**Health & Status**
- `GET /health` - API health check
- `GET /api/blockchain/info` - Blockchain information
- `GET /api/stats` - Network statistics

**Blocks**
- `GET /api/blocks` - Get latest blocks
- `GET /api/blocks/:id` - Get block by index or hash

**Transactions**
- `GET /api/transactions/:txId` - Get transaction by ID
- `GET /api/transactions/pending` - Get pending transactions
- `POST /api/transactions` - Submit new transaction

**Accounts**
- `GET /api/accounts/:address` - Get account balance and info

**Mining & Administration**
- `POST /api/mine` - Mine a new block (development)
- `GET /api/search/:query` - Search blockchain data

#### Transaction Types

1. **Transfer** - Basic token transfers
2. **Stake** - Delegate tokens to validators
3. **Unstake** - Withdraw staked tokens (with unbonding period)
4. **Swap** - Exchange tokens via built-in DEX

#### Fee Structure

```typescript
// Base fees by transaction type
transfer: 0.001 VDX
stake: 0.002 VDX
unstake: 0.003 VDX
swap: 0.0015 VDX

// Additional percentage fee: 0.01% of amount
// Large transaction fee: 0.05% for amounts > 1000 VDX
```

## 🔧 Configuration

### Environment Variables

Create `.env` files in each package:

**Blockchain Core** (`packages/blockchain-core/.env`):
```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
```

**Wallet App** (`packages/wallet-app/.env.local`):
```env
NEXT_PUBLIC_BLOCKCHAIN_API_URL=http://localhost:3001
NEXT_PUBLIC_NETWORK_NAME=Vindex Chain
```

### Network Configuration

The blockchain can be configured for different network environments:

- **Development** - Single node, fast mining, test accounts
- **Testnet** - Multi-node network for testing
- **Mainnet** - Production network with full security

## 🧪 Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific package
npm test --workspace=packages/blockchain-core
npm test --workspace=packages/wallet-app
```

### Linting and Code Quality

```bash
# Lint all packages
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### Adding Features

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

## 🌐 Network Specifications

### Consensus Algorithm
- **Type**: Proof of Stake (PoS)
- **Block Time**: ~10 seconds
- **Validator Selection**: Weighted random based on stake
- **Minimum Stake**: 100 VDX
- **Maximum Validators**: 21 active validators
- **Unbonding Period**: 7 days

### Token Economics
- **Token Name**: Vindex (VDX)
- **Total Supply**: 1,000,000,000 VDX (1 billion)
- **Distribution**: Fixed supply with burn mechanisms
- **Staking Rewards**: 8% annual yield
- **Validator Commission**: 4-6% (configurable)

### Network Features
- **Transaction Throughput**: Variable based on network load
- **Finality**: Immediate (single confirmation)
- **Cross-chain**: Planned for future versions
- **Smart Contracts**: Roadmap feature
- **Governance**: Community-driven proposals

## 🛣️ Roadmap

### Phase 1: Core Launch ✅
- [x] Basic blockchain implementation
- [x] Proof of Stake consensus
- [x] Wallet application
- [x] Block explorer
- [x] Staking system

### Phase 2: DeFi Integration 🚧
- [x] Built-in DEX functionality
- [x] Token swapping
- [ ] Liquidity pools
- [ ] Yield farming
- [ ] Governance tokens

### Phase 3: Advanced Features 📅
- [ ] Smart contracts
- [ ] Cross-chain bridges
- [ ] Mobile applications
- [ ] Hardware wallet support
- [ ] Multi-signature wallets

### Phase 4: Ecosystem Growth 🔮
- [ ] Developer tools and SDKs
- [ ] Third-party integrations
- [ ] Institutional features
- [ ] Regulatory compliance
- [ ] Global expansion

## 🤝 Contributing

We welcome contributions from developers, designers, and blockchain enthusiasts!

### Ways to Contribute

1. **Code Contributions** - Bug fixes, features, optimizations
2. **Documentation** - Improve docs, tutorials, guides
3. **Testing** - Report bugs, security issues, UX problems
4. **Design** - UI/UX improvements, branding, assets
5. **Community** - Support users, answer questions

### Development Workflow

1. **Issues First** - Check existing issues or create new ones
2. **Discussion** - Discuss approach in issue comments
3. **Implementation** - Follow coding standards and best practices
4. **Testing** - Ensure all tests pass and add new ones
5. **Documentation** - Update relevant documentation
6. **Review** - Submit PR for team review

### Code Standards

- **TypeScript** - Strict type checking enabled
- **ESLint** - Code linting and formatting
- **Prettier** - Consistent code formatting
- **Conventional Commits** - Standardized commit messages
- **Test Coverage** - Maintain high test coverage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔐 Security

### Reporting Security Issues

Please report security vulnerabilities to: security@vindex.io

### Security Measures

- **Private Key Encryption** - All private keys are encrypted at rest
- **Secure Communication** - HTTPS/WSS for all API communication  
- **Input Validation** - Comprehensive validation on all inputs
- **Rate Limiting** - API rate limiting prevents abuse
- **Audit Trail** - All transactions are cryptographically signed

## 📞 Support & Community

### Getting Help

- 📚 **Documentation**: [docs.vindex.io](https://docs.vindex.io)
- 💬 **Discord**: [discord.gg/vindex](https://discord.gg/vindex)
- 🐛 **Issues**: [GitHub Issues](https://github.com/VindexAdmin/vindex-chain/issues)
- ✉️ **Email**: support@vindex.io

### Community Channels

- **Twitter**: [@VindexChain](https://twitter.com/VindexChain)
- **Telegram**: [t.me/VindexChain](https://t.me/VindexChain)  
- **Reddit**: [r/VindexChain](https://reddit.com/r/VindexChain)
- **Medium**: [medium.com/@VindexChain](https://medium.com/@VindexChain)

---

<div align="center">

**🚀 Built with passion for the decentralized future 🚀**

**[Website](https://vindex.io) • [Documentation](https://docs.vindex.io) • [Community](https://discord.gg/vindex)**

</div>
