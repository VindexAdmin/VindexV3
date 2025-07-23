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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'receive' | 'history' | 'settings'>('overview');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Mock data - in production, get from blockchain services
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([
    { symbol: 'VDX', balance: 1500.25, usdValue: 750.12, icon: '🛡️' },
    { symbol: 'SOL', balance: 2.45, usdValue: 122.50, icon: '◎' },
    { symbol: 'XRP', balance: 100.0, usdValue: 50.00, icon: '💧' },
    { symbol: 'SUI', balance: 50.75, usdValue: 25.38, icon: '🌊' }
  ]);

  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'receive',
      amount: 100,
      token: 'VDX',
      from: 'Bridge Contract',
      date: new Date(Date.now() - 1000 * 60 * 30),
      status: 'completed',
      hash: 'vdx_123...abc'
    },
    {
      id: '2',
      type: 'bridge',
      amount: 1.5,
      token: 'SOL',
      to: 'VDX Bridge',
      date: new Date(Date.now() - 1000 * 60 * 60 * 2),
      status: 'completed',
      hash: 'sol_456...def'
    },
    {
      id: '3',
      type: 'send',
      amount: 50,
      token: 'VDX',
      to: 'vdx1abc...xyz',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24),
      status: 'completed',
      hash: 'vdx_789...ghi'
    }
  ]);

  const [sendForm, setSendForm] = useState({
    token: 'VDX',
    amount: '',
    recipient: '',
    memo: ''
  });

  const totalUsdValue = tokenBalances.reduce((sum, token) => sum + token.usdValue, 0);

  const refreshBalances = async () => {
    setIsRefreshing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, fetch real balances from blockchain services
      console.log('Refreshing wallet balances...');
      
    } catch (error) {
      console.error('Error refreshing balances:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSend = async () => {
    try {
      console.log('Sending transaction:', sendForm);
      // Implement actual send logic here
      
      // Reset form
      setSendForm({ token: 'VDX', amount: '', recipient: '', memo: '' });
      
      // Switch to history tab to show transaction
      setActiveTab('history');
      
    } catch (error) {
      console.error('Send transaction failed:', error);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    // Could add toast notification here
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
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Vindex Wallet</h2>
                    <p className="text-red-100 text-sm">{user?.email || 'Not logged in'}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Total Balance */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-3xl font-bold">${totalUsdValue.toFixed(2)}</p>
                  <button
                    onClick={refreshBalances}
                    disabled={isRefreshing}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <p className="text-red-100">Total Portfolio Value</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b bg-gray-50">
              {[
                { id: 'overview', icon: Wallet, label: 'Overview' },
                { id: 'send', icon: Send, label: 'Send' },
                { id: 'receive', icon: ArrowDownUp, label: 'Receive' },
                { id: 'history', icon: History, label: 'History' },
                { id: 'settings', icon: Settings, label: 'Settings' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 px-2 text-xs flex flex-col items-center gap-1 transition-colors ${
                    activeTab === tab.id
                      ? 'text-red-600 border-b-2 border-red-600 bg-white'
                      : 'text-gray-600 hover:text-red-600 hover:bg-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
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
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{token.icon}</span>
                            <div>
                              <p className="font-semibold">{token.symbol}</p>
                              <p className="text-sm text-gray-600">${token.usdValue.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{token.balance.toFixed(4)}</p>
                            <p className="text-sm text-gray-600">{token.symbol}</p>
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
                        className="p-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex flex-col items-center gap-2"
                      >
                        <Send className="w-6 h-6" />
                        <span className="text-sm font-medium">Send</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('receive')}
                        className="p-4 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex flex-col items-center gap-2"
                      >
                        <ArrowDownUp className="w-6 h-6 rotate-180" />
                        <span className="text-sm font-medium">Receive</span>
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
                    {tokenBalances.map((token) => (
                      <div key={token.symbol} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{token.icon}</span>
                            <span className="font-semibold">{token.symbol}</span>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded text-sm break-all font-mono">
                          {token.symbol === 'VDX' ? 'vdx1234567890abcdef...' : 
                           token.symbol === 'SOL' ? 'So11111111111111111111111...' :
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
