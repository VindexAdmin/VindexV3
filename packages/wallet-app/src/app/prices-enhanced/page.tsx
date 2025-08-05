'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import dynamic from 'next/dynamic';

// Importar componentes dinámicamente para evitar hidratación
const CryptoIcon = dynamic(() => import('../../components/ui/CryptoIcons').then(mod => ({ default: mod.CryptoIcon })), {
  ssr: false,
  loading: () => <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
});

const CryptoGrid = dynamic(() => import('../../components/ui/CryptoIcons').then(mod => ({ default: mod.CryptoGrid })), {
  ssr: false,
  loading: () => <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
    {Array(12).fill(0).map((_, i) => (
      <div key={i} className="flex flex-col items-center p-3">
        <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
        <div className="w-8 h-3 bg-gray-200 rounded mt-2 animate-pulse" />
      </div>
    ))}
  </div>
});

const PriceDisplay = dynamic(() => import('../../components/ui/PriceComponents').then(mod => ({ default: mod.PriceDisplay })), {
  ssr: false,
  loading: () => <div className="text-right">
    <div className="w-20 h-6 bg-gray-200 rounded animate-pulse mb-1" />
    <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
  </div>
});

import { enhancedPriceService } from '../../../lib/enhanced-price-service';
import { cryptoIconsService } from '../../../lib/crypto-icons-service';

export default function EnhancedPricesPage() {
  const [selectedView, setSelectedView] = useState<'grid' | 'list'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Tokens principales que soportamos
  const featuredTokens = [
    'VDX', 'BTC', 'ETH', 'SOL', 'XRP', 'SUI', 
    'USDC', 'USDT', 'BNB', 'ADA', 'AVAX', 'DOT'
  ];

  // Nuevos tokens/proyectos populares
  const trendingTokens = [
    'MATIC', 'LINK', 'UNI', 'ATOM', 'NEAR', 'FTM', 
    'ALGO', 'ICP', 'APT'
  ];

  useEffect(() => {
    // Precargar iconos comunes
    cryptoIconsService.preloadCommonIcons();
    
    // Verificar si estamos rate limited
    setIsRateLimited(enhancedPriceService.isRateLimited());
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Forzar actualización limpiando el cache
      await enhancedPriceService.getPrices(featuredTokens.concat(trendingTokens));
    } catch (error) {
      console.error('Error refreshing prices:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTokenClick = (symbol: string) => {
    console.log(`Token clicked: ${symbol}`);
    // Aquí puedes navegar a una página de detalles del token
    // router.push(`/token/${symbol}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Cryptocurrency Prices
              </h1>
              <p className="text-gray-600 mt-1">
                Real-time prices with official logos from trusted sources
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSelectedView('list')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    selectedView === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setSelectedView('grid')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    selectedView === 'grid'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Grid
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Tokens Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Featured Tokens</h2>
            <div className="flex items-center gap-2">
              {isRateLimited && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                  Demo Mode
                </span>
              )}
              <span className="text-sm text-gray-500">
                {isRateLimited ? 'Mock data for development' : 'Live data from CoinGecko'}
              </span>
            </div>
          </div>

          {selectedView === 'list' ? (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {featuredTokens.map((symbol, index) => (
                <div
                  key={symbol}
                  className={`${index !== featuredTokens.length - 1 ? 'border-b' : ''}`}
                >
                  <div className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <CryptoIcon symbol={symbol} size="lg" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-gray-900">{symbol}</span>
                          {symbol === 'VDX' && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              Native
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500">
                          {symbol === 'VDX' ? 'Vindex Chain' : 
                           symbol === 'BTC' ? 'Bitcoin' :
                           symbol === 'ETH' ? 'Ethereum' :
                           symbol === 'SOL' ? 'Solana' :
                           symbol === 'XRP' ? 'Ripple' :
                           symbol === 'SUI' ? 'Sui Network' : symbol}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <PriceDisplay 
                        symbol={symbol} 
                        showChange={true}
                        size="lg"
                        className="justify-end"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <CryptoGrid 
                tokens={featuredTokens} 
                onTokenClick={handleTokenClick}
              />
            </div>
          )}
        </div>

        {/* Trending Tokens Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Trending Tokens</h2>
            <span className="text-sm text-gray-500">Popular in DeFi</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <CryptoGrid 
              tokens={trendingTokens} 
              onTokenClick={handleTokenClick}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <CryptoIcon symbol="BTC" size="md" />
              <h3 className="font-semibold text-gray-900">Bitcoin Dominance</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">42.3%</div>
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <TrendingUp className="w-4 h-4" />
              +1.2% from yesterday
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <CryptoIcon symbol="ETH" size="md" />
              <h3 className="font-semibold text-gray-900">ETH/BTC Ratio</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">0.0434</div>
            <div className="flex items-center gap-1 text-red-600 text-sm">
              <TrendingDown className="w-4 h-4" />
              -0.8% from yesterday
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <CryptoIcon symbol="VDX" size="md" />
              <h3 className="font-semibold text-gray-900">VDX Market Cap</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">$1.2B</div>
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <TrendingUp className="w-4 h-4" />
              +5.4% from yesterday
            </div>
          </div>
        </div>

        {/* Data Sources Info */}
        <div className={`mt-12 rounded-xl p-6 ${
          isRateLimited 
            ? 'bg-yellow-50 border border-yellow-200' 
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <h3 className={`font-semibold mb-3 ${
            isRateLimited ? 'text-yellow-900' : 'text-blue-900'
          }`}>
            {isRateLimited ? '⚠️ Development Mode' : '📊 Data Sources'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className={`font-medium ${
                isRateLimited ? 'text-yellow-800' : 'text-blue-800'
              }`}>
                Price Data:
              </span>
              <span className={`ml-2 ${
                isRateLimited ? 'text-yellow-700' : 'text-blue-700'
              }`}>
                {isRateLimited ? 'Mock data (CoinGecko rate limited)' : 'CoinGecko API (Real-time)'}
              </span>
            </div>
            <div>
              <span className={`font-medium ${
                isRateLimited ? 'text-yellow-800' : 'text-blue-800'
              }`}>
                Token Icons:
              </span>
              <span className={`ml-2 ${
                isRateLimited ? 'text-yellow-700' : 'text-blue-700'
              }`}>
                CoinGecko + CryptoCompare
              </span>
            </div>
            <div>
              <span className={`font-medium ${
                isRateLimited ? 'text-yellow-800' : 'text-blue-800'
              }`}>
                Update Frequency:
              </span>
              <span className={`ml-2 ${
                isRateLimited ? 'text-yellow-700' : 'text-blue-700'
              }`}>
                {isRateLimited ? 'Static demo data' : 'Every 5 minutes'}
              </span>
            </div>
            <div>
              <span className={`font-medium ${
                isRateLimited ? 'text-yellow-800' : 'text-blue-800'
              }`}>
                Cache Duration:
              </span>
              <span className={`ml-2 ${
                isRateLimited ? 'text-yellow-700' : 'text-blue-700'
              }`}>
                {isRateLimited ? 'Persistent until refresh' : '5 minutes for prices, 24 hours for icons'}
              </span>
            </div>
          </div>
          {isRateLimited && (
            <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> CoinGecko free API rate limit reached. Using realistic mock data for development. 
                In production, consider upgrading to CoinGecko Pro API for higher limits.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
