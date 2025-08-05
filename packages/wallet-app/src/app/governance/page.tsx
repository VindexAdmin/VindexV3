'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Vote, 
  Users, 
  Clock, 
  TrendingUp, 
  Shield, 
  FileText, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Gavel,
  Coins,
  ArrowRight,
  Settings,
  Plus
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import Navigation from '../../components/ui/Navigation';

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  type: 'parameter' | 'upgrade' | 'treasury' | 'emergency';
  status: 'pending' | 'active' | 'passed' | 'failed' | 'executed' | 'cancelled' | 'expired';
  votingStart: number;
  votingEnd: number;
  executionTime?: number;
  quorumReached: boolean;
  votes: {
    for: number;
    against: number;
    abstain: number;
    totalVoted: number;
  };
  createdAt: number;
}

interface VotingPower {
  baseVDX: number;
  stakedVDX: number;
  delegatedVDX: number;
  delegatedToVDX: number;
  totalPower: number;
}

interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  totalVotes: number;
  totalVotingPower: number;
  averageParticipation: number;
  treasuryBalance: number;
  totalDelegated: number;
}

export default function Governance() {
  const { user, isAuthenticated } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [votingPower, setVotingPower] = useState<VotingPower | null>(null);
  const [activeTab, setActiveTab] = useState<'proposals' | 'create' | 'my-votes'>('proposals');
  const [loading, setLoading] = useState(true);

  // Mock data for development
  const mockStats: GovernanceStats = {
    totalProposals: 23,
    activeProposals: 3,
    totalVotes: 186,
    totalVotingPower: 45_000_000,
    averageParticipation: 0.18,
    treasuryBalance: 50_000_000,
    totalDelegated: 12_000_000
  };

  const mockVotingPower: VotingPower = {
    baseVDX: 5_000,
    stakedVDX: 10_000,
    delegatedVDX: 2_000,
    delegatedToVDX: 1_000,
    totalPower: 16_000 // 5000 + (10000 * 1.5) + 2000 - 1000
  };

  const mockProposals: Proposal[] = [
    {
      id: 'prop_1',
      title: 'Reduce Staking Rewards to 6% APY',
      description: 'Proposal to reduce staking rewards from 8% to 6% APY to improve tokenomics sustainability and reduce inflation pressure.',
      proposer: 'VDX1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
      type: 'parameter',
      status: 'active',
      votingStart: Date.now() - (2 * 24 * 60 * 60 * 1000),
      votingEnd: Date.now() + (5 * 24 * 60 * 60 * 1000),
      quorumReached: true,
      votes: {
        for: 28_500_000,
        against: 15_200_000,
        abstain: 2_300_000,
        totalVoted: 46_000_000
      },
      createdAt: Date.now() - (3 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'prop_2',
      title: 'Fund Marketing Campaign - $500K',
      description: 'Allocate 500,000 VDX from treasury to fund a comprehensive marketing campaign targeting DeFi communities on Twitter, Discord, and Reddit.',
      proposer: 'VDX2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      type: 'treasury',
      status: 'active',
      votingStart: Date.now() - (1 * 24 * 60 * 60 * 1000),
      votingEnd: Date.now() + (6 * 24 * 60 * 60 * 1000),
      quorumReached: false,
      votes: {
        for: 18_200_000,
        against: 8_500_000,
        abstain: 1_800_000,
        totalVoted: 28_500_000
      },
      createdAt: Date.now() - (2 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'prop_3',
      title: 'Bridge Fee Optimization',
      description: 'Adjust cross-chain bridge fees to be more competitive: SOL bridge 0.2% → 0.15%, XRP bridge 0.15% → 0.12%, SUI bridge 0.2% → 0.18%.',
      proposer: 'VDX3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
      type: 'parameter',
      status: 'passed',
      votingStart: Date.now() - (10 * 24 * 60 * 60 * 1000),
      votingEnd: Date.now() - (3 * 24 * 60 * 60 * 1000),
      executionTime: Date.now() + (1 * 24 * 60 * 60 * 1000),
      quorumReached: true,
      votes: {
        for: 52_800_000,
        against: 8_200_000,
        abstain: 4_000_000,
        totalVoted: 65_000_000
      },
      createdAt: Date.now() - (12 * 24 * 60 * 60 * 1000)
    }
  ];

  useEffect(() => {
    // Load governance data
    setStats(mockStats);
    setProposals(mockProposals);
    if (isAuthenticated) {
      setVotingPower(mockVotingPower);
    }
    setLoading(false);
  }, [isAuthenticated]);

  const getStatusIcon = (status: Proposal['status']) => {
    switch (status) {
      case 'active':
        return <Vote className="w-4 h-4 text-blue-600" />;
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'executed':
        return <CheckCircle className="w-4 h-4 text-green-800" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: Proposal['status']) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'executed':
        return 'bg-green-200 text-green-900';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: Proposal['type']) => {
    switch (type) {
      case 'parameter':
        return <Settings className="w-4 h-4" />;
      case 'treasury':
        return <Coins className="w-4 h-4" />;
      case 'upgrade':
        return <TrendingUp className="w-4 h-4" />;
      case 'emergency':
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const formatVDX = (amount: number) => {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}M VDX`;
    } else if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(1)}K VDX`;
    }
    return `${amount.toFixed(0)} VDX`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const calculateVotePercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return (votes / total) * 100;
  };

  const getDaysRemaining = (endTime: number) => {
    const now = Date.now();
    const remaining = endTime - now;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / (24 * 60 * 60 * 1000));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center space-x-4 mb-6">
            <Gavel className="w-12 h-12" />
            <div>
              <h1 className="text-4xl font-bold">Vindex Governance</h1>
              <p className="text-red-100 text-lg">Shape the future of Vindex Chain through decentralized governance</p>
            </div>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalProposals}</div>
                <div className="text-red-100">Total Proposals</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.activeProposals}</div>
                <div className="text-red-100">Active Proposals</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{formatPercentage(stats.averageParticipation)}</div>
                <div className="text-red-100">Avg Participation</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{formatVDX(stats.treasuryBalance)}</div>
                <div className="text-red-100">Treasury Balance</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Voting Power Card */}
            {isAuthenticated && votingPower && (
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-red-600" />
                  Your Voting Power
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">VDX Balance:</span>
                    <span className="font-semibold">{formatVDX(votingPower.baseVDX)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Staked VDX (1.5x):</span>
                    <span className="font-semibold">{formatVDX(votingPower.stakedVDX)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delegated to You:</span>
                    <span className="font-semibold">{formatVDX(votingPower.delegatedVDX)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delegated by You:</span>
                    <span className="font-semibold text-red-600">-{formatVDX(votingPower.delegatedToVDX)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total Power:</span>
                      <span className="font-bold text-red-600">{formatVDX(votingPower.totalPower)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('proposals')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    activeTab === 'proposals' 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>All Proposals</span>
                </button>
                <button
                  onClick={() => setActiveTab('create')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    activeTab === 'create' 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'hover:bg-gray-50'
                  }`}
                  disabled={!isAuthenticated}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Proposal</span>
                </button>
                <button
                  onClick={() => setActiveTab('my-votes')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    activeTab === 'my-votes' 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'hover:bg-gray-50'
                  }`}
                  disabled={!isAuthenticated}
                >
                  <Users className="w-4 h-4" />
                  <span>My Votes</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {activeTab === 'proposals' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Active Proposals</h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Updated in real-time</span>
                  </div>
                </div>

                {/* Proposals List */}
                <div className="space-y-6">
                  {proposals.map((proposal) => (
                    <motion.div
                      key={proposal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
                    >
                      {/* Proposal Header */}
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                                {getStatusIcon(proposal.status)}
                                <span className="ml-1 capitalize">{proposal.status}</span>
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {getTypeIcon(proposal.type)}
                                <span className="ml-1 capitalize">{proposal.type}</span>
                              </span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{proposal.title}</h3>
                            <p className="text-gray-600 text-sm line-clamp-2">{proposal.description}</p>
                          </div>
                          
                          {proposal.status === 'active' && (
                            <div className="text-right">
                              <div className="text-sm font-semibold text-red-600">
                                {getDaysRemaining(proposal.votingEnd)} days left
                              </div>
                              <div className="text-xs text-gray-500">to vote</div>
                            </div>
                          )}
                        </div>

                        {/* Vote Progress */}
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Voting Progress</span>
                            <span className="font-semibold">
                              {formatVDX(proposal.votes.totalVoted)} / {formatVDX(40_000_000)} (Quorum)
                            </span>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${proposal.quorumReached ? 'bg-green-500' : 'bg-yellow-500'}`}
                              style={{ width: `${Math.min(100, (proposal.votes.totalVoted / 40_000_000) * 100)}%` }}
                            />
                          </div>

                          {/* Vote Breakdown */}
                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">
                                {calculateVotePercentage(proposal.votes.for, proposal.votes.for + proposal.votes.against).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-600">For ({formatVDX(proposal.votes.for)})</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-red-600">
                                {calculateVotePercentage(proposal.votes.against, proposal.votes.for + proposal.votes.against).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-600">Against ({formatVDX(proposal.votes.against)})</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-gray-600">
                                {calculateVotePercentage(proposal.votes.abstain, proposal.votes.totalVoted).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-600">Abstain ({formatVDX(proposal.votes.abstain)})</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="p-6 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            Proposed by: <span className="font-mono text-xs">{proposal.proposer.substring(0, 20)}...</span>
                          </div>
                          <div className="flex space-x-3">
                            <Link
                              href={`/governance/proposals/${proposal.id}`}
                              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                              View Details
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                            {proposal.status === 'active' && isAuthenticated && (
                              <Link
                                href={`/governance/proposals/${proposal.id}/vote`}
                                className="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700"
                              >
                                <Vote className="w-4 h-4 mr-2" />
                                Vote Now
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'create' && (
              <div className="bg-white rounded-xl shadow-sm border p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Proposal</h2>
                {!isAuthenticated ? (
                  <div className="text-center py-12">
                    <Gavel className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
                    <p className="text-gray-600 mb-6">You need to be logged in to create proposals</p>
                    <button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">
                      Connect Wallet
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Proposal Creation Coming Soon</h3>
                    <p className="text-gray-600 mb-6">The proposal creation interface is under development</p>
                    <div className="text-sm text-gray-500">
                      Requirements: 100,000 VDX minimum + 10,000 VDX bond
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'my-votes' && (
              <div className="bg-white rounded-xl shadow-sm border p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">My Voting History</h2>
                {!isAuthenticated ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
                    <p className="text-gray-600 mb-6">You need to be logged in to view your voting history</p>
                    <button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">
                      Connect Wallet
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Vote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Votes Yet</h3>
                    <p className="text-gray-600 mb-6">You haven't voted on any proposals yet</p>
                    <button 
                      onClick={() => setActiveTab('proposals')}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      View Active Proposals
                    </button>
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
