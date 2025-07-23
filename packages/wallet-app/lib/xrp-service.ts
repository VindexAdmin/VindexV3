import { Client, Wallet, Payment, xrpToDrops } from 'xrpl';

/**
 * XRP Ledger Integration Service for VDX Bridge
 * Based on official XRPL documentation and best practices
 */
export class XRPService {
  private client: Client | null = null;
  private network: 'mainnet' | 'testnet' | 'devnet';
  
  constructor(network: 'mainnet' | 'testnet' | 'devnet' = 'testnet') {
    this.network = network;
  }
  
  /**
   * Get WebSocket server URL based on network
   * URLs from official XRPL documentation
   */
  private getServerUrl(): string {
    switch (this.network) {
      case 'mainnet':
        return 'wss://xrplcluster.com/';
      case 'testnet':
        return 'wss://s.altnet.rippletest.net:51233';
      case 'devnet':
        return 'wss://s.devnet.rippletest.net:51233';
      default:
        return 'wss://s.altnet.rippletest.net:51233';
    }
  }
  
  /**
   * Connect to XRP Ledger
   */
  async connect(): Promise<void> {
    try {
      if (this.client && this.client.isConnected()) {
        return;
      }
      
      this.client = new Client(this.getServerUrl());
      await this.client.connect();
      console.log(`Connected to XRP Ledger ${this.network}`);
    } catch (error) {
      console.error('Failed to connect to XRP Ledger:', error);
      throw error;
    }
  }
  
  /**
   * Disconnect from XRP Ledger
   */
  async disconnect(): Promise<void> {
    if (this.client && this.client.isConnected()) {
      await this.client.disconnect();
      this.client = null;
      console.log('Disconnected from XRP Ledger');
    }
  }
  
  /**
   * Validate XRP address format
   */
  isValidXRPAddress(address: string): boolean {
    // XRP addresses start with 'r' and are 25-34 characters long
    const xrpAddressRegex = /^r[1-9A-HJ-NP-Za-km-z]{25,33}$/;
    return xrpAddressRegex.test(address);
  }
  
  /**
   * Get XRP account balance
   */
  async getBalance(address: string): Promise<number> {
    try {
      const response = await this.client?.request({
        command: 'account_info',
        account: address,
        ledger_index: 'current',
      });

      if (response?.result?.account_data?.Balance) {
        const balance = response.result.account_data.Balance;
        // Balance is returned in drops, convert to XRP (1 XRP = 1,000,000 drops)
        const balanceInDrops = typeof balance === 'string' ? parseInt(balance) : balance;
        return balanceInDrops / 1000000;
      }
      
      return 0;
    } catch (error) {
      console.error('Failed to get XRP balance:', error);
      throw new Error('Failed to get balance');
    }
  }
  
  /**
   * Get current transaction fee
   */
  async getTransactionFee(): Promise<number> {
    await this.connect();
    
    try {
      const response = await this.client!.request({
        command: 'server_info'
      });
      
      // XRP fees are usually very low (10-15 drops = 0.00001-0.000015 XRP)
      const baseFeeDrops = response.result.info?.load_factor ? 
        response.result.info.load_factor * 10 : 10;
      
      // Convert drops to XRP (1 XRP = 1,000,000 drops)
      return baseFeeDrops / 1000000;
    } catch (error) {
      console.error('Error getting transaction fee:', error);
      return 0.00001; // Default minimum fee
    }
  }
  
  /**
   * Bridge XRP to VDX
   * Simulated for now - in production would interact with bridge contract
   */
  async bridgeFromXRP(
    fromAddress: string,
    amount: number,
    vdxRecipientAddress: string,
    privateKey?: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      if (!this.isValidXRPAddress(fromAddress)) {
        return { success: false, error: 'Invalid XRP address' };
      }
      
      if (amount <= 0) {
        return { success: false, error: 'Amount must be greater than 0' };
      }
      
      // Check balance
      const balance = await this.getBalance(fromAddress);
      const fee = await this.getTransactionFee();
      
      if (balance < amount + fee) {
        return { 
          success: false, 
          error: `Insufficient XRP balance. Available: ${balance} XRP, Required: ${amount + fee} XRP` 
        };
      }
      
      // In production, this would:
      // 1. Create payment transaction to bridge contract
      // 2. Include memo with VDX recipient address
      // 3. Wait for confirmation
      // 4. Trigger VDX mint on destination chain
      
      console.log(`XRP Bridge initiated:
        From: ${fromAddress}
        Amount: ${amount} XRP
        VDX Recipient: ${vdxRecipientAddress}
        Estimated VDX: ${amount * 2} VDX (1 XRP = 2 VDX)
      `);
      
      // Simulate transaction hash
      const simulatedTxHash = `xrp_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      
      return {
        success: true,
        txHash: simulatedTxHash
      };
      
    } catch (error: any) {
      console.error('XRP bridge error:', error);
      return {
        success: false,
        error: error.message || 'XRP bridge transaction failed'
      };
    }
  }
  
  /**
   * Bridge VDX to XRP
   * Burns VDX and releases XRP from bridge contract
   */
  async bridgeToXRP(
    xrpRecipientAddress: string,
    vdxAmount: number,
    vdxTxHash: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      if (!this.isValidXRPAddress(xrpRecipientAddress)) {
        return { success: false, error: 'Invalid XRP recipient address' };
      }
      
      if (vdxAmount <= 0) {
        return { success: false, error: 'VDX amount must be greater than 0' };
      }
      
      // Calculate XRP amount (1 VDX = 0.5 XRP, so 2 VDX = 1 XRP)
      const xrpAmount = vdxAmount * 0.5;
      
      if (xrpAmount < 0.000001) {
        return { 
          success: false, 
          error: 'Minimum bridge amount is 0.000002 VDX (0.000001 XRP)' 
        };
      }
      
      // In production, this would:
      // 1. Verify VDX burn transaction
      // 2. Check bridge contract liquidity
      // 3. Create XRP payment to recipient
      // 4. Submit and wait for confirmation
      
      console.log(`VDX to XRP Bridge initiated:
        VDX Amount: ${vdxAmount}
        XRP Amount: ${xrpAmount}
        Recipient: ${xrpRecipientAddress}
        VDX Tx Hash: ${vdxTxHash}
      `);
      
      // Simulate transaction hash
      const simulatedTxHash = `xrp_release_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      
      return {
        success: true,
        txHash: simulatedTxHash
      };
      
    } catch (error: any) {
      console.error('VDX to XRP bridge error:', error);
      return {
        success: false,
        error: error.message || 'VDX to XRP bridge failed'
      };
    }
  }
  
  /**
   * Get transaction details by hash
   */
  async getTransactionInfo(txHash: string): Promise<any> {
    await this.connect();
    
    try {
      const response = await this.client!.request({
        command: 'tx',
        transaction: txHash
      });
      
      return response.result;
    } catch (error) {
      console.error('Error getting transaction info:', error);
      return null;
    }
  }
  
  /**
   * Get explorer URL for transaction
   */
  getExplorerUrl(txHash: string): string {
    const baseUrl = this.network === 'mainnet' 
      ? 'https://livenet.xrpl.org' 
      : `https://${this.network}.xrpl.org`;
    return `${baseUrl}/transactions/${txHash}`;
  }
  
  /**
   * Get current XRP price (mock - in production use price oracle)
   */
  async getCurrentPrice(): Promise<number> {
    // In production, integrate with CoinGecko, Chainlink, etc.
    return 0.50; // Mock price in USD
  }
}

// Singleton instance
export const xrpService = new XRPService();

export default XRPService;
