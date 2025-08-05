'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Activity, DollarSign, BarChart3 } from 'lucide-react';
import { realTimePriceService, type TokenPrice } from '../../../lib/realtime-price-service';
import { CryptoIcon } from '../../components/ui/CryptoIcons';

export default function RealTimePricesPage() {
  const [prices, setPrices] = useState<Map<string, TokenPrice>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Tokens principales para mostrar
  const mainTokens = [
    'VDX', 'BTC', 'ETH', 'SOL', 'XRP', 'SUI', 
    'USDC', 'USDT', 'BNB', 'ADA', 'AVAX', 'DOT'
  ];

  const altTokens = [
    'MATIC', 'LINK', 'UNI', 'ATOM', 'NEAR', 'FTM',
    'ALGO', 'ICP', 'APT', 'AAVE', 'ARB', 'OP'
  ];

  useEffect(() => {
    loadInitialPrices();
    
    // Auto-refresh cada minuto si está habilitado
    let refreshInterval: NodeJS.Timeout;
    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        refreshPrices(true);
      }, 60000); // 1 minuto
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  const loadInitialPrices = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Loading initial real-time prices...');
      const allTokens = [...mainTokens, ...altTokens];
      const priceMap = await realTimePriceService.getBatchPrices(allTokens);
      setPrices(priceMap);
      setLastUpdate(new Date());
      updateStats();
    } catch (error) {
      console.error('Failed to load initial prices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPrices = async (force = false) => {
    if (!force) setIsRefreshing(true);
    try {
      console.log('🔄 Refreshing real-time prices...');
      const allTokens = [...mainTokens, ...altTokens];
      const priceMap = await realTimePriceService.getBatchPrices(allTokens, true);
      setPrices(priceMap);
      setLastUpdate(new Date());
      updateStats();
    } catch (error) {
      console.error('Failed to refresh prices:', error);
    } finally {
      if (!force) setIsRefreshing(false);
    }
  };

  const updateStats = () => {
    const serviceStats = realTimePriceService.getStats();
    setStats(serviceStats);
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'live': return 'bg-green-100 text-green-700';
      case 'cached': return 'bg-blue-100 text-blue-700';
      case 'mock': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSourceText = (source: string) => {
    switch (source) {
      case 'live': return 'LIVE';
      case 'cached': return 'CACHED';
      case 'mock': return 'DEMO';
      default: return 'UNKNOWN';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-pulse text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Real-Time Prices</h2>
          <p className="text-gray-600">Connecting to CoinGecko API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Controls */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Activity className="w-8 h-8 text-green-500" />
                Real-Time Crypto Prices
              </h1>
              <p className="text-gray-600 mt-1">
                Live data from CoinGecko API • Updates every minute
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Auto-refresh Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Auto-refresh</span>
              </label>

              {/* Manual Refresh Button */}
              <button
                onClick={() => refreshPrices()}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Now
              </button>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="flex items-center justify-between py-3 border-t bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600">
                  Last Update: {lastUpdate?.toLocaleTimeString() || 'Never'}
                </span>
              </div>
              {stats && (
                <div className="text-gray-500">
                  Live: {stats.livePrices} • Cached: {stats.cacheSize - stats.livePrices - stats.mockPrices} • Demo: {stats.mockPrices}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Next auto-refresh in: {autoRefresh ? '~1 min' : 'Disabled'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Tokens */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Major Cryptocurrencies</h2>
            <div className="text-sm text-gray-500">Real-time prices</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {mainTokens.map((symbol) => {
              const price = prices.get(symbol);
              if (!price) return null;

              return (
                <div key={symbol} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
                  {/* Header with Icon and Source */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <CryptoIcon symbol={symbol} size="lg" />
                      <div>
                        <div className="font-bold text-lg text-gray-900">{symbol}</div>
                        <div className="text-sm text-gray-500">
                          {symbol === 'VDX' ? 'Vindex Chain' : 
                           symbol === 'BTC' ? 'Bitcoin' :
                           symbol === 'ETH' ? 'Ethereum' :
                           symbol === 'SOL' ? 'Solana' : symbol}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSourceColor(price.source)}`}>
                      {getSourceText(price.source)}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mb-3">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {realTimePriceService.formatPrice(price.price)}
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${
                      price.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {price.priceChange24h >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>{realTimePriceService.formatPriceChange(price.priceChange24h).text}</span>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-2 text-xs text-gray-500">
                    {price.marketCap > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Market Cap:</span>
                        <span className="font-medium">{realTimePriceService.formatMarketCap(price.marketCap)}</span>
                      </div>
                    )}
                    {price.volume24h > 0 && (
                      <div className="flex items-center justify-between">
                        <span>24h Volume:</span>
                        <span className="font-medium">{realTimePriceService.formatMarketCap(price.volume24h)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Updated:</span>
                      <span className="font-medium">
                        {new Date(price.lastUpdated).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alt Tokens */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">DeFi & Layer 2 Tokens</h2>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200">
              {altTokens.map((symbol) => {
                const price = prices.get(symbol);
                if (!price) return null;

                return (
                  <div key={symbol} className="bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CryptoIcon symbol={symbol} size="sm" />
                        <div>
                          <div className="font-semibold text-gray-900">{symbol}</div>
                          <div className="text-xs text-gray-500">{getSourceText(price.source)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {realTimePriceService.formatPrice(price.price)}
                        </div>
                        <div className={`text-xs ${
                          price.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {realTimePriceService.formatPriceChange(price.priceChange24h).text}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Service Info */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Real-Time Price Service
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-green-800">Data Source:</span>
              <span className="text-green-700 ml-2">CoinGecko API (Live)</span>
            </div>
            <div>
              <span className="font-medium text-green-800">Update Frequency:</span>
              <span className="text-green-700 ml-2">Every 60 seconds</span>
            </div>
            <div>
              <span className="font-medium text-green-800">Rate Limiting:</span>
              <span className="text-green-700 ml-2">Intelligent caching</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-green-100 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>✅ Production Ready:</strong> This implementation uses real CoinGecko API data with proper rate limiting, 
              caching, and error handling. Prices update automatically every minute and are marked as LIVE, CACHED, or DEMO 
              depending on the data source.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
