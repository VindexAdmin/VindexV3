'use client';

import React, { useState, useEffect } from 'react';
import { cryptoIconsService, type CryptoIconData } from '../../../lib/crypto-icons-service';

interface CryptoIconProps {
  symbol: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  className?: string;
  fallbackColor?: string;
}

export function CryptoIcon({ 
  symbol, 
  size = 'md', 
  showName = false,
  className = '',
  fallbackColor = '#DC2626'
}: CryptoIconProps) {
  const [icon, setIcon] = useState<CryptoIconData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
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
  }, [symbol, isMounted]);

  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6', 
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base', 
    lg: 'text-lg',
    xl: 'text-xl'
  };

  // Componente de fallback SVG
  const FallbackIcon = () => {
    const initial = symbol.charAt(0).toUpperCase();
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold ${textSizes[size]}`}
        style={{ backgroundColor: fallbackColor }}
      >
        {initial}
      </div>
    );
  };

  // Durante SSR o antes de que el componente se monte, mostrar loading
  if (!isMounted || isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full bg-gray-200 animate-pulse`} />
        {showName && <div className="w-16 h-4 bg-gray-200 animate-pulse rounded" />}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {icon && !imageError ? (
        <img
          src={icon.iconUrl}
          alt={`${icon.name} logo`}
          className={`${sizeClasses[size]} rounded-full`}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : (
        <FallbackIcon />
      )}
      
      {showName && icon && (
        <span className={`font-medium ${textSizes[size]}`}>
          {icon.name}
        </span>
      )}
    </div>
  );
}

interface TokenListItemProps {
  symbol: string;
  name?: string;
  balance?: number;
  usdValue?: number;
  onClick?: () => void;
  className?: string;
}

export function TokenListItem({
  symbol,
  name,
  balance,
  usdValue,
  onClick,
  className = ''
}: TokenListItemProps) {
  return (
    <div 
      className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <CryptoIcon symbol={symbol} size="md" />
        <div>
          <div className="font-semibold text-gray-900">{symbol}</div>
          {name && <div className="text-sm text-gray-500">{name}</div>}
        </div>
      </div>
      
      {(balance !== undefined || usdValue !== undefined) && (
        <div className="text-right">
          {balance !== undefined && (
            <div className="font-semibold text-gray-900">
              {balance.toLocaleString()} {symbol}
            </div>
          )}
          {usdValue !== undefined && (
            <div className="text-sm text-gray-500">
              ${usdValue.toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CryptoGridProps {
  tokens: string[];
  onTokenClick?: (symbol: string) => void;
  className?: string;
}

export function CryptoGrid({ tokens, onTokenClick, className = '' }: CryptoGridProps) {
  return (
    <div className={`grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 ${className}`}>
      {tokens.map((symbol) => (
        <div
          key={symbol}
          className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => onTokenClick?.(symbol)}
        >
          <CryptoIcon symbol={symbol} size="lg" />
          <span className="text-xs font-medium mt-2 text-center">{symbol}</span>
        </div>
      ))}
    </div>
  );
}
