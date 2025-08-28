'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  RefreshCw
} from 'lucide-react';
import { phantomWalletService } from '../../../lib/phantom-wallet-service';
import { solflareWalletService } from '../../../lib/solflare-wallet-service';
import { useAuth } from '../../../lib/auth-context';
import { useRef, useLayoutEffect, useState as useReactState } from 'react';

interface WalletPanelProps {
  isOpen: boolean;
  onClose: () => void;
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
  const navRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const nav = document.querySelector('nav');
    if (nav) {
      setNavHeight(nav.getBoundingClientRect().height);
    }
  }, [isOpen]);
  const { user, api } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'receive' | 'history' | 'settings'>('overview');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userWallets, setUserWallets] = useState<any[]>([]);
  
  // Balances reales desde el backend
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([
    { symbol: 'VDX', balance: 0, usdValue: 0, icon: '🛡️' },
    { symbol: 'SOL', balance: 0, usdValue: 0, icon: '◎' },
    { symbol: 'XRP', balance: 0, usdValue: 0, icon: '💧' },
    { symbol: 'SUI', balance: 0, usdValue: 0, icon: '🌊' }
  ]);

  // Calcula el balance total en VDX
  const totalVdx = tokenBalances.find((t: TokenBalance) => t.symbol === 'VDX')?.balance || 0;

  // Función para obtener balances reales
  const fetchBalances = async () => {
    try {
      // Dirección del usuario (ajusta según tu lógica de cuentas)
      const address = user?.email || '';
      // Consulta el balance de cada token
      const tokens = [
        { symbol: 'VDX', icon: '🛡️' },
        { symbol: 'SOL', icon: '◎' },
        { symbol: 'XRP', icon: '💧' },
        { symbol: 'SUI', icon: '🌊' }
      ];
      const balances = await Promise.all(tokens.map(async (token) => {
        try {
          // Endpoint para cada token (ajusta si tienes endpoints específicos)
          const res = await fetch(`http://localhost:3001/api/accounts/${address}?token=${token.symbol}`);
          const data = await res.json();
          // Simula precio USD (en producción, consulta un API de precios)
          const usdValue = token.symbol === 'VDX' ? 0.5 : token.symbol === 'SOL' ? 50 : token.symbol === 'XRP' ? 0.5 : token.symbol === 'SUI' ? 0.3 : 0;
          return {
            symbol: token.symbol,
            balance: data.data?.balance || 0,
            usdValue: (data.data?.balance || 0) * usdValue,
            icon: token.icon
          };
        } catch (err) {
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
      const response = await fetch(`http://localhost:3001/api/auth/wallets`, {
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

  // Actualiza balances al abrir el panel y al refrescar
  useEffect(() => {
    if (isOpen) {
      fetchBalances();
      fetchUserWallets();
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

      // Get current user's wallet address
      if (!user?.email) {
        alert('User not authenticated');
        return;
      }

      // Make actual transaction using the API
      const transactionData = {
        from: user.email, // Using email as identifier for now
        to: sendForm.recipient,
        amount: amount,
        memo: sendForm.memo || ''
      };

      console.log('Creating transaction:', transactionData);
      
      // Call the actual transaction endpoint
      const response = await api.createTransaction(transactionData);
      
      if (response.success) {
        alert(`Transaction created successfully! TX ID: ${response.data.id}`);
        
        // Reset form
        setSendForm({ token: 'VDX', amount: '', recipient: '', memo: '' });
        
        // Refresh balances
        await fetchBalances();
        
        // Switch to history tab to show transaction
        setActiveTab('history');
      } else {
        alert(`Transaction failed: ${response.error}`);
      }
      
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
            <div className="relative p-7 bg-gradient-to-br from-red-600/80 to-red-700/80 rounded-b-3xl shadow-xl">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-3">
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
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
              {/* Total Balance */}
              <div className="text-center mt-2">
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
                  <h3 className="text-lg font-semibold">Receive Tokens</h3>
                  
                  <div className="space-y-4">
                    {/* VDX Wallet from blockchain */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🛡️</span>
                          <span className="font-semibold">VDX</span>
                          <span className="text-sm text-gray-500">(Vindex Chain)</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded text-sm break-all font-mono">
                        {userWallets.length > 0 ? userWallets[0].address : 'Loading wallet address...'}
                      </div>
                      
                      <button
                        onClick={() => copyAddress(userWallets.length > 0 ? userWallets[0].address : '')}
                        disabled={userWallets.length === 0}
                        className="mt-2 flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors text-sm disabled:opacity-50"
                      >
                        <Copy className="w-4 h-4" />
                        Copy VDX Address
                      </button>
                    </div>

                    {/* Other tokens with mock addresses for now */}
                    {tokenBalances.filter(token => token.symbol !== 'VDX').map((token) => (
                      <div key={token.symbol} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{token.icon}</span>
                            <span className="font-semibold">{token.symbol}</span>
                            <span className="text-sm text-gray-500">(External Chain)</span>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded text-sm break-all font-mono">
                          {token.symbol === 'SOL' ? 'So11111111111111111111111...' :
                           token.symbol === 'XRP' ? 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH' :
                           'sui1234567890abcdef...'}
                        </div>
                        
                        <button
                          onClick={() => copyAddress('mock-address')}
                          className="mt-2 flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors text-sm"
                        >
                          <Copy className="w-4 h-4" />
                          Copy Address
                        </button>
                        
                        <p className="text-xs text-gray-500 mt-2">
                          ⚠️ Bridge functionality coming soon
                        </p>
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
                      <h4 className="font-medium mb-2">Security</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Show Private Key</span>
                          <button
                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                            className="text-red-600 hover:text-red-700"
                          >
                            {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
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
                          <span>Phantom Wallet</span>
                          <span className="text-green-600">Connected</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Solflare Wallet</span>
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
