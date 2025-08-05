'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { enhancedPriceService, type TokenPrice } from '../../../lib/enhanced-price-service';
import { CryptoIcon } from './CryptoIcons';

interface PriceDisplayProps {
  symbol: string;
  amount?: number;
  showChange?: boolean;
  showUSDValue?: boolean;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceDisplay({ 
  symbol, 
  amount, 
  showChange = false, 
  showUSDValue = false,
  showIcon = false,
  className = '',
  size = 'md'
}: PriceDisplayProps) {
  const [price, setPrice] = useState<TokenPrice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    loadPrice();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadPrice, 30000);
    
    return () => clearInterval(interval);
  }, [symbol, isMounted]);

  const loadPrice = async () => {
    try {
      const priceData = await enhancedPriceService.getPrice(symbol);
      setPrice(priceData);
    } catch (error) {
      console.error(`Failed to load price for ${symbol}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (value: number): string => {
    return enhancedPriceService.formatPrice(value);
  };

  const getPriceChange = () => {
    if (!price) return null;
    return enhancedPriceService.formatPriceChange(price.priceChange24h);
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  // Durante SSR o antes de montar, mostrar skeleton
  if (!isMounted || isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showIcon && <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />}
        <div className="flex items-center gap-2">
          <div className="w-16 h-5 bg-gray-200 rounded animate-pulse" />
          {showChange && <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />}
        </div>
      </div>
    );
  }

  if (!price) {
    return (
      <div className={`${sizeClasses[size]} text-gray-400 ${className}`}>
        Price unavailable
      </div>
    );
  }

  const priceChange = getPriceChange();
  const usdValue = amount ? amount * price.price : null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Crypto Icon */}
      {showIcon && (
        <CryptoIcon 
          symbol={symbol} 
          size={size === 'lg' ? 'md' : size === 'md' ? 'sm' : 'xs'} 
        />
      )}
      
      {/* Main Price */}
      <span className={`font-semibold ${sizeClasses[size]}`}>
        {formatPrice(price.price)}
      </span>

      {/* Price Change */}
      {showChange && priceChange && (
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
          priceChange.isPositive 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {priceChange.isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{priceChange.text}</span>
        </div>
      )}

      {/* USD Value */}
      {showUSDValue && usdValue !== null && (
        <span className={`text-gray-500 ${sizeClasses[size === 'lg' ? 'md' : 'sm']}`}>
          ({formatPrice(usdValue)})
        </span>
      )}
    </div>
  );
}

interface TokenSelectorProps {
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  supportedTokens?: string[];
  className?: string;
}

export function TokenSelector({ 
  selectedSymbol, 
  onSelect, 
  supportedTokens,
  className = '' 
}: TokenSelectorProps) {
  const [prices, setPrices] = useState<Map<string, TokenPrice>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const tokens = supportedTokens || enhancedPriceService.getSupportedTokens();

  useEffect(() => {
    loadPrices();
    
    // Subscribe to price updates
    const unsubscribe = enhancedPriceService.onPriceUpdate((updatedPrices: Map<string, TokenPrice>) => {
      setPrices(new Map(updatedPrices));
    });

    return unsubscribe;
  }, []);

  const loadPrices = async () => {
    try {
      const priceMap = await enhancedPriceService.getPrices(tokens);
      setPrices(priceMap);
    } catch (error) {
      console.error('Failed to load prices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTokenLogo = (symbol: string): string => {
    const logos: Record<string, string> = {
      VDX: '🛡️',
      SOL: '☀️',
      XRP: '🌊',
      SUI: '💧',
      ETH: '⚡',
      BTC: '₿',
      USDC: '💵',
      USDT: '💲'
    };
    return logos[symbol] || '🪙';
  };

  return (
    <div className={`token-selector ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-gray-50 rounded-2xl">
        {tokens.map((symbol: string) => {
          const price = prices.get(symbol);
          const isSelected = symbol === selectedSymbol;
          
          return (
            <button
              key={symbol}
              onClick={() => onSelect(symbol)}
              className={`p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">{getTokenLogo(symbol)}</span>
                <span className="font-medium text-sm">{symbol}</span>
                
                {isLoading ? (
                  <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
                ) : price ? (
                  <span className="text-xs text-gray-500">
                    {enhancedPriceService.formatPrice(price.price)}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">N/A</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface PriceComparisonProps {
  fromSymbol: string;
  toSymbol: string;
  amount: number;
  className?: string;
}

export function PriceComparison({ 
  fromSymbol, 
  toSymbol, 
  amount, 
  className = '' 
}: PriceComparisonProps) {
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConversionRate();
  }, [fromSymbol, toSymbol]);

  const loadConversionRate = async () => {
    if (fromSymbol === toSymbol) {
      setConversionRate(1);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const rate = await enhancedPriceService.getConversionRate(fromSymbol, toSymbol);
      setConversionRate(rate);
    } catch (error) {
      console.error('Failed to load conversion rate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!conversionRate) {
    return (
      <div className={`text-center py-4 text-gray-400 ${className}`}>
        Conversion rate unavailable
      </div>
    );
  }

  const convertedAmount = amount * conversionRate;

  return (
    <div className={`price-comparison p-4 bg-blue-50 rounded-xl ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{amount}</div>
          <div className="text-sm text-gray-500">{fromSymbol}</div>
        </div>
        
        <div className="flex-1 text-center">
          <div className="text-gray-400">≈</div>
          <div className="text-xs text-gray-500">
            1 {fromSymbol} = {conversionRate.toFixed(6)} {toSymbol}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {convertedAmount.toFixed(6)}
          </div>
          <div className="text-sm text-gray-500">{toSymbol}</div>
        </div>
      </div>
    </div>
  );
}
