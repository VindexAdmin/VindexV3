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
  Settings
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import TransactionService, { SwapTransaction } from '../../../lib/transaction-service';
import BridgeService, { BridgeTransaction as BridgeTx, BridgeNetworkConfig } from '../../../lib/bridge-service';
import EnhancedBridgeService from '../../../lib/enhanced-bridge-service';
import WalletConnector, { type UnifiedConnection } from '../../components/ui/WalletConnector';
import { PriceDisplay, TokenSelector, PriceComparison } from '../../components/ui/PriceComponents';
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const [destinationAddress, setDestinationAddress] = useState('');
  
  const [isClient, setIsClient] = useState(false);

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

  // Clear destination address when changing to VDX network
  useEffect(() => {
    if (toNetwork === 'VDX') {
      setDestinationAddress('');
    }
  }, [toNetwork]);

  // Initialize client-side only state to prevent hydration errors
  useEffect(() => {
    setIsClient(true);
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
    setDestinationAddress(''); // Clear destination address on swap
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

    // Check SOL balance if bridging from SOL (using connected wallet)
    if (fromNetwork === 'SOL') {
      if (!walletConnection) {
        return 'Please connect a Solana wallet';
      }
      
      const solBalance = walletConnection.balance || 0;
      if (amount > solBalance) {
        return `Insufficient SOL balance. Available: ${solBalance.toFixed(4)} SOL`;
      }
    }

    // Validate destination address for external networks
    if (toNetwork !== 'VDX' && !destinationAddress) {
      return `Please enter a ${networks.find(n => n.id === toNetwork)?.symbol} destination address`;
    }

    // Basic address validation
    if (toNetwork === 'SOL' && destinationAddress) {
      if (destinationAddress.length < 32 || destinationAddress.length > 44) {
        return 'Invalid Solana address format';
      }
    }

    if (toNetwork === 'XRP' && destinationAddress) {
      if (!destinationAddress.startsWith('r') || destinationAddress.length < 25) {
        return 'Invalid XRP address format';
      }
    }

    if (toNetwork === 'SUI' && destinationAddress) {
      if (!destinationAddress.startsWith('0x') || destinationAddress.length !== 66) {
        return 'Invalid SUI address format (should start with 0x and be 64 characters)';
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

    // Prepare transaction details for confirmation
    const fromNet = networks.find(n => n.id === fromNetwork);
    const toNet = networks.find(n => n.id === toNetwork);
    const amount = parseFloat(fromAmount);
    const estimatedOutput = parseFloat(toAmount);
    const bridgeFee = getTotalFee();
    const exchangeRate = getExchangeRate();

    setPendingTransaction({
      fromNet,
      toNet,
      amount,
      estimatedOutput,
      bridgeFee,
      exchangeRate,
      userAddress: wallets?.[0]?.address || walletConnection?.address
    });

    setShowConfirmModal(true);
  };

  const confirmBridge = async () => {
    if (!pendingTransaction) return;

    setShowConfirmModal(false);
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const { fromNet, toNet, amount, estimatedOutput, bridgeFee, exchangeRate } = pendingTransaction;

      // Validate network configurations
      if (!fromNet || !toNet) {
        throw new Error('Invalid network configuration');
      }

      // Additional validation for cross-chain requirements
      if (fromNetwork === 'SOL' && !walletConnection) {
        throw new Error('Solana wallet not connected');
      }

      const bridgeTransaction: BridgeTx = {
        id: BridgeService.generateTransactionId(),
        fromNetwork: fromNetwork,
        toNetwork: toNetwork,
        fromToken: fromNet.symbol,
        toToken: toNet.symbol,
        fromAmount: amount,
        toAmount: estimatedOutput,
        status: 'pending',
        timestamp: Date.now(),
        estimatedCompletion: Date.now() + BridgeService.estimateBridgeTime(fromNetwork, toNetwork),
        userAddress: wallets?.[0]?.address || walletConnection?.address,
        bridgeFee: bridgeFee,
        exchangeRate: exchangeRate,
        destinationAddress: toNetwork !== 'VDX' ? destinationAddress : wallets?.[0]?.address
      };

      // Save bridge transaction using the service
      BridgeService.saveBridgeTransaction(bridgeTransaction);

      // Start real bridge execution with enhanced retry logic
      try {
        // Validate configuration first
        EnhancedBridgeService.validateBridgeConfiguration(bridgeTransaction);
        
        // Execute with retry logic
        await EnhancedBridgeService.executeBridgeWithRetry(bridgeTransaction, {
          maxRetries: 3,
          baseDelay: 2000, // 2 seconds
          maxDelay: 15000, // 15 seconds
          backoffMultiplier: 2
        });
        
        console.log('✅ Bridge execution initiated successfully with retry protection');
      } catch (bridgeError) {
        console.error('❌ Bridge execution failed after retries:', bridgeError);
        throw new Error(`Bridge execution failed: ${bridgeError instanceof Error ? bridgeError.message : 'Unknown error'}`);
      }

      // If bridging from VDX, create blockchain transaction
      if (fromNetwork === 'VDX' && wallets && wallets[0]) {
        const blockchainTransaction = {
          from: wallets[0].address,
          to: fromNet.contractAddress,
          amount: amount,
          type: 'bridge',
          data: {
            fromNetwork: fromNetwork,
            toNetwork: toNetwork,
            targetAddress: walletConnection?.address || 'user_external_address',
            bridgeId: bridgeTransaction.id,
            destinationChainId: toNet.chainId
          }
        };

        try {
          console.log('🔄 Submitting VDX blockchain transaction...');
          const response = await api.sendTransaction(blockchainTransaction);
          if (response.success) {
            BridgeService.updateBridgeTransactionStatus(bridgeTransaction.id, 'processing', {
              txHash: response.data?.transactionId || bridgeTransaction.id
            });
            console.log('✅ Blockchain transaction submitted:', response.data?.transactionId);
          } else {
            throw new Error(response.error || 'Blockchain transaction failed');
          }
        } catch (blockchainError) {
          console.error('❌ Blockchain bridge error:', blockchainError);
          BridgeService.updateBridgeTransactionStatus(bridgeTransaction.id, 'failed');
          throw new Error(`Blockchain transaction failed: ${blockchainError instanceof Error ? blockchainError.message : 'Unknown error'}`);
        }
      }

      setSuccess(`✅ Bridge transaction initiated successfully! Transaction ID: ${bridgeTransaction.id.slice(0, 8)}...`);
      setFromAmount('');
      setToAmount('');

    } catch (error: any) {
      console.error('❌ Bridge error:', error);
      const errorMessage = error.message || 'Bridge failed. Please try again.';
      
      // Add user-friendly error messages
      if (errorMessage.includes('Insufficient')) {
        setError('❌ Insufficient balance. Please check your wallet balance and try again.');
      } else if (errorMessage.includes('network')) {
        setError('❌ Network error. Please check your connection and try again.');
      } else if (errorMessage.includes('wallet')) {
        setError('❌ Wallet connection error. Please reconnect your wallet.');
      } else {
        setError(`❌ ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
      setPendingTransaction(null);
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 pt-24 sm:pt-28 lg:pt-32">
        {/* Mobile-first responsive grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          
          {/* Mobile: Stack all sections vertically */}
          {/* Desktop: Left Sidebar - Wallet Connection */}
          <div className="xl:col-span-1 order-3 xl:order-1">
            <div className="space-y-4 sm:space-y-6">
              
              {/* VDX Wallet Connection */}
              <WalletConnector 
                onConnectionChange={setWalletConnection}
                className="mb-6 sm:mb-8"
              />

              {/* Bridge Info - Hidden on mobile, collapsible on tablet */}
              <div className="hidden sm:block bg-white rounded-xl shadow-sm border p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Status</h3>
                
                {/* Network Health Indicators */}
                <div className="space-y-2 mb-4">
                  {networks.map((network) => (
                    <div key={network.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{network.icon}</span>
                        <span className="font-medium text-sm">{network.symbol}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          network.status === 'active' ? 'bg-green-500' :
                          network.status === 'maintenance' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></div>
                        <span className="text-xs text-gray-600 capitalize">{network.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <h4 className="text-md font-semibold text-gray-900 mb-3">How it Works</h4>
                <div className="space-y-3 sm:space-y-4 text-sm text-gray-600">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-xs font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Select Networks</p>
                      <p className="text-xs sm:text-sm">Choose source and destination blockchains</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-xs font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Lock Tokens</p>
                      <p className="text-xs sm:text-sm">Tokens are securely locked in bridge contract</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-xs font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Mint & Transfer</p>
                      <p className="text-xs sm:text-sm">Equivalent tokens minted on destination chain</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: Bridge Interface comes first */}
          {/* Desktop: Center - Bridge Interface */}
          <div className="xl:col-span-1 order-1 xl:order-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Bridge Header - Responsive */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-4 sm:px-6 py-3 sm:py-4 border-b border-red-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Cross-Chain Bridge</h2>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`p-2 rounded-lg transition-colors ${
                      showAdvanced 
                        ? 'bg-red-200 text-red-700' 
                        : 'hover:bg-red-200 text-red-600'
                    }`}
                  >
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-4 sm:space-y-6">
                {!isAuthenticated && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 mr-2" />
                      <p className="text-yellow-700 text-xs sm:text-sm">
                        Please connect your wallet to use the bridge
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-red-600 text-xs sm:text-sm pr-2">{error}</p>
                      <button
                        onClick={() => setError('')}
                        className="text-red-400 hover:text-red-600 text-lg"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-green-600 text-xs sm:text-sm pr-2">{success}</p>
                      <button
                        onClick={() => setSuccess('')}
                        className="text-green-400 hover:text-green-600 text-lg"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {showAdvanced && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">Advanced Settings</h4>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-700 mb-2">Slippage Tolerance</label>
                      <div className="flex space-x-2">
                        {[0.5, 1.0, 2.0].map(value => (
                          <button
                            key={value}
                            onClick={() => setSlippage(value)}
                            className={`px-3 py-1 rounded text-xs sm:text-sm transition-all duration-200 ${
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

                {/* From Network - Mobile Optimized */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">From</label>
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border-2 border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <select
                        value={fromNetwork}
                        onChange={(e) => setFromNetwork(e.target.value)}
                        className="bg-transparent text-base sm:text-lg font-semibold focus:outline-none min-w-0 flex-shrink-0"
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
                        className="text-right text-base sm:text-lg font-semibold bg-transparent focus:outline-none w-full min-w-0"
                        disabled={!isAuthenticated}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
                      <span className="truncate">{networks.find(n => n.id === fromNetwork)?.name}</span>
                      <span className="flex-shrink-0">Fee: {networks.find(n => n.id === fromNetwork)?.fee}%</span>
                    </div>
                  </div>
                </div>

                {/* Swap Button - Mobile Optimized */}
                <div className="flex justify-center py-2">
                  <button
                    onClick={handleSwapNetworks}
                    className="p-2 sm:p-3 bg-red-50 hover:bg-red-100 rounded-full transition-colors border border-red-200"
                    disabled={!isAuthenticated}
                  >
                    <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  </button>
                </div>

                {/* Price Comparison - Mobile Responsive */}
                {fromAmount && parseFloat(fromAmount) > 0 && (
                  <div className="my-3 sm:my-4">
                    <PriceComparison 
                      fromSymbol={networks.find(n => n.id === fromNetwork)?.symbol || fromNetwork}
                      toSymbol={networks.find(n => n.id === toNetwork)?.symbol || toNetwork}
                      amount={parseFloat(fromAmount)}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                )}

                {/* To Network - Mobile Optimized */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">To</label>
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border-2 border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <select
                        value={toNetwork}
                        onChange={(e) => setToNetwork(e.target.value)}
                        className="bg-transparent text-base sm:text-lg font-semibold focus:outline-none min-w-0 flex-shrink-0"
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
                        className="text-right text-base sm:text-lg font-semibold bg-transparent focus:outline-none w-full min-w-0"
                        disabled={!isAuthenticated}
                        readOnly
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
                      <span className="truncate">{networks.find(n => n.id === toNetwork)?.name}</span>
                      <span className="flex-shrink-0">Fee: {networks.find(n => n.id === toNetwork)?.fee}%</span>
                    </div>
                  </div>
                  
                  {/* Destination Address Input */}
                  {toNetwork !== 'VDX' && (
                    <div className="mt-2">
                      <label className="block text-xs sm:text-sm text-gray-700 mb-1">
                        Destination {networks.find(n => n.id === toNetwork)?.symbol} Address
                      </label>
                      <input
                        type="text"
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        placeholder={`Enter your ${networks.find(n => n.id === toNetwork)?.symbol} wallet address`}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        disabled={!isAuthenticated}
                      />
                      {toNetwork === 'SOL' && walletConnection?.address && (
                        <button
                          onClick={() => setDestinationAddress(walletConnection.address)}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Use connected Solana wallet: {walletConnection.address.slice(0, 8)}...{walletConnection.address.slice(-6)}
                        </button>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Make sure this address is correct. Transfers to wrong addresses cannot be recovered.
                      </p>
                    </div>
                  )}
                </div>

                {/* Exchange Rate & Details - Mobile Optimized */}
                {fromAmount && toAmount && (
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-lg space-y-2 text-xs sm:text-sm border">
                    <div className="flex justify-between items-start">
                      <span className="text-gray-600">Exchange Rate:</span>
                      <span className="font-medium text-right">1 {networks.find(n => n.id === fromNetwork)?.symbol} = {getExchangeRate().toFixed(6)} {networks.find(n => n.id === toNetwork)?.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bridge Fee:</span>
                      <span className="font-medium">{(getTotalFee() * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Time:</span>
                      <span className="font-medium">{networks.find(n => n.id === fromNetwork)?.estimatedTime}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-gray-200">
                      <span className="text-gray-600 font-medium">You will receive:</span>
                      <span className="font-semibold text-green-600">{parseFloat(toAmount).toFixed(6)} {networks.find(n => n.id === toNetwork)?.symbol}</span>
                    </div>
                  </div>
                )}

                {/* Bridge Button - Mobile Optimized */}
                <button
                  onClick={handleBridge}
                  disabled={!isAuthenticated || isLoading || !fromAmount || !toAmount}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {!isAuthenticated ? (
                    <span className="flex items-center justify-center">
                      <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Connect Wallet
                    </span>
                  ) : isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Bridge Tokens
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile: Activity comes after bridge interface */}
          {/* Desktop: Right Sidebar - Bridge Activity */}
          <div className="xl:col-span-1 order-2 xl:order-3">
            <div className="space-y-4 sm:space-y-6">
              
              {/* Recent Bridge Transactions - Mobile Optimized */}
              <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Bridge Activity</h3>
                {bridgeTransactions.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <Zap className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2" />
                    <p className="text-gray-500 text-xs sm:text-sm">No bridge transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {bridgeTransactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <span className="text-xs sm:text-sm font-medium truncate">
                              {tx.fromToken} → {tx.toToken}
                            </span>
                            <div className={`text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full flex-shrink-0 ${
                              tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              tx.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                              tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {tx.status}
                            </div>
                            {/* Show retry information */}
                            {tx.retryAttempt && tx.retryAttempt > 0 && (
                              <div className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 flex-shrink-0">
                                Retry {tx.retryAttempt}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            {tx.status === 'completed' ? (
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                            ) : tx.status === 'failed' ? (
                              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                            ) : (
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span className="truncate">{tx.fromAmount} {tx.fromToken}</span>
                          <span className="flex-shrink-0 ml-2">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                        </div>
                        
                        {/* Progress bar for processing transactions */}
                        {isClient && tx.status === 'processing' && tx.estimatedCompletion && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>{Math.min(100, Math.round(((Date.now() - tx.timestamp) / (tx.estimatedCompletion - tx.timestamp)) * 100))}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div 
                                className="bg-blue-600 h-1 rounded-full transition-all duration-1000" 
                                style={{ 
                                  width: `${Math.min(100, Math.round(((Date.now() - tx.timestamp) / (tx.estimatedCompletion - tx.timestamp)) * 100))}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                        {/* Show error information if failed */}
                        {tx.status === 'failed' && tx.error && (
                          <div className="mt-1 sm:mt-2 p-1.5 sm:p-2 bg-red-50 rounded text-xs text-red-700">
                            <div className="font-medium">Error:</div>
                            <div className="truncate">{tx.error}</div>
                            {tx.totalAttempts && (
                              <div className="text-red-600 mt-1">
                                Failed after {tx.totalAttempts} attempts
                              </div>
                            )}
                          </div>
                        )}
                        {tx.txHash && (
                          <div className="mt-1 sm:mt-2 flex items-center space-x-2">
                            <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-600 flex-shrink-0" />
                            <span className="text-xs text-blue-600 font-mono truncate">
                              {tx.txHash.slice(0, 12)}...
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Links - Mobile Optimized */}
              <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h3>
                <div className="space-y-2 sm:space-y-3">
                  <Link href="/swap" className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                      <span className="font-medium text-gray-900 text-sm sm:text-base">Swap Tokens</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </Link>
                  <Link href="/explorer" className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <Info className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                      <span className="font-medium text-gray-900 text-sm sm:text-base">View Explorer</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && pendingTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Confirm Bridge Transaction</h3>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg sm:text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 text-sm">From:</span>
                    <div className="text-right">
                      <div className="font-semibold text-sm sm:text-base">{pendingTransaction.amount} {pendingTransaction.fromNet.symbol}</div>
                      <div className="text-xs sm:text-sm text-gray-500">{pendingTransaction.fromNet.name}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center my-2">
                    <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">To:</span>
                    <div className="text-right">
                      <div className="font-semibold text-sm sm:text-base">{pendingTransaction.estimatedOutput.toFixed(6)} {pendingTransaction.toNet.symbol}</div>
                      <div className="text-xs sm:text-sm text-gray-500">{pendingTransaction.toNet.name}</div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-3 sm:pt-4 space-y-1 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exchange Rate:</span>
                    <span>1 {pendingTransaction.fromNet.symbol} = {pendingTransaction.exchangeRate.toFixed(6)} {pendingTransaction.toNet.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bridge Fee:</span>
                    <span>{(pendingTransaction.bridgeFee * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Time:</span>
                    <span>{pendingTransaction.fromNet.estimatedTime}</span>
                  </div>
                  {pendingTransaction.toNet.id !== 'VDX' && destinationAddress && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Destination:</span>
                      <span className="font-mono text-xs">
                        {destinationAddress.slice(0, 8)}...{destinationAddress.slice(-6)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold">
                    <span>You will receive:</span>
                    <span>{pendingTransaction.estimatedOutput.toFixed(6)} {pendingTransaction.toNet.symbol}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 sm:space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBridge}
                  disabled={isLoading}
                  className="flex-1 px-3 sm:px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-colors text-sm sm:text-base"
                >
                  {isLoading ? 'Processing...' : 'Confirm Bridge'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
