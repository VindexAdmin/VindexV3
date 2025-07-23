'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpDown, TrendingUp, RotateCcw, Settings, Info, Shield, Wallet, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import TransactionService, { SwapTransaction } from '../../../lib/transaction-service';
import Navigation from '../../components/ui/Navigation';

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
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recentTransactions, setRecentTransactions] = useState<SwapTransaction[]>([]);

  const handlePoolClick = (poolId: string) => {
    setSelectedPool(selectedPool === poolId ? null : poolId);
  };

  const handleTransactionClick = (txId: string) => {
    setSelectedTransaction(selectedTransaction === txId ? null : txId);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleQuickSwap = (tokenA: string, tokenB: string) => {
    setFromToken(tokenA);
    setToToken(tokenB);
    setFromAmount('');
    setToAmount('');
    setError('');
    setSuccess('');
  };

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

  // Load recent transactions and set up real-time updates
  useEffect(() => {
    const loadInitialTransactions = () => {
      const savedTransactions = TransactionService.getLocalTransactions();
      setRecentTransactions(savedTransactions.slice(0, 10));
    };

    loadInitialTransactions();

    const unsubscribe = TransactionService.onTransactionUpdate((event) => {
      const { allTransactions } = event.detail;
      setRecentTransactions(allTransactions.slice(0, 10));
    });

    TransactionService.cleanOldTransactions();

    return unsubscribe;
  }, []);

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

  const handleMaxAmount = () => {
    const fromTokenData = tokens.find(t => t.symbol === fromToken);
    if (fromTokenData) {
      handleAmountChange(fromTokenData.balance.toString(), true);
    }
  };

  const handleConnectWallet = () => {
    // Redirect to login/wallet connection
    window.location.href = '/auth/login';
  };

  const handleRefreshData = async () => {
    setIsLoading(true);
    try {
      // Simulate data refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Market data refreshed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  const validateSwap = () => {
    if (!isAuthenticated) {
      return 'Please connect your wallet to perform swaps';
    }

    if (!fromAmount || !toAmount) {
      return 'Please enter valid amounts';
    }

    if (!wallets || wallets.length === 0) {
      return 'No wallet available. Please create a wallet first.';
    }

    const amount = parseFloat(fromAmount);
    const fromTokenData = tokens.find(t => t.symbol === fromToken);
    
    if (!fromTokenData || amount > fromTokenData.balance) {
      return 'Insufficient balance';
    }

    if (amount <= 0) {
      return 'Amount must be greater than 0';
    }

    if (fromToken === toToken) {
      return 'Cannot swap the same token';
    }

    return null;
  };

  const handleSwap = async () => {
    const validationError = validateSwap();
    if (validationError) {
      setError(validationError);
      return;
    }

    const amount = parseFloat(fromAmount);
    const minAmountOut = parseFloat(toAmount) * (1 - slippage / 100);

    setIsLoading(true);
    setError('');
    
    try {
      const transactionId = TransactionService.generateTransactionId();
      
      const blockchainTransaction = {
        from: wallets[0].address,
        to: 'SWAP_CONTRACT',
        amount: amount,
        type: 'swap',
        data: {
          tokenA: fromToken,
          tokenB: toToken,
          amountIn: amount,
          minAmountOut: minAmountOut,
          slippage: slippage
        }
      };

      const localTransaction: SwapTransaction = {
        id: transactionId,
        type: 'swap' as const,
        from: wallets[0].address,
        to: 'SWAP_CONTRACT',
        amount: amount,
        timestamp: Date.now(),
        status: 'pending' as const,
        data: {
          tokenA: fromToken,
          tokenB: toToken,
          amountIn: amount,
          amountOut: parseFloat(toAmount),
          slippage: slippage,
          exchangeRate: parseFloat(toAmount) / amount,
          fee: amount * fee
        }
      };

      TransactionService.saveTransaction(localTransaction);

      try {
        const response = await api.sendTransaction(blockchainTransaction);
        
        if (response.success) {
          TransactionService.updateTransactionStatus(transactionId, 'confirmed', {
            txHash: response.data?.transactionId || transactionId,
            blockNumber: response.data?.blockNumber
          });
          
          setSuccess(`Successfully created swap transaction: ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`);
          setFromAmount('');
          setToAmount('');
        } else {
          TransactionService.updateTransactionStatus(transactionId, 'failed', {
            error: response.error || 'Blockchain transaction failed'
          });
          setError(response.error || 'Swap transaction failed');
        }
      } catch (blockchainError: any) {
        TransactionService.updateTransactionStatus(transactionId, 'failed', {
          error: blockchainError.message || 'Blockchain communication failed'
        });
        throw blockchainError;
      }
      
    } catch (error: any) {
      console.error('Swap error:', error);
      setError(error.message || 'Swap failed. Please try again.');
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
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Sidebar - Market Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Token Prices */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Token Prices</h3>
                <button
                  onClick={handleRefreshData}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <RotateCcw className={`h-4 w-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="space-y-3">
                {tokens.slice(0, 4).map((token) => (
                  <div key={token.symbol} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {token.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{token.symbol}</div>
                        <div className="text-sm text-gray-500">{token.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">${formatPrice(token.price)}</div>
                      <div className="text-sm text-green-600">+{(Math.random() * 10).toFixed(2)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Pools */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pools</h3>
              <div className="space-y-3">
                {liquidityPools.slice(0, 3).map((pool) => (
                  <div key={pool.id}>
                    <div 
                      className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors"
                      onClick={() => handlePoolClick(pool.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white"></div>
                          <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white"></div>
                        </div>
                        <span className="font-medium text-gray-900">{pool.tokenA}/{pool.tokenB}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-green-600">{pool.apy}% APY</div>
                        <div className="text-xs text-gray-500">${formatNumber(pool.totalLiquidity)}</div>
                      </div>
                    </div>
                    
                    {selectedPool === pool.id && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Reserve {pool.tokenA}:</span>
                            <span className="font-medium">{formatNumber(pool.reserveA)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Reserve {pool.tokenB}:</span>
                            <span className="font-medium">{formatNumber(pool.reserveB)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Liquidity:</span>
                            <span className="font-medium">${formatNumber(pool.totalLiquidity)}</span>
                          </div>
                          <button
                            onClick={() => handleQuickSwap(pool.tokenA, pool.tokenB)}
                            className="w-full mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                          >
                            Quick Swap {pool.tokenA} → {pool.tokenB}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center - Swap Interface */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Swap Header */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Swap Tokens</h2>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-lg transition-colors ${
                      showSettings 
                        ? 'bg-red-200 text-red-700' 
                        : 'hover:bg-red-200 text-red-600'
                    }`}
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {!isAuthenticated && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                      <p className="text-yellow-700 text-sm">
                        Please log in to access the swap functionality
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-red-600 text-sm">{error}</p>
                      <button
                        onClick={() => setError('')}
                        className="text-red-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-green-600 text-sm">{success}</p>
                      <button
                        onClick={() => setSuccess('')}
                        className="text-green-400 hover:text-green-600"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {showSettings && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-3">Transaction Settings</h4>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Slippage Tolerance</label>
                      <div className="flex space-x-2">
                        {[0.1, 0.5, 1.0].map(value => (
                          <button
                            key={value}
                            onClick={() => {
                              setSlippage(value);
                              setSuccess(`Slippage tolerance set to ${value}%`);
                              setTimeout(() => setSuccess(''), 2000);
                            }}
                            className={`px-3 py-1 rounded text-sm transition-all duration-200 ${
                              slippage === value 
                                ? 'bg-red-600 text-white shadow-md' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-sm'
                            }`}
                          >
                            {value}%
                          </button>
                        ))}
                        <input
                          type="number"
                          value={slippage}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (value >= 0.1 && value <= 50) {
                              setSlippage(value);
                            }
                          }}
                          className="px-2 py-1 w-16 text-sm border border-gray-300 rounded focus:outline-none focus:border-red-500"
                          step="0.1"
                          min="0.1"
                          max="50"
                          placeholder="Custom"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* From Token */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">From</label>
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <select
                        value={fromToken}
                        onChange={(e) => setFromToken(e.target.value)}
                        className="bg-transparent text-lg font-semibold focus:outline-none"
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
                        className="text-right text-lg font-semibold bg-transparent focus:outline-none w-full"
                        disabled={!isAuthenticated}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>${formatPrice(tokens.find(t => t.symbol === fromToken)?.price || 0)}</span>
                      <div className="flex items-center space-x-2">
                        <span>
                          Balance: {formatNumber(tokens.find(t => t.symbol === fromToken)?.balance || 0)}
                        </span>
                        <button
                          onClick={handleMaxAmount}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          disabled={!isAuthenticated}
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleSwapTokens}
                    className="p-3 bg-red-50 hover:bg-red-100 rounded-full transition-colors border border-red-200"
                    disabled={!isAuthenticated}
                  >
                    <ArrowUpDown className="h-5 w-5 text-red-600" />
                  </button>
                </div>

                {/* To Token */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">To</label>
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <select
                        value={toToken}
                        onChange={(e) => setToToken(e.target.value)}
                        className="bg-transparent text-lg font-semibold focus:outline-none"
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
                        className="text-right text-lg font-semibold bg-transparent focus:outline-none w-full"
                        disabled={!isAuthenticated}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>${formatPrice(tokens.find(t => t.symbol === toToken)?.price || 0)}</span>
                      <span>
                        Balance: {formatNumber(tokens.find(t => t.symbol === toToken)?.balance || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Exchange Rate & Details */}
                {fromAmount && toAmount && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm border">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Exchange Rate:</span>
                      <span className="font-medium">1 {fromToken} = {getExchangeRate().toFixed(6)} {toToken}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trading Fee (0.3%):</span>
                      <span className="font-medium">{(parseFloat(fromAmount) * fee).toFixed(6)} {fromToken}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price Impact:</span>
                      <span className="text-green-600 font-medium">{"<0.01%"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Minimum Received:</span>
                      <span className="font-medium">{(parseFloat(toAmount) * (1 - slippage / 100)).toFixed(6)} {toToken}</span>
                    </div>
                  </div>
                )}

                {/* Swap Button */}
                <button
                  onClick={!isAuthenticated ? handleConnectWallet : handleSwap}
                  disabled={isAuthenticated && (isLoading || !fromAmount || !toAmount)}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 px-6 rounded-lg hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {!isAuthenticated 
                    ? 'Connect Wallet' 
                    : isLoading 
                    ? 'Processing...' 
                    : 'Swap Tokens'
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Activity & Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <RotateCcw className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">No recent transactions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.slice(0, 5).map((tx) => (
                    <div key={tx.id}>
                      <div 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => handleTransactionClick(tx.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <ArrowUpDown className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {tx.data?.tokenA} → {tx.data?.tokenB}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(tx.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {tx.data?.amountIn} {tx.data?.tokenA}
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            tx.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {tx.status}
                          </div>
                        </div>
                      </div>
                      
                      {selectedTransaction === tx.id && (
                        <div className="mt-2 p-3 bg-white border rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">Transaction Details</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">TX ID:</span>
                              <button
                                onClick={() => copyToClipboard(tx.id)}
                                className="font-mono text-blue-600 hover:text-blue-800 truncate max-w-32"
                              >
                                {tx.id.slice(0, 16)}...
                              </button>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Amount In:</span>
                              <span className="font-medium">{tx.data?.amountIn} {tx.data?.tokenA}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Amount Out:</span>
                              <span className="font-medium">{tx.data?.amountOut} {tx.data?.tokenB}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Exchange Rate:</span>
                              <span className="font-medium">{tx.data?.exchangeRate?.toFixed(6)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Fee:</span>
                              <span className="font-medium">{tx.data?.fee?.toFixed(6)} {tx.data?.tokenA}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Slippage:</span>
                              <span className="font-medium">{tx.data?.slippage}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Timestamp:</span>
                              <span className="font-medium">{new Date(tx.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Market Stats */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">24h Volume</span>
                  <span className="font-semibold text-gray-900">${formatNumber(1247893)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Liquidity</span>
                  <span className="font-semibold text-gray-900">${formatNumber(5290905)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Trades</span>
                  <span className="font-semibold text-gray-900">{formatNumber(2847)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Pairs</span>
                  <span className="font-semibold text-gray-900">{liquidityPools.length}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/bridge" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <ArrowUpDown className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Cross-Chain Bridge</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </Link>
                <Link href="/explorer" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">View Explorer</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </Link>
                <Link href="/staking" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Stake Tokens</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
