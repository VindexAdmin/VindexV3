'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { TrendingUp, Shield, Award, Clock, ArrowRight, Wallet, Users, DollarSign } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import Navigation from '../../components/ui/Navigation';

interface Validator {
  id: string;
  name: string;
  address: string;
  commission: number;
  stake: number;
  uptime: number;
  apy: number;
  status: 'active' | 'inactive' | 'jailed';
  blocksProduced: number;
}

interface StakingPosition {
  id: string;
  validatorId: string;
  validatorName: string;
  amount: number;
  rewards: number;
  startDate: string;
  status: 'active' | 'pending' | 'unstaking';
  apy: number;
}

export default function Staking() {
  const { user, wallets, api, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedValidator, setSelectedValidator] = useState('');
  const [validators, setValidators] = useState<Validator[]>([]);
  const [stakingPositions, setStakingPositions] = useState<StakingPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => {
    const nav = document.querySelector('nav');
    if (nav) {
      setNavHeight(nav.clientHeight);
    }
  }, []);


  // Mock data for now - would be fetched from API
  const mockValidators: Validator[] = [
    {
      id: 'validator_1',
      name: 'Vindex Genesis Validator',
      address: 'VDX1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      commission: 5,
      stake: 45000000,
      uptime: 99.8,
      apy: 8.2,
      status: 'active',
      blocksProduced: 1247
    },
    {
      id: 'validator_2',
      name: 'Secure Stake Validator',
      address: 'VDX2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1',
      commission: 7,
      stake: 42000000,
      uptime: 99.5,
      apy: 7.8,
      status: 'active',
      blocksProduced: 1198
    },
    {
      id: 'validator_3',
      name: 'DeFi Pro Validator',
      address: 'VDX3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
      commission: 6,
      stake: 38000000,
      uptime: 99.2,
      apy: 8.0,
      status: 'active',
      blocksProduced: 1089
    }
  ];

  const mockStakingPositions: StakingPosition[] = [
    {
      id: '1',
      validatorId: 'validator_1',
      validatorName: 'Vindex Genesis Validator',
      amount: 3000,
      rewards: 76.5,
      startDate: '2024-12-01',
      status: 'active',
      apy: 8.2
    },
    {
      id: '2',
      validatorId: 'validator_3',
      validatorName: 'DeFi Pro Validator',
      amount: 2000,
      rewards: 51.0,
      startDate: '2024-12-15',
      status: 'active',
      apy: 8.0
    }
  ];

  useEffect(() => {
    // Load validators and staking positions
    setValidators(mockValidators);
    if (isAuthenticated) {
      setStakingPositions(mockStakingPositions);
    }
  }, [isAuthenticated]);

  const totalStaked = stakingPositions.reduce((sum, pos) => sum + pos.amount, 0);
  const totalRewards = stakingPositions.reduce((sum, pos) => sum + pos.rewards, 0);
  const averageAPY = stakingPositions.length > 0 
    ? stakingPositions.reduce((sum, pos) => sum + pos.apy, 0) / stakingPositions.length 
    : 0;

  const handleStake = async () => {
    if (!isAuthenticated) {
      setError('Please log in to stake');
      return;
    }

    if (!stakeAmount || !selectedValidator) {
      setError('Please enter amount and select a validator');
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      // This would be an actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSuccess(`Successfully staked ${amount} VDX with ${validators.find(v => v.id === selectedValidator)?.name}`);
      setStakeAmount('');
      setSelectedValidator('');
      // Refresh staking positions
      // fetchStakingPositions();
    } catch (error: any) {
      setError('Failed to stake. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'unstaking': return 'text-orange-600 bg-orange-100';
      case 'jailed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Navigation */}
      <Navigation />

      <div className="pt-20">
        {/* Modern Header */}
        <header className="relative w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-16 flex flex-col items-center justify-center shadow-lg">
          <div className="max-w-2xl w-full px-4 text-center">
            <h1 className="text-5xl font-extrabold tracking-tight mb-4 drop-shadow-lg">Stake Your VDX</h1>
            <p className="text-xl text-red-100 mb-6">Secure the Vindex network and earn rewards by staking your VDX tokens with trusted validators.</p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10">
        {/* Card Tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'validators', label: 'Validators', icon: Shield },
            { id: 'stake', label: 'Stake Tokens', icon: Award },
            { id: 'positions', label: 'My Stakes', icon: Wallet }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold text-base transition border-2 shadow-sm ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white border-red-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <section className="w-full">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
                <Shield className="h-8 w-8 text-red-600 mb-2" />
                <div className="text-center">
                  <div className="text-sm text-gray-500">Total Staked</div>
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(125000000)} VDX</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
                <Award className="h-8 w-8 text-green-600 mb-2" />
                <div className="text-center">
                  <div className="text-sm text-gray-500">Your Total Staked</div>
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(totalStaked)} VDX</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
                <DollarSign className="h-8 w-8 text-blue-600 mb-2" />
                <div className="text-center">
                  <div className="text-sm text-gray-500">Total Rewards</div>
                  <div className="text-2xl font-bold text-green-600">{totalRewards.toFixed(2)} VDX</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stake' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-lg border p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Stake Your VDX Tokens</h3>
                {/* Stake form */}
                {!isAuthenticated ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Please log in to stake your tokens</p>
                    <Link
                      href="/"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                    >
                      Go to Login
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-600">{error}</p>
                      </div>
                    )}
                    {success && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-green-600">{success}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Validator
                      </label>
                      <select
                        value={selectedValidator}
                        onChange={(e) => setSelectedValidator(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">Choose a validator...</option>
                        {validators.filter(v => v.status === 'active').map((validator) => (
                          <option key={validator.id} value={validator.id}>
                            {validator.name} - {validator.apy}% APY (Commission: {validator.commission}%)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount to Stake (VDX)
                      </label>
                      <input
                        type="number"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        placeholder="Enter amount..."
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Available: {wallets?.[0]?.balance || 0} VDX
                      </p>
                    </div>
                    {selectedValidator && stakeAmount && (
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium text-gray-900 mb-2">Staking Summary</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Validator:</span>
                            <span>{validators.find(v => v.id === selectedValidator)?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Amount:</span>
                            <span>{stakeAmount} VDX</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Expected APY:</span>
                            <span className="text-green-600">{validators.find(v => v.id === selectedValidator)?.apy}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Commission:</span>
                            <span>{validators.find(v => v.id === selectedValidator)?.commission}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={handleStake}
                      disabled={isLoading || !stakeAmount || !selectedValidator}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Staking...' : 'Stake Tokens'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'positions' && (
            <div className="space-y-6">
              {!isAuthenticated ? (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Please log in to view your staking positions</p>
                  <Link
                    href="/"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    Go to Login
                  </Link>
                </div>
              ) : stakingPositions.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">You don't have any active staking positions</p>
                  <button
                    onClick={() => setActiveTab('stake')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    Start Staking
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {stakingPositions.map((position) => (
                    <div key={position.id} className="bg-white rounded-lg shadow-sm border p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900">
                          {position.validatorName}
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(position.status)}`}>
                          {position.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Staked Amount</p>
                          <p className="text-lg font-semibold text-gray-900">{formatNumber(position.amount)} VDX</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Rewards Earned</p>
                          <p className="text-lg font-semibold text-green-600">{position.rewards.toFixed(2)} VDX</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">APY</p>
                          <p className="text-lg font-semibold text-blue-600">{position.apy}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Start Date</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {new Date(position.startDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex space-x-3">
                        <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
                          Claim Rewards
                        </button>
                        <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm">
                          Unstake
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      </div>
    </div>
  );
}
