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
  timestamp: number;
  transactions: Transaction[];
  transactionCount: number;
  validator: string;
  previousHash: string;
  merkleRoot: string;
  stateRoot: string;
  totalFees: number;
  reward: number;
  size: number;
  difficulty?: number;
  nonce: number;
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

const shortenHash = (hash: string) => {
  if (!hash) return '';
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

export default function Explorer() {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('blocks');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const blocksPerPage = 50;

  useEffect(() => {
    fetchNetworkData();
  }, [currentPage]); // Refetch when page changes

  useEffect(() => {
    // Subscribe to real-time transaction updates
    const unsubscribe = TransactionService.onTransactionUpdate(() => {
      console.log('🔄 Transaction update detected, refreshing data...');
      if (currentPage === 1) { // Only auto-refresh first page
        fetchNetworkData();
      }
    });

    // Auto-refresh every 5 seconds only for the first page
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing explorer data...');
      if (currentPage === 1) {
        fetchNetworkData();
      }
    }, 5000); // Update every 5 seconds for a smoother experience
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const fetchNetworkData = async () => {
    try {
      setError('');
      console.log('📊 Fetching network data...');
      
      // Fetch network stats
      const statsResponse = await api.getBlockchainInfo();
      if (statsResponse.success) {
        setNetworkStats(statsResponse.data);
        console.log('✅ Network stats loaded:', statsResponse.data);
      }

      // Fetch recent blocks with pagination
      const offset = (currentPage - 1) * blocksPerPage;
      const blocksResponse = await api.getBlocks(blocksPerPage, offset);
      console.log('📦 Blocks API response:', blocksResponse);
      
      if (blocksResponse.success && blocksResponse.data) {
        // The data array is directly in the response data
        const blocks = Array.isArray(blocksResponse.data) ? blocksResponse.data : [];
        setBlocks(blocks.sort((a: Block, b: Block) => b.index - a.index));
        
        // For pagination, use the blockchain info for total count since we know the total blocks
        const totalBlocks = networkStats?.chainLength || blocks.length;
        setTotalPages(Math.ceil(totalBlocks / blocksPerPage));
        console.log(`✅ Loaded ${blocks.length} blocks. Page ${currentPage}/${totalPages}`);
      } else {
        console.error('❌ Failed to load blocks:', blocksResponse.error);
      }

      // Combinar transacciones del blockchain con transacciones locales
      let blockchainTransactions: BlockchainTransaction[] = [];
      let localTransactions: SwapTransaction[] = [];

      try {
        // Intentar obtener transacciones del blockchain
        // Primero intentamos el pool de transacciones pendientes
        const poolResponse = await api.getTransactionPool();
        if (poolResponse.success && poolResponse.data && Array.isArray(poolResponse.data) && poolResponse.data.length > 0) {
          console.log('✅ Found pending transactions:', poolResponse.data.length);
          blockchainTransactions = poolResponse.data;
        } else {
          console.log('ℹ️ No pending transactions found');
          // Si no hay transacciones pendientes, extraer transacciones de los bloques
          if (blocksResponse.success && blocksResponse.data && Array.isArray(blocksResponse.data)) {
            const allTransactions: BlockchainTransaction[] = [];
            blocksResponse.data.forEach((block: any) => {
              if (block.transactions && Array.isArray(block.transactions)) {
                block.transactions.forEach((tx: any) => {
                  allTransactions.push({
                    id: tx.id || `${block.hash}-${tx.from}-${tx.to}-${tx.amount}`,
                    from: tx.from || 'unknown',
                    to: tx.to || 'unknown',
                    amount: tx.amount || 0,
                    type: tx.type || 'transfer',
                    timestamp: tx.timestamp || block.timestamp,
                    status: 'confirmed'
                  });
                });
              }
            });
            blockchainTransactions = allTransactions.slice(0, 20); // Limitar a 20 transacciones más recientes
            console.log('✅ Extracted transactions from blocks:', blockchainTransactions.length);
          }
        }
      } catch (poolError) {
        console.warn('⚠️ Could not fetch transactions from blockchain:', poolError);
        // Fallback: extraer transacciones de los bloques si el pool falla
        if (blocksResponse.success && blocksResponse.data && Array.isArray(blocksResponse.data)) {
          const allTransactions: BlockchainTransaction[] = [];
          blocksResponse.data.forEach((block: any) => {
            if (block.transactions && Array.isArray(block.transactions)) {
              block.transactions.forEach((tx: any) => {
                allTransactions.push({
                  id: tx.id || `${block.hash}-${tx.from}-${tx.to}-${tx.amount}`,
                  from: tx.from || 'unknown',
                  to: tx.to || 'unknown',
                  amount: tx.amount || 0,
                  type: tx.type || 'transfer',
                  timestamp: tx.timestamp || block.timestamp,
                  status: 'confirmed'
                });
              });
            }
          });
          blockchainTransactions = allTransactions.slice(0, 20);
          console.log('✅ Fallback: Extracted transactions from blocks:', blockchainTransactions.length);
        }
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
      <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-12 pt-24">
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
            <div className="flex justify-between items-center px-6">
              <nav className="flex space-x-8">
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
              
              <button
                onClick={fetchNetworkData}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              >
                <motion.div
                  animate={isLoading ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }}
                >
                  🔄
                </motion.div>
                Refresh
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'blocks' && (
              <div className="space-y-4">
                {blocks.length > 0 ? (
                  blocks.map((block, index) => (
                    <motion.div
                      key={block.hash}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="bg-white p-6 rounded-lg border border-gray-200 hover:border-red-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-center gap-6">
                        <div className="flex items-center space-x-4">
                          <div className="bg-red-50 text-red-600 p-3 rounded-lg w-20 text-center flex-shrink-0">
                            <span className="text-red-600 font-bold text-lg">#{block.index}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                              Block {shortenHash(block.hash)}
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {formatTimeAgo(block.timestamp)}
                              </span>
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-600 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {block.transactionCount} transactions
                              </span>
                              <span className="text-gray-600 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatTimeAgo(block.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm text-gray-600 mb-1">Validator</p>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {shortenHash(block.validator) || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading blocks...</p>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-gray-600 font-medium">No blocks found</p>
                    <p className="text-sm text-gray-500 mt-2">Make sure the blockchain is running and generating blocks</p>
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
