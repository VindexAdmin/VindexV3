# Vindex Chain - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
Vindex Chain is a complete blockchain cryptocurrency ecosystem with the following components:
- **Blockchain Core**: TypeScript/Node.js Proof of Stake blockchain
- **Wallet App**: Modern React-based cryptocurrency wallet
- **Explorer**: Block explorer for transaction and block viewing
- **Admin Dashboard**: Administrative interface for network monitoring

## Brand Guidelines
- **Name**: Vindex Chain / Vindex Ecosystem
- **Logo**: Shield with "V" inside
- **Colors**: Red (#DC2626), White (#FFFFFF), Black (#000000)
- **Token**: VDX (1 billion fixed supply with BurnSwap mechanism)

## Technical Specifications
- **Consensus**: Proof of Stake
- **Initial Supply**: 1,000,000,000 VDX tokens
- **Features**: Staking, Basic DEX/Swap, Anti-spam fees, No rewards for empty blocks
- **UI/UX**: Modern, user-friendly interfaces
- **Network**: Public blockchain with 3 initial validator nodes

## Code Style Guidelines
- Use TypeScript for all blockchain core functionality
- Follow modern React patterns for frontend applications
- Implement responsive design with Tailwind CSS
- Use proper error handling and validation
- Include comprehensive logging and monitoring
- Follow security best practices for cryptocurrency applications

## Architecture
This is a monorepo structure with:
- `packages/blockchain-core/` - Core blockchain implementation
- `packages/wallet-app/` - User wallet interface
- `packages/explorer/` - Block explorer
- `packages/admin-dashboard/` - Administrative tools

When generating code, always consider:
- Security implications for cryptocurrency handling
- Scalability and performance
- User experience and accessibility
- Integration between different packages
