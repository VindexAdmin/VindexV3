/**
 * Crypto Icons Service
 * Obtiene logos e iconos oficiales de criptomonedas de múltiples fuentes
 */

import React from 'react';

export interface CryptoIconData {
  symbol: string;
  name: string;
  iconUrl: string;
  largeIconUrl?: string;
  source: 'coingecko' | 'cryptocompare' | 'coinmarketcap' | 'local';
}

export class CryptoIconsService {
  private cache = new Map<string, CryptoIconData>();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 horas

  // Múltiples fuentes de iconos para redundancia
  private iconSources = {
    // CoinGecko - La fuente más confiable y gratuita
    coingecko: {
      baseUrl: 'https://api.coingecko.com/api/v3',
      iconUrl: (id: string) => `https://assets.coingecko.com/coins/images/${this.getCoinGeckoId(id)}/large.png`,
      smallIconUrl: (id: string) => `https://assets.coingecko.com/coins/images/${this.getCoinGeckoId(id)}/small.png`
    },

    // CryptoCompare - Backup
    cryptocompare: {
      baseUrl: 'https://min-api.cryptocompare.com',
      iconUrl: (symbol: string) => `https://www.cryptocompare.com/media/19633/btc.png`,
      // Formato real: https://www.cryptocompare.com/media/37746/matic-token-icon.png
    },

    // Fallback local para tokens personalizados
    local: {
      iconUrl: (symbol: string) => `/icons/crypto/${symbol.toLowerCase()}.png`
    }
  };

  // Mapeo de símbolos a IDs de CoinGecko
  private coinGeckoIds = new Map([
    // Principales criptomonedas
    ['BTC', 'bitcoin'],
    ['ETH', 'ethereum'],
    ['SOL', 'solana'],
    ['XRP', 'ripple'],
    ['SUI', 'sui'],
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
    ['APT', 'aptos'],
    
    // Tokens Vindex
    ['VDX', 'vindex'] // Placeholder - se actualizará cuando VDX esté en CoinGecko
  ]);

  /**
   * Obtiene el icono de una criptomoneda
   */
  async getCryptoIcon(symbol: string): Promise<CryptoIconData | null> {
    try {
      // Verificar cache
      const cached = this.getCachedIcon(symbol);
      if (cached) {
        return cached;
      }

      // Intentar obtener desde CoinGecko (más confiable)
      const coinGeckoIcon = await this.getFromCoinGecko(symbol);
      if (coinGeckoIcon) {
        this.setCachedIcon(symbol, coinGeckoIcon);
        return coinGeckoIcon;
      }

      // Fallback a icono local
      const localIcon = this.getLocalIcon(symbol);
      this.setCachedIcon(symbol, localIcon);
      return localIcon;

    } catch (error) {
      console.error(`Error getting icon for ${symbol}:`, error);
      return this.getLocalIcon(symbol);
    }
  }

  /**
   * Obtiene iconos de múltiples tokens de una vez
   */
  async getBatchIcons(symbols: string[]): Promise<Map<string, CryptoIconData>> {
    const results = new Map<string, CryptoIconData>();
    
    // Procesar en paralelo
    const promises = symbols.map(async (symbol) => {
      const icon = await this.getCryptoIcon(symbol);
      if (icon) {
        results.set(symbol, icon);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Obtiene desde CoinGecko API
   */
  private async getFromCoinGecko(symbol: string): Promise<CryptoIconData | null> {
    try {
      const coinId = this.getCoinGeckoId(symbol);
      if (!coinId) {
        return null;
      }

      const response = await fetch(
        `${this.iconSources.coingecko.baseUrl}/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        symbol: symbol.toUpperCase(),
        name: data.name,
        iconUrl: data.image.small,
        largeIconUrl: data.image.large,
        source: 'coingecko'
      };

    } catch (error) {
      console.warn(`Failed to get icon from CoinGecko for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Genera icono local como fallback
   */
  private getLocalIcon(symbol: string): CryptoIconData {
    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      iconUrl: this.iconSources.local.iconUrl(symbol),
      source: 'local'
    };
  }

  /**
   * Obtiene ID de CoinGecko para un símbolo
   */
  private getCoinGeckoId(symbol: string): string | undefined {
    return this.coinGeckoIds.get(symbol.toUpperCase());
  }

  /**
   * Cache management
   */
  private getCachedIcon(symbol: string): CryptoIconData | null {
    const cached = this.cache.get(symbol.toUpperCase());
    if (cached && this.isCacheValid(symbol)) {
      return cached;
    }
    return null;
  }

  private setCachedIcon(symbol: string, icon: CryptoIconData): void {
    this.cache.set(symbol.toUpperCase(), {
      ...icon,
      lastUpdated: Date.now()
    } as any);
  }

  private isCacheValid(symbol: string): boolean {
    const cached = this.cache.get(symbol.toUpperCase()) as any;
    if (!cached?.lastUpdated) return false;
    return Date.now() - cached.lastUpdated < this.cacheExpiry;
  }

  /**
   * Precarga iconos de tokens comunes
   */
  async preloadCommonIcons(): Promise<void> {
    const commonTokens = ['BTC', 'ETH', 'SOL', 'XRP', 'SUI', 'USDC', 'USDT', 'VDX'];
    await this.getBatchIcons(commonTokens);
  }

  /**
   * Genera URL de respaldo usando servicio de placeholder
   */
  generateFallbackIcon(symbol: string): string {
    // Genera un icono SVG simple con las iniciales del token
    const initial = symbol.charAt(0).toUpperCase();
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#DC2626"/>
        <text x="16" y="20" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="white">
          ${initial}
        </text>
      </svg>
    `)}`;
  }
}

// Instancia singleton del servicio
export const cryptoIconsService = new CryptoIconsService();

// Hook React para usar en componentes
export function useCryptoIcon(symbol: string) {
  const [icon, setIcon] = React.useState<CryptoIconData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    const loadIcon = async () => {
      try {
        const iconData = await cryptoIconsService.getCryptoIcon(symbol);
        if (mounted) {
          setIcon(iconData);
        }
      } catch (error) {
        console.error(`Failed to load icon for ${symbol}:`, error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadIcon();

    return () => {
      mounted = false;
    };
  }, [symbol]);

  return { icon, isLoading };
}
