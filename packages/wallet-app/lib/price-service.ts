/**
 * Real-time Price Service
 * Integrates with CoinGecko API for real cryptocurrency prices
 */

export interface TokenPrice {
  symbol: string;
  price: number;
  priceChange24h: number;
  lastUpdated: number;
}

export interface PriceResponse {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

export class PriceService {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private cache = new Map<string, TokenPrice>();
  private cacheExpiry = 30000; // 30 seconds
  private updateCallbacks = new Set<(prices: Map<string, TokenPrice>) => void>();

  // Token ID mapping for CoinGecko
  private tokenIds = new Map([
    ['VDX', 'vindex'], // Placeholder - would be real VDX token ID
    ['SOL', 'solana'],
    ['XRP', 'ripple'],
    ['SUI', 'sui'],
    ['ETH', 'ethereum'],
    ['BTC', 'bitcoin'],
    ['USDC', 'usd-coin'],
    ['USDT', 'tether']
  ]);

  /**
   * Get current price for a single token
   */
  async getPrice(symbol: string): Promise<TokenPrice | null> {
    try {
      const cached = this.getCachedPrice(symbol);
      if (cached) {
        return cached;
      }

      const tokenId = this.tokenIds.get(symbol.toUpperCase());
      if (!tokenId) {
        console.warn(`Token ${symbol} not supported for pricing`);
        return null;
      }

      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_change=true`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: PriceResponse = await response.json();
      const tokenData = data[tokenId];

      if (!tokenData) {
        return null;
      }

      const price: TokenPrice = {
        symbol: symbol.toUpperCase(),
        price: tokenData.usd,
        priceChange24h: tokenData.usd_24h_change || 0,
        lastUpdated: Date.now()
      };

      // Cache the price
      this.cache.set(symbol.toUpperCase(), price);

      return price;

    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      
      // Return mock price for VDX if API fails
      if (symbol.toUpperCase() === 'VDX') {
        return {
          symbol: 'VDX',
          price: 0.25, // Mock VDX price
          priceChange24h: 2.5,
          lastUpdated: Date.now()
        };
      }
      
      return null;
    }
  }

  /**
   * Get prices for multiple tokens
   */
  async getPrices(symbols: string[]): Promise<Map<string, TokenPrice>> {
    const pricePromises = symbols.map(symbol => this.getPrice(symbol));
    const prices = await Promise.all(pricePromises);
    
    const priceMap = new Map<string, TokenPrice>();
    
    prices.forEach((price, index) => {
      if (price) {
        priceMap.set(symbols[index].toUpperCase(), price);
      }
    });

    // Notify subscribers
    this.updateCallbacks.forEach(callback => {
      try {
        callback(priceMap);
      } catch (error) {
        console.error('Price update callback error:', error);
      }
    });

    return priceMap;
  }

  /**
   * Get cached price if still valid
   */
  private getCachedPrice(symbol: string): TokenPrice | null {
    const cached = this.cache.get(symbol.toUpperCase());
    
    if (cached && (Date.now() - cached.lastUpdated) < this.cacheExpiry) {
      return cached;
    }
    
    return null;
  }

  /**
   * Calculate conversion rate between two tokens
   */
  async getConversionRate(fromSymbol: string, toSymbol: string): Promise<number> {
    try {
      const [fromPrice, toPrice] = await Promise.all([
        this.getPrice(fromSymbol),
        this.getPrice(toSymbol)
      ]);

      if (!fromPrice || !toPrice) {
        throw new Error(`Could not get prices for ${fromSymbol} or ${toSymbol}`);
      }

      return fromPrice.price / toPrice.price;

    } catch (error) {
      console.error('Conversion rate calculation failed:', error);
      
      // Fallback to mock rates for VDX conversions
      const from = fromSymbol.toUpperCase();
      const to = toSymbol.toUpperCase();
      
      if (from === 'VDX' && to === 'SOL') return 0.002; // 1 VDX = 0.002 SOL
      if (from === 'SOL' && to === 'VDX') return 500;   // 1 SOL = 500 VDX
      if (from === 'VDX' && to === 'XRP') return 0.5;   // 1 VDX = 0.5 XRP
      if (from === 'XRP' && to === 'VDX') return 2;     // 1 XRP = 2 VDX
      if (from === 'VDX' && to === 'SUI') return 0.1;   // 1 VDX = 0.1 SUI
      if (from === 'SUI' && to === 'VDX') return 10;    // 1 SUI = 10 VDX
      
      return 1; // 1:1 fallback
    }
  }

  /**
   * Convert amount from one token to another
   */
  async convertAmount(amount: number, fromSymbol: string, toSymbol: string): Promise<number> {
    const rate = await this.getConversionRate(fromSymbol, toSymbol);
    return amount * rate;
  }

  /**
   * Get USD value of token amount
   */
  async getUSDValue(amount: number, symbol: string): Promise<number> {
    const price = await this.getPrice(symbol);
    return price ? amount * price.price : 0;
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    if (price >= 1000) {
      return price.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    } else if (price >= 1) {
      return price.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else if (price >= 0.01) {
      return price.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
    } else {
      return price.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 6,
        maximumFractionDigits: 8
      });
    }
  }

  /**
   * Format price change percentage
   */
  formatPriceChange(change: number): { text: string; isPositive: boolean } {
    const isPositive = change >= 0;
    const formatted = Math.abs(change).toFixed(2);
    
    return {
      text: `${isPositive ? '+' : '-'}${formatted}%`,
      isPositive
    };
  }

  /**
   * Subscribe to price updates
   */
  onPriceUpdate(callback: (prices: Map<string, TokenPrice>) => void): () => void {
    this.updateCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * Start automatic price updates
   */
  startAutoUpdate(symbols: string[], intervalMs: number = 30000): () => void {
    const interval = setInterval(() => {
      this.getPrices(symbols).catch(error => {
        console.error('Auto price update failed:', error);
      });
    }, intervalMs);

    // Initial fetch
    this.getPrices(symbols).catch(error => {
      console.error('Initial price fetch failed:', error);
    });

    // Return stop function
    return () => {
      clearInterval(interval);
    };
  }

  /**
   * Clear all cached prices
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; oldestEntry: number | null } {
    let oldest: number | null = null;
    
    this.cache.forEach((price) => {
      if (oldest === null || price.lastUpdated < oldest) {
        oldest = price.lastUpdated;
      }
    });

    return {
      size: this.cache.size,
      oldestEntry: oldest
    };
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ping`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get supported tokens
   */
  getSupportedTokens(): string[] {
    return Array.from(this.tokenIds.keys());
  }
}

// Singleton instance
export const priceService = new PriceService();

export default PriceService;
