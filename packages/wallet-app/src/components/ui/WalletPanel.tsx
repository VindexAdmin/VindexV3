'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { 
  X, 
  Wallet, 
  Send, 
  ArrowDownUp, 
  History, 
  Settings, 
  Shield, 
  Copy, 
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  RefreshCw,
  QrCode,
  ChevronDown
} from 'lucide-react';
import { ethereumWalletService } from '../../../lib/ethereum-wallet-service';
import { bitcoinWalletService } from '../../../lib/bitcoin-wallet-service';
import { useAuth } from '../../../lib/auth-context';
import { useRef, useLayoutEffect, useState as useReactState } from 'react';

interface WalletPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Wallet {
  privateKey?: string;
  publicKey?: string;
  mnemonic?: string;
}

interface TokenBalance {
  symbol: string;
  balance: number;
  usdValue: number;
  icon: string;
}

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'bridge' | 'swap' | 'stake';
  amount: number;
  token: string;
  from?: string;
  to?: string;
  date: Date;
  status: 'pending' | 'completed' | 'failed';
  hash?: string;
}

export default function WalletPanel({ isOpen, onClose }: WalletPanelProps) {
  // Hook para calcular altura del Nav
  const [navHeight, setNavHeight] = useReactState(0);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const nav = document.querySelector('nav');
    if (nav) {
      setNavHeight(nav.getBoundingClientRect().height);
    }
  }, [isOpen]);
  const { user, api } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'receive' | 'history' | 'settings'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userWallets, setUserWallets] = useState<any[]>([]);
  
  // Balances reales desde el backend
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([
    { symbol: 'VDX', balance: 0, usdValue: 0, icon: '🛡️' },
    { symbol: 'ETH', balance: 0, usdValue: 0, icon: '⟠' },
    { symbol: 'BTC', balance: 0, usdValue: 0, icon: '₿' },
    { symbol: 'USDT', balance: 0, usdValue: 0, icon: '💵' }
  ]);

  // Calcula el balance total en VDX
  const totalVdx = tokenBalances.find((t: TokenBalance) => t.symbol === 'VDX')?.balance || 0;

  // Función para obtener balances reales
  const fetchBalances = async () => {
    try {
      const tokens = [
        { symbol: 'VDX', icon: '🛡️', service: null },
        { symbol: 'ETH', icon: '⟠', service: ethereumWalletService },
        { symbol: 'BTC', icon: '₿', service: bitcoinWalletService },
        { symbol: 'USDT', icon: '💵', service: null } // USDT will be handled through Ethereum
      ];

      const balances = await Promise.all(tokens.map(async (token) => {
        try {
          if (token.symbol === 'VDX') {
            // Use VDX native API
            const res = await fetch(`http://localhost:3001/api/accounts/${user?.email}?token=VDX`, {
              headers: {
                'Authorization': `Bearer ${api.getToken()}`
              }
            });
            const data = await res.json();
            return {
              symbol: token.symbol,
              balance: data.data?.balance || 0,
              usdValue: (data.data?.balance || 0) * 0.5, // VDX price
              icon: token.icon
            };
          } else if (token.service) {
            // Use blockchain service
            const { balance, usdValue } = await token.service.getBalance();
            return {
              symbol: token.symbol,
              balance: parseFloat(balance),
              usdValue: usdValue,
              icon: token.icon
            };
          } else {
            // USDT case - get from Ethereum contract
            const tokenContract = '0xdac17f958d2ee523a2206206994597c13d831ec7'; // USDT contract
            const response = await fetch(`https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${tokenContract}&address=${await ethereumWalletService.getAddress()}&tag=latest&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`);
            const data = await response.json();
            const balance = parseFloat(data.result) / 1e6; // USDT has 6 decimals
            return {
              symbol: token.symbol,
              balance: balance,
              usdValue: balance, // USDT is pegged to USD
              icon: token.icon
            };
          }
        } catch (err) {
          console.error(`Error fetching ${token.symbol} balance:`, err);
          return {
            symbol: token.symbol,
            balance: 0,
            usdValue: 0,
            icon: token.icon
          };
        }
      }));
      setTokenBalances(balances);
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  // Función para obtener las wallets del usuario
  const fetchUserWallets = async () => {
    try {
      if (!user?.email) return;
      
      // Llamada al endpoint para obtener wallets del usuario
      const response = await fetch(`http://localhost:3005/api/auth/wallets`, {
        headers: {
          'Authorization': `Bearer ${api.getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserWallets(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching user wallets:', error);
    }
  };

  // Conecta las wallets y actualiza balances
  useEffect(() => {
    if (isOpen) {
      // Conectar wallets primero
      const connectWallets = async () => {
        try {
          await ethereumWalletService.connect();
          await bitcoinWalletService.connect();
        } catch (error) {
          console.error('Error connecting wallets:', error);
        }
      };
      
      connectWallets().then(() => {
        fetchBalances();
        fetchUserWallets();
      });
    }
  }, [isOpen, user]);

  const refreshBalances = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchBalances(), fetchUserWallets()]);
    } catch (error) {
      console.error('Error refreshing balances:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        // Usar el VindexAPI en lugar de fetch directo
        const response = await api.getTransactionPool();
        if (response.success && Array.isArray(response.data) && response.data.length > 0) {
          // Mapea los datos del backend al formato esperado por el componente
          const txs = response.data.map((tx: any) => ({
            id: tx.id || tx.hash,
            type: tx.type || 'send',
            amount: tx.amount,
            token: 'VDX',
            from: tx.from,
            to: tx.to,
            date: new Date(tx.timestamp),
            status: 'pending',
            hash: tx.id || tx.hash
          }));
          setRecentTransactions(txs);
        } else {
          // Si no hay transacciones pendientes, limpiar la lista
          setRecentTransactions([]);
        }
      } catch (error) {
        console.warn('No pending transactions available:', error);
        setRecentTransactions([]);
      }
    }
    
    fetchTransactions();
    // Opcional: refrescar cada 10 segundos
    const interval = setInterval(fetchTransactions, 10000);
    return () => clearInterval(interval);
  }, [api]);

  const [sendForm, setSendForm] = useState({
    token: 'VDX',
    amount: '',
    recipient: '',
    memo: ''
  });

  const totalUsdValue = tokenBalances.reduce((sum, token) => sum + token.usdValue, 0);

  // ...existing code...

  const handleSend = async () => {
    try {
      if (!sendForm.amount || !sendForm.recipient) {
        alert('Please fill in all required fields');
        return;
      }

      const amount = parseFloat(sendForm.amount);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      let txHash;
      
      switch (sendForm.token) {
        case 'VDX':
          if (!user?.email) {
            alert('User not authenticated');
            return;
          }
          const response = await api.createTransaction({
            from: user.email,
            to: sendForm.recipient,
            amount: amount,
            memo: sendForm.memo || ''
          });
          if (response.success) {
            txHash = response.data.id;
          } else {
            throw new Error(response.error);
          }
          break;

        case 'ETH':
          txHash = await ethereumWalletService.sendTransaction(
            sendForm.recipient,
            sendForm.amount
          );
          break;

        case 'BTC':
          txHash = await bitcoinWalletService.sendTransaction(
            sendForm.recipient,
            sendForm.amount
          );
          break;

        case 'USDT':
          // Use Ethereum wallet service with USDT contract
          // This would need additional implementation for ERC20 transfers
          alert('USDT transfers coming soon');
          return;

        default:
          alert('Unsupported token');
          return;
      }

      alert(`Transaction created successfully! TX ID: ${txHash}`);
      
      // Reset form
      setSendForm({ token: 'VDX', amount: '', recipient: '', memo: '' });
      
      // Refresh balances
      await fetchBalances();
      
      // Switch to history tab to show transaction
      setActiveTab('history');
      
    } catch (error) {
      console.error('Send transaction failed:', error);
      alert(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const copyAddress = (address: string) => {
    if (!address) {
      alert('No address available to copy');
      return;
    }
    
    navigator.clipboard.writeText(address).then(() => {
      // Simple notification - you could replace with a toast library
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      notification.textContent = 'Address copied to clipboard!';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 2000);
    }).catch((err) => {
      console.error('Failed to copy address:', err);
      alert('Failed to copy address');
    });
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'send': return <Send className="w-4 h-4 text-red-500" />;
      case 'receive': return <ArrowDownUp className="w-4 h-4 text-green-500 rotate-180" />;
      case 'bridge': return <ArrowDownUp className="w-4 h-4 text-blue-500" />;
      case 'swap': return <ArrowDownUp className="w-4 h-4 text-purple-500" />;
      case 'stake': return <Shield className="w-4 h-4 text-orange-500" />;
      default: return <ArrowDownUp className="w-4 h-4 text-gray-500" />;
    }
  };

  useEffect(() => {
    // Initialize wallet data when the component mounts
    setWallet({
      privateKey: "mock-private-key-1234567890abcdef...",
      publicKey: "mock-public-key-1234567890abcdef...",
      mnemonic: "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
    });
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white/80 backdrop-blur-xl shadow-2xl z-50 overflow-hidden flex flex-col border-l border-red-100 sm:w-[420px]"
            style={{ boxShadow: '0 8px 32px rgba(220,38,38,0.18)', paddingTop: navHeight ? `${navHeight + 16}px` : '80px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Glassmorphism Card */}
            <div className="relative p-7 pt-2 bg-gradient-to-br from-red-600/80 to-red-700/80 rounded-b-3xl shadow-xl">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 -mt-2">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-red-200">
                    <Wallet className="w-7 h-7 text-red-600" />
                  </div>
                  <div className="truncate">
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white drop-shadow truncate">Vindex Wallet</h2>
                    <p className="text-red-100 text-xs sm:text-sm font-mono truncate">{user?.email || 'Not logged in'}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="absolute top-2 right-2 p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
              {/* Total Balance */}
              <div className="text-center mt-4">
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-4xl font-extrabold text-white drop-shadow">${totalUsdValue.toFixed(2)}</p>
                    <button
                      onClick={refreshBalances}
                      disabled={isRefreshing}
                      className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors border border-red-200"
                    >
                      <RefreshCw className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <p className="text-red-100 text-sm">Total Portfolio Value (USD)</p>
                  <p className="text-red-100 text-xs mt-1">Total VDX: <span className="font-bold">{totalVdx.toFixed(2)}</span></p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs - Modern Style */}
            <div className="flex border-b bg-white/80 backdrop-blur px-2">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'send', label: 'Send' },
                { id: 'receive', label: 'Receive' },
                { id: 'history', label: 'History' },
                { id: 'settings', label: 'Settings' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 sm:py-4 px-1 sm:px-2 text-xs sm:text-base font-semibold flex flex-col items-center gap-1 rounded-t-2xl transition-all duration-200 border-b-2 ${
                    activeTab === tab.id
                      ? 'text-red-600 border-red-600 bg-white shadow-lg scale-105'
                      : 'text-gray-500 border-transparent hover:text-red-600 hover:bg-red-50 hover:scale-105'
                  }`}
                  style={{ boxShadow: activeTab === tab.id ? '0 2px 12px rgba(220,38,38,0.08)' : undefined }}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Token Balances</h3>
                    <div className="space-y-3">
                      {tokenBalances.map((token) => (
                        <div
                          key={token.symbol}
                          className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xl sm:text-2xl">{token.icon}</span>
                            <div>
                              <p className="font-semibold text-sm sm:text-base">{token.symbol}</p>
                              <p className="text-xs sm:text-sm text-gray-600">${token.usdValue.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm sm:text-base">{token.balance.toFixed(4)}</p>
                            <p className="text-xs sm:text-sm text-gray-600">{token.symbol}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setActiveTab('send')}
                        className="p-3 sm:p-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex flex-col items-center gap-1 sm:gap-2"
                      >
                        <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="text-xs sm:text-sm font-medium">Send</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('receive')}
                        className="p-3 sm:p-4 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex flex-col items-center gap-1 sm:gap-2"
                      >
                        <ArrowDownUp className="w-5 h-5 sm:w-6 sm:h-6 rotate-180" />
                        <span className="text-xs sm:text-sm font-medium">Receive</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Send Tab */}
              {activeTab === 'send' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Send Tokens</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Token</label>
                      <select
                        value={sendForm.token}
                        onChange={(e) => setSendForm({ ...sendForm, token: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        {tokenBalances.map((token) => (
                          <option key={token.symbol} value={token.symbol}>
                            {token.symbol} - Balance: {token.balance.toFixed(4)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Amount</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={sendForm.amount}
                        onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Recipient Address</label>
                      <input
                        type="text"
                        placeholder="Enter wallet address"
                        value={sendForm.recipient}
                        onChange={(e) => setSendForm({ ...sendForm, recipient: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Memo (Optional)</label>
                      <input
                        type="text"
                        placeholder="Transaction note"
                        value={sendForm.memo}
                        onChange={(e) => setSendForm({ ...sendForm, memo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <button
                      onClick={handleSend}
                      disabled={!sendForm.amount || !sendForm.recipient}
                      className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send {sendForm.token}
                    </button>
                  </div>
                </div>
              )}

              {/* Receive Tab */}
              {activeTab === 'receive' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Receive Tokens</h3>
                    <button
                      onClick={() => fetchUserWallets()}
                      className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {/* VDX Wallet from blockchain */}
                    <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                            <span className="text-xl">🛡️</span>
                          </div>
                          <div>
                            <span className="font-semibold text-lg block">VDX</span>
                            <span className="text-sm text-gray-500 block">Vindex Chain Network</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyAddress(userWallets.length > 0 ? userWallets[0].address : '')}
                            disabled={userWallets.length === 0}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                            title="Copy Address"
                          >
                            <Copy className="w-5 h-5 text-gray-600" />
                          </button>
                          <button
                            onClick={() => setShowQR(true)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            title="Show QR Code"
                          >
                            <QrCode className="w-5 h-5 text-gray-600" />
                          </button>

                          {/* QR Code Modal */}
                          {showQR && userWallets.length > 0 && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                              <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 relative">
                                <button
                                  onClick={() => setShowQR(false)}
                                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                                
                                <div className="text-center mb-4">
                                  <h4 className="text-lg font-semibold">VDX Wallet Address</h4>
                                  <p className="text-sm text-gray-500">Scan to receive VDX tokens</p>
                                </div>

                                <div className="bg-white p-4 rounded-lg flex items-center justify-center">
                                  {/* TODO: Implementar generación real de QR */}
                                  <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <QrCode className="w-32 h-32 text-gray-400" />
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <div className="text-xs text-gray-500 text-center break-all font-mono">
                                    {userWallets[0].address}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="font-mono text-sm break-all text-gray-800">
                          {userWallets.length > 0 ? userWallets[0].address : 'Loading wallet address...'}
                        </div>
                      </div>
                      
                      <div className="mt-4 text-sm text-gray-500">
                        Use this address to receive VDX tokens on the Vindex Chain network.
                      </div>
                    </div>

                    {/* Other tokens with mock addresses for now */}
                    {tokenBalances.filter(token => token.symbol !== 'VDX').map((token) => (
                      <div key={token.symbol} className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow opacity-75">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                              <span className="text-xl">{token.icon}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-lg block">{token.symbol}</span>
                              <span className="text-sm text-gray-500 block">External Network</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              disabled
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                              title="Copy Address"
                            >
                              <Copy className="w-5 h-5 text-gray-400" />
                            </button>
                            <button
                              disabled
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                              title="Show QR Code"
                            >
                              <QrCode className="w-5 h-5 text-gray-400" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                          <div className="font-mono text-sm break-all text-gray-400">
                            Bridge Integration Coming Soon
                          </div>
                        </div>
                        
                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                          <span>⚠️</span>
                          <span>Bridge functionality for {token.symbol} is under development</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Transaction History</h3>
                  
                  <div className="space-y-3">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getTypeIcon(tx.type)}
                            <div>
                              <p className="font-semibold capitalize">{tx.type}</p>
                              <p className="text-sm text-gray-600">
                                {tx.date.toLocaleDateString()} {tx.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.token}
                            </p>
                            <p className={`text-sm ${getStatusColor(tx.status)} capitalize`}>
                              {tx.status}
                            </p>
                          </div>
                        </div>
                        
                        {tx.hash && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500 font-mono">{tx.hash}</span>
                            <button className="text-red-600 hover:text-red-700">
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Wallet Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium mb-4">Security</h4>
                      <div className="space-y-4">
                        {/* Private Key Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Private Key</span>
                            <button
                              onClick={() => setShowPrivateKey(!showPrivateKey)}
                              className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              {showPrivateKey ? 'Hide' : 'Reveal'}
                            </button>
                          </div>
                          {showPrivateKey && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-xs font-mono break-all text-gray-700">
                                {wallet?.privateKey || 'No private key available'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Public Key Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Public Key</span>
                            <button
                              onClick={() => setShowPublicKey(!showPublicKey)}
                              className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              {showPublicKey ? 'Hide' : 'Reveal'}
                            </button>
                          </div>
                          {showPublicKey && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-xs font-mono break-all text-gray-700">
                                {wallet?.publicKey || 'No public key available'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Mnemonic Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Recovery Phrase</span>
                            <button
                              onClick={() => setShowMnemonic(!showMnemonic)}
                              className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              {showMnemonic ? 'Hide' : 'Reveal'}
                            </button>
                          </div>
                          {showMnemonic && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="grid grid-cols-3 gap-2">
                                {wallet?.mnemonic?.split(' ').map((word, index) => (
                                  <div key={index} className="flex items-center">
                                    <span className="text-xs text-gray-500 w-4">{index + 1}.</span>
                                    <span className="text-xs font-mono text-gray-700">{word}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {showPrivateKey && (
                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-xs">
                            <p className="text-yellow-800 font-medium mb-2">⚠️ Keep this private!</p>
                            <p className="font-mono break-all">mock-private-key-1234567890abcdef...</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium mb-2">Connected Wallets</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Ethereum Wallet</span>
                          <span className="text-green-600">Connected</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Bitcoin Wallet</span>
                          <span className="text-green-600">Connected</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Tether Wallet</span>
                          <span className="text-gray-500">Disconnected</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium mb-2">Preferences</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Currency Display</span>
                          <select className="text-sm border rounded px-2 py-1">
                            <option>USD</option>
                            <option>EUR</option>
                            <option>BTC</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Auto-refresh</span>
                          <input type="checkbox" defaultChecked className="rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
