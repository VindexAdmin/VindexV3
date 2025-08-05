declare global {
  interface Window {
    bitcoin?: any;
  }
}

export class BitcoinWalletService {
  private connected: boolean = false;
  private mockAddress: string = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'; // Mock address for demo

  async connect(): Promise<boolean> {
    try {
      // En producción, esto se conectaría con una wallet real de Bitcoin
      this.connected = true;
      return true;
    } catch (error) {
      console.error('Error connecting to Bitcoin wallet:', error);
      return false;
    }
  }

  async getAddress(): Promise<string> {
    if (!this.connected) {
      await this.connect();
    }
    return this.mockAddress;
  }

  async getBalance(): Promise<{ balance: string; usdValue: number }> {
    try {
      if (!this.connected) {
        await this.connect();
      }
      // En producción, esto obtendría el balance real de la blockchain
      const btcBalance = 0.05; // Mock balance for demo
      
      // Mock BTC price in USD
      const btcPrice = 43000;
      const usdValue = btcBalance * btcPrice;

      return {
        balance: btcBalance.toString(),
        usdValue
      };
    } catch (error) {
      console.error('Error getting Bitcoin balance:', error);
      throw error;
    }
  }

  async sendTransaction(to: string, amount: string): Promise<string> {
    try {
      if (!this.connected) {
        await this.connect();
      }

      // En producción, esto enviaría una transacción real
      return 'mock-tx-hash-' + Math.random().toString(36).substring(7);
    } catch (error) {
      console.error('Error sending Bitcoin transaction:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const bitcoinWalletService = new BitcoinWalletService();