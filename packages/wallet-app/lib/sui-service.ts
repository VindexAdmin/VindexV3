import { 
  SuiClient, 
  getFullnodeUrl,
  SuiTransactionBlockResponse,
  CoinBalance 
} from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { fromHEX, toHEX } from '@mysten/sui.js/utils';

export interface SUITransactionRequest {
  fromAddress: string;
  toAddress: string;
  amount: number;
  privateKey?: string;
  coinType?: string;
}

export interface SUITransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: number;
}

export class SUIService {
  private client: SuiClient | null = null;
  private network: 'mainnet' | 'testnet' | 'devnet' = 'testnet';

  constructor(network: 'mainnet' | 'testnet' | 'devnet' = 'testnet') {
    this.network = network;
  }

  async connect(): Promise<void> {
    try {
      const rpcUrl = getFullnodeUrl(this.network);
      this.client = new SuiClient({ url: rpcUrl });
      
      // Test connection
      await this.client.getLatestCheckpointSequenceNumber();
      console.log(`Connected to SUI ${this.network} network`);
    } catch (error) {
      console.error('Failed to connect to SUI network:', error);
      throw new Error('SUI connection failed');
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    console.log('Disconnected from SUI network');
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  validateAddress(address: string): boolean {
    try {
      // SUI addresses are 32 bytes (64 hex characters) with 0x prefix
      if (!address.startsWith('0x')) {
        return false;
      }
      
      const hexPart = address.slice(2);
      if (hexPart.length !== 64) {
        return false;
      }
      
      // Check if it's valid hex
      return /^[0-9a-fA-F]+$/.test(hexPart);
    } catch {
      return false;
    }
  }

  async getBalance(address: string, coinType: string = '0x2::sui::SUI'): Promise<number> {
    try {
      if (!this.client) {
        throw new Error('Not connected to SUI network');
      }

      const balance = await this.client.getBalance({
        owner: address,
        coinType: coinType
      });

      // Convert from MIST to SUI (1 SUI = 1e9 MIST)
      return parseInt(balance.totalBalance) / 1e9;
    } catch (error) {
      console.error('Failed to get SUI balance:', error);
      throw new Error('Failed to get balance');
    }
  }

  async getAllBalances(address: string): Promise<CoinBalance[]> {
    try {
      if (!this.client) {
        throw new Error('Not connected to SUI network');
      }

      const balances = await this.client.getAllBalances({
        owner: address
      });

      return balances;
    } catch (error) {
      console.error('Failed to get all SUI balances:', error);
      throw new Error('Failed to get balances');
    }
  }

  async estimateTransactionFee(
    fromAddress: string,
    toAddress: string,
    amount: number,
    coinType: string = '0x2::sui::SUI'
  ): Promise<number> {
    try {
      if (!this.client) {
        throw new Error('Not connected to SUI network');
      }

      // Create a transaction block for estimation
      const txb = new TransactionBlock();
      const amountInMist = Math.floor(amount * 1e9);
      
      const [coin] = txb.splitCoins(txb.gas, [txb.pure(amountInMist)]);
      txb.transferObjects([coin], txb.pure(toAddress));
      
      // Set sender for gas estimation
      txb.setSender(fromAddress);

      // Dry run to get gas estimation
      const dryRun = await this.client.dryRunTransactionBlock({
        transactionBlock: await txb.build({ client: this.client })
      });

      if (dryRun.effects.status.status !== 'success') {
        console.warn('Transaction simulation failed:', dryRun.effects.status);
        return 0.001; // Default fee estimate
      }

      // Convert gas used from MIST to SUI
      const gasUsed = parseInt(dryRun.effects.gasUsed.computationCost) + 
                     parseInt(dryRun.effects.gasUsed.storageCost);
      
      return gasUsed / 1e9;
    } catch (error) {
      console.error('Error estimating SUI transaction fee:', error);
      return 0.001; // Default minimum fee
    }
  }

  async sendTransaction(request: SUITransactionRequest): Promise<SUITransactionResult> {
    try {
      if (!this.client) {
        throw new Error('Not connected to SUI network');
      }

      if (!request.privateKey) {
        throw new Error('Private key is required for SUI transactions');
      }

      // Create keypair from private key
      const keypair = Ed25519Keypair.fromSecretKey(fromHEX(request.privateKey));
      const senderAddress = keypair.getPublicKey().toSuiAddress();

      // Verify sender address matches
      if (senderAddress !== request.fromAddress) {
        throw new Error('Private key does not match from address');
      }

      // Check balance
      const balance = await this.getBalance(request.fromAddress, request.coinType);
      const fee = await this.estimateTransactionFee(
        request.fromAddress, 
        request.toAddress, 
        request.amount, 
        request.coinType
      );

      if (balance < request.amount + fee) {
        throw new Error(`Insufficient balance. Required: ${request.amount + fee}, Available: ${balance}`);
      }

      // Create transaction
      const txb = new TransactionBlock();
      const amountInMist = Math.floor(request.amount * 1e9);
      
      if (request.coinType === '0x2::sui::SUI') {
        // For native SUI transfers
        const [coin] = txb.splitCoins(txb.gas, [txb.pure(amountInMist)]);
        txb.transferObjects([coin], txb.pure(request.toAddress));
      } else {
        // For other coin types, need to handle differently
        // This is a simplified version - real implementation would need coin selection
        throw new Error('Non-SUI coin transfers not implemented yet');
      }

      // Sign and execute transaction
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: keypair,
        transactionBlock: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        return {
          success: true,
          transactionHash: result.digest,
          gasUsed: result.effects.gasUsed ? 
            (parseInt(result.effects.gasUsed.computationCost) + 
             parseInt(result.effects.gasUsed.storageCost)) / 1e9 : 0
        };
      } else {
        return {
          success: false,
          error: result.effects?.status?.error || 'Transaction failed',
          transactionHash: result.digest
        };
      }

    } catch (error) {
      console.error('SUI transaction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getTransactionStatus(txHash: string): Promise<SuiTransactionBlockResponse | null> {
    try {
      if (!this.client) {
        throw new Error('Not connected to SUI network');
      }

      const result = await this.client.getTransactionBlock({
        digest: txHash,
        options: {
          showEffects: true,
          showEvents: true,
          showInput: true,
          showObjectChanges: true,
        },
      });

      return result;
    } catch (error) {
      console.error('Failed to get SUI transaction status:', error);
      return null;
    }
  }

  async waitForTransactionConfirmation(
    txHash: string, 
    maxWaitTime: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.getTransactionStatus(txHash);
        
        if (status?.effects?.status?.status === 'success') {
          return true;
        } else if (status?.effects?.status?.status === 'failure') {
          return false;
        }
        
        // Wait 2 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error checking transaction status:', error);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return false; // Timeout
  }

  getExplorerUrl(txHash: string): string {
    const baseUrls = {
      mainnet: 'https://explorer.sui.io/txblock',
      testnet: 'https://explorer.sui.io/txblock',
      devnet: 'https://explorer.sui.io/txblock'
    };
    
    return `${baseUrls[this.network]}/${txHash}?network=${this.network}`;
  }

  // Utility methods
  suiToMist(sui: number): number {
    return Math.floor(sui * 1e9);
  }

  mistToSui(mist: number): number {
    return mist / 1e9;
  }

  generateRandomAddress(): string {
    const keypair = new Ed25519Keypair();
    return keypair.getPublicKey().toSuiAddress();
  }

  async getFaucetTokens(address: string): Promise<boolean> {
    try {
      if (this.network === 'mainnet') {
        throw new Error('Faucet not available on mainnet');
      }

      // Note: SUI testnet faucet would require HTTP requests to their faucet API
      // This is a placeholder - real implementation would call their faucet endpoint
      console.log(`Requesting faucet tokens for ${address} on ${this.network}`);
      
      // Placeholder return
      return false;
    } catch (error) {
      console.error('Faucet request failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const suiService = new SUIService();
