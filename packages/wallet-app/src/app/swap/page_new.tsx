'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpDown, TrendingUp, RotateCcw, Settings, Info, Shield, Wallet, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';

interface Token {
  symbol: string;
  name: string;
  balance: number;
  price: number;
  logoUrl?: string;
}

interface LiquidityPool {
  id: string;
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  totalLiquidity: number;
  apy: number;
}

export default function Swap() {
  const { user, wallets, api, isAuthenticated } = useAuth();
  const [fromToken, setFromToken] = useState('VDX');
  const [toToken, setToToken] = useState('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('swap');

  const tokens: Token[] = [
    { symbol: 'VDX', name: 'Vindex Token', balance: Number(wallets?.[0]?.balance) || 0, price: 1.25 },
    { symbol: 'USDC', name: 'USD Coin', balance: 5000, price: 1.00 },
    { symbol: 'ETH', name: 'Ethereum', balance: 2.5, price: 2800 },
    { symbol: 'BTC', name: 'Bitcoin', balance: 0.1, price: 45000 },
    { symbol: 'WETH', name: 'Wrapped Ethereum', balance: 1.8, price: 2795 },
    { symbol: 'DAI', name: 'Dai Stablecoin', balance: 3500, price: 1.001 }
  ];

  const liquidityPools: LiquidityPool[] = [
    {
      id: '1',
      tokenA: 'VDX',
      tokenB: 'USDC',
      reserveA: 1000000,
      reserveB: 1250000,
      totalLiquidity: 1118033,
      apy: 12.5
    },
    {
      id: '2',
      tokenA: 'VDX',
      tokenB: 'ETH',
      reserveA: 2000000,
      reserveB: 892.86,
      totalLiquidity: 2499552,
      apy: 15.8
    },
    {
      id: '3',
      tokenA: 'USDC',
      tokenB: 'ETH',
      reserveA: 2800000,
      reserveB: 1000,
      totalLiquidity: 1673320,
      apy: 8.3
    }
  ];

  const getExchangeRate = () => {
    const fromTokenData = tokens.find(t => t.symbol === fromToken);
    const toTokenData = tokens.find(t => t.symbol === toToken);
    if (!fromTokenData || !toTokenData) return 0;
    return fromTokenData.price / toTokenData.price;
  };

  const fee = 0.003; // 0.3% fee

  const handleAmountChange = (value: string, isFrom: boolean) => {
    setError('');
    const exchangeRate = getExchangeRate();
    
    if (isFrom) {
      setFromAmount(value);
      if (value && !isNaN(parseFloat(value))) {
        const calculated = (parseFloat(value) * exchangeRate * (1 - fee)).toFixed(6);
        setToAmount(calculated);
      } else {
        setToAmount('');
      }
    } else {
      setToAmount(value);
      if (value && !isNaN(parseFloat(value))) {
        const calculated = (parseFloat(value) / exchangeRate / (1 - fee)).toFixed(6);
        setFromAmount(calculated);
      } else {
        setFromAmount('');
      }
    }
  };

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    const tempAmount = fromAmount;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const handleSwap = async () => {
    if (!isAuthenticated) {
      setError('Please log in to perform swaps');
      return;
    }

    if (!fromAmount || !toAmount) {
      setError('Please enter valid amounts');
      return;
    }

    const amount = parseFloat(fromAmount);
    const fromTokenData = tokens.find(t => t.symbol === fromToken);
    
    if (!fromTokenData || amount > fromTokenData.balance) {
      setError('Insufficient balance');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(`Successfully swapped ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`);
      setFromAmount('');
      setToAmount('');
      
      // Refresh balances
      // await fetchBalances();
    } catch (error: any) {
      setError('Swap failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPrice = (price: number) => {
    return price < 1 ? price.toFixed(6) : price.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-red-600" />
              <span className="text-xl font-bold text-gray-900">Vindex Chain</span>
            </Link>
            
            <div className="flex items-center space-x-8">
              <Link href="/explorer" className="text-gray-600 hover:text-gray-900">Explorer</Link>
              <Link href="/staking" className="text-gray-600 hover:text-gray-900">Staking</Link>
              <Link href="/swap" className="text-red-600 font-medium">Swap</Link>
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">Admin</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Vindex DEX</h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">
              Trade tokens instantly with deep liquidity and minimal fees on the Vindex ecosystem
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'swap', label: 'Swap', icon: ArrowUpDown },
                { id: 'pools', label: 'Liquidity Pools', icon: TrendingUp },
                { id: 'analytics', label: 'Analytics', icon: Info }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'swap' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Swap Tokens</h3>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  <Settings className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {showSettings && (
                <div className="mb-6 p-4 bg-gray-50 rounded-md">
                  <h4 className="font-medium text-gray-900 mb-3">Transaction Settings</h4>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Slippage Tolerance</label>
                    <div className="flex space-x-2">
                      {[0.1, 0.5, 1.0].map(value => (
                        <button
                          key={value}
                          onClick={() => setSlippage(value)}
                          className={`px-3 py-1 rounded text-sm ${
                            slippage === value 
                              ? 'bg-red-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {value}%
                        </button>
                      ))}
                      <input
                        type="number"
                        step="0.1"
                        value={slippage}
                        onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {!isAuthenticated && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-yellow-700 text-sm">
                      Please log in to access the swap functionality
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-600 text-sm">{success}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* From Token */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">From</label>
                  <div className="border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <select
                        value={fromToken}
                        onChange={(e) => setFromToken(e.target.value)}
                        className="bg-transparent text-lg font-medium focus:outline-none"
                        disabled={!isAuthenticated}
                      >
                        {tokens.map(token => (
                          <option key={token.symbol} value={token.symbol}>
                            {token.symbol}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={fromAmount}
                        onChange={(e) => handleAmountChange(e.target.value, true)}
                        placeholder="0.0"
                        className="text-right text-lg font-medium bg-transparent focus:outline-none w-full"
                        disabled={!isAuthenticated}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{tokens.find(t => t.symbol === fromToken)?.name}</span>
                      <span>
                        Balance: {formatNumber(tokens.find(t => t.symbol === fromToken)?.balance || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleSwapTokens}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    disabled={!isAuthenticated}
                  >
                    <ArrowUpDown className="h-5 w-5 text-gray-600" />
                  </button>
                </div>

                {/* To Token */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">To</label>
                  <div className="border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <select
                        value={toToken}
                        onChange={(e) => setToToken(e.target.value)}
                        className="bg-transparent text-lg font-medium focus:outline-none"
                        disabled={!isAuthenticated}
                      >
                        {tokens.filter(t => t.symbol !== fromToken).map(token => (
                          <option key={token.symbol} value={token.symbol}>
                            {token.symbol}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={toAmount}
                        onChange={(e) => handleAmountChange(e.target.value, false)}
                        placeholder="0.0"
                        className="text-right text-lg font-medium bg-transparent focus:outline-none w-full"
                        disabled={!isAuthenticated}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{tokens.find(t => t.symbol === toToken)?.name}</span>
                      <span>
                        Balance: {formatNumber(tokens.find(t => t.symbol === toToken)?.balance || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Exchange Rate & Details */}
              {fromAmount && toAmount && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Exchange Rate:</span>
                    <span>1 {fromToken} = {getExchangeRate().toFixed(6)} {toToken}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trading Fee (0.3%):</span>
                    <span>{(parseFloat(fromAmount) * fee).toFixed(6)} {fromToken}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price Impact:</span>
                    <span className="text-green-600">{"<0.01%"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minimum Received:</span>
                    <span>{(parseFloat(toAmount) * (1 - slippage / 100)).toFixed(6)} {toToken}</span>
                  </div>
                </div>
              )}

              {/* Swap Button */}
              <button
                onClick={handleSwap}
                disabled={!isAuthenticated || isLoading || !fromAmount || !toAmount}
                className="w-full mt-6 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {!isAuthenticated 
                  ? 'Connect Wallet' 
                  : isLoading 
                  ? 'Swapping...' 
                  : 'Swap Tokens'
                }
              </button>
            </div>
          </div>
        )}

        {activeTab === 'pools' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Liquidity Pools</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Provide liquidity to earn trading fees and liquidity mining rewards
              </p>
            </div>

            <div className="grid gap-6">
              {liquidityPools.map((pool) => (
                <div key={pool.id} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex -space-x-1">
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {pool.tokenA}
                        </div>
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {pool.tokenB}
                        </div>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900">
                        {pool.tokenA}/{pool.tokenB}
                      </h4>
                    </div>
                    <span className="text-lg font-bold text-green-600">{pool.apy}% APY</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Liquidity</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${formatNumber(pool.totalLiquidity)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{pool.tokenA} Reserve</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatNumber(pool.reserveA)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{pool.tokenB} Reserve</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatNumber(pool.reserveB)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">24h Volume</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${formatNumber(Math.random() * 100000)}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button 
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                      disabled={!isAuthenticated}
                    >
                      Add Liquidity
                    </button>
                    <button 
                      className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                      disabled={!isAuthenticated}
                    >
                      Remove Liquidity
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">DEX Analytics</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Real-time statistics and trading data for the Vindex DEX
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Volume (24h)
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ${formatNumber(1247893)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Wallet className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Liquidity
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ${formatNumber(5290905)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ArrowUpDown className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Trades (24h)
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatNumber(2847)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Token Prices */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Token Prices</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Token
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          24h Change
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Volume
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tokens.map((token) => (
                        <tr key={token.symbol} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3">
                                {token.symbol.slice(0, 2)}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {token.symbol}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {token.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${formatPrice(token.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            +{(Math.random() * 10).toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${formatNumber(Math.random() * 1000000)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
