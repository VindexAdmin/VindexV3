'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../../../../lib/auth-context';
import Navigation from '../../../components/ui/Navigation';
import { Block, Transaction } from '../../../../types';

export default function BlockDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { api } = useAuth();
  const [block, setBlock] = useState<Block | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBlockData();
  }, [params.id]);

  const fetchBlockData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.getBlock(params.id);
      
      if (response.success && response.data) {
        setBlock(response.data);
      } else {
        setError('Failed to load block data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load block data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const shortenHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading block details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !block) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <svg className="w-16 h-16 text-red-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Block</h3>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-red-600 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              ← Back to Explorer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/explorer" className="text-gray-600 hover:text-red-600">
              Explorer
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-red-600">Block #{block.index}</span>
          </div>
        </div>

        {/* Block Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm overflow-hidden mb-8"
        >
          <div className="border-b border-gray-200">
            <div className="px-6 py-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Block #{block.index}
              </h1>
              <p className="text-gray-600 mt-1">
                {formatTime(block.timestamp)}
              </p>
            </div>
          </div>

          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Block Hash</h3>
                <p className="mt-1 text-gray-900 font-mono break-all">{block.hash}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Previous Block</h3>
                <Link 
                  href={`/explorer/block/${block.index - 1}`}
                  className="mt-1 text-red-600 hover:text-red-700 font-mono break-all"
                >
                  {block.previousHash}
                </Link>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Merkle Root</h3>
                <p className="mt-1 text-gray-900 font-mono break-all">{block.merkleRoot}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Validator</h3>
                <p className="mt-1 text-gray-900 font-mono">{shortenHash(block.validator)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Block Reward</h3>
                <p className="mt-1 text-gray-900">{block.reward} VDX</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Fees</h3>
                <p className="mt-1 text-gray-900">{block.totalFees} VDX</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Size</h3>
                <p className="mt-1 text-gray-900">{block.size} bytes</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Transactions ({block.transactionCount})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {block.transactions.map((tx, index) => (
              <div key={tx.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-600 font-medium mb-1">
                      Transaction #{index + 1}
                    </p>
                    <p className="text-sm text-gray-600 font-mono">
                      {shortenHash(tx.id)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900 font-medium">
                      {tx.amount} VDX
                    </p>
                    <p className="text-sm text-gray-600">
                      Fee: {tx.fee} VDX
                    </p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">From: </span>
                    <span className="font-mono text-gray-900">{shortenHash(tx.from)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">To: </span>
                    <span className="font-mono text-gray-900">{shortenHash(tx.to)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
