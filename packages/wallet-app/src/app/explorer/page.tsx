'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';
import TransactionService, { SwapTransaction, BlockchainTransaction } from '../../../lib/transaction-service';
import Navigation from '../../components/ui/Navigation';

interface Block {
  index: number;
  hash: string;
  previousHash: string;
  timestamp: number;
  transactionCount: number;
  validator?: string;
  difficulty?: number;
  nonce?: string;
  merkleRoot?: string;
}

interface Transaction {
  hash?: string;
  id?: string;
  fromAddress?: string;
  toAddress?: string;
  from?: string;
  to?: string;
  amount: number;
  fee?: number;
  timestamp: number;
  blockHash?: string;
  status: 'confirmed' | 'pending' | 'failed';
  type?: string;
  data?: {
    tokenA?: string;
    tokenB?: string;
    amountIn?: number;
    amountOut?: number;
    slippage?: number;
  };
}

interface NetworkStats {
  chainLength: number;
  totalTransactions: number;
  circulatingSupply: number;
  burnedTokens: number;
  validators: number;
  latestBlock: {
    index: number;
    hash: string;
    timestamp: number;
    transactionCount: number;
  };
}

export default function Explorer() {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('blocks');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNetworkData();
    
    // Suscribirse a actualizaciones de transacciones en tiempo real
    const unsubscribe = TransactionService.onTransactionUpdate(() => {
      // Refrescar datos cuando hay nuevas transacciones
      fetchNetworkData();
    });

    const interval = setInterval(fetchNetworkData, 15000); // Update every 15 seconds
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const fetchNetworkData = async () => {
    try {
      setError('');
      
      // Fetch network stats
      const statsResponse = await api.getBlockchainInfo();
      if (statsResponse.success) {
        setNetworkStats(statsResponse.data);
      }

      // Fetch recent blocks
      const blocksResponse = await api.getBlocks(10, 0);
      if (blocksResponse.success) {
        setBlocks(blocksResponse.data || []);
      }

      // Combinar transacciones del blockchain con transacciones locales
      let blockchainTransactions: BlockchainTransaction[] = [];
      let localTransactions: SwapTransaction[] = [];

      try {
        // Intentar obtener transacciones del blockchain
        const poolResponse = await api.getTransactionPool();
        if (poolResponse.success && poolResponse.data && poolResponse.data.length > 0) {
          blockchainTransactions = poolResponse.data;
        }
      } catch (poolError) {
        console.warn('Could not fetch transactions from blockchain:', poolError);
      }

      // Obtener transacciones locales
      localTransactions = TransactionService.getLocalTransactions();

      // Combinar ambas fuentes de transacciones
      const combinedTransactions = TransactionService.combineTransactions(
        localTransactions,
        blockchainTransactions
      );

      // Convertir al formato esperado por el componente
      const formattedTransactions: Transaction[] = combinedTransactions.map(tx => ({
        hash: tx.txHash || tx.id,
        id: tx.id,
        from: tx.from,
        to: tx.to,
        amount: tx.amount,
        timestamp: tx.timestamp,
        status: tx.status,
        type: tx.type,
        data: tx.data
      }));

      setTransactions(formattedTransactions.slice(0, 20)); // Mostrar últimas 20

    } catch (error: any) {
      console.error('Failed to fetch network data:', error);
      setError('Failed to load blockchain data. Make sure the blockchain API is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const shortenHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading blockchain data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation />

      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Vindex Chain Explorer</h1>
          <p className="text-red-100 text-lg">
            Explore blocks, transactions, and network statistics on the Vindex blockchain
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Network Statistics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Block Height</h3>
            <p className="text-3xl font-bold text-red-600">
              {networkStats?.chainLength?.toLocaleString() || '0'}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Transactions</h3>
            <p className="text-3xl font-bold text-red-600">
              {networkStats?.totalTransactions?.toLocaleString() || '0'}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Circulating Supply</h3>
            <p className="text-3xl font-bold text-red-600">
              {networkStats?.circulatingSupply?.toLocaleString() || '590M'} VDX
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-6 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Validators</h3>
            <p className="text-3xl font-bold text-red-600">
              {networkStats?.validators || '3'}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-6 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Latest Block</h3>
            <p className="text-3xl font-bold text-red-600">
              #{networkStats?.latestBlock?.index || '0'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {networkStats?.latestBlock?.timestamp 
                ? formatTimeAgo(networkStats.latestBlock.timestamp)
                : 'No data'
              }
            </p>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('blocks')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'blocks'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Recent Blocks
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'transactions'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Recent Transactions
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'blocks' && (
              <div className="space-y-4">
                {blocks.length > 0 ? (
                  blocks.map((block) => (
                    <motion.div
                      key={block.index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <span className="text-red-600 font-bold">#{block.index}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              Block {shortenHash(block.hash)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {block.transactionCount} transactions • {formatTimeAgo(block.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Validator</p>
                          <p className="font-medium text-gray-900">
                            {block.validator || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No blocks found</p>
                    <p className="text-sm">Make sure the blockchain is running and generating blocks</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="space-y-4">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <motion.div
                      key={tx.hash || tx.id || Math.random()}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${
                            tx.status === 'confirmed' ? 'bg-green-500' :
                            tx.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {shortenHash(tx.hash || tx.id || 'N/A')}
                            </p>
                            <p className="text-sm text-gray-600">
                              {tx.type === 'swap' ? (
                                `${tx.data?.tokenA || 'Token'} → ${tx.data?.tokenB || 'Token'} (Swap)`
                              ) : (
                                `${shortenAddress(tx.fromAddress || tx.from || 'N/A')} → ${shortenAddress(tx.toAddress || tx.to || 'N/A')}`
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {tx.type === 'swap' ? (
                              `${tx.data?.amountIn || tx.amount || 0} ${tx.data?.tokenA || 'VDX'}`
                            ) : (
                              `${(tx.amount || 0).toLocaleString()} VDX`
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            {tx.fee ? `Fee: ${tx.fee} VDX • ` : ''}{formatTimeAgo(tx.timestamp)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No recent transactions</p>
                    <p className="text-sm">Transactions will appear here as they are processed</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
