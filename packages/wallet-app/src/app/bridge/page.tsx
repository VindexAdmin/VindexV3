'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  ArrowUpDown, 
  Shield, 
  Wallet, 
  AlertCircle, 
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  Zap,
  Settings,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import TransactionService, { SwapTransaction } from '../../../lib/transaction-service';
import BridgeService, { BridgeTransaction as BridgeTx, BridgeNetworkConfig } from '../../../lib/bridge-service';
import WalletConnector, { type UnifiedConnection } from '../../components/ui/WalletConnector';
import { PriceDisplay, TokenSelector, PriceComparison } from '../../components/ui/PriceComponents';
import { phantomWalletService } from '../../../lib/phantom-wallet-service';
import { solflareWalletService } from '../../../lib/solflare-wallet-service';
import Navigation from '../../components/ui/Navigation';

interface BridgeNetwork {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  color: string;
  exchangeRate: number; // VDX per 1 token
  fee: number; // percentage
  minAmount: number;
  maxAmount: number;
  estimatedTime: string;
  status: 'active' | 'maintenance' | 'disabled';
}

interface BridgeTransaction {
  id: string;
  fromNetwork: string;
  toNetwork: string;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  timestamp: number;
  estimatedCompletion?: number;
}

export default function Bridge() {
  const { user, wallets, api, isAuthenticated } = useAuth();
  const [fromNetwork, setFromNetwork] = useState('VDX');
  const [toNetwork, setToNetwork] = useState('SOL');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bridgeTransactions, setBridgeTransactions] = useState<BridgeTx[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [slippage, setSlippage] = useState(1.0);
  const [walletConnection, setWalletConnection] = useState<UnifiedConnection | null>(null);
  const [showPrices, setShowPrices] = useState(true);

  const networks: BridgeNetworkConfig[] = [
    {
      id: 'VDX',
      name: 'Vindex Chain',
      symbol: 'VDX',
      chainId: 1337,
      rpcUrl: 'http://localhost:3001',
      contractAddress: '0x742d35Cc6634C0532925a3b8D89e3734E1234567',
      explorerUrl: 'http://localhost:3002/explorer',
      icon: '🛡️',
      color: 'red',
      exchangeRate: 1,
      fee: 0.1,
      minAmount: 1,
      maxAmount: 1000000,
      estimatedTime: '2-5 minutes',
      status: 'active'
    },
    {
      id: 'SOL',
      name: 'Solana',
      symbol: 'SOL',
      chainId: 101,
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      contractAddress: 'BRIDGE_SOL_CONTRACT_ADDRESS',
      explorerUrl: 'https://explorer.solana.com',
      icon: '🟣',
      color: 'purple',
      exchangeRate: 0.008, // 1 SOL = 125 VDX
      fee: 0.25,
      minAmount: 0.01,
      maxAmount: 1000,
      estimatedTime: '5-10 minutes',
      status: 'active'
    },
    {
      id: 'XRP',
      name: 'XRP Ledger',
      symbol: 'XRP',
      chainId: 0,
      rpcUrl: 'https://s1.ripple.com:51234',
      contractAddress: 'BRIDGE_XRP_CONTRACT_ADDRESS',
      explorerUrl: 'https://xrpscan.com',
      icon: '💧',
      color: 'blue',
      exchangeRate: 0.5, // 1 XRP = 2 VDX
      fee: 0.15,
      minAmount: 0.5,
      maxAmount: 10000,
      estimatedTime: '3-7 minutes',
      status: 'active'
    },
    {
      id: 'SUI',
      name: 'Sui Network',
      symbol: 'SUI',
      chainId: 1,
      rpcUrl: 'https://fullnode.mainnet.sui.io:443',
      contractAddress: 'BRIDGE_SUI_CONTRACT_ADDRESS',
      explorerUrl: 'https://explorer.sui.io',
      icon: '🌊',
      color: 'cyan',
      exchangeRate: 0.6, // 1 SUI = 1.67 VDX
      fee: 0.2,
      minAmount: 0.1,
      maxAmount: 5000,
      estimatedTime: '4-8 minutes',
      status: 'active'
    }
  ];

  // Load bridge transactions and set up real-time updates
  useEffect(() => {
    const loadInitialTransactions = () => {
      const savedTransactions = BridgeService.getBridgeTransactions();
      setBridgeTransactions(savedTransactions.slice(0, 10));
    };

    loadInitialTransactions();

    const unsubscribe = BridgeService.onBridgeUpdate((event) => {
      const { allTransactions } = event.detail;
      setBridgeTransactions(allTransactions.slice(0, 10));
    });

    BridgeService.cleanOldBridgeTransactions();

    return unsubscribe;
  }, []);

  const saveBridgeTransaction = (tx: BridgeTx) => {
    BridgeService.saveBridgeTransaction(tx);
  };

  const getExchangeRate = () => {
    return BridgeService.calculateExchangeRate(fromNetwork, toNetwork, networks);
  };

  const getTotalFee = () => {
    return BridgeService.calculateBridgeFee(fromNetwork, toNetwork, parseFloat(fromAmount) || 0, networks);
  };

  const handleAmountChange = (value: string, isFrom: boolean) => {
    setError('');
    const exchangeRate = getExchangeRate();
    const fee = getTotalFee();
    
    if (isFrom) {
      setFromAmount(value);
      if (value && !isNaN(parseFloat(value))) {
        const calculated = parseFloat(value) * exchangeRate * (1 - fee);
        setToAmount(calculated.toFixed(6));
      } else {
        setToAmount('');
      }
    } else {
      setToAmount(value);
      if (value && !isNaN(parseFloat(value))) {
        const calculated = parseFloat(value) / exchangeRate / (1 - fee);
        setFromAmount(calculated.toFixed(6));
      } else {
        setFromAmount('');
      }
    }
  };

  const handleSwapNetworks = () => {
    const tempNetwork = fromNetwork;
    const tempAmount = fromAmount;
    setFromNetwork(toNetwork);
    setToNetwork(tempNetwork);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const validateBridge = () => {
    if (!isAuthenticated) {
      return 'Please connect your wallet to use the bridge';
    }

    if (!fromAmount || !toAmount) {
      return 'Please enter valid amounts';
    }

    const amount = parseFloat(fromAmount);
    const validation = BridgeService.validateBridgeTransaction(fromNetwork, toNetwork, amount, networks);
    
    if (!validation.isValid) {
      return validation.error;
    }

    // Check VDX balance if bridging from VDX
    if (fromNetwork === 'VDX' && wallets && wallets[0]) {
      const vdxBalance = Number(wallets[0].balance) || 0;
      if (amount > vdxBalance) {
        return 'Insufficient VDX balance';
      }
    }

    return null;
  };

  const handleBridge = async () => {
    const validationError = validateBridge();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const fromNet = networks.find(n => n.id === fromNetwork);
      const toNet = networks.find(n => n.id === toNetwork);
      const amount = parseFloat(fromAmount);
      const estimatedOutput = parseFloat(toAmount);
      const bridgeFee = getTotalFee();
      const exchangeRate = getExchangeRate();

      const bridgeTransaction: BridgeTx = {
        id: BridgeService.generateTransactionId(),
        fromNetwork: fromNetwork,
        toNetwork: toNetwork,
        fromToken: fromNet!.symbol,
        toToken: toNet!.symbol,
        fromAmount: amount,
        toAmount: estimatedOutput,
        status: 'pending',
        timestamp: Date.now(),
        estimatedCompletion: Date.now() + BridgeService.estimateBridgeTime(fromNetwork, toNetwork),
        userAddress: wallets?.[0]?.address,
        bridgeFee: bridgeFee,
        exchangeRate: exchangeRate
      };

      // Save bridge transaction using the service
      BridgeService.saveBridgeTransaction(bridgeTransaction);

      // Start real bridge execution (replaces simulation)
      BridgeService.executeBridge(bridgeTransaction);

      // If bridging from VDX, create blockchain transaction
      if (fromNetwork === 'VDX' && wallets && wallets[0]) {
        const blockchainTransaction = {
          from: wallets[0].address,
          to: fromNet!.contractAddress,
          amount: amount,
          type: 'bridge',
          data: {
            fromNetwork: fromNetwork,
            toNetwork: toNetwork,
            targetAddress: 'user_external_address', // In real implementation, user would provide this
            bridgeId: bridgeTransaction.id,
            destinationChainId: toNet!.chainId
          }
        };

        try {
          const response = await api.sendTransaction(blockchainTransaction);
          if (response.success) {
            BridgeService.updateBridgeTransactionStatus(bridgeTransaction.id, 'processing', {
              txHash: response.data?.transactionId || bridgeTransaction.id
            });
            console.log('Bridge transaction submitted to blockchain:', response.data?.transactionId);
          }
        } catch (error) {
          console.error('Blockchain bridge error:', error);
          BridgeService.updateBridgeTransactionStatus(bridgeTransaction.id, 'failed');
        }
      }

      setSuccess('Bridge transaction initiated! Please wait for confirmation.');
      setFromAmount('');
      setToAmount('');

    } catch (error: any) {
      console.error('Bridge error:', error);
      setError(error.message || 'Bridge failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getNetworkColor = (networkId: string) => {
    const network = networks.find(n => n.id === networkId);
    return network?.color || 'gray';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'processing': return 'blue';
      case 'completed': return 'green';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Sidebar - Wallet & Network Info */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Wallet Connection */}
            <WalletConnector 
              onConnectionChange={setWalletConnection}
              className="mb-6"
            />

            {/* Connected Wallet Info */}
            {walletConnection && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Connected Wallet
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {walletConnection.walletType === 'phantom' ? '👻' : '☀️'}
                    </span>
                    <span className="font-medium">
                      {walletConnection.walletType === 'phantom' ? 'Phantom Wallet' : 'Solflare Wallet'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Balance: {walletConnection.balance.toFixed(4)} SOL
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    {walletConnection.address.slice(0, 8)}...{walletConnection.address.slice(-8)}
                  </p>
                </div>
              </div>
            )}

            {/* Multi-Wallet Info */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Supported Wallets</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">👻</span>
                    <div>
                      <p className="font-medium">Phantom</p>
                      <p className="text-sm text-gray-500">Solana wallet</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    {phantomWalletService.isInstalled() ? (
                      <span className="text-green-600">✓ Installed</span>
                    ) : (
                      <span className="text-gray-400">Not installed</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">☀️</span>
                    <div>
                      <p className="font-medium">Solflare</p>
                      <p className="text-sm text-gray-500">Solana wallet</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    {solflareWalletService.isInstalled() ? (
                      <span className="text-green-600">✓ Installed</span>
                    ) : (
                      <span className="text-gray-400">Not installed</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Price Display */}
            {showPrices && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Live Prices</h3>
                  <button
                    onClick={() => setShowPrices(!showPrices)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">VDX</span>
                    <PriceDisplay symbol="VDX" showChange />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">SOL</span>
                    <PriceDisplay symbol="SOL" showChange />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">XRP</span>
                    <PriceDisplay symbol="XRP" showChange />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">SUI</span>
                    <PriceDisplay symbol="SUI" showChange />
                  </div>
                </div>
              </div>
            )}
            
            {/* Supported Networks */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Supported Networks</h3>
              <div className="space-y-3">
                {networks.map((network) => (
                  <div key={network.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{network.icon}</div>
                      <div>
                        <div className="font-medium text-gray-900">{network.name}</div>
                        <div className="text-sm text-gray-500">{network.symbol}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        network.status === 'active' ? 'bg-green-100 text-green-800' :
                        network.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {network.status}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{network.estimatedTime}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bridge Statistics */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bridge Stats</h3>
              <div className="space-y-4">
                {(() => {
                  const stats = BridgeService.getBridgeStatistics();
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">24h Volume</span>
                        <span className="font-semibold text-gray-900">${formatNumber(stats.dailyVolume * 1.25)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Bridged</span>
                        <span className="font-semibold text-gray-900">${formatNumber(stats.totalVolume * 1.25)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Success Rate</span>
                        <span className="font-semibold text-gray-900">{stats.successRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg. Time</span>
                        <span className="font-semibold text-gray-900">{Math.round(stats.averageTime)} min</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Center - Bridge Interface */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Bridge Header */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Cross-Chain Bridge</h2>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`p-2 rounded-lg transition-colors ${
                      showAdvanced 
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
                        Please connect your wallet to use the bridge
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

                {showAdvanced && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-3">Advanced Settings</h4>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Slippage Tolerance</label>
                      <div className="flex space-x-2">
                        {[0.5, 1.0, 2.0].map(value => (
                          <button
                            key={value}
                            onClick={() => setSlippage(value)}
                            className={`px-3 py-1 rounded text-sm transition-all duration-200 ${
                              slippage === value 
                                ? 'bg-red-600 text-white shadow-md' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {value}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* From Network */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">From</label>
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <select
                        value={fromNetwork}
                        onChange={(e) => setFromNetwork(e.target.value)}
                        className="bg-transparent text-lg font-semibold focus:outline-none"
                        disabled={!isAuthenticated}
                      >
                        {networks.map(network => (
                          <option key={network.id} value={network.id}>
                            {network.icon} {network.symbol}
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
                      <span>{networks.find(n => n.id === fromNetwork)?.name}</span>
                      <span>Fee: {networks.find(n => n.id === fromNetwork)?.fee}%</span>
                    </div>
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleSwapNetworks}
                    className="p-3 bg-red-50 hover:bg-red-100 rounded-full transition-colors border border-red-200"
                    disabled={!isAuthenticated}
                  >
                    <ArrowUpDown className="h-5 w-5 text-red-600" />
                  </button>
                </div>

                {/* Price Comparison */}
                {fromAmount && parseFloat(fromAmount) > 0 && (
                  <PriceComparison 
                    fromSymbol={networks.find(n => n.id === fromNetwork)?.symbol || fromNetwork}
                    toSymbol={networks.find(n => n.id === toNetwork)?.symbol || toNetwork}
                    amount={parseFloat(fromAmount)}
                    className="my-4"
                  />
                )}

                {/* To Network */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">To</label>
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <select
                        value={toNetwork}
                        onChange={(e) => setToNetwork(e.target.value)}
                        className="bg-transparent text-lg font-semibold focus:outline-none"
                        disabled={!isAuthenticated}
                      >
                        {networks.filter(n => n.id !== fromNetwork).map(network => (
                          <option key={network.id} value={network.id}>
                            {network.icon} {network.symbol}
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
                        readOnly
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{networks.find(n => n.id === toNetwork)?.name}</span>
                      <span>Fee: {networks.find(n => n.id === toNetwork)?.fee}%</span>
                    </div>
                  </div>
                </div>

                {/* Exchange Rate & Details */}
                {fromAmount && toAmount && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm border">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Exchange Rate:</span>
                      <span className="font-medium">1 {networks.find(n => n.id === fromNetwork)?.symbol} = {getExchangeRate().toFixed(6)} {networks.find(n => n.id === toNetwork)?.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bridge Fee:</span>
                      <span className="font-medium">{(getTotalFee() * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Time:</span>
                      <span className="font-medium">{networks.find(n => n.id === fromNetwork)?.estimatedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">You will receive:</span>
                      <span className="font-medium">{parseFloat(toAmount).toFixed(6)} {networks.find(n => n.id === toNetwork)?.symbol}</span>
                    </div>
                  </div>
                )}

                {/* Bridge Button */}
                <button
                  onClick={handleBridge}
                  disabled={!isAuthenticated || isLoading || !fromAmount || !toAmount}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 px-6 rounded-lg hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {!isAuthenticated 
                    ? 'Connect Wallet' 
                    : isLoading 
                    ? 'Processing...' 
                    : 'Bridge Tokens'
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Bridge Activity */}
          <div className="lg:col-span-1 space-y-6">
            {/* Recent Bridge Transactions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bridge Activity</h3>
              {bridgeTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">No bridge transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bridgeTransactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            {tx.fromToken} → {tx.toToken}
                          </span>
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            tx.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {tx.status}
                          </div>
                        </div>
                        <div className="text-right">
                          {tx.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : tx.status === 'failed' ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{tx.fromAmount} {tx.fromToken}</span>
                        <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                      </div>
                      {tx.txHash && (
                        <div className="mt-2 flex items-center space-x-2">
                          <ExternalLink className="h-3 w-3 text-blue-600" />
                          <span className="text-xs text-blue-600 font-mono truncate">
                            {tx.txHash.slice(0, 16)}...
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bridge Info */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">How it Works</h3>
              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Select Networks</p>
                    <p>Choose source and destination blockchains</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Lock Tokens</p>
                    <p>Tokens are securely locked in bridge contract</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Mint & Transfer</p>
                    <p>Equivalent tokens minted on destination chain</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/swap" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <ArrowUpDown className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Swap Tokens</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </Link>
                <Link href="/explorer" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Info className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">View Explorer</span>
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
