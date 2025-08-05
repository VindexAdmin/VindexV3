/**
 * Enhanced Price Service with Mock Data for Development
 * Handles CoinGecko rate limits gracefully
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

export class EnhancedPriceService {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private cache = new Map<string, TokenPrice>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutos para evitar rate limits
  private updateCallbacks = new Set<(prices: Map<string, TokenPrice>) => void>();
  private rateLimitHit = false;

  // Token ID mapping for CoinGecko
  private tokenIds = new Map([
    ['VDX', 'vindex'], // Placeholder
    ['SOL', 'solana'],
    ['XRP', 'ripple'],
    ['SUI', 'sui'],
    ['ETH', 'ethereum'],
    ['BTC', 'bitcoin'],
    ['USDC', 'usd-coin'],
    ['USDT', 'tether'],
    ['BNB', 'binancecoin'],
    ['ADA', 'cardano'],
    ['AVAX', 'avalanche-2'],
    ['DOT', 'polkadot'],
    ['MATIC', 'matic-network'],
    ['LINK', 'chainlink'],
    ['UNI', 'uniswap'],
    ['ATOM', 'cosmos'],
    ['NEAR', 'near'],
    ['FTM', 'fantom'],
    ['ALGO', 'algorand'],
    ['ICP', 'internet-computer'],
    ['APT', 'aptos']
  ]);

  // Mock data for development when API is rate limited
  private mockPrices: Record<string, TokenPrice> = {
    VDX: { symbol: 'VDX', price: 0.25, priceChange24h: 5.2, lastUpdated: Date.now() },
    BTC: { symbol: 'BTC', price: 43250.00, priceChange24h: 2.3, lastUpdated: Date.now() },
    ETH: { symbol: 'ETH', price: 2890.50, priceChange24h: 1.8, lastUpdated: Date.now() },
    SOL: { symbol: 'SOL', price: 98.75, priceChange24h: -1.2, lastUpdated: Date.now() },
    XRP: { symbol: 'XRP', price: 0.52, priceChange24h: 0.8, lastUpdated: Date.now() },
    SUI: { symbol: 'SUI', price: 1.85, priceChange24h: 3.4, lastUpdated: Date.now() },
    USDC: { symbol: 'USDC', price: 1.00, priceChange24h: 0.1, lastUpdated: Date.now() },
    USDT: { symbol: 'USDT', price: 1.00, priceChange24h: -0.1, lastUpdated: Date.now() },
    BNB: { symbol: 'BNB', price: 310.20, priceChange24h: 1.5, lastUpdated: Date.now() },
    ADA: { symbol: 'ADA', price: 0.45, priceChange24h: -0.8, lastUpdated: Date.now() },
    AVAX: { symbol: 'AVAX', price: 28.90, priceChange24h: 2.1, lastUpdated: Date.now() },
    DOT: { symbol: 'DOT', price: 6.85, priceChange24h: -1.5, lastUpdated: Date.now() },
    MATIC: { symbol: 'MATIC', price: 0.72, priceChange24h: 4.2, lastUpdated: Date.now() },
    LINK: { symbol: 'LINK', price: 14.30, priceChange24h: 1.8, lastUpdated: Date.now() },
    UNI: { symbol: 'UNI', price: 8.45, priceChange24h: -2.1, lastUpdated: Date.now() },
    ATOM: { symbol: 'ATOM', price: 9.20, priceChange24h: 0.5, lastUpdated: Date.now() },
    NEAR: { symbol: 'NEAR', price: 4.15, priceChange24h: 3.8, lastUpdated: Date.now() },
    FTM: { symbol: 'FTM', price: 0.42, priceChange24h: -1.8, lastUpdated: Date.now() },
    ALGO: { symbol: 'ALGO', price: 0.18, priceChange24h: 2.5, lastUpdated: Date.now() },
    ICP: { symbol: 'ICP', price: 12.80, priceChange24h: -0.9, lastUpdated: Date.now() },
    APT: { symbol: 'APT', price: 8.90, priceChange24h: 1.2, lastUpdated: Date.now() }
  };

  /**
   * Get current price for a single token
   */
  async getPrice(symbol: string): Promise<TokenPrice | null> {
    try {
      const cached = this.getCachedPrice(symbol);
      if (cached) {
        return cached;
      }

      // If rate limited, use mock data
      if (this.rateLimitHit) {
        return this.getMockPrice(symbol);
      }

      const tokenId = this.tokenIds.get(symbol.toUpperCase());
      if (!tokenId) {
        console.warn(`Token ${symbol} not supported for pricing`);
        return this.getMockPrice(symbol);
      }

      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_change=true`,
        {
          headers: {
            'Accept': 'application/json',
          },
          // Agregar modo cors para evitar problemas
          mode: 'cors',
        }
      );

      if (response.status === 429) {
        console.warn('CoinGecko rate limit hit, using mock data');
        this.rateLimitHit = true;
        return this.getMockPrice(symbol);
      }

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: PriceResponse = await response.json();
      const tokenData = data[tokenId];

      if (!tokenData) {
        return this.getMockPrice(symbol);
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
      // Manejar específicamente errores de CORS y rate limiting
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn(`CORS or network error for ${symbol}, using mock data:`, error.message);
        this.rateLimitHit = true; // Activar modo fallback temporalmente
      } else {
        console.error(`Failed to fetch price for ${symbol}:`, error);
      }
      return this.getMockPrice(symbol);
    }
  }

  /**
   * Get mock price for development
   */
  private getMockPrice(symbol: string): TokenPrice | null {
    const mockPrice = this.mockPrices[symbol.toUpperCase()];
    if (mockPrice) {
      // Cache mock price
      this.cache.set(symbol.toUpperCase(), mockPrice);
      return mockPrice;
    }
    
    // Generate random price for unknown tokens
    return {
      symbol: symbol.toUpperCase(),
      price: Math.random() * 100 + 0.01,
      priceChange24h: (Math.random() - 0.5) * 10,
      lastUpdated: Date.now()
    };
  }

  /**
   * Get prices for multiple tokens efficiently
   */
  async getPrices(symbols: string[]): Promise<Map<string, TokenPrice>> {
    const results = new Map<string, TokenPrice>();
    
    // Check cache first
    const uncachedSymbols: string[] = [];
    for (const symbol of symbols) {
      const cached = this.getCachedPrice(symbol);
      if (cached) {
        results.set(symbol, cached);
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    if (uncachedSymbols.length === 0) {
      return results;
    }

    // If rate limited, use mock data for all
    if (this.rateLimitHit) {
      for (const symbol of uncachedSymbols) {
        const mockPrice = this.getMockPrice(symbol);
        if (mockPrice) {
          results.set(symbol, mockPrice);
        }
      }
      return results;
    }

    try {
      // Get token IDs for batch request
      const tokenIds = uncachedSymbols
        .map(symbol => this.tokenIds.get(symbol.toUpperCase()))
        .filter(id => id !== undefined) as string[];

      if (tokenIds.length === 0) {
        // Use mock data for all unknown tokens
        for (const symbol of uncachedSymbols) {
          const mockPrice = this.getMockPrice(symbol);
          if (mockPrice) {
            results.set(symbol, mockPrice);
          }
        }
        return results;
      }

      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${tokenIds.join(',')}&vs_currencies=usd&include_24hr_change=true`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (response.status === 429) {
        console.warn('CoinGecko rate limit hit during batch request, using mock data');
        this.rateLimitHit = true;
        for (const symbol of uncachedSymbols) {
          const mockPrice = this.getMockPrice(symbol);
          if (mockPrice) {
            results.set(symbol, mockPrice);
          }
        }
        return results;
      }

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: PriceResponse = await response.json();

      // Process results
      for (const symbol of uncachedSymbols) {
        const tokenId = this.tokenIds.get(symbol.toUpperCase());
        if (tokenId && data[tokenId]) {
          const tokenData = data[tokenId];
          const price: TokenPrice = {
            symbol: symbol.toUpperCase(),
            price: tokenData.usd,
            priceChange24h: tokenData.usd_24h_change || 0,
            lastUpdated: Date.now()
          };
          
          this.cache.set(symbol.toUpperCase(), price);
          results.set(symbol, price);
        } else {
          // Use mock data for missing tokens
          const mockPrice = this.getMockPrice(symbol);
          if (mockPrice) {
            results.set(symbol, mockPrice);
          }
        }
      }

    } catch (error) {
      console.error('Failed to fetch batch prices:', error);
      // Fallback to mock data
      for (const symbol of uncachedSymbols) {
        const mockPrice = this.getMockPrice(symbol);
        if (mockPrice) {
          results.set(symbol, mockPrice);
        }
      }
    }

    return results;
  }

  /**
   * Cache management
   */
  private getCachedPrice(symbol: string): TokenPrice | null {
    const cached = this.cache.get(symbol.toUpperCase());
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }
    return null;
  }

  private isCacheValid(price: TokenPrice): boolean {
    return Date.now() - price.lastUpdated < this.cacheExpiry;
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    if (price === 0) return '$0.00';
    
    if (price >= 1000) {
      return `$${price.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    } else if (price >= 1) {
      return `$${price.toFixed(4)}`;
    } else if (price >= 0.01) {
      return `$${price.toFixed(6)}`;
    } else {
      return `$${price.toFixed(8)}`;
    }
  }

  /**
   * Format price change
   */
  formatPriceChange(change: number): { text: string; isPositive: boolean } {
    const isPositive = change >= 0;
    const prefix = isPositive ? '+' : '';
    return {
      text: `${prefix}${change.toFixed(2)}%`,
      isPositive
    };
  }

  /**
   * Get supported tokens
   */
  getSupportedTokens(): string[] {
    return Array.from(this.tokenIds.keys());
  }

  /**
   * Subscribe to price updates
   */
  onPriceUpdate(callback: (prices: Map<string, TokenPrice>) => void): () => void {
    this.updateCallbacks.add(callback);
    
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * Get conversion rate between two tokens
   */
  async getConversionRate(fromSymbol: string, toSymbol: string): Promise<number | null> {
    if (fromSymbol === toSymbol) return 1;

    try {
      const fromPrice = await this.getPrice(fromSymbol);
      const toPrice = await this.getPrice(toSymbol);

      if (!fromPrice || !toPrice) return null;

      return fromPrice.price / toPrice.price;
    } catch (error) {
      console.error(`Failed to get conversion rate from ${fromSymbol} to ${toSymbol}:`, error);
      return null;
    }
  }

  /**
   * Reset rate limit flag (for testing)
   */
  resetRateLimit(): void {
    this.rateLimitHit = false;
  }

  /**
   * Check if currently rate limited
   */
  isRateLimited(): boolean {
    return this.rateLimitHit;
  }
}

// Export singleton instance
export const enhancedPriceService = new EnhancedPriceService();
