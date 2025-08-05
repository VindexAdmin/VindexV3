import { BrowserProvider, JsonRpcProvider, JsonRpcSigner, formatEther, parseEther } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export class EthereumWalletService {
  private provider: BrowserProvider | JsonRpcProvider | null = null;
  private signer: JsonRpcSigner | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initProvider();
    }
  }

  private async initProvider() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new BrowserProvider(window.ethereum);
    } else if (process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL) {
      this.provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL);
    }
  }

  public async connect(): Promise<boolean> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get the signer
      this.signer = await this.provider.getSigner();
      
      return true;
    } catch (error) {
      console.error('Failed to connect to Ethereum wallet:', error);
      return false;
    }
  }

  public async getAddress(): Promise<string> {
    try {
      if (!this.signer) {
        await this.connect();
      }
      if (!this.signer) {
        throw new Error('No signer available');
      }
      return await this.signer.getAddress();
    } catch (error) {
      console.error('Failed to get address:', error);
      throw error;
    }
  }

  public async getBalance(): Promise<{ balance: string; usdValue: number }> {
    try {
      if (!this.provider || !this.signer) {
        await this.connect();
      }
      if (!this.signer) {
        throw new Error('No signer available');
      }

      const address = await this.signer.getAddress();
      const balance = await this.provider!.getBalance(address);
      
      // Format the balance from wei to ether
      const ethBalance = formatEther(balance);
      
      // TODO: Get real ETH price
      const ethPrice = 2000; // Mock ETH price in USD
      const usdValue = parseFloat(ethBalance) * ethPrice;

      return {
        balance: ethBalance,
        usdValue
      };
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  public async sendTransaction(to: string, amount: string): Promise<string> {
    try {
      if (!this.signer) {
        await this.connect();
      }
      if (!this.signer) {
        throw new Error('No signer available');
      }

      const tx = await this.signer.sendTransaction({
        to,
        value: parseEther(amount)
      });

      return tx.hash;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    this.provider = null;
    this.signer = null;
  }

  public isConnected(): boolean {
    return this.signer !== null;
  }
}

export const ethereumWalletService = new EthereumWalletService();
