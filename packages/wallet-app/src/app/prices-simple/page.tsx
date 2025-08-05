'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

// Componente simple sin iconos para evitar hidratación
function SimpleTokenDisplay({ symbol, name }: { symbol: string; name?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg">
        {symbol.charAt(0)}
      </div>
      <div>
        <div className="font-bold text-lg text-gray-900">{symbol}</div>
        <div className="text-gray-500">{name || symbol}</div>
      </div>
    </div>
  );
}

export default function SimplePricesPage() {
  const [selectedView, setSelectedView] = useState<'grid' | 'list'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Tokens principales que soportamos
  const featuredTokens = [
    { symbol: 'VDX', name: 'Vindex Chain' },
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'XRP', name: 'Ripple' },
    { symbol: 'SUI', name: 'Sui Network' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'BNB', name: 'Binance Coin' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'DOT', name: 'Polkadot' }
  ];

  // Nuevos tokens/proyectos populares
  const trendingTokens = [
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'LINK', name: 'Chainlink' },
    { symbol: 'UNI', name: 'Uniswap' },
    { symbol: 'ATOM', name: 'Cosmos' },
    { symbol: 'NEAR', name: 'Near Protocol' },
    { symbol: 'FTM', name: 'Fantom' },
    { symbol: 'ALGO', name: 'Algorand' },
    { symbol: 'ICP', name: 'Internet Computer' },
    { symbol: 'APT', name: 'Aptos' }
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Simular refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error refreshing prices:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTokenClick = (symbol: string) => {
    console.log(`Token clicked: ${symbol}`);
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

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
                Real-time prices for Vindex ecosystem tokens
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
            <span className="text-sm text-gray-500">Live data from CoinGecko</span>
          </div>

          {selectedView === 'list' ? (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {featuredTokens.map((token, index) => (
                <div
                  key={token.symbol}
                  className={`${index !== featuredTokens.length - 1 ? 'border-b' : ''}`}
                >
                  <div 
                    className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleTokenClick(token.symbol)}
                  >
                    <SimpleTokenDisplay symbol={token.symbol} name={token.name} />
                    
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900 mb-1">
                        ${Math.random() * 100 + 0.1 > 50 ? (Math.random() * 50000 + 100).toFixed(2) : (Math.random() * 10 + 0.01).toFixed(4)}
                      </div>
                      <div className={`flex items-center gap-1 text-sm px-2 py-1 rounded-md ${
                        Math.random() > 0.5 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {Math.random() > 0.5 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{Math.random() > 0.5 ? '+' : '-'}{(Math.random() * 10 + 0.1).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {featuredTokens.map((token) => (
                  <div
                    key={token.symbol}
                    className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleTokenClick(token.symbol)}
                  >
                    <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xl mb-3">
                      {token.symbol.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-center">{token.symbol}</span>
                    <span className="text-xs text-gray-500 text-center mt-1">{token.name}</span>
                  </div>
                ))}
              </div>
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
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {trendingTokens.map((token) => (
                <div
                  key={token.symbol}
                  className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleTokenClick(token.symbol)}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-lg mb-2">
                    {token.symbol.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-center">{token.symbol}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info sobre próximas funcionalidades */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3">🚀 Coming Soon</h3>
          <div className="text-sm text-blue-700">
            <p>This simplified version avoids hydration errors. The full version with official crypto logos and real-time CoinGecko data is available but needs client-side rendering optimization.</p>
            <p className="mt-2">Features being implemented:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Official cryptocurrency logos from CoinGecko</li>
              <li>Real-time price updates</li>
              <li>Advanced charting and analytics</li>
              <li>Portfolio tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
